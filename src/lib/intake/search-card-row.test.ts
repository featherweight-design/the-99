// The new-deck search's card read: `loadCardRow` narrows its claim read to the one card it reads.
import { beforeEach, describe, expect, it, vi } from "vitest";

const CARD = "0000aaaa-0000-4000-8000-000000000001";
const stub = vi.hoisted(() => ({
  execute: vi.fn(),
  loadAvailability: vi.fn(async () => new Map()),
}));
vi.mock("../../db", () => ({ db: { execute: stub.execute } }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: stub.loadAvailability }));

const { loadCardRow } = await import("./search");

const OWNED = { rows: [{ name: "Sol Ring", game_changer: false, type_line: "Artifact", image_uri: null, owned: true }] };

beforeEach(() => {
  stub.execute.mockReset().mockResolvedValueOnce(OWNED).mockRejectedValue(new Error("not under test"));
  stub.loadAvailability.mockClear();
});

describe("the card row's claim read", () => {
  it("is narrowed to the card", async () => {
    await loadCardRow("u", CARD);
    const [, opts] = stub.loadAvailability.mock.calls[0] as unknown as [string, { oracleIds: string[] }];
    expect(opts.oracleIds).toEqual([CARD]);
  });
});
