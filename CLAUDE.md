# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. What this is

**Cromos** — a free mobile app for Ecuadorian university students in Quito to track their World Cup 2026 sticker album, manage their cromos, and connect with other students to **trade**, **sell directly**, or **auction** physical stickers. The app **never processes payments** and **never shows ads** — all transactions are coordinated outside the platform (WhatsApp). It is and will remain 100% free; there is no premium tier.

Repo state: **greenfield**. As of this writing the repo contains only `LICENSE`, `README.md`, `.mcp.json` (Supabase MCP wired), and this file. Everything below describes the target system and the phased plan to build it. Do not assume code exists — check first.

Design origin: there is a handoff bundle from Claude Design (`Cromos.html` + React/JSX prototypes) that defines the visual language. We **recreate it pixel-perfectly in React Native**, we do not port the prototype's internal structure. See §6.

---

## 2. Tech stack (decided)

| Layer | Choice | Notes |
|---|---|---|
| Mobile client | **Expo (managed) + Expo Router** | File-based routing. Builds via EAS. OTA updates. |
| Backend | **Supabase** | Postgres + Auth + RLS + Storage + Edge Functions + Realtime. Project ref `wpcnqfyfcnebtmxstcpo`, MCP connected. |
| Auth | **Supabase Auth, institutional email REQUIRED** | Registration only with a recognized university email domain (`@epn.edu.ec`, `@puce.edu.ec`, `@uce.edu.ec`, `@usfq.edu.ec`, `@udla.edu.ec`, …). The verified email domain is the source of truth for the user's university — it is **not** self-declared. Email confirmation (magic link / OTP) is mandatory before any social action. |
| Session storage | **`LargeSecureStore` (AES-256)** — `src/lib/large-secure-store.ts` | Encryption key in `expo-secure-store`; ciphertext in `AsyncStorage` (SecureStore has a ~2 KB limit, Supabase sessions can exceed it). Never raw tokens in `AsyncStorage` — only ciphertext. AsyncStorage is used for nothing else. |
| Client data layer | `@supabase/supabase-js` + **TanStack Query v5** server cache | Realtime is wired as a push-invalidation mechanism later (Phase 8), not a query-cache replacement. |
| Styling | **NativeWind (Tailwind RN)** | Mirrors the design tokens in §6. |
| Frontend work | **ALWAYS use the `ui-ux-pro-max` skill** | Mandatory for every screen/component. Non-negotiable. |
| State (client-only) | Zustand if needed | Keep it minimal; server is source of truth. |
| Geolocation | **NONE** | "Cercanía" = the university scope, nothing more. No GPS, no coordinates, no location columns. This keeps the privacy/security surface small — keep it that way. |

Users **not registered** exist as a deliberate, limited tier: they can do **personal album tracking only** — no matches, no trades, no sales, no auctions, no contact, no visibility to others. This can be a fully local/offline mode or an anonymous Supabase session; decide in Phase 1, but it must never touch the social graph.

---

## 3. SECURITY — ABSOLUTE PRIORITY

This is the #1 constraint of the project. Treat every change as if it ships to production tomorrow.

**Non-negotiables for every agent touching this codebase:**

