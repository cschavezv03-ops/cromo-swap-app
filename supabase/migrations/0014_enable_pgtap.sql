-- =============================================================================
-- Migration: 0014_enable_pgtap.sql
-- Purpose:   Enable the pgtap extension so the test suite in
--            supabase/tests/rls_test.sql can run via `supabase test db`.
-- Deps:      0001 (extensions schema)
-- Phase:     2 – Data Model & Security Core
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  TEST ONLY — DO NOT RUN IN THE NORMAL PRODUCTION MIGRATE PATH           ║
-- ║  This migration only enables the pgtap extension. The actual test suite  ║
-- ║  lives in supabase/tests/rls_test.sql.                                   ║
-- ║  Run tests via: supabase test db                                          ║
-- ║  Apply only to development / staging environments.                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Rollback (-- down):
--   DROP EXTENSION IF EXISTS pgtap;
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
