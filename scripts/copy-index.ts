// `pnpm db:copy:index [--dry-run]`: publish staging's commander index build to production (plan
// `2026-09-28-card-data-replicate.md`, §3b). Reads CATALOG_COPY_SOURCE_URL, CATALOG_COPY_TARGET_URL
// and CATALOG_COPY_TARGET_BRANCH; every check it makes is `scripts/lib/catalog-copy.ts`'s.
//
// Replaces six tables EXACTLY in one transaction: the commander and pair headers (prose left
// alone, see `PROSE_COLUMNS`), both card lists, `format_staples` and `identity_composition`. The
// target's `commander_scores` are cleared under `SCORE_INDEX_LOCK` in that same transaction, the
// builder's own clear, so no score outlives the index it was scored against.
//
// DATABASE_URL must name the target as well: the clear's module imports `src/db`, which refuses to
// load without it. Nothing here queries through it.
import "./lib/env.mjs";
import { runCopyCli } from "./lib/catalog-copy";
import { indexCopySpec } from "./lib/index-copy";

runCopyCli(indexCopySpec);
