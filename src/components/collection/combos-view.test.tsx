import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { quickFilterCopy } from "../../lib/copy/quick-filters";
import type { CollectionCombos } from "../../lib/combos/collection-combos";

const open = vi.fn();
const addToWishlist = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock("../cards/card-detail-context", () => ({
  useCardDetail: () => ({ open }),
  comboOpenOpts: (id: string) => ({ combo: true, comboVariantId: id }),
}));
vi.mock("../stores/store-provider", () => ({ useStoreInfo: () => ({ name: "Mana Pool" }) }));
vi.mock("../../app/collection/wishlist/actions", () => ({ addToWishlistAction: addToWishlist }));

import { CombosView, comboResultWord } from "./combos-view";

const copy = quickFilterCopy.combos;
const piece = (id: string, name: string) => ({ oracleId: id, name, imageUri: null, artCropUri: null });
const both: CollectionCombos = {
  side: "both",
  total: 2,
  pairs: [
    { variantId: "v1", produces: ["Infinite damage"], popularity: 1, a: piece("a", "Aang"), b: piece("b", "Touch") },
    { variantId: "v2", produces: ["Infinite lifeloss"], popularity: 1, a: piece("c", "Blood"), b: piece("d", "Bond"), heldIn: { id: "k", name: "Edgar's Bloodline" } },
  ],
};
const one: CollectionCombos = {
  side: "one",
  total: 1,
  pairs: [{ variantId: "v3", produces: ["Infinite turns"], popularity: 1, a: piece("e", "Vault"), b: piece("f", "Key"), missingId: "f", missingCents: 110, wantedBy: [] }],
};

function stubFetch(by: Record<string, CollectionCombos | null>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const body = by[new URL(url, "http://x").searchParams.get("side") ?? ""] ?? null;
    return { ok: body !== null, json: async () => body };
  }));
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  open.mockClear();
});

describe("CombosView", () => {
  it("draws both fact lines and the NEW tag on the announced pair", async () => {
    stubFetch({ both });
    render(<CombosView side="both" onSide={() => {}} bothCount={2} newVariantId="v1" wide retry={0} />);
    await waitFor(() => expect(screen.getByText(copy.inNoDeck)).toBeTruthy());
    expect(screen.getByText(copy.bothIn("Edgar's Bloodline"))).toBeTruthy();
    expect(screen.getAllByText(copy.newTag)).toHaveLength(1);
    expect(screen.getByText("Infinite damage")).toBeTruthy();
  });

  it("own one: the missing slot, its price, and Add to wishlist writes the missing card", async () => {
    stubFetch({ one });
    render(<CombosView side="one" onSide={() => {}} bothCount={2} newVariantId={null} wide retry={0} />);
    await waitFor(() => expect(screen.getByText(`${copy.missing("Key")} · ${copy.priced("$1.10", "Mana Pool")}`)).toBeTruthy());
    expect(screen.getByText(copy.notOwned)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.addToWishlist }));
    expect(addToWishlist).toHaveBeenCalledWith("f");
    await waitFor(() => expect(screen.getByRole("button", { name: copy.wishlisted })).toBeTruthy());
  });

  it("the toggle reports the side, and How it works opens the pair's combo sheet", async () => {
    stubFetch({ both });
    const onSide = vi.fn();
    render(<CombosView side="both" onSide={onSide} bothCount={2} newVariantId={null} wide retry={0} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.ownOne) }));
    expect(onSide).toHaveBeenCalledWith("one");
    await waitFor(() => screen.getAllByRole("button", { name: copy.howItWorks }));
    fireEvent.click(screen.getAllByRole("button", { name: copy.howItWorks })[0]);
    expect(open.mock.calls[0][3]).toMatchObject({ combo: true, comboVariantId: "v1" });
  });

  it("an empty side is one quiet line, a failed one says so", async () => {
    stubFetch({ both: { side: "both", total: 0, pairs: [] } });
    const { unmount } = render(<CombosView side="both" onSide={() => {}} bothCount={0} newVariantId={null} wide retry={0} />);
    await waitFor(() => expect(screen.getByText(copy.emptyBoth)).toBeTruthy());
    unmount();
    stubFetch({});
    render(<CombosView side="one" onSide={() => {}} bothCount={0} newVariantId={null} wide retry={0} />);
    await waitFor(() => expect(screen.getByText(copy.loadFailed)).toBeTruthy());
  });

  it("the result word prefers the unbounded or game-ending feature", () => {
    expect(comboResultWord(["Create a token", "Infinite damage"])).toBe("Infinite damage");
    expect(comboResultWord([])).toBeNull();
  });
});
