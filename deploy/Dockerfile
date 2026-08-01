# confer-gbrain production image — reconstructed 2026-05-29 from the docker
# history of ghcr.io/conferinc/gbrain:sp1a-v10 (the recipe had never been saved
# to the repo — a reproducibility gap). This file makes the prod build
# reviewable + reproducible.
#
# Model: install UPSTREAM gbrain, then overlay Confer's patched source files on
# top. gbrain runs from TS source via Bun at runtime (the `gbrain` bin is a
# symlink to src/cli.ts), so overlaying .ts files is sufficient — no compile step.
#
# ─── IMPORTANT: pin the upstream ref ───────────────────────────────────────
# The original image did `bun install -g github:garrytan/gbrain` (unpinned HEAD —
# non-reproducible: two builds days apart get different upstream code). Pin to a
# specific upstream commit/tag for reproducibility. Bump UPSTREAM_REF
# deliberately and keep it in sync with UPSTREAM.md.
#
# 2026-06-10 rebase (confer/rebase-0.42.38): pinned to upstream v0.42.38.0
# (03ffc6eb). This picks up the v0.42.37.0 source-isolation security fix
# (#1999, resolveRequestedScope) — the overlay operations.ts on this branch is
# REBUILT on top of that fix, it does not clobber it. The previous pin was
# 42d99b6f (v0.41.26.0-era master, 2026-05-27).
#
# ─── Build (run on a linux/amd64 host, e.g. S1, or buildx) ──────────────────
#   cd confer-gbrain
#   docker build -f deploy/Dockerfile -t ghcr.io/conferinc/gbrain:sp1a-v11 \
#     --build-arg UPSTREAM_REF=<commit-sha-or-tag> .
#   docker push ghcr.io/conferinc/gbrain:sp1a-v11
# Then point Coolify app 108 at :sp1a-v11 and redeploy (see deploy/DEPLOY.md).

ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}

ENV BUN_INSTALL_BIN=/usr/local/bin
ENV GBRAIN_HOME=/data/.gbrain

# ─── curl: required by the Coolify-generated healthcheck ────────────────────
# Coolify's app-level health check (health_check_enabled) auto-generates a
# `curl -f <path> || wget -O- <path> || exit 1` probe. The base oven/bun image
# (debian-slim) ships NEITHER curl nor wget, so the generated probe fails every
# tick and the container is marked `unhealthy`. It does NOT crash-loop today
# (Docker never restarts on unhealthy, and Coolify has no restart-unhealthy
# scheduler), but a false `unhealthy` is a landmine for deploy health-gates and
# any future auto-restart policy. Installing curl makes the generated probe work.
# Discovered 2026-05-29 when a clean force-redeploy first materialized Coolify's
# healthcheck against an image lacking curl. (Was previously NONE on the running
# container, so the gap was invisible.)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Pin upstream for reproducible builds. Override with --build-arg UPSTREAM_REF=<sha>.
# Default = the audited pin for this branch (upstream v0.42.68.1; see UPSTREAM.md).
ARG UPSTREAM_REF=f84bfb57f2ab9294ea9c4bb33e40dec75dab41bf
RUN bun install -g "github:garrytan/gbrain#${UPSTREAM_REF}"

# Confer schema pack (consumed by the CMD's `gbrain schema use confer-everything-v1`).
# pack.yaml is NOT in this repo — it lives in confer-gstack at
# confer-packs/confer-everything-v1/pack.yaml. Stage it into the build-context
# root before building (see deploy/DEPLOY.md):
#   cp ../confer-gstack/confer-packs/confer-everything-v1/pack.yaml ./pack.yaml
COPY pack.yaml /opt/confer/pack.yaml

