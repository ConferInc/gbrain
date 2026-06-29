// Migration v111 (content_chunks_embedding_code) + write-path contract for
// code-path embedding isolation. Mirrors test/migrations-v0_27_1.test.ts
// (the embedding_image dual-column precedent this feature is modeled on).
//
// Verifies:
// - v111 is in MIGRATIONS with the embedding_code column + partial HNSW index.
// - Fresh PGLite has the column + partial HNSW index (schema parity).
// - upsertChunks persists embedding_code, and the COALESCE-on-conflict preserves
//   it when a later upsert of the same chunk omits embedding_code.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { MIGRATIONS } from '../src/core/migrate.ts';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';
import type { ChunkInput } from '../src/core/types.ts';

let engine: PGLiteEngine;

beforeAll(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
});

afterAll(async () => {
  await engine.disconnect();
});

describe('migration v111 (code-path embedding isolation)', () => {
  test('present as version 111 with embedding_code column + partial index', () => {
    const m = MIGRATIONS.find((x) => x.version === 111);
    expect(m).toBeDefined();
    expect(m!.name).toBe('content_chunks_embedding_code');
    expect(m!.idempotent).toBe(true);
    expect(m!.sql).toContain('embedding_code vector(1024)');
    expect(m!.sql.toLowerCase()).toContain('idx_chunks_embedding_code');
    // PGLite gets the column + index too (pgvector ships in its WASM bundle).
    expect(m!.sqlFor?.pglite ?? '').toContain('embedding_code');
    expect((m!.sqlFor?.pglite ?? '').toLowerCase()).toContain('idx_chunks_embedding_code');
  });

  test('content_chunks has the embedding_code column post-schema', async () => {
    const rows = await engine.executeRaw<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'content_chunks'
         AND column_name = 'embedding_code'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].data_type).toBe('USER-DEFINED'); // pgvector type
  });

  test('partial HNSW index idx_chunks_embedding_code exists', async () => {
    const rows = await engine.executeRaw<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'content_chunks'
         AND indexname = 'idx_chunks_embedding_code'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].indexdef.toLowerCase()).toContain('hnsw');
    expect(rows[0].indexdef.toLowerCase()).toContain('embedding_code is not null');
  });

  test('upsertChunks persists embedding_code; COALESCE preserves it on re-upsert', async () => {
    const slug = 'code/probe-ts';
    await engine.putPage(slug, { type: 'code' as never, title: 'probe', compiled_truth: 'fn x(){}' });

    const vec = new Float32Array(Array.from({ length: 1024 }, () => 0.5));
    const base: ChunkInput = {
      chunk_index: 0,
      chunk_text: 'fn x(){}',
      chunk_source: 'compiled_truth',
      language: 'typescript',
    };

    await engine.upsertChunks(slug, [{ ...base, embedding_code: vec }]);
    const countQ =
      `SELECT count(*)::int AS n FROM content_chunks cc
       JOIN pages p ON p.id = cc.page_id
       WHERE p.slug = $1 AND cc.embedding_code IS NOT NULL`;
    const first = await engine.executeRaw<{ n: number }>(countQ, [slug]);
    expect(first[0].n).toBe(1);

    // Re-upsert the SAME chunk WITHOUT embedding_code — COALESCE must keep it.
    await engine.upsertChunks(slug, [base]);
    const second = await engine.executeRaw<{ n: number }>(countQ, [slug]);
    expect(second[0].n).toBe(1);

    // Cosine query over the partial index returns the seeded row.
    const vecStr = '[' + Array.from(vec).join(',') + ']';
    const hits = await engine.executeRaw<{ chunk_index: number }>(
      `SELECT chunk_index FROM content_chunks
       WHERE embedding_code IS NOT NULL
       ORDER BY embedding_code <=> $1::vector LIMIT 1`,
      [vecStr],
    );
    expect(hits.length).toBe(1);
  });
});
