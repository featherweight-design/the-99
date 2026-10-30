// The claim read's SQL, captured from a fake transaction and rendered with the real dialect.
import { afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { loadAvailability, loadDeckBuyRows } from "./availability-query";
import { ENV_VIEW } from "@/test/env-view";

async function emitted(): Promise<string> {
  let captured: SQL | null = null;
  const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
  await loadAvailability("user_1", { oracleIds: ["o1"], env: ENV_VIEW }, tx as never);
  return new PgDialect().sqlToQuery(captured!).sql;
}

describe("loadAvailability and the lock", () => {
  // Locked (L2): a live lock on a card still in that deck's list, qualified on both sides.
  it("carries the locked key, read from a live lock on a card the deck still holds", async () => {
    const q = await emitted();
    expect(q).toContain("'locked', exists (");
    expect(q).toContain("join deck_cards dk on dk.deck_id = lk.deck_id and dk.oracle_id = lk.oracle_id");
    expect(q).toContain("where lk.deck_id = cd.deck_id and lk.oracle_id = cd.oracle_id and lk.removed_at is null");
  });
});

describe("loadAvailability with unownedAsZero (the cart's chooser)", () => {
  const render = async (opts: Omit<Parameters<typeof loadAvailability>[1], "env">) => {
    let captured: SQL | null = null;
    const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
    await loadAvailability("user_1", { ...opts, env: ENV_VIEW }, tx as never);
    return new PgDialect().sqlToQuery(captured!).sql;
  };

  it("leaves every other reader's query exactly as it was", async () => {
    expect(await render({ oracleIds: ["o1"], unownedAsZero: false })).toBe(await render({ oracleIds: ["o1"] }));
  });

  it("drives the select from the named cards too, an unowned one at 0", async () => {
    const q = await render({ oracleIds: ["o1"], unownedAsZero: true });
    expect(q).toContain("from (");
    expect(q).toMatch(/select x\.oracle_id, 0 from unnest\(\$\d+::uuid\[\]\) as x\(oracle_id\)/);
    expect(q).toContain("where not exists (select 1 from owned w where w.oracle_id = x.oracle_id)");
    expect(await render({ oracleIds: ["o1"] })).not.toContain("unnest(");
  });
});

// Admin adoption 6e: both claim readers decide CHANGE_COMMANDER_ENABLED (the moved-commander pending
// clause) from the env they are HANDED, the
// reader's resolved switches, and never from the environment alone. The environment and the handed env
// are given opposite values, so a reader that dropped its env would follow the environment and fail.
describe("the claim readers decide their switches from the env they are handed", () => {
  const ON = { CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const OFF = { CHANGE_COMMANDER_ENABLED: "false" } as unknown as NodeJS.ProcessEnv;
  const MOVED = "select 1 from decks lvd where lvd.id = nv.deck_id";
  const capture = () => {
    const seen: SQL[] = [];
    const tx = { execute: async (q: SQL) => { seen.push(q); return { rows: [] }; } };
    return { tx: tx as never, text: () => new PgDialect().sqlToQuery(seen[0]).sql };
  };
  const environment = (value: string) => {
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", value);
  };
  afterEach(() => vi.unstubAllEnvs());

  it("loadAvailability: the reader's ON wins over an environment that has it off", async () => {
    environment("false");
    const { tx, text } = capture();
    await loadAvailability("user_1", { oracleIds: ["o1"], env: ON }, tx);
    expect(text()).toContain(MOVED);
  });

  it("loadAvailability: the reader's OFF wins over an environment that has it on", async () => {
    environment("true");
    const { tx, text } = capture();
    await loadAvailability("user_1", { oracleIds: ["o1"], env: OFF }, tx);
    expect(text()).not.toContain(MOVED);
  });

  it("loadDeckBuyRows: the pending clause follows the handed env, both ways", async () => {
    environment("false");
    const on = capture();
    await loadDeckBuyRows("user_1", undefined, on.tx, ON);
    expect(on.text()).toContain(MOVED);
    environment("true");
    const off = capture();
    await loadDeckBuyRows("user_1", undefined, off.tx, OFF);
    expect(off.text()).not.toContain(MOVED);
  });
});

describe("a claim whose deck's draft has cut the card", () => {
  it("probes that deck's own draft row, aliased and qualified on both sides, and hands the flag on", async () => {
    const q = await emitted();
    expect(q).toContain("select 1 from deck_cards dcut where dcut.deck_id = ac.deck_id and dcut.oracle_id = ac.oracle_id");
    expect(q).toContain("(nv.deck_id is not null and not bool_or(ac.is_commander) and not exists (");
    expect(q).toContain("'draftCut', cd.draft_cut");
    // A card the draft promoted to commander or partner stays in the deck: not cut (PR #2458 round 3).
    expect(q).toContain("where dlive.id = ac.deck_id and ac.oracle_id in (dlive.commander_oracle_id, dlive.partner_oracle_id)");
  });
});
