-- gbrain-upgrade-0.42.67 — ROLLBACK ONLY. Run AFTER the old image is healthy, BEFORE
-- re-opening traffic. Idempotent; safe to run twice. See P1 §4.1b, P3 §9e-2b.
-- Undoes the observable effects of upstream v118 (replayed by our v126) for old code that
-- reads page_generation_clock.value instead of page_generation_clock_seq.last_value.
BEGIN;

-- 1. Catch the legacy table-clock up to the sequence, so Layer 1 stops reporting "fresh"
--    for every cache row stamped during the new-code window.
UPDATE page_generation_clock
   SET value = GREATEST(value, COALESCE((SELECT last_value FROM page_generation_clock_seq), 0))
 WHERE id = 1;

-- 2. Re-assert the legacy trigger body. The old image's own initSchema replay also does this,
--    so this is belt-and-braces against ordering (script run before the old image boots).
--    SET search_path is required here: v126 (src/core/migrate.ts) explicitly re-hardens this
--    function with an ALTER FUNCTION ... SET search_path = pg_catalog, public after its own
--    verbatim replay of upstream v118's body (which lacked it). A plain CREATE OR REPLACE
--    FUNCTION with no search_path clause resets proconfig to unset, silently undoing that
--    hardening the moment this rollback script runs (Codex gate 6, P1 Step 11 whole-phase).
CREATE OR REPLACE FUNCTION bump_page_generation_clock_fn() RETURNS trigger SET search_path = pg_catalog, public AS $func$
BEGIN
  UPDATE page_generation_clock SET value = value + 1 WHERE id = 1;
  RETURN NULL;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bump_page_generation_clock_trg ON pages;
CREATE TRIGGER bump_page_generation_clock_trg
  AFTER INSERT OR UPDATE OR DELETE ON pages
  FOR EACH STATEMENT
  EXECUTE FUNCTION bump_page_generation_clock_fn();

-- 3. Purge cache rows stamped under sequence semantics. They repopulate on demand.
DELETE FROM query_cache;

COMMIT;
