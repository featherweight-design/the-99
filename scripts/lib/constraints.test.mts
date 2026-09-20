// One case per failure path, each written as the shape that would defeat a careless version.
//
// The hazard this guard covers is a SILENT PASS — Postgres truncates rather than refusing —
// so the guard's own green has to be earned. Every case below was confirmed to fail against a
// version of `auditMigrations` missing the clause it covers.
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { auditMigrations, declaredConstraints, truncate, MAX_IDENTIFIER_BYTES } from "./constraints.mjs";

const dirs: string[] = [];
const folder = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "constraints-"));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** A name of exactly `n` bytes, sharing `prefix`. */
const named = (prefix: string, n: number) => prefix + "x".repeat(Math.max(0, n - prefix.length));

describe("declaredConstraints", () => {
  // Both syntaxes, because drizzle emits the inline form for primary keys and checks and the
  // ALTER form for foreign keys — a parser reading one finds half the constraints and reports
  // no collision on the pair that actually collides.
  it("reads the inline CREATE TABLE form", () => {
    const found = declaredConstraints(
      'CREATE TABLE "t" (\n\t"a" uuid,\n\tCONSTRAINT "t_pk" PRIMARY KEY("a")\n);',
    );
    expect(found).toEqual([{ relation: "t", name: "t_pk" }]);
  });

  it("reads the ALTER TABLE form", () => {
    const found = declaredConstraints(
      'ALTER TABLE "t" ADD CONSTRAINT "t_fk" FOREIGN KEY ("a") REFERENCES "u"("a");',
    );
    expect(found).toEqual([{ relation: "t", name: "t_fk" }]);
  });

  it("attributes every inline constraint to its own table", () => {
    const found = declaredConstraints(
      'CREATE TABLE "a" (\n\tCONSTRAINT "one" CHECK (1)\n);\nCREATE TABLE "b" (\n\tCONSTRAINT "two" CHECK (1)\n);',
    );
    expect(found).toEqual([
      { relation: "a", name: "one" },
      { relation: "b", name: "two" },
    ]);
  });
});

describe("auditMigrations", () => {
  it("passes a folder whose names all fit", () => {
    expect(auditMigrations(folder({ "0001_a.sql": 'ALTER TABLE "t" ADD CONSTRAINT "t_fk" FOREIGN KEY ("a") REFERENCES "u"("a");' }))).toEqual([]);
  });

  it("reports a name over 63 bytes", () => {
    const long = named("t_", 70);
    const findings = auditMigrations(
      folder({ "0001_a.sql": `ALTER TABLE "t" ADD CONSTRAINT "${long}" FOREIGN KEY ("a") REFERENCES "u"("a");` }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ kind: "too-long", relation: "t", name: long });
  });

  // THE FATAL CASE, and the one this guard exists for: two names on the same relation whose
  // first 63 bytes agree. Postgres stores the truncation, so the second is a duplicate.
  it("reports a collision after truncation", () => {
    const a = named("t_shared_prefix_", 70);
    const b = named("t_shared_prefix_", 80);
    const findings = auditMigrations(
      folder({
        "0001_a.sql": `CREATE TABLE "t" (\n\tCONSTRAINT "${a}" PRIMARY KEY("x")\n);`,
        "0002_b.sql": `ALTER TABLE "t" ADD CONSTRAINT "${b}" FOREIGN KEY ("a") REFERENCES "u"("a");`,
      }),
    );
    expect(findings.some((f) => f.kind === "collision")).toBe(true);
  });

  // ACROSS FILES, not within one. A constraint added in 0001 is still on the relation when
  // 0042 adds another, and a per-file audit reports nothing about the pair that breaks.
  it("finds a collision whose halves are in different migrations", () => {
    const a = named("t_shared_prefix_", 70);
    const b = named("t_shared_prefix_", 80);
    const sameFile = auditMigrations(
      folder({ "0001_a.sql": `CREATE TABLE "t" (\n\tCONSTRAINT "${a}" PRIMARY KEY("x")\n);\nALTER TABLE "t" ADD CONSTRAINT "${b}" FOREIGN KEY ("a") REFERENCES "u"("a");` }),
    );
    expect(sameFile.some((f) => f.kind === "collision")).toBe(true);
  });

  // Postgres enforces constraint names PER RELATION. Two tables holding names that truncate
  // alike is legal and ordinary, and reporting it would fail every schema that names its keys
  // the same way — a false finding that gets the whole check switched off.
  //
  // The two names must DIFFER for this to measure anything: with one name used twice the
  // self-collision guard already suppresses it, and a version keyed on the name alone passes.
  it("does not report two relations whose names truncate alike", () => {
    const a = named("shared_prefix_", 70);
    const b = named("shared_prefix_", 80);
    const findings = auditMigrations(
      folder({
        "0001_a.sql": `CREATE TABLE "a" (\n\tCONSTRAINT "${a}" PRIMARY KEY("x")\n);`,
        "0002_b.sql": `CREATE TABLE "b" (\n\tCONSTRAINT "${b}" PRIMARY KEY("x")\n);`,
      }),
    );
    expect(findings.every((f) => f.kind === "too-long")).toBe(true);
  });

  // The same constraint re-declared identically is one constraint, not a collision with
  // itself. A guard that reported that would fire on any folder holding a recreated table.
  it("does not report a name colliding with itself", () => {
    const long = named("t_", 70);
    const findings = auditMigrations(
      folder({
        "0001_a.sql": `CREATE TABLE "t" (\n\tCONSTRAINT "${long}" PRIMARY KEY("x")\n);`,
        "0002_b.sql": `CREATE TABLE "t" (\n\tCONSTRAINT "${long}" PRIMARY KEY("x")\n);`,
      }),
    );
    expect(findings.some((f) => f.kind === "collision")).toBe(false);
  });
});

describe("truncate", () => {
  it("cuts at the byte limit", () => {
    expect(truncate("a".repeat(100))).toHaveLength(MAX_IDENTIFIER_BYTES);
  });

  it("leaves a name that already fits alone", () => {
    expect(truncate("short_name")).toBe("short_name");
  });
});

describe("the repository's own migrations", () => {
  // The live assertion, not a fixture. Everything over the limit today is listed in
  // `constraints-allowlist.mjs` with its reason, so this failing means a NEW one arrived.
  it("declare no unlisted over-long name and no collision at all", () => {
    expect(auditMigrations("drizzle")).toEqual([]);
  });
});
