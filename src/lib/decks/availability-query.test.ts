// The claim read's SQL, captured from a fake transaction and rendered with the real dialect.
import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { loadAvailability, loadDeckBuyRows } from "./availability-query";

async function emitted(): Promise<string> {
  let captured: SQL | null = null;
  const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
  await loadAvailability("user_1", { oracleIds: ["o1"] }, tx as never);
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
  const render = async (opts: Parameters<typeof loadAvailability>[1]) => {
    let captured: SQL | null = null;
    const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
    await loadAvailability("user_1", opts, tx as never);
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
    // Without the flag no unowned card joins the select (the moved-commander clause has its own unnest).
    expect(await render({ oracleIds: ["o1"] })).not.toMatch(/from unnest\(\$\d+::uuid\[\]\) as x\(oracle_id\)/);
  });
});

// Change commander (plan decision 2): a deck whose live commander moved since its newest version is
// pending, in both claim readers.
describe("the claim readers count a moved commander as pending", () => {
  const MOVED = "select 1 from decks lvd where lvd.id = nv.deck_id";
  const capture = () => {
    const seen: SQL[] = [];
    const tx = { execute: async (q: SQL) => { seen.push(q); return { rows: [] }; } };
    return { tx: tx as never, text: () => new PgDialect().sqlToQuery(seen[0]).sql };
  };

  it("loadAvailability", async () => {
    const { tx, text } = capture();
    await loadAvailability("user_1", { oracleIds: ["o1"] }, tx);
    expect(text()).toContain(MOVED);
  });

  it("loadDeckBuyRows", async () => {
    const { tx, text } = capture();
    await loadDeckBuyRows("user_1", undefined, tx);
    expect(text()).toContain(MOVED);
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