# ─── Confer overlay: patched source over the upstream install ───────────────
# Every COPY below was re-audited on the 0.42.38 rebase (2026-06-10). All
# non-overlay Confer patches from the previous pin (lock-renewal, withRetry+
# reconnect, doctor sync-staleness, conversation-parser builtins, find_orphans
# scoping, engine resolveSlugs scoping, facts-queue drain) were verified merged
# upstream and are NO LONGER overlaid — upstream's versions are newer. The COPY
# list is unchanged (same 10 files); their contents are rebased:
#   operations.ts     — REBUILT on upstream v0.42.37 resolveRequestedScope
#                       (#1999). Keeps: put_page `source` selector, resolve_slugs
#                       tenant scoping, scalar-bound explicit-source hardening,
#                       resolveReadScope/crossSourceScope compat shims.
#   oauth-provider.ts — DCR scope clamp/seal + truthful registration response +
#                       federated-union of public sources (unchanged upstream
#                       since the old pin; carried verbatim).
#   migrate.ts        — [gbrain-upgrade-0.42.67] Confer migrations RENUMBERED again:
#                       former Confer v117-119 -> v128-130; v126 is the new
#                       confer_collision_heal_upstream_116_119 heal migration
#                       (re-applies upstream's real v116-119 DDL verbatim, incl.
#                       the search_path hardening ALTER FUNCTION, on brains that
#                       already ran the OLD Confer numbering for that range);
#                       v127 is confer_collision_heal_upstream_108_110 (carried
#                       from the prior rebase, unchanged). Max version 130. See
#                       P1 Step 4.1/4.1a/4.1b and evidence/p1/migration-renumber-verified.txt.
COPY src/core/operations.ts     /root/.bun/install/global/node_modules/gbrain/src/core/operations.ts
COPY src/core/oauth-provider.ts /root/.bun/install/global/node_modules/gbrain/src/core/oauth-provider.ts
COPY src/core/migrate.ts        /root/.bun/install/global/node_modules/gbrain/src/core/migrate.ts
# confer_rls_family_collision doctor check (0.42.67 rebase, P1 §1d/D4b) — standing tripwire
# for the "never both RLS families" invariant. Added 2026-07-31/08-01.
COPY src/commands/doctor.ts     /root/.bun/install/global/node_modules/gbrain/src/commands/doctor.ts
# world_knowledge feature (0.42) — these were MISSING from the overlay, so a
# build without them shipped a brain with the world_knowledge CODE absent.
# Added 2026-05-29 (sp1a-v13). The src/migrations/*.sql files are intentionally
# NOT copied — Confer migrations are defined inline in migrate.ts.
COPY src/core/schema-pack/manifest-v1.ts /root/.bun/install/global/node_modules/gbrain/src/core/schema-pack/manifest-v1.ts
COPY src/core/takes-fence.ts             /root/.bun/install/global/node_modules/gbrain/src/core/takes-fence.ts
COPY src/core/facts/world-knowledge.ts   /root/.bun/install/global/node_modules/gbrain/src/core/facts/world-knowledge.ts
COPY src/core/facts/consensus-refresh.ts /root/.bun/install/global/node_modules/gbrain/src/core/facts/consensus-refresh.ts
COPY src/core/cycle/propose-takes.ts     /root/.bun/install/global/node_modules/gbrain/src/core/cycle/propose-takes.ts
COPY src/commands/takes.ts               /root/.bun/install/global/node_modules/gbrain/src/commands/takes.ts
# gpt-5.5 thinking (sp1a-v17) — upstream's native openai recipe allow-lists only
# gpt-5.2/gpt-4o-mini, so resolveRecipe('openai:gpt-5.5') threw and think/dream/
# subagent fell back to "no LLM available". Overlay the patched recipe so gpt-5.5
# is allow-listed for chat + expansion. Reasoning then runs on openai:gpt-5.5.
COPY src/core/ai/recipes/openai.ts       /root/.bun/install/global/node_modules/gbrain/src/core/ai/recipes/openai.ts

EXPOSE 3000

# Init schema + serve. Joined with && (not ;) so serve does not start against a
# half-initialized DB, and `exec` so SIGTERM reaches bun for graceful shutdown on
# Coolify redeploy (the original used `;` + no exec — GB-PROD-5/8). DATABASE_URL
# is injected by Coolify. Note: --enable-dcr is intentionally OMITTED (DCR is a
# self-registration surface; the DCR scope-clamp seal in oauth-provider.ts is
# defense-in-depth, but not enabling DCR at all is the primary control).
CMD ["sh","-c","set -eo pipefail; mkdir -p /data/.gbrain/.gbrain/schema-packs/confer-everything-v1 && cp /opt/confer/pack.yaml /data/.gbrain/.gbrain/schema-packs/confer-everything-v1/pack.yaml && gbrain init --url \"$DATABASE_URL\" --embedding-model openai:text-embedding-3-small --embedding-dimensions 1536 2>&1 && gbrain schema reload >/dev/null 2>&1 && gbrain schema use confer-everything-v1 2>&1 && exec gbrain serve --http --port 3000 --bind 0.0.0.0 --token-ttl 86400 --public-url https://brain-api.confersolutions.ai"]
