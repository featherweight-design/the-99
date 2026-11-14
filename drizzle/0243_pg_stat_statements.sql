-- pg_stat_statements, for per-query timing and call counts (Hugh, 2026-11-14). Available on every Neon branch; staging already has it. No table, no column: the ledger and /api/health count it like any other migration.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
