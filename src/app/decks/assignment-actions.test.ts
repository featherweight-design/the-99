// The chooser's pick reads the card back after the write, so the row redraws from the state that decided it.
import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  card: vi.fn(async () => null),
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/decks/assign", () => ({ assignCopyFor: async () => null }));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: () => undefined }));
vi.mock("../../lib/collection/summary-read", () => ({ loadContestedCard: stub.card }));

const { assignCopy } = await import("./assignment-actions");

describe("assignCopy", () => {
  it("reads the card back for the reader", async () => {
    expect(await assignCopy("o1", "d1")).toEqual({ ok: true, card: null });
    expect(stub.card.mock.calls[0] as unknown[]).toEqual(["o1", "user_1"]);
  });
});
