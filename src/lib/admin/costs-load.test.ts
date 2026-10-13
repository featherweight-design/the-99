// `loadCosts` wiring, against a database that answers every read with no rows: the owner's share it
// hands the view is the one the allowance enforces (`ownerShareMicro()`), env var included.
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const empty = (): unknown =>
  new Proxy(() => {}, {
    get: (_t, key) => (key === "then" ? (resolve: (v: unknown) => void) => resolve([]) : empty),
    apply: () => empty(),
  });
// One transaction's view is the same empty database.
const reads = vi.hoisted(() => ({ outside: 0, options: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: new Proxy(empty() as object, {
    get: (t, key) => {
      if (key === "transaction") return (fn: (tx: unknown) => unknown, options: unknown) => (reads.options.push(options), fn(empty()));
      // A figure read on the pool rather than the transaction's view.
      if (key === "select") reads.outside++;
      return Reflect.get(t, key);
    },
  }),
}));
vi.mock("../model/allowance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../model/allowance")>()),
  modelOwnerUserId: () => "user_owner",
  readAllowance: async () => ({ paused: false }),
}));

const { loadCosts, readEvalLedgers } = await import("./costs");

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-11T15:00:00Z");
const before = process.env.MODEL_OWNER_MONTHLY_USD;

afterEach(() => {
  if (before === undefined) delete process.env.MODEL_OWNER_MONTHLY_USD;
  else process.env.MODEL_OWNER_MONTHLY_USD = before;
});

describe("loadCosts", () => {
  it("reads the owner's share from MODEL_OWNER_MONTHLY_USD", async () => {
    process.env.MODEL_OWNER_MONTHLY_USD = "25";
    const { summary: s } = await loadCosts(OCT, "user_admin", NOW);
    expect(s.ownerShareMicro).toBe(25_000_000);
    expect(s.ownerMicro).toBe(0);
  });

  it("falls back to spend-rule's share when the env var is unset", async () => {
    delete process.env.MODEL_OWNER_MONTHLY_USD;
    const { summary: s } = await loadCosts(OCT, "user_admin", NOW);
    expect(s.ownerShareMicro).toBe(5_000_000);
  });

  it("reads every figure inside one repeatable-read transaction", async () => {
    reads.outside = 0;
    reads.options.length = 0;
    await loadCosts(OCT, "user_admin", NOW);
    expect(reads.options).toEqual([{ isolationLevel: "repeatable read" }]);
    expect(reads.outside).toBe(0);
  });

  it("hands the view the committed eval ledgers, and their month in the system figure", async () => {
    const { summary, detail } = await loadCosts(OCT, "user_admin", NOW);
    const files = readdirSync(join(process.cwd(), "docs/superpowers/eval")).filter((f) => /^ledger.*\.jsonl$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    expect(detail.ledgers.map((l) => l.file).sort()).toEqual(files.sort());
    // October 2026 has eval spend on the committed ledgers, and nothing else in this empty database.
    expect(summary.systemSplit.evals).toBeGreaterThan(0);
    expect(summary.systemSplit.total).toBe(summary.systemSplit.evals);
  });
});

describe("readEvalLedgers", () => {
  it("names a missing directory, so eval spend reads unknown rather than $0", () => {
    expect(readEvalLedgers(join(tmpdir(), "no-such-eval-dir"))).toEqual({ ledgers: [], unreadable: ["docs/superpowers/eval"] });
  });

  it("names a ledger that will not parse and keeps the ones that do", () => {
    const dir = mkdtempSync(join(tmpdir(), "eval-"));
    try {
      writeFileSync(join(dir, "ledger.jsonl"), '{"at":"2026-10-01T00:00:00Z","usd":1,"requests":2}\n');
      writeFileSync(join(dir, "ledger-broken.jsonl"), "{not json\n");
      const { ledgers, unreadable } = readEvalLedgers(dir);
      expect(ledgers.map((l) => l.file)).toEqual(["ledger.jsonl"]);
      expect(unreadable).toEqual(["ledger-broken.jsonl"]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("reads the committed ledgers whole", () => {
    expect(readEvalLedgers().unreadable).toEqual([]);
  });
});
