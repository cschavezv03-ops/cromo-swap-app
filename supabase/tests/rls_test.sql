-- =============================================================================
-- File:    supabase/tests/rls_test.sql
-- Purpose: pgTAP RLS + constraint test suite for Phase 2 data model.
--          Covers all scenarios from spec CAP-13 (R13-1 through R13-9).
--          Updated by 0017_profile_contacts: phone tests moved from profiles
--          to profile_contacts; new profile_contacts RLS assertions added.
-- Run:     supabase test db  (requires pgtap extension from 0014)
-- ⚠️  TEST ONLY — do NOT include in production migrate path ⚠️
-- =============================================================================

BEGIN;

-- How many tests to expect (update this count when adding tests)
-- Phase 2: 58 tests; Phase 3 adds: 15 new assertions = 73 total
SELECT plan(73);

-- =============================================================================
-- HELPERS
-- We create test users as entries in auth.users (fake) and profiles.
-- In pgTAP DB tests, we use SET LOCAL role + set_config to simulate sessions.
-- =============================================================================

-- Create test users directly in auth.users + profiles.
-- Using DO block so we can capture UUIDs for use in subsequent tests.
DO $$
DECLARE
  user_a   uuid := '00000000-0001-0000-0000-000000000000';
  user_b   uuid := '00000000-0002-0000-0000-000000000000';
  user_c   uuid := '00000000-0003-0000-0000-000000000000';
  guest_id uuid := '00000000-0004-0000-0000-000000000000';
  cromo1   uuid;
  cromo2   uuid;
  listing1 uuid;
BEGIN
  -- Insert fake auth.users rows (minimal set needed)
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
  VALUES
    (user_a,   'a@epn.edu.ec',   now(), now(), '{}'),
    (user_b,   'b@puce.edu.ec',  now(), now(), '{}'),
    (user_c,   'c@uce.edu.ec',   now(), now(), '{}'),
    (guest_id, 'g@anon.invalid', now(), now(), '{}')
  ON CONFLICT (id) DO NOTHING;

  -- Insert profiles (no whatsapp_phone here — it lives in profile_contacts now)
  INSERT INTO public.profiles (id, display_name, university, scope, is_anonymous)
  VALUES
    -- User A: EPN, scope includes PUCE and UCE, normal user
    (user_a,   'Test User A',   'EPN',  ARRAY['EPN','PUCE','UCE'], false),
    -- User B: PUCE, in A's scope
    (user_b,   'Test User B',   'PUCE', ARRAY['PUCE','EPN'],       false),
    -- User C: UCE, in A's scope
    (user_c,   'Test User C',   'UCE',  ARRAY['UCE'],              false),
    -- Guest user (anonymous Supabase session)
    (guest_id, 'Guest User',    NULL,   ARRAY[]::text[],           true)
  ON CONFLICT (id) DO NOTHING;

  -- Insert phone numbers into profile_contacts (new canonical location)
  INSERT INTO public.profile_contacts (user_id, whatsapp_phone)
  VALUES
    (user_a, '+593991234567'),
    (user_b, '+593997654321')
  ON CONFLICT (user_id) DO NOTHING;

  -- Get three catalog cromo IDs for testing
  SELECT id INTO cromo1 FROM public.catalog_cromos LIMIT 1;
  SELECT id INTO cromo2 FROM public.catalog_cromos OFFSET 1 LIMIT 1;

  -- Insert inventory items for User A (cromo1: repeated) and User B (cromo1: missing)
  INSERT INTO public.inventory_items (user_id, cromo_id, quantity)
  VALUES
    (user_a, cromo1, 2),   -- A has cromo1 repeated (surplus)
    (user_a, cromo2, 0),   -- A is missing cromo2
    (user_b, cromo1, 0),   -- B is missing cromo1
    (user_b, cromo2, 2)    -- B has cromo2 repeated (surplus)
  ON CONFLICT (user_id, cromo_id) DO NOTHING;

  -- Create a public listing for User B (visible to everyone)
  -- Using kind='trade' (not 'sale') — sale requires a non-null price (listings_sale_price_check).
  listing1 := gen_random_uuid();
  INSERT INTO public.listings (id, seller_id, kind, status, cromo_id, is_public, scope_universities)
  VALUES (listing1, user_b, 'trade', 'active', cromo2,
          true, ARRAY['PUCE','EPN'])
  ON CONFLICT DO NOTHING;

  -- Store UUIDs in temporary table for test SQL access
  CREATE TEMP TABLE IF NOT EXISTS test_uuids (key text PRIMARY KEY, val uuid);
  INSERT INTO test_uuids VALUES
    ('user_a',   user_a),
    ('user_b',   user_b),
    ('user_c',   user_c),
    ('guest_id', guest_id),
    ('cromo1',   cromo1),
    ('cromo2',   cromo2),
    ('listing1', listing1)
  ON CONFLICT DO NOTHING;

  -- cromo3: a third catalog cromo used for puce_listing (separate from cromo1/cromo2
  -- to avoid reservation-index or guard-trigger conflicts with R13-7/R13-9 setup).
  INSERT INTO test_uuids (key, val)
    SELECT 'cromo3', id FROM public.catalog_cromos OFFSET 2 LIMIT 1
  ON CONFLICT DO NOTHING;
END;
$$;

-- Grant authenticated role access to the temp table so SET LOCAL role = authenticated
-- sessions can still read UUIDs.
GRANT SELECT ON test_uuids TO authenticated;

