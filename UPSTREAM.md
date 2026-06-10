# Upstream Pinning Policy — confer/gbrain

**Upstream:** https://github.com/garrytan/gbrain
**Pinned SHA:** 03ffc6ebdbc7dd8b29e5bfd0c3a9a6c983b54f01 (v0.42.38.0)
**Pinned at:** 2026-06-10 (branch `confer/rebase-0.42.38`)
**Previous pin:** 42d99b6fca3b5270f664dd61b8b1e3091e493760 (2026-05-27)

> 2026-06-10 rebase notes: upstream v0.42.37.0 (#1999) landed
> `resolveRequestedScope` — the canonical source-isolation read-scope resolver.
> Confer's earlier `resolveReadScope`/`crossSourceScope` security patches are
> superseded by it; the overlay keeps only a scalar-bound hardening branch plus
> compat shims. Confer runner-migrations renumbered 108-110 → 117-119 (upstream
> claimed 108-115); migration 116 heals the version-counter collision on prod
> brains. VERSION on this branch follows upstream (0.42.38.0); the fork no
> longer carries its own 0.42.0.0 number.

## Rebase cadence

Quarterly. Aether (fork maintainer) runs:

```bash
git fetch upstream
git rebase upstream/master  # NOT upstream/main — gbrain default is master
# resolve any conflicts with Confer migrations under src/migrations/
bun test  # must pass before push
git push --force-with-lease origin confer/main
```

## Maintainer chain

Per Confer-OS spec §5 row 4:
1. **Aether** (S7) — operational maintainer; reviews PRs, runs quarterly rebase
2. **Vulcan** (MacStudio) — ultimate authority on fork policy; override on Aether decisions
3. **Yatin** — escalation for policy / scope changes

## Confer-local additions (DO NOT remove on rebase)

- `src/migrations/0001_confer_rls.sql` through `0004_confer_source_config_keys.sql`
- `src/migrations/down/0001_*.down.sql` through `0004_*.down.sql`
- `tests/migrations/*.test.ts`
- `tests/load/*`

All other files track upstream exactly.

## Linking to the spec

Authoritative spec: `~/Workspace/temporary/docs/superpowers/specs/2026-05-27-confer-gbrain-gstack-os-design.md` (committed in the principal's workspace; canonical mirror lands in `ConferInc/agent-ops/specs/` post-SP-0).
