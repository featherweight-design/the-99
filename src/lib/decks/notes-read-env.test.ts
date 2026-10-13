// Admin PR 6b: the notes read draws each tag's art down the chain card details uses, and the deck's
// printing picks in that chain follow the READER's resolved switches, so the env the page resolved must
// reach `chainArt`. The env is a SENTINEL: an assertion on it never prints the process environment.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ results: [] as unknown[][], artArgs: [] as unknown[][] }));

vi.mock("../../db", () => {
  const chain = (rows: unknown[]): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve(rows) : () => chain(rows)),
  });
  return { db: { select: () => chain(stub.results.shift() ?? []) } };
});
vi.mock("../cards/chain-art", () => ({
  chainArt: async (...args: unknown[]) => (stub.artArgs.push(args), new Map([[CARD, "picked.jpg"]])),
}));

const CARD = "11111111-1111-4111-8111-111111111111";
const ENV = { DECK_PRINTINGS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

const { readDeckNotes } = await import("./notes-read");
const { formatTag } = await import("./notes-body");

beforeEach(() => {
  stub.artArgs = [];
  stub.results = [
    [{ id: "n1", body: `see ${formatTag(CARD, "Bolt")}`, createdAt: new Date(0), doneAt: null }],
    [{ id: CARD, name: "Lightning Bolt", imageUri: "catalog.jpg" }],
    [],
  ];
});

describe("readDeckNotes", () => {
  it("hands the reader's resolved env to the tag art's chain", async () => {
    const view = await readDeckNotes("d1", "u1", { commanderOracleId: "c", partnerOracleId: null }, ENV);
    expect(stub.artArgs).toHaveLength(1);
    expect(stub.artArgs[0].slice(0, 3)).toEqual(["u1", "d1", [CARD]]);
    expect(stub.artArgs[0][3]).toBe(ENV);
    expect(view.open[0].drawn.find((s) => s.kind === "tag")).toMatchObject({ imageUri: "picked.jpg" });
  });
});