-- Shorthand functions to set session user context (simulate JWT claims)
CREATE OR REPLACE FUNCTION set_session_as(p_user_id uuid, p_is_anon boolean DEFAULT false)
  RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',          p_user_id::text,
      'role',         'authenticated',
      'is_anonymous', p_is_anon
    )::text,
    true  -- local to transaction
  );
  SET LOCAL role = authenticated;
END;
$$;

CREATE OR REPLACE FUNCTION set_session_as_guest(p_user_id uuid)
  RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_session_as(p_user_id, true);
END;
$$;

CREATE OR REPLACE FUNCTION reset_session()
  RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RESET role;
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$$;

-- =============================================================================
-- R13-2: DENY-BY-DEFAULT — fresh role sees zero rows on every table
-- =============================================================================

-- Create a fresh user with no rows, simulate as authenticated
DO $$
DECLARE fresh_id uuid := '00000000-9999-0000-0000-000000000000';
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
  VALUES (fresh_id, 'fresh@test.invalid', now(), now(), '{}')
  ON CONFLICT DO NOTHING;
  INSERT INTO test_uuids VALUES ('fresh_id', fresh_id) ON CONFLICT DO NOTHING;
END;
$$;

-- Simulate fresh user session
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='fresh_id'));

-- Fresh user: universities still readable (public reference data)
SELECT is(
  (SELECT count(*)::int FROM public.universities),
  8,
  'R01-2: anon/authenticated can read all universities'
);

SELECT is(
  (SELECT count(*)::int FROM public.countries),
  16,
  'R01-2: anon/authenticated can read all countries (16 rows)'
);

SELECT is(
  (SELECT count(*)::int FROM public.rarities),
  6,
  'R01-2: anon/authenticated can read all rarities (6 rows)'
);

SELECT is(
  (SELECT count(*)::int FROM public.catalog_cromos WHERE is_active = true),
  240,
  'R02-3: catalog seed returns exactly 240 active rows'
);

-- Fresh user with no profile: cannot see others' profiles (deny by default)
SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id <> (SELECT val FROM test_uuids WHERE key='fresh_id')),
  0,
  'R13-2: fresh user sees zero profiles (deny-by-default)'
);

-- Fresh user sees zero inventory of others
SELECT is(
  (SELECT count(*)::int FROM public.inventory_items
   WHERE user_id <> (SELECT val FROM test_uuids WHERE key='fresh_id')),
  0,
  'R13-2: fresh user sees zero others inventory (deny-by-default)'
);

-- Fresh user sees zero scoped (non-public) listings (no university → not in scope).
-- Public listings are intentionally visible to any authenticated non-guest user.
SELECT is(
  (SELECT count(*)::int FROM public.listings
   WHERE seller_id <> (SELECT val FROM test_uuids WHERE key='fresh_id')
     AND is_public = false),
  0,
  'R13-2: fresh user sees zero scoped (non-public) listings (deny-by-default, not in scope)'
);

SELECT is(
  (SELECT count(*)::int FROM public.blocks
   WHERE blocker_id <> (SELECT val FROM test_uuids WHERE key='fresh_id')),
  0,
  'R13-2: fresh user sees zero block rows (deny-by-default)'
);

SELECT is(
  (SELECT count(*)::int FROM public.transactions
   WHERE initiator_id <> (SELECT val FROM test_uuids WHERE key='fresh_id')
     AND owner_id     <> (SELECT val FROM test_uuids WHERE key='fresh_id')),
  0,
  'R13-2: fresh user sees zero transactions (deny-by-default)'
);

SELECT is(
  (SELECT count(*)::int FROM public.notifications
   WHERE user_id <> (SELECT val FROM test_uuids WHERE key='fresh_id')),
  0,
  'R13-2: fresh user sees zero notifications (deny-by-default)'
);

SELECT is(
  (SELECT count(*)::int FROM public.auction_bids
   WHERE bidder_id <> (SELECT val FROM test_uuids WHERE key='fresh_id')),
  0,
  'R13-2: fresh user sees zero auction bids (deny-by-default)'
);

SELECT reset_session();

-- =============================================================================
-- R13-3: GUEST LOCKOUT
-- Guest (is_anonymous=true) cannot see listings, transactions, auction_bids,
-- others' inventory, or others' profiles.
-- =============================================================================

SELECT set_session_as_guest((SELECT val FROM test_uuids WHERE key='guest_id'));

SELECT is(
  (SELECT count(*)::int FROM public.listings
   WHERE seller_id <> (SELECT val FROM test_uuids WHERE key='guest_id')),
  0,
  'R13-3: guest cannot see any listings'
);

SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id <> (SELECT val FROM test_uuids WHERE key='guest_id')),
  0,
  'R13-3: guest cannot see others profiles'
);

SELECT is(
  (SELECT count(*)::int FROM public.inventory_items
   WHERE user_id <> (SELECT val FROM test_uuids WHERE key='guest_id')),
  0,
  'R13-3: guest cannot see others inventory'
);

SELECT is(
  (SELECT count(*)::int FROM public.transactions),
  0,
  'R13-3: guest cannot see any transactions'
);

SELECT is(
  (SELECT count(*)::int FROM public.auction_bids),
  0,
  'R13-3: guest cannot see any auction bids'
);

-- Guest cannot see any profile_contacts rows (no accepted transactions possible)
SELECT is(
  (SELECT count(*)::int FROM public.profile_contacts
   WHERE user_id <> (SELECT val FROM test_uuids WHERE key='guest_id')),
  0,
  'R13-3: guest cannot see others profile_contacts (no accepted tx possible)'
);

