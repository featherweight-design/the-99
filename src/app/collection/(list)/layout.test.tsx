import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The head's collection-edit props (editing, the sheet's way into Precons I own, scanning) are always on: the retired
// COLLECTION_EDIT_ENABLED is never read.
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../lib/home/summary", () => ({
  getCollectionStats: async () => ({ uniqueCards: 4, totalCards: 4 }),
  getCollectionLastUpdated: async () => null,
}));
vi.mock("../../../lib/collection/history", () => ({ collectionHasHistory: async () => false }));
vi.mock("../../../components/collection/collection-place-head", () => ({ CollectionPlaceHead: () => null }));
vi.mock("../../../components/collection/collection-content-scope", () => ({ CollectionContentScope: () => null }));

import CollectionListLayout from "./layout";
import { CollectionPlaceHead } from "../../../components/collection/collection-place-head";

const head = async () => {
  const el = (await CollectionListLayout({ children: null })) as ReactElement<{ children: ReactElement<Record<string, unknown>>[] }>;
  return el.props.children.find((c) => c.type === CollectionPlaceHead)!;
};

describe("the collection layout: collection editing (S18)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is always on: the retired COLLECTION_EDIT_ENABLED is never read", async () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "");
    const props = (await head()).props;
    expect([props.editEnabled, props.preconPick, props.scan]).toEqual([true, true, true]);
  });
});

describe("the collection layout: the Wishlist tab (Social R2)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is always drawn: the retired SOCIAL_WISHLIST_ENABLED is never read", async () => {
    vi.stubEnv("SOCIAL_WISHLIST_ENABLED", "");
    expect((await head()).props.wishlistEnabled).toBe(true);
  });
});
