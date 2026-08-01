# Upstream Pinning Policy — confer/gbrain

**Upstream:** https://github.com/garrytan/gbrain
**Pinned SHA:** f84bfb57f2ab9294ea9c4bb33e40dec75dab41bf (v0.42.68.1)
**Pinned at:** 2026-07-31/08-01 (branch `confer/rebase-0.42.67`)
**Previous pin:** 03ffc6ebdbc7dd8b29e5bfd0c3a9a6c983b54f01 (2026-06-10, v0.42.38.0)

> 2026-07-31/08-01 rebase notes (gbrain-upgrade-0.42.67, P1): re-pinned from the
> originally-planned `c6dc0adf`/v0.42.67.0 to `f84bfb57`/v0.42.68.1 per a fresh delta report
> (`evidence/upstream-repin-f84bfb57.md`), then FROZEN to an immutable local tag
> (`gbrain-upgrade-pin-0.42.68.1`) so ordinary `upstream/master` forward drift during a
> multi-hour phase can't reopen the pin question — see P1-rebase.md's `[RT5-FREEZE]` policy.
> Upstream independently claimed migration versions 116-119 for its own real migrations
> (code_edges backfill, context_volunteer_events, page_generation_clock sequence swap,
> op_checkpoints array check) — the same class of collision the prior rebase's v116 heal
> fixed, recurring one rebase later. New migration v126 (`confer_collision_heal_upstream_116_119`)
> heals it idempotently; Confer's own migrations renumbered 116-119 → 127-130. Upstream also
> independently fixed the same `resolve_slugs` unscoped-read vulnerability Confer's overlay
> targeted (`#3242`, `federatedSearchScope`) — upstream's fix is strictly more complete and
> was adopted verbatim, Confer's own version deleted. `src/migrations/*.sql` (dead code, no
> runtime reader) deleted; DDL now lives entirely inline in `migrate.ts`. VERSION on this
> branch follows upstream (0.42.68.1).
>
> 2026-06-10 rebase notes (prior pin, kept for history): upstream v0.42.37.0 (#1999) landed
> `resolveRequestedScope` — the canonical source-isolation read-scope resolver.
> Confer's earlier `resolveReadScope`/`crossSourceScope` security patches are
> superseded by it; the overlay keeps only a scalar-bound hardening branch plus
> compat shims. Confer runner-migrations renumbered 108-110 → 117-119 (upstream
> claimed 108-115); migration 116 heals the version-counter collision on prod
> brains.

## Rebase cadence

Quarterly. Aether (fork maintainer) runs:

```bash
git fetch upstream
git rebase upstream/master  # NOT upstream/main — gbrain default is master
# resolve any conflicts with Confer's inline migrations in src/core/migrate.ts
bun test  # must pass before push
git push --force-with-lease origin confer/main
```

## Maintainer chain

Per Confer-OS spec §5 row 4:
1. **Aether** (S7) — operational maintainer; reviews PRs, runs quarterly rebase
2. **Vulcan** (MacStudio) — ultimate authority on fork policy; override on Aether decisions
3. **Yatin** — escalation for policy / scope changes

## Confer-local additions (DO NOT remove on rebase)

Confer schema DDL lives inline in `src/core/migrate.ts` (entries v126-v130). There is no
`src/migrations/` directory as of the 0.42.67 rebase — see gbrain-upgrade-0.42.67 P1 §1c.
(The `tests/migrations/*.test.ts` and `tests/load/*` paths formerly listed here were confirmed
by P0 §4.5 not to exist in this repo at all — removed as phantom entries, not relocated.)

All other files track upstream exactly.

## Linking to the spec

Authoritative spec: `~/Workspace/temporary/docs/superpowers/specs/2026-05-27-confer-gbrain-gstack-os-design.md` (committed in the principal's workspace; canonical mirror lands in `ConferInc/agent-ops/specs/` post-SP-0).