SELECT reset_session();

-- =============================================================================
-- R13-4: BLOCK INVISIBILITY (symmetric)
-- After A blocks B: A cannot see B's profile/inventory/listings; B cannot see A's.
-- =============================================================================

-- User A blocks User B
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));
INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_a'),
    (SELECT val FROM test_uuids WHERE key='user_b')
  )
ON CONFLICT DO NOTHING;

-- A cannot see B's profile
SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id = (SELECT val FROM test_uuids WHERE key='user_b')),
  0,
  'R13-4: blocker (A) cannot see blocked (B) profile'
);

-- A cannot see B's inventory
SELECT is(
  (SELECT count(*)::int FROM public.inventory_items
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_b')),
  0,
  'R13-4: blocker (A) cannot see blocked (B) inventory'
);

-- A cannot see B's listings
SELECT is(
  (SELECT count(*)::int FROM public.listings
   WHERE seller_id = (SELECT val FROM test_uuids WHERE key='user_b')),
  0,
  'R13-4: blocker (A) cannot see blocked (B) listings'
);

SELECT reset_session();

-- Symmetric: B cannot see A's profile (block is symmetric in is_blocked)
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_b'));

SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id = (SELECT val FROM test_uuids WHERE key='user_a')),
  0,
  'R13-4: blocked (B) cannot see blocker (A) profile (symmetric)'
);

SELECT is(
  (SELECT count(*)::int FROM public.inventory_items
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_a')),
  0,
  'R13-4: blocked (B) cannot see blocker (A) inventory (symmetric)'
);

SELECT reset_session();

-- Remove block for remaining tests
RESET role;
DELETE FROM public.blocks
  WHERE blocker_id = (SELECT val FROM test_uuids WHERE key='user_a')
    AND blocked_id  = (SELECT val FROM test_uuids WHERE key='user_b');

-- =============================================================================
-- R13-5: OUT-OF-SCOPE LISTING HIDDEN
-- A scoped private listing is invisible to a user whose university is not in
-- scope_universities.
-- =============================================================================

-- Create a PUCE-scoped private listing (seller B)
-- Using kind='trade' (not 'sale') — sale requires a non-null price.
-- Using cromo3 to avoid reservation-index conflict with listing1 (cromo2)
-- and to avoid conflicting with the R13-9 package test (which uses cromo1).
RESET role;
DO $$
DECLARE puce_listing uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.listings (id, seller_id, kind, status, cromo_id, is_public, scope_universities)
  VALUES (puce_listing, (SELECT val FROM test_uuids WHERE key='user_b'),
          'trade', 'active',
          (SELECT val FROM test_uuids WHERE key='cromo3'),
          false, ARRAY['PUCE'])
  ON CONFLICT DO NOTHING;
  INSERT INTO test_uuids VALUES ('puce_listing', puce_listing) ON CONFLICT DO NOTHING;
END;
$$;

-- User C (UCE) should NOT see this listing (PUCE-only scope)
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_c'));

SELECT is(
  (SELECT count(*)::int FROM public.listings
   WHERE id = (SELECT val FROM test_uuids WHERE key='puce_listing')),
  0,
  'R13-5: UCE user cannot see PUCE-scoped private listing'
);

SELECT reset_session();

-- User A (EPN with PUCE in scope) can NOT see this either — EPN is not in PUCE-only scope_universities
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT is(
  (SELECT count(*)::int FROM public.listings
   WHERE id = (SELECT val FROM test_uuids WHERE key='puce_listing')),
  0,
  'R13-5: EPN user cannot see listing scoped only to PUCE (EPN not in scope_universities)'
);

SELECT reset_session();

-- User B (PUCE) — their own listing — can always see it
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_b'));

SELECT is(
  (SELECT count(*)::int FROM public.listings
   WHERE id = (SELECT val FROM test_uuids WHERE key='puce_listing')),
  1,
  'R13-5: seller (B) can always see their own listing'
);

SELECT reset_session();

-- =============================================================================
-- R13-6: WHATSAPP REVEAL — only via contact_info / profile_contacts after
--        accepted transaction. Phone now lives in profile_contacts table.
-- =============================================================================

-- Without accepted transaction: user A cannot see user B's profile_contacts
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT is(
  (SELECT count(*)::int FROM public.profile_contacts
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_b')),
  0,
  'R13-6: profile_contacts returns 0 rows for non-counterparty (no accepted tx)'
);

-- contact_info view also returns 0 (inherits profile_contacts RLS)
SELECT is(
  (SELECT count(*)::int FROM public.contact_info
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_b')),
  0,
  'R13-6: contact_info returns 0 rows without accepted transaction'
);

SELECT reset_session();

-- Now simulate an accepted transaction between A and B
RESET role;
DO $$
DECLARE
  tx_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.transactions
    (id, kind, listing_id, initiator_id, owner_id, status, offered_cromo_id)
  VALUES (
    tx_id, 'trade',
    (SELECT val FROM test_uuids WHERE key='listing1'),
    (SELECT val FROM test_uuids WHERE key='user_a'),
    (SELECT val FROM test_uuids WHERE key='user_b'),
    'accepted',
    (SELECT val FROM test_uuids WHERE key='cromo1')
  )
  ON CONFLICT DO NOTHING;
  INSERT INTO test_uuids VALUES ('tx_ab', tx_id) ON CONFLICT DO NOTHING;
END;
$$;

-- Now A should see B's phone via profile_contacts (counterparty SELECT policy)
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT is(
  (SELECT count(*)::int FROM public.profile_contacts
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_b')),
  1,
  'R13-6: profile_contacts returns 1 row after accepted transaction exists'
);

SELECT isnt(
  (SELECT whatsapp_phone FROM public.profile_contacts
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_b')),
  NULL,
  'R13-6: whatsapp_phone is non-null in profile_contacts after accepted tx'
);

-- contact_info view must also return 1 row (plain view, inherits RLS)
SELECT is(
  (SELECT count(*)::int FROM public.contact_info
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_b')),
  1,
  'R13-6: contact_info returns 1 row after accepted transaction exists'
);

SELECT reset_session();

-- Cleanup transaction for later tests
RESET role;
DELETE FROM public.transactions WHERE id = (SELECT val FROM test_uuids WHERE key='tx_ab');

-- =============================================================================
-- R13-7: RESERVATION UNIQUE INDEX — second active listing for same cromo rejected
-- =============================================================================

-- User B already has an active sale listing for cromo2.
-- Try inserting a second active trade listing for same cromo2 — should fail.
RESET role;

SELECT throws_ok(
  $$
  INSERT INTO public.listings (seller_id, kind, status, cromo_id, is_public, scope_universities)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_b'),
    'trade', 'active',
    (SELECT val FROM test_uuids WHERE key='cromo2'),
    true, ARRAY['PUCE']
  )
  $$,
  23505,   -- unique_violation
  NULL,
  'R13-7: reservation unique index rejects second active individual listing for same cromo'
);

-- =============================================================================
-- R13-8: PRICE AND FORMAT CHECK TESTS
-- =============================================================================

-- price = 0 rejected
SELECT throws_ok(
  $$
  INSERT INTO public.listings (seller_id, kind, status, cromo_id, price, is_public, scope_universities)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_a'),
    'sale', 'active',
    (SELECT val FROM test_uuids WHERE key='cromo1'),
    0, true, ARRAY['EPN']
  )
  $$,
  23514,   -- check_violation
  NULL,
  'R13-8: price=0 rejected by CHECK(price > 0)'
);

-- price = -5 rejected
SELECT throws_ok(
  $$
  INSERT INTO public.listings (seller_id, kind, status, cromo_id, price, is_public, scope_universities)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_a'),
    'sale', 'active',
    (SELECT val FROM test_uuids WHERE key='cromo1'),
    -5, true, ARRAY['EPN']
  )
  $$,
  23514,
  NULL,
  'R13-8: price=-5 rejected by CHECK(price > 0)'
);

-- Malformed phone on profile_contacts (not E.164) rejected — no +country code
SELECT throws_ok(
  $$
  INSERT INTO public.profile_contacts (user_id, whatsapp_phone)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_c'),
    '0991234567'
  )
  $$,
  23514,
  NULL,
  'R13-8: malformed E.164 phone (0991234567) rejected by CHECK on profile_contacts'
);

-- Another malformed format — +0 is not valid (must be +[1-9])
SELECT throws_ok(
  $$
  INSERT INTO public.profile_contacts (user_id, whatsapp_phone)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_c'),
    '+0991234567'
  )
  $$,
  23514,
  NULL,
  'R13-8: malformed E.164 phone (+0991234567 starts with +0) rejected on profile_contacts'
);

-- Valid E.164 accepted (no exception) — user C has no profile_contacts row yet
SELECT lives_ok(
  $$
  INSERT INTO public.profile_contacts (user_id, whatsapp_phone)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_c'),
    '+59398765432'
  )
  $$,
  'R13-8: valid E.164 phone (+59398765432) accepted on profile_contacts'
);