1. **RLS on by default, deny by default.** Every table has Row Level Security enabled. No table is readable/writable without an explicit policy. Service-role key never reaches the client — server-only (Edge Functions).
2. **The scope is enforced server-side.** A user's selectable scope is a subset of recognized universities; what cromos/users/listings they can see and interact with is filtered in SQL/policies, never only in the client. The client filter is UX, not security.
3. **University = verified email domain.** Never trust a client-supplied `university` field. Derive it from `auth.users.email` domain at signup (DB trigger / Edge Function), store it immutably (or change only via re-verification).
4. **Block list is hard.** If A blocks B: B cannot see A's profile, listings, or auctions; cannot send A requests; no matches generated between them; no shared transactions; no contact. Enforced in policies, not just UI. Blocks are symmetric in effect (B's content disappears for A and A's for B w.r.t. interaction).
5. **WhatsApp number is revealed only after acceptance.** A user's phone number is private. It becomes visible to the counterparty **only** after the seller/owner explicitly accepts the request (trade / purchase / auction winner). Before that, no API response includes it. After cancellation it's hidden again. The phone lives in a **separate `profile_contacts` table** (not on `profiles`) whose RLS allows only: (a) the owner of the row, and (b) a counterparty with an `accepted` transaction. This is DB-enforced at the table level — not a convention. The `contact_info` view (a plain `security_invoker = true` view over `profile_contacts`) is the canonical API surface for reading the phone. Never query `profiles` for a phone number — the column does not exist there (removed by migration 0017).
6. **Reservation = lock.** When a request (trade / direct sale / auction) is accepted, the involved cromo(s) are **reserved**: not available for new trades/sales/auctions, can't generate new "available" matches, can't be deleted without cancelling the reservation. Enforce with status + DB constraints, and guard against race conditions (a cromo can't be reserved by two transactions — use transactional `SELECT ... FOR UPDATE` / unique partial indexes / row-level locking in Edge Functions).
7. **Auction penalty.** If a user wins an auction and does not complete the purchase, they are blocked from **auction participation** (bidding, winning, starting offers) for **2 weeks**. Tracking, trades, and direct sales are unaffected. Enforce the block server-side with a timestamp; never client-only.
8. **Input validation everywhere.** Validate on the client for UX and **again** on the server (Edge Functions / DB constraints / `check` constraints). Prices are positive numbers, USD only. No SQL string interpolation — parameterized everything.
9. **No PII in logs.** No emails, phone numbers, or tokens in logs, error messages, or analytics.
10. **Secrets** live in EAS secrets / Supabase project secrets, never committed. The anon/publishable key is fine in the client; the service-role key is not.

When in doubt about whether something is a security boundary: assume it is, and enforce it in the database.

---

## 4. Domain model & business rules (the source of truth)

This section is the canonical spec. If code disagrees with this, the code is wrong (or this needs updating with the user's sign-off).

### 4.1 Entities (conceptual — DB schema is designed in Phase 2, not here)

- **User** — registered (has verified university email + WhatsApp number stored in `profile_contacts` + chosen scope) or guest (tracking only).
- **University** — fixed list of recognized Quito universities, each with an email domain. Used for scope.
- **Album / Catalog** — the *current* World Cup album only (WC 2026). A catalog is a fixed set of **cromos** (sticker definitions: number, country, player name *or* flag/country name, rarity, etc.). **Phase plan:** start with the design's placeholder catalog (16 selections × 15 = 240 cromos); the real 48-selection WC 2026 catalog lands in a dedicated later phase once mapped/researched. We (the team) curate the catalog; users don't create cromo definitions.
- **Inventory item** — a (user, cromo, quantity, status) record. Quantity ≥ 0. A guest has inventory too (tracking).
- **Listing** — something offered to others. Kinds:
  - **Trade offer** (a cromo or a package the owner will swap)
  - **Direct sale** (a cromo or package with a fixed displayed USD price; flag `negotiable` true/false — *displayed* price, app does NOT host negotiation)
  - **Auction** (a cromo or package; start price, current bid, increment, time left, optional buy-now price, visibility scope)
  - **Package / lote** — multiple cromos offered together (sale package / trade package / lote de repetidos). A package shows: included cromos (exact list — always show the list, no generic lots in the UI), count, total price, negotiable flag, seller's university, availability status. A cromo committed to a package cannot also be listed individually at the same time.
- **Match** — a computed compatibility between two users within the scope: what I can give them (my repeated/offered cromos they're missing) and what they can give me. Match types (ordered by ease, this is the sort order): **perfect** (1↔1 exact), **multiple** (n↔n balanced), **partial**, **unbalanced**. The system also lets a user *search* others' cromos directly — initiating a trade does not require a precomputed match. Either side can initiate.
- **Transaction** — a trade / purchase / auction-settlement going through the acceptance pipeline.
- **Notification** — in-app events (request received, accepted, outbid, auction ending, etc.).
- **Block** — directed user→user block records.

### 4.2 Selling

- A user can sell a cromo **even if it's their only copy** — a cromo does not need to be a repeat to be sold or auctioned.
- Consequence: if you sell your only copy and both parties confirm, that cromo becomes **missing** again in your collection.
- The user decides which cromos to offer (for trade/sale/auction) — nothing is auto-listed.
- Direct-sale price is **visually fixed** in the app but can be flagged **negotiable** or **not negotiable**.
- The app does **not** allow offering/bidding/negotiating on a direct sale inside the platform. Negotiation, if any, happens over WhatsApp **after** the seller accepts the contact request.
- All prices are **USD only** (Ecuador uses USD). The app displays only USD.

### 4.3 Auctions

- The owner of a cromo can start an auction on it (current album only, like everything else).
- An auction has: start price, increment, current bid + bids count, time left, optional **buy-now** price, and a **visibility scope** chosen by the seller: **all registered users** OR **only the seller's selected university scope**. Keep visibility options to those two for MVP — don't add more.
- Bidding shows a **penalty warning** (see §3.7) before placing a bid.
- **Auction end flow (critical):** the winner does NOT automatically get the seller's contact.
  1. Auction ends.
  2. App identifies the winner.
  3. Seller receives the winner's request.
  4. Seller must **accept**.
  5. Only after acceptance is WhatsApp contact enabled.
  6. If the seller does not accept, the transaction does not advance.
- Penalty for the **winner** not concluding: 2-week block from auctions only (see §3.7).

### 4.4 Reservation / locking

When a buy / trade / auction request is **accepted**, the cromo(s) are **reserved**. While reserved a cromo:
- does not appear available for new trades,
- does not appear available for new sales,
- cannot enter another auction,
- cannot be deleted from inventory without cancelling the reservation,
- does not generate new "available" matches.

**Central rule:** a cromo accepted into a transaction is **locked** until the transaction completes or is cancelled. (See §3.6 for the race-condition / concurrency requirements.)

### 4.5 Contact & WhatsApp

- The **only** contact channel is WhatsApp.
- Contact is enabled **only after acceptance** by the owner/seller (trade accepted, direct-sale request accepted, auction winner accepted). Until then, the counterparty's number is not exposed by the API.
- After acceptance → the app surfaces a "Contactar por WhatsApp" affordance (deep link) for both parties.

### 4.6 Trade completion & inventory effects

- After a trade is **accepted**, the parties confirm completion (the "after accepting a trade" step). On confirmed completion, the traded cromo is **subtracted** from the giver's inventory and **added** to the receiver's; the system supports adding the other received cromo(s) too. Direct sale of an only copy → that cromo becomes missing again (§4.2).
- Decrementing to 0 removes "have"/"repeated" status appropriately and re-flags the cromo as missing.

### 4.7 Scope

- Every registered user picks their **scope**: a subset of recognized universities. The user can edit it. Closing/finalizing the scope is a deliberate action.
- All social surfaces (matches, search, listings, auctions w/ "my scope" visibility) are filtered to the scope **server-side**.
- A user can search for and initiate trades/purchases with **any user within their chosen scope** — e.g. "I'm EPN, I include PUCE and UCE, so I can match/search with people from those." Either side can initiate; a precomputed match is not required.

### 4.8 Blocking (no reports in MVP)

- There is **no report system** at launch — only **block**.
- Effects of A blocks B: A doesn't see B's profile / listings / auctions; A receives no requests from B; no matches A↔B; A and B can't be in a transaction together; A can't contact B. (See §3.4 — enforce in policies.)

### 4.9 Guest (unregistered) users

- Album **tracking only**. No matches, no trades, no sales, no auctions, no contact, not visible to others. Must never touch the social graph.

---

## 5. Phased plan

Build in order. Each phase ends with: working code, tests where the stack allows, RLS verified, no security gaps. **Strict TDD where the stack supports it.**

> The detailed, living phase breakdown should be tracked in the SDD/engram layer per the orchestrator workflow. This is the high-level skeleton.

- **Phase 0 — Foundations & context.** This CLAUDE.md. SDD init. Engram seeded with the domain spec and decisions. *(in progress / done when this file lands)*
- **Phase 1 — Project scaffolding.** Expo + Expo Router app skeleton, NativeWind + design tokens (§6), Supabase client wiring with `expo-secure-store`, env/secrets handling, lint + typecheck + test runner, CI basics. Guest tracking mode shell. No backend tables yet beyond auth.
- **Phase 2 — Data model & security core.** Postgres schema (migrations via Supabase): universities, catalog/cromos, inventory, listings (trade/sale/auction/package), transactions, notifications, blocks, profiles (university derived from email domain via trigger, WhatsApp number column). **RLS policies for everything**, deny-by-default. Seed the placeholder catalog (16×15=240). Advisors clean.
- **Phase 3 — Auth & onboarding.** Institutional-email signup + email confirmation, domain→university derivation, WhatsApp number capture, scope selection onboarding (matches the design's onboarding screen). Block list plumbing.
- **Phase 4 — Album & inventory.** Album screen (per-selection progress, filters by status/country), cromo detail sheet, marking have/repeated/missing, choosing what to offer (trade/sale/auction). Pixel-match the design.
- **Phase 5 — Matches & trades.** Match computation (perfect/multiple/partial/unbalanced, scope-filtered, block-aware), direct cromo search, trade proposal screen + acceptance pipeline + reservation/locking, completion → inventory effects, WhatsApp reveal post-acceptance.
- **Phase 6 — Direct sales.** Sale listings (fixed price, negotiable flag, USD), packages/lotes (exact cromo lists), purchase-request → accept → WhatsApp. Reservation rules.
- **Phase 7 — Auctions.** Auction creation (start price, increment, buy-now, visibility scope), bidding with penalty warning, time handling, end flow (winner → request → seller accept → WhatsApp), 2-week auction-block penalty enforcement.
- **Phase 8 — Notifications & profile.** In-app notifications (Realtime), profile screen with editable scope, block management UI.
- **Phase 9 — Real catalog.** Replace placeholder with the mapped WC 2026 catalog (48 selections). Migration path for existing inventory.
- **Phase 10 — Hardening.** Security review pass, RLS test suite, rate limiting on sensitive Edge Functions, abuse edge cases, polish.

Don't jump ahead. Don't merge a phase with known security gaps.

---

## 6. Design system (from the Claude Design handoff)

The handoff bundle (`Cromos.html` and `app/*.jsx`, `tweaks-panel.jsx`) is the visual source of truth. **Recreate it in React Native — match the visual output, not the prototype's structure.** Don't render it in a browser; read the source.

- **Vibe:** modern, minimal, warm. Original brand "Cromos" — **no Panini/FIFA marks**. Cromo cards are abstract: flag + country code + number + jersey-stripe motif.
- **Type:** `Manrope` (UI, weights 400–800), `JetBrains Mono` (numbers/codes), `Instrument Serif` (accents). Bundle these as app fonts.
- **Palette (`C` in `components.jsx`):**
  - `paper` `#F7F4ED` (warm cream), `paper2` `#EEEAE0`, `card` `#FFFFFF`
  - `ink` `#15140F`, `ink2` `#3A372F`, `muted` `#7A766B`, `faint` `#B8B3A6`, `hairline` `#E5E0D2`
  - `accent` `#1F5E3F` (pitch green), `accentSoft` `#E2EBE3`
  - `hot` `#C73E1D` (coral — perfect match / urgent), `hotSoft` `#F7E2DA`
  - `gold` `#B8862C`, `legend` `#1F1B14`
  - Background: radial gradient `#F3F0E6 → #E8E3D5 → #DDD7C5`
  - Surface variants the prototype exposes: cream / paper / mist (keep as a theme option or pick cream as default).
- **Rarities** (`RARITIES`): común / poco común / raro / muy raro / especial / legendario — each with chip bg, text, dot color. Legendario cromos render dark (`#1F1B14` bg, gold text).
- **Cromo card** sizes: xs/sm/md/lg/xl (see `components.jsx` `dims`). Empty (missing) state = dashed faint border, transparent.
- **Screens in the prototype** (use as the screen map): Welcome → Onboarding (university + scope) → Home/Álbum → Cromo detail (sheet) → Matches → Trade proposal → Mercado (sales + auctions) → Auction detail → Other profile → Notifications → Profile. Bottom tab nav: Álbum / Matches / Mercado / Avisos / Perfil.
- **Universities seed** (`UNIVERSITIES` in `data.jsx`): EPN, PUCE, UCE, USFQ, UDLA, UIDE, UTE, ESPE — each with short code + color. Real domains get attached in Phase 3.

When building any UI: **invoke the `ui-ux-pro-max` skill first**, then implement. Every screen. Always.

---

## 7. Conventions for agents working here

- **Frontend = always `ui-ux-pro-max` skill first.** No exceptions.
- **Security is checked at the database.** Client-side filters/validation are UX only. If you add a table, you add RLS policies in the same change, deny-by-default. Run Supabase advisors after schema changes.
- **No payments, no ads, no premium.** If a task implies otherwise, push back.
- **No geolocation.** "Cercanía" = university scope. Don't add location data.
- **University is derived from the verified email domain**, never trusted from the client.
- **WhatsApp numbers and emails are PII** — RLS-protected, never logged, revealed only post-acceptance.
- **Supabase migrations** for all schema changes (via the Supabase MCP `apply_migration` or the CLI). Never ad-hoc SQL that isn't captured as a migration.
- **TDD where the stack allows it** (Strict TDD Mode is on). Write the failing test first.
- **Conventional commits**, no AI attribution / no Co-Authored-By.
- **Don't build after changes** (per user's global rule); rely on typecheck/test.
- Prefer `bat`/`rg`/`fd`/`eza`/`sd` over `cat`/`grep`/`find`/`ls`/`sed`.
- Keep the SDD/engram layer in sync — decisions, schema rationale, and the live phase breakdown live there.

### Commands

```bash
npm start               # expo start — dev server (Expo Go)
npm run android         # expo start --android
npm run ios             # expo start --ios
npm run web             # expo start --web
npm run lint            # expo lint (ESLint flat config)
npm run typecheck       # tsc --noEmit — zero errors required
npm test                # jest (jest-expo preset)
npm run test:watch      # jest --watch
npm run format          # prettier --write .
npx eas build --profile preview   # managed native build
```

> **NativeWind / Tailwind version pin (MANDATORY):** `nativewind` is pinned to exactly `4.2.3`
> and `tailwindcss` to `3.4.x`. Do **NOT** upgrade Tailwind to 4.x. NativeWind v5 + Tailwind 4
> migration is deferred to **Phase 10 (Hardening)**. This is a deliberate decision documented in
> the SDD design artifact.

> **No PII in logs (permanent rule — §3.9):** No email addresses, phone numbers, session tokens,
> or user identifiers may appear in `console.log`, error messages, analytics calls, or Sentry
> breadcrumbs at any point in the codebase. This applies from Phase 1 onward and is never
> relaxed.

> **react-native-svg added:** `react-native-svg` is a direct dependency used by the
> `GradientBackground` component to render the app's radial gradient background
> (`#F3F0E6 → #E8E3D5 → #DDD7C5`). React Native has no native radial gradient primitive;
> SVG is the correct solution. Do not remove it.

Supabase: schema changes go through migrations (Supabase MCP / `supabase` CLI); use `list_tables`, `get_advisors`, `get_logs` before/after changes.
