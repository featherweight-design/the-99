import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));
vi.mock("../staples/universal", () => ({ loadUniversalStaples: async () => new Set<string>() }));

import { labelTrialPool, ROLE_WORDS } from "./gather";

const dialect = new PgDialect();
const DECK = "00000000-0000-4000-8000-0000000000d1";
const CMDR = "00000000-0000-4000-8000-0000000000c1";

/** Which slice a pool query is, read off the SQL the real `spellPool` built. */
type Slice = { mv: number; roles: string };
let pools: Slice[];

beforeEach(() => {
  pools = [];
  execute.mockReset();
  execute.mockImplementation(async (q: SQL) => {
    const { sql, params } = dialect.sqlToQuery(q);
    if (/from decks where id/.test(sql)) {
      return { rows: params[0] === DECK ? [{ commander: CMDR, partner: null, user_id: "u1" }] : [] };
    }
    if (/select color_identity from cards/.test(sql)) return { rows: [{ color_identity: ["R", "G", "W"] }] };
    if (/from deck_cards dc join cards c/.test(sql)) {
      return {
        rows: [
          { oracle_id: "deck-spell-2", cmc: 2, spell: true },
          { oracle_id: "deck-spell-4", cmc: 4, spell: true },
          { oracle_id: "deck-land", cmc: 0, spell: false },
        ],
      };
    }
    // A pool query: its mana value is the `u.cmc <=` parameter, its slice the role predicate.
    const mvParam = sql.match(/u\.cmc <= \$(\d+)/)?.[1];
    const mv = Number(params[Number(mvParam) - 1]);
    // `roleWords` wraps each role's words in a group, so a single role is exactly `(words)`.
    const role = Object.entries(ROLE_WORDS).find(([, words]) => params.includes(`(${words})`))?.[0];
    const roles = /\n\s+and true\n/.test(sql) ? "any" : role ?? "?";
    pools.push({ mv, roles });
    // Every slice returns one card of its own and one shared with every other slice.
    return { rows: [{ oracle_id: `${roles}@${mv}` }, { oracle_id: "shared" }] };
  });
});

describe("labelTrialPool (vocabulary plan, Task 6b)", () => {
  it("is null for a deck that does not exist, and reads no pool", async () => {
    expect(await labelTrialPool("00000000-0000-4000-8000-0000000000ff")).toBeNull();
    expect(pools).toHaveLength(0);
  });

  it("reads the role-free slice and each single role's, at every spell mana value and no land's", async () => {
    await labelTrialPool(DECK);
    const want = [2, 4].flatMap((mv) => ["any", ...Object.keys(ROLE_WORDS)].map((roles) => `${roles}@${mv}`)).sort();
    expect(pools.map((p) => `${p.roles}@${p.mv}`).sort()).toEqual(want);
  });

  it("is the deduplicated union of every slice, the deck's spells (not its lands) and its commander", async () => {
    const ids = await labelTrialPool(DECK);
    const slices = [2, 4].flatMap((mv) => ["any", ...Object.keys(ROLE_WORDS)].map((roles) => `${roles}@${mv}`));
    expect(ids).toEqual([...slices, "shared", "deck-spell-2", "deck-spell-4", CMDR].sort());
  });
});
