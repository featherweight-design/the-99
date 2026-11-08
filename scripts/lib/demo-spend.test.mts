// `demo:generate`'s spend gate and redaction, driven with a fake ledger: no browser, no database, no model.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gatedPress, redact, secretsOf } from "./demo-spend.mjs";

type Entry = { source: string; usd: number; pending?: string; settles?: string };
function fake(initialSpent = 0) {
  const entries: Entry[] = [];
  // spent() = the starting figure plus pending entries no settle closed plus settled spend, as `ledger.mts` counts it.
  const spent = () => {
    const closed = new Set(entries.flatMap((e) => (e.settles ? [e.settles] : [])));
    return initialSpent + entries.reduce((n, e) => n + (e.pending && closed.has(e.pending) ? 0 : e.usd), 0);
  };
  return { entries, ledger: { spent, record: (e: object) => void entries.push(e as Entry) } };
}
const gate = (f: ReturnType<typeof fake>, over: Record<string, unknown> = {}) => ({
  ledger: f.ledger, capUsd: 5, worstUsd: 2, id: "step", feature: "synopsis",
  press: async () => "stored", settledUsd: async () => 0.5, ...over,
});

describe("gatedPress", () => {
  it("refuses a press whose worst case crosses the cap, before writing or pressing anything", async () => {
    const f = fake(3.5);
    let pressed = false;
    await expect(gatedPress(gate(f, { press: async () => { pressed = true; } }))).rejects.toThrow(/STOP before step.*\$5 cap/);
    expect(pressed).toBe(false);
    expect(f.entries).toEqual([]);
  });

  it("writes the pending entry at the worst case BEFORE the press runs", async () => {
    const f = fake();
    let seen: Entry[] = [];
    await gatedPress(gate(f, { press: async () => { seen = [...f.entries]; } }));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ source: "pending", usd: 2 });
  });

  it("settles at the recorded cost and closes the pending entry", async () => {
    const f = fake();
    const { usd } = await gatedPress(gate(f));
    expect(usd).toBe(0.5);
    expect(f.entries.map((e) => e.source)).toEqual(["pending", "realtime:1"]);
    expect(f.entries[1].settles).toBe(f.entries[0].pending);
    expect(f.ledger.spent()).toBeCloseTo(0.5);
  });

  it("settles a FAILED press at what it cost, and rethrows carrying that cost", async () => {
    const f = fake();
    const boom = new Error("boom");
    await expect(gatedPress(gate(f, { press: async () => { throw boom; }, settledUsd: async (ok: boolean) => (ok ? 0 : 1.25) }))).rejects.toBe(boom);
    expect(boom).toMatchObject({ settledUsd: 1.25 });
    expect(f.entries[1]).toMatchObject({ source: "realtime:1", usd: 1.25 });
  });

  it("settles at the worst case when the cost is unreadable, and never at nothing", async () => {
    for (const unreadable of [async () => { throw new Error("db down"); }, async () => null, async () => Number.NaN]) {
      const f = fake();
      const { usd } = await gatedPress(gate(f, { settledUsd: unreadable }));
      expect(usd).toBe(2);
      expect(f.ledger.spent()).toBe(2);
    }
  });

  it("a press that threw an unreadable cost settles at the worst case and still throws", async () => {
    const f = fake();
    await expect(gatedPress(gate(f, { press: async () => { throw new Error("x"); }, settledUsd: async () => { throw new Error("db down"); } }))).rejects.toMatchObject({ settledUsd: 2 });
    expect(f.entries.at(-1)).toMatchObject({ usd: 2 });
  });
});

describe("redact", () => {
  const url = "postgresql://neondb_owner:npg_secretpw@ep-lucky-rain-a6dlpv9g-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require";
  it("removes the connection string, its password and its host from any text", () => {
    const text = `connect failed ${url}\nhost ep-lucky-rain-a6dlpv9g-pooler.us-west-2.aws.neon.tech pw npg_secretpw direct ep-lucky-rain-a6dlpv9g.us-west-2.aws.neon.tech`;
    const out = redact(text, secretsOf(url));
    expect(out).not.toMatch(/npg_secretpw|neon\.tech|neondb_owner/);
  });
  it("removes a postgres URL the script did not know about", () => {
    expect(redact("x postgres://u:p@somewhere.example/db y")).toBe("x postgres://[redacted] y");
  });
});

describe("demo-generate's wiring", () => {
  const source = readFileSync(new URL("../demo-generate.mjs", import.meta.url), "utf8");
  it("presses model tools only through the gate, and prints a child's output only redacted", () => {
    expect(source).toMatch(/gatedPress\(/);
    expect(source).not.toMatch(/source: "pending"/);
    expect(source).toMatch(/process\.stderr\.write\(`\[next\] \$\{redact\(/);
  });
});
