// Admin PR 6b: a notice row previews its card down the chain card details uses, and the deck's printing
// picks in that chain follow the READER's resolved switches, so the env the page resolved must reach
// `chainArt`. The env is a SENTINEL: an assertion on it never prints the process environment.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ results: [] as unknown[][], artArgs: [] as unknown[][] }));

vi.mock("../../db", () => {
  const chain = (rows: unknown[]): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve(rows) : () => chain(rows)),
  });
  const select = () => chain(stub.results.shift() ?? []);
  return { db: { select, transaction: async (cb: (tx: unknown) => unknown) => cb({ select }) } };
});
vi.mock("../profile/load", async (importOriginal) => ({ ...(await importOriginal<object>()), readProfileHead: async () => null }));
vi.mock("../cards/chain-art", () => ({
  chainArt: async (...args: unknown[]) => (stub.artArgs.push(args), new Map([[BANNED, "picked.jpg"]])),
}));

const COMMANDER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BANNED = "11111111-1111-4111-8111-111111111111";
const ENV = { DECK_PRINTINGS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

const { loadDeckNotices } = await import("./read");

beforeEach(() => {
  stub.artArgs = [];
  stub.results = [
    [{ commander: COMMANDER, partner: null, legalSeen: [] }],
    [],
    [{ oracleId: BANNED }],
    [
      { oracleId: COMMANDER, name: "Commander", imageUri: null, commanderLegal: true, colorIdentity: ["R"] },
      { oracleId: BANNED, name: "Banned", imageUri: "catalog.jpg", commanderLegal: false, colorIdentity: ["R"] },
    ],
  ];
});

describe("loadDeckNotices", () => {
  it("hands the reader's resolved env to the rows' art chain", async () => {
    const notices = await loadDeckNotices("d1", "u1", ENV);
    expect(stub.artArgs).toHaveLength(1);
    expect(stub.artArgs[0].slice(0, 3)).toEqual(["u1", "d1", [BANNED]]);
    expect(stub.artArgs[0][3]).toBe(ENV);
    expect(notices?.violationCount).toBe(1);
  });
});
