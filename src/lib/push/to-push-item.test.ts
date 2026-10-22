import { describe, expect, it } from "vitest";

import type { FeedView } from "../feed/home";
import { toPushItem } from "./to-push-item";

const card = { oracleId: "o1", name: "Jace, Multiverse Architect", image: "img", art: null, colorIdentity: null };
const view = (over: Partial<FeedView>): FeedView => ({
  key: "k1", kind: "price-drop", at: "2026-10-22T00:00:00.000Z", unseen: true, card, friend: null, href: null, opens: null,
  name: null, setSize: null, owned: null, drop: null, combo: null, ...over,
});
const friend = { publicId: "p-colin", displayName: "Colin" };

describe("a feed view as a push item", () => {
  it("price drop: the card and both figures", () => {
    expect(toPushItem(view({ drop: { fromCents: 840, toCents: 510 }, opens: "o1" }), "b")).toEqual({
      kind: "price-drop", key: "k1", batch: "b", oracleId: "o1", card: card.name, wasCents: 840, nowCents: 510, image: "img",
    });
  });
  it("trade match: the friend and the card", () => {
    expect(toPushItem(view({ kind: "trade-match", friend }), "b")).toMatchObject({ kind: "trade-match", friend: "Colin", publicId: "p-colin", card: card.name });
  });
  it("spare request: the friend and the card", () => {
    expect(toPushItem(view({ kind: "spare-request", friend }), "b")).toMatchObject({ kind: "spare-request", friend: "Colin", card: card.name });
  });
  it("combo: the two pieces, the piece added and the piece Home opens", () => {
    expect(toPushItem(view({ kind: "combo", opens: "o9", combo: { pieces: ["A", "B"], added: "B" } }), "b")).toMatchObject({
      kind: "combo", oracleId: "o9", a: "A", b: "B", added: "B",
    });
  });
  it("is null where a notification would be half-worded", () => {
    expect(toPushItem(view({ drop: { fromCents: 1, toCents: 1 }, card: null }), "b")).toBeNull(); // the card is gone
    expect(toPushItem(view({ drop: null }), "b")).toBeNull(); // no price pair
    expect(toPushItem(view({ kind: "trade-match", friend: null }), "b")).toBeNull(); // the friend is gone
    expect(toPushItem(view({ kind: "combo", combo: null }), "b")).toBeNull();
    // Valid combo data and `opens`, but the piece's card is gone from the catalog: dropped like every other stored kind.
    expect(toPushItem(view({ kind: "combo", card: null, opens: "o9", combo: { pieces: ["A", "B"], added: "B" } }), "b")).toBeNull();
  });
  it("is null for a kind this PR does not push", () => {
    expect(toPushItem(view({ kind: "new-set", name: "Set" }), "b")).toBeNull();
    expect(toPushItem(view({ kind: "new-precon", name: "Precon" }), "b")).toBeNull();
  });
});
