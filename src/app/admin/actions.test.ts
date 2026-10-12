// The admin's server actions (admin STATES C7, D4; the plan's Security section). Two halves: a
// static read of every `"use server"` module under src/app/admin, failing on an export whose first
// statement is not `requireAdmin()`, and the settings writes run against a recording database.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gate = vi.fn(async () => ({ userId: "user_admin", env: "staging" as const }));
vi.mock("../../lib/admin/access", () => ({ requireAdmin: () => gate() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Write = { op: string; values?: Record<string, unknown> };
const writes: Write[] = [];
let before: { valueMicroUsd: number }[] = [];
const tx = {
  select: () => ({ from: () => ({ where: () => ({ for: async () => before }) }) }),
  insert: (table: { [k: symbol]: unknown }) => ({
    values: (values: Record<string, unknown>) => {
      const name = String((table as Record<symbol, unknown>)[Symbol.for("drizzle:Name")]);
      writes.push({ op: name, values });
      return { onConflictDoUpdate: async () => undefined, then: (r: (v: unknown) => void) => r(undefined) };
    },
  }),
};
const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx));
vi.mock("../../db", () => ({ db: { transaction: (fn: (t: typeof tx) => Promise<void>) => transaction(fn) } }));

const actions = await import("./actions");

beforeEach(() => {
  writes.length = 0;
  before = [];
  gate.mockClear();
  transaction.mockClear();
});

const HERE = dirname(fileURLToPath(import.meta.url));
function serverModules(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return serverModules(path);
    if (!/\.tsx?$/.test(entry) || /\.test\./.test(entry)) return [];
    return /^\s*["']use server["']/.test(readFileSync(path, "utf8")) ? [path] : [];
  });
}

/** Every exported function in a module, and whether its first statement awaits `requireAdmin()`. */
function exportsOf(path: string): { name: string; gated: boolean }[] {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const out: { name: string; gated: boolean }[] = [];
  const isGate = (node: ts.Node | undefined): boolean => {
    if (!node) return false;
    const text = node.getText(source).replace(/\s+/g, " ");
    return /^(const \{[^}]*\} = |const \w+ = )?await requireAdmin\(\);?$/.test(text);
  };
  for (const st of source.statements) {
    const exported = ts.getModifiers(st as ts.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isFunctionDeclaration(st)) out.push({ name: st.name?.text ?? "default", gated: isGate(st.body?.statements[0]) });
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const init = d.initializer;
        const body = init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && ts.isBlock(init.body) ? init.body : null;
        out.push({ name: d.name.getText(source), gated: isGate(body?.statements[0]) });
      }
    }
  }
  return out;
}

describe("every admin action is gated first", () => {
  const modules = serverModules(HERE);

  it("finds the admin's action modules", () => {
    expect(modules.map((m) => m.slice(HERE.length + 1))).toContain("actions.ts");
  });

  it.each(modules.map((m) => [m.slice(HERE.length + 1), m]))("%s: requireAdmin() is the first statement of every export", (_name, path) => {
    const found = exportsOf(path);
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((e) => !e.gated).map((e) => e.name)).toEqual([]);
  });

  it("reads a module whose export skips the gate as a failure", () => {
    const path = join(HERE, "actions.ts");
    const original = exportsOf(path);
    expect(original.every((e) => e.gated)).toBe(true);
    // The same parser over a hand-written ungated export.
    const src = ts.createSourceFile("x.ts", `"use server";\nexport async function leak() { const x = 1; await requireAdmin(); }`, ts.ScriptTarget.Latest, true);
    const fn = src.statements[1] as ts.FunctionDeclaration;
    expect(fn.body?.statements[0].getText(src)).not.toMatch(/requireAdmin/);
  });
});

describe("the settings writes", () => {
  it("refuses a stranger before reading anything", async () => {
    gate.mockRejectedValueOnce(new Error("NEXT_NOT_FOUND"));
    await expect(actions.setAccountCap({ amount: "100" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses an amount that is not dollars, writing nothing", async () => {
    await expect(actions.setSystemCeiling({ amount: "-3" })).resolves.toEqual({ ok: false, error: "amount" });
    await expect(actions.setAccountCap({ amount: 100 })).resolves.toEqual({ ok: false, error: "amount" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses an as-of day that is not a real past day", async () => {
    for (const asOf of ["2026-02-30", "18 Nov", "2999-01-01"]) {
      await expect(actions.setElsewhere({ amount: "18.40", asOf })).resolves.toEqual({ ok: false, error: "date" });
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("writes the setting, then its setting_set event, in one transaction", async () => {
    before = [{ valueMicroUsd: 250_000_000 }];
    await expect(actions.setAccountCap({ amount: "$100", note: "  November cap  " })).resolves.toEqual({ ok: true });
    expect(transaction).toHaveBeenCalledOnce();
    expect(writes.map((w) => w.op)).toEqual(["admin_settings", "admin_events"]);
    expect(writes[0].values).toMatchObject({ key: "account_cap_usd", valueMicroUsd: 100_000_000, note: "November cap", updatedBy: "user_admin" });
    expect(writes[1].values).toEqual({
      actorId: "user_admin",
      kind: "setting_set",
      settingKey: "account_cap_usd",
      oldValue: "250.00",
      newValue: "100.00",
      note: "November cap",
    });
  });

  it("records elsewhere with the day it was read and no old value the first time", async () => {
    await expect(actions.setElsewhere({ amount: "18.4", asOf: "2026-10-09", note: "" })).resolves.toEqual({ ok: true });
    expect(writes[0].values).toMatchObject({ key: "elsewhere_usd", valueMicroUsd: 18_400_000, asOf: "2026-10-09", note: null });
    expect(writes[1].values).toMatchObject({ settingKey: "elsewhere_usd", oldValue: null, newValue: "18.40" });
  });

  it("says nothing changed when the transaction fails", async () => {
    transaction.mockRejectedValueOnce(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(actions.setSystemCeiling({ amount: "15" })).resolves.toEqual({ ok: false, error: "failed" });
    spy.mockRestore();
  });
});
