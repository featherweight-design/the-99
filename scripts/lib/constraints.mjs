// Every SQL identifier a migration declares, against Postgres's 63-byte limit.
//
// WHY THIS EXISTS. Drizzle derives a constraint name from the table plus every column in the
// key, and on a composite key over a long table name that runs past 63 bytes. Postgres does
// not reject the name — IT TRUNCATES IT, silently — so two constraints on the same table
// whose names agree for 63 bytes become the same constraint, and the second `ADD CONSTRAINT`
// fails with "already exists" and takes the whole migration down.
//
// `commander_pair_support_cards`'s primary key and its composite foreign key did exactly
// that, at 130 characters each with an identical 63-byte prefix. Nothing here caught it:
// `drizzle-kit check` compares its own snapshots, typecheck and lint never read SQL, and the
// generated file reads perfectly. It surfaces only when the migration RUNS — which on a real
// deployment is the Vercel production build, where a failure is a broken release rather than
// a red CI job.
//
// Two rules, and the SECOND is the one that bites. An over-long name alone is survivable: a
// lone 130-character constraint truncates and still works, which is why this had not happened
// before. A COLLISION after truncation is fatal. Both are reported, because a name already
// over the limit is one sibling away from the fatal case, and the moment to rename it is
// while the migration is still unmerged.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { APPLIED_LONG_NAMES } from "./constraints-allowlist.mjs";

export const MAX_IDENTIFIER_BYTES = 63;

/** Postgres truncates by BYTES, not characters. These identifiers are ASCII in practice, but
 *  measuring characters would silently disagree the first time one is not. */
export const truncate = (name) =>
  Buffer.from(name, "utf8").subarray(0, MAX_IDENTIFIER_BYTES).toString("utf8");

/**
 * Named identifiers declared in one migration's SQL, with the relation each belongs to.
 *
 * Grouped by relation because that is the scope Postgres enforces uniqueness in: two
 * constraints on DIFFERENT tables may share a name, and reporting that pair would be a false
 * finding against every schema that names its primary keys consistently.
 */
export function declaredConstraints(sqlText) {
  const found = [];
  // `CREATE TABLE "x" (… CONSTRAINT "y" …)` — the whole body belongs to that relation.
  for (const m of sqlText.matchAll(/CREATE TABLE\s+"([^"]+)"\s*\(([\s\S]*?)\n\);/g)) {
    for (const c of m[2].matchAll(/CONSTRAINT\s+"([^"]+)"/g)) {
      found.push({ relation: m[1], name: c[1] });
    }
  }
  // `ALTER TABLE "x" ADD CONSTRAINT "y"`.
  for (const m of sqlText.matchAll(/ALTER TABLE\s+"([^"]+)"\s+ADD CONSTRAINT\s+"([^"]+)"/g)) {
    found.push({ relation: m[1], name: m[2] });
  }
  return found;
}

/** Findings across a whole migration folder. Empty means clean. */
export function auditMigrations(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  // Accumulated across the FOLDER, not per file: a constraint added in 0031 is still on the
  // relation when 0042 adds another, and the collision is just as fatal a year apart.
  const byRelation = new Map();
  const findings = [];

  for (const file of files) {
    for (const { relation, name } of declaredConstraints(
      readFileSync(join(dir, file), "utf8"),
    )) {
      const bytes = Buffer.byteLength(name, "utf8");
      // An already-applied over-long name is exempt BY NAME (see the allowlist). A collision
      // never is: it is checked below, outside this branch, on every name including these.
      if (bytes > MAX_IDENTIFIER_BYTES && !APPLIED_LONG_NAMES.has(name)) {
        findings.push({
          kind: "too-long",
          file,
          relation,
          name,
          detail: `${bytes} bytes; Postgres would store "${truncate(name)}"`,
        });
      }
      const key = `${relation} ${truncate(name)}`;
      const prior = byRelation.get(key);
      if (prior && prior.name !== name) {
        findings.push({
          kind: "collision",
          file,
          relation,
          name,
          detail: `truncates to the same 63 bytes as "${prior.name}" (${prior.file})`,
        });
      }
      if (!prior) byRelation.set(key, { name, file });
    }
  }
  return findings;
}