-- =============================================================================
-- profile_contacts RLS: owner can SELECT their own row
-- =============================================================================

SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT is(
  (SELECT count(*)::int FROM public.profile_contacts
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_a')),
  1,
  'profile_contacts owner SELECT: user A can see their own row'
);

SELECT reset_session();

-- profile_contacts RLS: non-counterparty cannot see another user's row
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_c'));

SELECT is(
  (SELECT count(*)::int FROM public.profile_contacts
   WHERE user_id = (SELECT val FROM test_uuids WHERE key='user_a')),
  0,
  'profile_contacts non-counterparty: user C cannot see user A phone (no accepted tx)'
);

SELECT reset_session();

-- =============================================================================
-- R13-9: NO DOUBLE-LISTING — cromo in active package cannot be individually listed
-- =============================================================================

-- Create a package listing for User A
RESET role;
DO $$
DECLARE
  pkg_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.listings (id, seller_id, kind, status, cromo_id, is_public, scope_universities)
  VALUES (pkg_id, (SELECT val FROM test_uuids WHERE key='user_a'),
          'package', 'active', NULL, true, ARRAY['EPN','PUCE'])
  ON CONFLICT DO NOTHING;
  INSERT INTO test_uuids VALUES ('pkg_listing', pkg_id) ON CONFLICT DO NOTHING;

  -- Add cromo1 to the package (User A has it as surplus)
  INSERT INTO public.listing_packages (listing_id, cromo_id, quantity)
  VALUES (pkg_id, (SELECT val FROM test_uuids WHERE key='cromo1'), 1)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Now try to individually list cromo1 (which is in the active package above).
-- Migration 0015 adds a BEFORE INSERT trigger on listings that checks if the
-- cromo_id is already in an active package listing (individual→package direction).
-- This should now raise P0001.
SELECT throws_ok(
  $$
  INSERT INTO public.listings (seller_id, kind, status, cromo_id, is_public, scope_universities)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_a'),
    'sale', 'active',
    (SELECT val FROM test_uuids WHERE key='cromo1'),
    true, ARRAY['EPN']
  )
  $$,
  'P0001',  -- raise_exception from guard_no_double_listing_individual trigger (0015)
  NULL,
  'R13-9: individual→package block (0015): cromo in active package cannot be individually listed'
);

