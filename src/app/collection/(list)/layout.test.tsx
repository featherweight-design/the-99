import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The Add cards sheet's way into Precons I own (no-collection entry S18) is decided here, from the reader's switches:
// the line's own switch and PRECONS_ENABLED, both, or the sheet is as shipped.
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: async () => ENV_VIEW };
});
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

describe("the collection layout: the sheet's precon row (S18)", () => {
  afterEach(() => vi.unstubAllEnvs());
  const on = () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    vi.stubEnv("PRECONS_ENABLED", "true");
  };

  it("is on with both switches", async () => {
    on();
    expect((await head()).props.preconPick).toBe(true);
  });

  it("is off with either switch off", async () => {
    on();
    vi.stubEnv("PRECONS_ENABLED", "");
    expect((await head()).props.preconPick).toBe(false);
    on();
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "");
    expect((await head()).props.preconPick).toBe(false);
  });
});

describe("the collection layout: the Wishlist tab (Social R2)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is drawn with the reader's SOCIAL_WISHLIST_ENABLED on", async () => {
    vi.stubEnv("SOCIAL_WISHLIST_ENABLED", "true");
    expect((await head()).props.wishlistEnabled).toBe(true);
  });

  it("is not drawn with it off", async () => {
    vi.stubEnv("SOCIAL_WISHLIST_ENABLED", "");
    expect((await head()).props.wishlistEnabled).toBe(false);
  });
});
