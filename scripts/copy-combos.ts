// `pnpm db:copy:combos [--dry-run]`: publish staging's combo build to production (plan
// `2026-09-28-card-data-replicate.md`, §3a). Reads CATALOG_COPY_SOURCE_URL, CATALOG_COPY_TARGET_URL
// and CATALOG_COPY_TARGET_BRANCH; every check it makes is `scripts/lib/catalog-copy.ts`'s.
//
// NOT a raw table copy. It runs the combo ingest's OWN publish bodies against production, with
// logging on, so production's `deck_data_changes` records the diff between ITS previous flags and
// combos and the new ones, on its own sequence — the entries its readers' `seen_seq` expects. Both
// bodies run in the harness's one transaction, so flags and variants commit together or not at all.
//
// DATABASE_URL must name the target as well: the publish bodies' module imports `src/db`, which
// refuses to load without it. Nothing here queries through it.
import "./lib/env.mjs";
import { runCopyCli } from "./lib/catalog-copy";
import { combosCopySpec } from "./lib/combos-copy";

runCopyCli(combosCopySpec);