-- Test package→individual direction: trying to add to a package a cromo already
-- individually listed should fail.
-- User B's cromo2 already has an active sale listing (listing1 + puce_listing).
-- Try adding it to a new package — should fail with the guard trigger.
RESET role;
DO $$
DECLARE pkg2_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.listings (id, seller_id, kind, status, cromo_id, is_public, scope_universities)
  VALUES (pkg2_id, (SELECT val FROM test_uuids WHERE key='user_b'),
          'package', 'active', NULL, true, ARRAY['PUCE'])
  ON CONFLICT DO NOTHING;
  INSERT INTO test_uuids VALUES ('pkg2_listing', pkg2_id) ON CONFLICT DO NOTHING;
END;
$$;

SELECT throws_ok(
  format($$
  INSERT INTO public.listing_packages (listing_id, cromo_id, quantity)
  VALUES ('%s', '%s', 1)
  $$,
  (SELECT val FROM test_uuids WHERE key='pkg2_listing'),
  (SELECT val FROM test_uuids WHERE key='cromo2')),
  'P0001',  -- raise_exception from guard trigger
  NULL,
  'R13-9: package→individual block: cromo already in active individual listing cannot be added to package'
);

-- =============================================================================
-- R12-2: is_blocked is symmetric
-- =============================================================================

RESET role;

-- Insert block: A blocks B
INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (
    (SELECT val FROM test_uuids WHERE key='user_a'),
    (SELECT val FROM test_uuids WHERE key='user_b')
  )
ON CONFLICT DO NOTHING;

SELECT is(
  private.is_blocked(
    (SELECT val FROM test_uuids WHERE key='user_a'),
    (SELECT val FROM test_uuids WHERE key='user_b')
  ),
  true,
  'R12-2: is_blocked(A,B) = true when A blocks B'
);

SELECT is(
  private.is_blocked(
    (SELECT val FROM test_uuids WHERE key='user_b'),
    (SELECT val FROM test_uuids WHERE key='user_a')
  ),
  true,
  'R12-2: is_blocked(B,A) = true (symmetric — A blocked B)'
);

SELECT is(
  private.is_blocked(
    (SELECT val FROM test_uuids WHERE key='user_a'),
    (SELECT val FROM test_uuids WHERE key='user_c')
  ),
  false,
  'R12-2: is_blocked(A,C) = false (no block between A and C)'
);

-- Remove block again
DELETE FROM public.blocks
  WHERE blocker_id = (SELECT val FROM test_uuids WHERE key='user_a')
    AND blocked_id  = (SELECT val FROM test_uuids WHERE key='user_b');

-- =============================================================================
-- R05-3: Self-block rejected by CHECK constraint
-- =============================================================================

SELECT throws_ok(
  format($$
  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES ('%s', '%s')
  $$,
  (SELECT val FROM test_uuids WHERE key='user_a'),
  (SELECT val FROM test_uuids WHERE key='user_a')),
  23514,  -- check_violation
  NULL,
  'R05-3: self-block (blocker_id = blocked_id) rejected by CHECK constraint'
);

-- =============================================================================
-- R09-3: Client cannot update transaction status
-- =============================================================================

RESET role;
DO $$
DECLARE tx2_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.transactions
    (id, kind, listing_id, initiator_id, owner_id, status)
  VALUES (
    tx2_id, 'trade',
    (SELECT val FROM test_uuids WHERE key='listing1'),
    (SELECT val FROM test_uuids WHERE key='user_a'),
    (SELECT val FROM test_uuids WHERE key='user_b'),
    'pending'
  )
  ON CONFLICT DO NOTHING;
  INSERT INTO test_uuids VALUES ('tx2_id', tx2_id) ON CONFLICT DO NOTHING;
END;
$$;

-- Try to update status as client (authenticated role).
-- Transactions have no UPDATE RLS policy — the UPDATE silently affects 0 rows.
-- R09-3 verifies the client CANNOT change status; mechanism is RLS (no rows matched)
-- rather than the guard trigger (which would fire if RLS allowed the row through).
-- We verify the outcome: status remains 'pending' after the attempted UPDATE.
SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT lives_ok(
  format($$
  UPDATE public.transactions
  SET status = 'accepted'
  WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key='tx2_id')),
  'R09-3: UPDATE attempt runs without exception (RLS blocks via no UPDATE policy)'
);

SELECT reset_session();

-- Verify outcome: status unchanged (RLS prevented the write)
RESET role;
SELECT is(
  (SELECT status FROM public.transactions WHERE id = (SELECT val FROM test_uuids WHERE key='tx2_id')),
  'pending',
  'R09-3: transactions.status is still pending — client UPDATE was silently blocked by RLS'
);

-- =============================================================================
-- R03-2: profiles.university / is_anonymous / auction_blocked_until are
--        not client-writable
-- =============================================================================

SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT throws_ok(
  format($$
  UPDATE public.profiles
  SET university = 'PUCE'
  WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key='user_a')),
  'P0001',
  NULL,
  'R03-2: profiles.university is not client-writable (guard trigger)'
);

SELECT throws_ok(
  format($$
  UPDATE public.profiles
  SET is_anonymous = true
  WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key='user_a')),
  'P0001',
  NULL,
  'R03-2: profiles.is_anonymous is not client-writable (guard trigger)'
);

SELECT throws_ok(
  format($$
  UPDATE public.profiles
  SET auction_blocked_until = now() + interval '14 days'
  WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key='user_a')),
  'P0001',
  NULL,
  'R03-2: profiles.auction_blocked_until is not client-writable (guard trigger)'
);

SELECT reset_session();

-- =============================================================================
-- R04-1: Inventory quantity -1 rejected
-- =============================================================================

RESET role;

SELECT throws_ok(
  format($$
  INSERT INTO public.inventory_items (user_id, cromo_id, quantity)
  VALUES ('%s', '%s', -1)
  $$,
  (SELECT val FROM test_uuids WHERE key='user_a'),
  gen_random_uuid()::text),
  23514,  -- check_violation
  NULL,
  'R04-1: quantity=-1 rejected by CHECK(quantity >= 0)'
);

-- =============================================================================
-- R02-3: Catalog seed: 240 rows, UNIQUE(number, catalog_version) constraint
-- =============================================================================

RESET role;

SELECT is(
  (SELECT count(*)::int FROM public.catalog_cromos WHERE catalog_version = 1),
  240,
  'R02-3: exactly 240 catalog_cromos for catalog_version=1'
);

-- Try duplicate number+version
SELECT throws_ok(
  $$
  INSERT INTO public.catalog_cromos (number, catalog_version, country, rarity, player_name)
  VALUES (1, 1, 'ECU', 'comun', 'Test Player')
  $$,
  23505,  -- unique_violation
  NULL,
  'R02-3: UNIQUE(number, catalog_version) rejects duplicate'
);

-- =============================================================================
-- R10-3: Notifications — client can only change `read`
-- =============================================================================

RESET role;
DO $$
DECLARE notif_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.notifications (id, user_id, kind, payload, read)
  VALUES (notif_id, (SELECT val FROM test_uuids WHERE key='user_a'),
          'trade_request', '{"listing_id":"test"}', false)
  ON CONFLICT DO NOTHING;
  INSERT INTO test_uuids VALUES ('notif1', notif_id) ON CONFLICT DO NOTHING;
END;
$$;

SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

-- Mark as read (allowed)
SELECT lives_ok(
  format($$
  UPDATE public.notifications SET read = true WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key='notif1')),
  'R10-3: client CAN mark notification as read'
);

-- Try changing kind (not allowed)
SELECT throws_ok(
  format($$
  UPDATE public.notifications SET kind = 'other' WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key='notif1')),
  'P0001',
  NULL,
  'R10-3: client cannot change notification.kind (guard trigger)'
);

SELECT reset_session();

-- =============================================================================
-- R01-2: Client cannot INSERT reference data (universities/countries/rarities)
-- =============================================================================

SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT throws_ok(
  $$
  INSERT INTO public.universities (id, name, short, color)
  VALUES ('TEST', 'Test Uni', 'TEST', '#000000')
  $$,
  42501,   -- insufficient_privilege
  NULL,
  'R01-2: authenticated client cannot INSERT into universities'
);

SELECT throws_ok(
  $$
  INSERT INTO public.countries (code, name, flag_emoji, stripe, stripe2, accent)
  VALUES ('TST', 'Testland', '🏳', '#000', '#fff', '#f00')
  $$,
  42501,
  NULL,
  'R01-2: authenticated client cannot INSERT into countries'
);

SELECT throws_ok(
  $$
  INSERT INTO public.rarities (id, label, sort_order, chip_color, text_color, dot_color)
  VALUES ('test', 'Test', 7, '#000', '#fff', '#f00')
  $$,
  42501,
  NULL,
  'R01-2: authenticated client cannot INSERT into rarities'
);

SELECT reset_session();

-- =============================================================================
-- R08-3: Direct INSERT into auction_bids denied
-- =============================================================================

SELECT set_session_as((SELECT val FROM test_uuids WHERE key='user_a'));

SELECT throws_ok(
  format($$
  INSERT INTO public.auction_bids (listing_id, bidder_id, amount)
  VALUES ('%s', '%s', 10.00)
  $$,
  (SELECT val FROM test_uuids WHERE key='listing1'),
  (SELECT val FROM test_uuids WHERE key='user_a')),
  42501,  -- insufficient_privilege (no INSERT policy)
  NULL,
  'R08-3: direct INSERT into auction_bids denied for authenticated client'
);

SELECT reset_session();

-- =============================================================================
-- PHASE 3: Auth & Onboarding — hook, triggers, is_confirmed
-- =============================================================================
-- These tests verify:
--   A1-A4 from the task list:
--   1. before_user_created_hook: bad domain → error key; good domain → no error
--   2. before_user_created_hook: anonymous payload → no error
--   3. private.handle_email_confirmed: simulated INSERT/UPDATE as postgres
--      → profiles.university derived; re-derived on email change
--   4. private.handle_new_anonymous_user: anon INSERT → guest profiles row
--   5. private.is_confirmed: no claim → false
--   6. Guard regression: client UPDATE profiles SET university=... still throws
--   7. Empty scope: registered user with scope='{}' → in_scope false, zero other profiles
-- =============================================================================

