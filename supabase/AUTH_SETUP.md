# Supabase Auth Dashboard Setup — cromo-swap-app

> **IMPORTANT**: Everything in this document requires manual action in the
> [Supabase dashboard](https://supabase.com/dashboard/project/wpcnqfyfcnebtmxstcpo).
> None of these settings can be applied via MCP, the CLI, or a migration file.
> Each item is marked **DASHBOARD ONLY**.

---

## Checklist (perform in order)

### 1. Email — Confirm email ON
**DASHBOARD ONLY**

Path: `Authentication → Providers → Email`

- [ ] **Confirm email**: toggle **ON**

Why: without this, `auth.users.email_confirmed_at` is never set after OTP
verification, so the `on_auth_user_email_confirmed` trigger never fires and
no `profiles` row with `university` is created. The route guard treats the
user as "verify in progress" indefinitely.

---

### 2. Anonymous sign-ins ON
**DASHBOARD ONLY**

Path: `Authentication → Sign In / Providers`

- [ ] **Anonymous sign-ins**: toggle **ON**

Why: guests must be able to browse the album tab without registering. The
`on_auth_user_created_anon` trigger provisions a `profiles` row with
`is_anonymous=true` on their first sign-in.

---

### 3. Manual linking ON
**DASHBOARD ONLY**

Path: `Authentication → Sign In / Providers` (or `Authentication → Providers`)

- [ ] **Manual linking**: toggle **ON**

Why: the guest → registered upgrade flow uses `supabase.auth.updateUser({ email })`
to attach an email to an existing anonymous session (same `auth.users.id`),
preserving the user's inventory. Without Manual linking enabled, `updateUser`
on an anonymous session is rejected by Supabase Auth.

---

### 4. Before User Created hook — wire the Postgres function
**DASHBOARD ONLY**

Path: `Authentication → Hooks`

- [ ] Click **Add hook**
- [ ] Hook event: **Before User Created**
- [ ] Hook type: **Postgres function**
- [ ] Schema: `public`
- [ ] Function: `before_user_created_hook`
- [ ] Save

Why: this is the **server-side enforcement** of the institutional-email allow-list
(Spec R3-1). Until it is wired here, the function exists in the DB but is never
called — all signups proceed normally (safe for incremental rollout, but do not
expose the app publicly before this is enabled).

Note: migration `0020_auth_onboarding.sql` already applies `GRANT EXECUTE ON
FUNCTION public.before_user_created_hook TO supabase_auth_admin` for idempotency.
The dashboard may or may not re-apply the same grant when you wire the hook —
either way is safe.

---

### 5. URL Configuration — Expo app redirect URLs
**DASHBOARD ONLY**

Path: `Authentication → URL Configuration`

- [ ] **Site URL**: set to your production URL (or `http://localhost:8081` for dev)
- [ ] **Redirect URLs**: add the Expo app scheme, e.g.:
  - `cromos://` (Expo custom scheme — confirm the exact scheme with the app team)
  - `exp://` (Expo Go for local dev — optional)

Why: OTP sign-in (the current auth method) does NOT require deep-link redirect
URLs; the user enters the 6-digit code in-app and calls `verifyOtp()`. However,
URL config is mandatory if magic links are ever enabled, and it is good practice
to set it now. Do not use `shouldCreateUser: false` with OTP until you have
verified the hook is working and confirmed email allow-list enforcement.

---

### 6. Rate limits — review defaults
**DASHBOARD ONLY** (no change needed for MVP)

Path: `Authentication → Rate Limits`

Current defaults (as of 2026):
- OTP send: ~1 request per 60 s per email address
- Hourly OTP send limit: 30 per hour per IP (approximate)

These defaults are adequate for MVP. No action required now; revisit at Phase 10
when load-testing.

---

### 7. Email templates — customize OTP copy (optional, cosmetic)
**DASHBOARD ONLY**

Path: `Authentication → Email Templates`

- [ ] Customize the OTP / confirmation email subject and body for brand consistency
  (Spanish copy, Cromo Swap branding).

This is cosmetic and does not affect functionality. Defer if not a priority.

---

## Smoke Test (run AFTER all above steps are complete)

Verify the hook is working correctly before a public launch:

### Test A — Rejected domain
```
POST /auth/v1/otp
Body: { "email": "student@gmail.com", "create_user": true }

Expected: HTTP 422 or 403 with message "Registro permitido solo con un
           correo universitario reconocido."
Expected: NO row in auth.users for this email.
```

In a Supabase JS client:
```js
const { error } = await supabase.auth.signInWithOtp({ email: 'x@gmail.com' });
// error.message should mention the rejection; no user created
```

### Test B — Allowed institutional domain
```
POST /auth/v1/otp
Body: { "email": "student@epn.edu.ec", "create_user": true }

Expected: HTTP 200, OTP email sent.
```

After the user enters the OTP code and calls `verifyOtp`:
```sql
-- Check in the Supabase SQL editor
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'student@epn.edu.ec';
SELECT id, university, is_anonymous FROM public.profiles WHERE id = '<user id from above>';
-- Expected: university = 'EPN', is_anonymous = false
```

### Test C — Anonymous sign-in
```js
const { data, error } = await supabase.auth.signInAnonymously();
// error should be null; data.user.is_anonymous should be true
```

After sign-in:
```sql
SELECT id, is_anonymous, university FROM public.profiles WHERE id = '<anon user id>';
-- Expected: is_anonymous = true, university = null
```

---

## Future Work (not Phase 3)

- **Phase 10**: Add a `pg_cron` job to delete anonymous users older than 30 days:
  ```sql
  DELETE FROM auth.users
  WHERE is_anonymous = true
    AND created_at < now() - interval '30 days';
  ```
  (Requires the `pg_cron` extension and appropriate permissions — do not
  add until Phase 10 scope is finalized.)

- **Post-MVP**: Consider adding a Custom Access Token hook to embed
  `university` and `scope` claims into the JWT (avoids a round-trip to
  `profiles` on every request). This is a Phase 5+ optimization.

---

## Related Files

| File | Purpose |
|------|---------|
| `supabase/migrations/0020_auth_onboarding.sql` | Creates the hook function and triggers |
| `supabase/tests/rls_test.sql` | pgTAP tests for the hook and triggers (Phase 3 section) |
| `src/types/database.ts` | Generated TypeScript types (regenerate after each migration) |