RESET role;

-- ---------------------------------------------------------------------------
-- P3-1: before_user_created_hook — bad domain (@gmail.com) → error key
-- ---------------------------------------------------------------------------
SELECT is(
  (public.before_user_created_hook(
    '{"metadata":{"uuid":"00000000-0000-0000-0000-000000000001","time":"2026-01-01T00:00:00Z","name":"before-user-created","ip_address":"127.0.0.1"},"user":{"id":"00000000-0000-0000-0000-000000000002","aud":"authenticated","role":"","email":"student@gmail.com","phone":"","app_metadata":{"provider":"email","providers":["email"]},"user_metadata":{},"identities":[],"created_at":"0001-01-01T00:00:00Z","updated_at":"0001-01-01T00:00:00Z","is_anonymous":false}}'::jsonb
  )) ? 'error',
  true,
  'P3-1: before_user_created_hook returns error key for @gmail.com (bad domain)'
);

-- ---------------------------------------------------------------------------
-- P3-2: before_user_created_hook — good institutional domain (@epn.edu.ec) → no error key
-- ---------------------------------------------------------------------------
SELECT is(
  (public.before_user_created_hook(
    '{"metadata":{"uuid":"00000000-0000-0000-0000-000000000003","time":"2026-01-01T00:00:00Z","name":"before-user-created","ip_address":"127.0.0.1"},"user":{"id":"00000000-0000-0000-0000-000000000004","aud":"authenticated","role":"","email":"student@epn.edu.ec","phone":"","app_metadata":{"provider":"email","providers":["email"]},"user_metadata":{},"identities":[],"created_at":"0001-01-01T00:00:00Z","updated_at":"0001-01-01T00:00:00Z","is_anonymous":false}}'::jsonb
  )) ? 'error',
  false,
  'P3-2: before_user_created_hook returns no error key for @epn.edu.ec (institutional domain)'
);

-- ---------------------------------------------------------------------------
-- P3-3: before_user_created_hook — uppercase domain (@EPN.EDU.EC) → citext, no error
-- ---------------------------------------------------------------------------
SELECT is(
  (public.before_user_created_hook(
    '{"metadata":{"uuid":"00000000-0000-0000-0000-000000000005","time":"2026-01-01T00:00:00Z","name":"before-user-created","ip_address":"127.0.0.1"},"user":{"id":"00000000-0000-0000-0000-000000000006","aud":"authenticated","role":"","email":"student@EPN.EDU.EC","phone":"","app_metadata":{"provider":"email","providers":["email"]},"user_metadata":{},"identities":[],"created_at":"0001-01-01T00:00:00Z","updated_at":"0001-01-01T00:00:00Z","is_anonymous":false}}'::jsonb
  )) ? 'error',
  false,
  'P3-3: before_user_created_hook is case-insensitive (citext) — @EPN.EDU.EC allowed'
);

-- ---------------------------------------------------------------------------
-- P3-4: before_user_created_hook — anonymous payload (is_anonymous=true) → no error
-- ---------------------------------------------------------------------------
SELECT is(
  (public.before_user_created_hook(
    '{"metadata":{"uuid":"00000000-0000-0000-0000-000000000007","time":"2026-01-01T00:00:00Z","name":"before-user-created","ip_address":"127.0.0.1"},"user":{"id":"00000000-0000-0000-0000-000000000008","aud":"authenticated","role":"","email":"","phone":"","app_metadata":{"provider":"anonymous","providers":["anonymous"]},"user_metadata":{},"identities":[],"created_at":"0001-01-01T00:00:00Z","updated_at":"0001-01-01T00:00:00Z","is_anonymous":true}}'::jsonb
  )) ? 'error',
  false,
  'P3-4: before_user_created_hook allows anonymous signups unconditionally'
);

-- ---------------------------------------------------------------------------
-- P3-5: handle_email_confirmed trigger — INSERT with confirmed institutional email
--        → profiles row created with derived university, is_anonymous=false
-- (We insert directly into auth.users as postgres to simulate the trigger.)
-- We use UUIDs in a reserved test range distinct from the Phase 2 setup users.
-- ---------------------------------------------------------------------------
RESET role;

DO $$
DECLARE
  v_uid uuid := '00000000-3001-0000-0000-000000000000';
BEGIN
  -- Insert auth.users row with email_confirmed_at set (trigger fires on INSERT)
  INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data, is_anonymous)
  VALUES (v_uid, 'p3test@epn.edu.ec', now(), now(), now(), '{}', false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO test_uuids (key, val) VALUES ('p3_epn_user', v_uid)
  ON CONFLICT DO NOTHING;
END;
$$;

SELECT is(
  (SELECT university FROM public.profiles WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_epn_user')),
  'EPN',
  'P3-5: handle_email_confirmed derives university=EPN from @epn.edu.ec on INSERT'
);

SELECT is(
  (SELECT is_anonymous FROM public.profiles WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_epn_user')),
  false,
  'P3-5: handle_email_confirmed sets is_anonymous=false on profiles upsert'
);

-- ---------------------------------------------------------------------------
-- P3-6: handle_email_confirmed trigger — UPDATE email to another institutional domain
--        → profiles.university re-derived to new university
-- ---------------------------------------------------------------------------
RESET role;

UPDATE auth.users
SET email = 'p3test@uce.edu.ec', email_confirmed_at = now()
WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_epn_user');

SELECT is(
  (SELECT university FROM public.profiles WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_epn_user')),
  'UCE',
  'P3-6: handle_email_confirmed re-derives university=UCE after email change to @uce.edu.ec'
);

-- ---------------------------------------------------------------------------
-- P3-7: handle_email_confirmed trigger — UPDATE email to unrecognized domain
--        → profiles.university UNCHANGED (left as UCE from P3-6), no exception
-- ---------------------------------------------------------------------------
RESET role;

UPDATE auth.users
SET email = 'p3test@gmail.com', email_confirmed_at = now()
WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_epn_user');

SELECT is(
  (SELECT university FROM public.profiles WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_epn_user')),
  'UCE',
  'P3-7: handle_email_confirmed leaves university unchanged for unrecognized domain (defensive, no exception)'
);

-- ---------------------------------------------------------------------------
-- P3-8: handle_new_anonymous_user trigger — anonymous INSERT → guest profiles row
-- ---------------------------------------------------------------------------
RESET role;

DO $$
DECLARE
  v_uid uuid := '00000000-3002-0000-0000-000000000000';
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data, is_anonymous)
  VALUES (v_uid, NULL, now(), now(), '{}', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO test_uuids (key, val) VALUES ('p3_anon_user', v_uid)
  ON CONFLICT DO NOTHING;
END;
$$;

SELECT is(
  (SELECT is_anonymous FROM public.profiles WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_anon_user')),
  true,
  'P3-8: handle_new_anonymous_user creates profiles row with is_anonymous=true on anon INSERT'
);

SELECT is(
  (SELECT university FROM public.profiles WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_anon_user')),
  NULL,
  'P3-8: anon user profiles row has university=NULL (no scope)'
);

-- ---------------------------------------------------------------------------
-- P3-9: private.is_confirmed() — no JWT claim → false
-- Called as postgres (matching the pattern private.is_blocked uses in this suite).
-- is_confirmed() reads auth.jwt(); in the test context, jwt() returns an empty
-- or minimal object, so email_confirmed_at is absent → should return false.
-- ---------------------------------------------------------------------------
RESET role;

SELECT is(
  private.is_confirmed(),
  false,
  'P3-9: is_confirmed() returns false when JWT has no email_confirmed_at claim'
);

-- ---------------------------------------------------------------------------
-- P3-10: Guard regression — client UPDATE profiles SET university=... still throws
--         (the 0019 guard trigger must still block clients even after 0020)
-- ---------------------------------------------------------------------------
SELECT set_session_as((SELECT val FROM test_uuids WHERE key = 'user_a'));

SELECT throws_ok(
  format($$
  UPDATE public.profiles
  SET university = 'USFQ'
  WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key = 'user_a')),
  'P0001',
  NULL,
  'P3-10: profiles.university is still not client-writable after 0020 (guard trigger regression)'
);

SELECT reset_session();

-- ---------------------------------------------------------------------------
-- P3-11: Derivation path as postgres — profiles.university CAN be set by
--         postgres role (simulates what handle_email_confirmed does)
-- ---------------------------------------------------------------------------
RESET role;

SELECT lives_ok(
  format($$
  UPDATE public.profiles
  SET university = 'PUCE'
  WHERE id = '%s'
  $$, (SELECT val FROM test_uuids WHERE key = 'p3_epn_user')),
  'P3-11: postgres role CAN update profiles.university (derivation path bypass)'
);

-- Restore to clean state (EPN for consistency)
UPDATE public.profiles SET university = 'EPN' WHERE id = (SELECT val FROM test_uuids WHERE key = 'p3_epn_user');

-- ---------------------------------------------------------------------------
-- P3-12: Empty scope → in_scope returns false; zero other-profiles rows visible
-- Insert a user with scope='{}' and verify they see no other profiles
-- ---------------------------------------------------------------------------
RESET role;

DO $$
DECLARE
  v_uid uuid := '00000000-3003-0000-0000-000000000000';
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_user_meta_data)
  VALUES (v_uid, 'noscope@puce.edu.ec', now(), now(), '{}')
  ON CONFLICT (id) DO NOTHING;

  -- Profile with scope='{}' (no universities selected)
  INSERT INTO public.profiles (id, display_name, university, scope, is_anonymous)
  VALUES (v_uid, 'NoScope User', 'PUCE', ARRAY[]::text[], false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO test_uuids (key, val) VALUES ('p3_noscope_user', v_uid)
  ON CONFLICT DO NOTHING;
END;
$$;

SELECT is(
  private.in_scope(
    (SELECT val FROM test_uuids WHERE key = 'p3_noscope_user'),
    'EPN'
  ),
  false,
  'P3-12: in_scope returns false for user with scope={}'
);

-- Empty-scope user sees zero other-user profiles (scope filtering)
SELECT set_session_as((SELECT val FROM test_uuids WHERE key = 'p3_noscope_user'));

SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id <> (SELECT val FROM test_uuids WHERE key = 'p3_noscope_user')),
  0,
  'P3-12: registered user with scope={} sees zero other profiles (no matching scope)'
);

SELECT reset_session();

-- =============================================================================
-- Cleanup test data (leave no trace in the DB after tests)
-- (In pgTAP test-db runs, the entire transaction is rolled back anyway)
-- =============================================================================

RESET role;
-- All cleanup is handled by ROLLBACK at the end of this test transaction.

SELECT * FROM finish();

ROLLBACK;
