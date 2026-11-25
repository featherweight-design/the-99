import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { quickFilterCopy } from "../../lib/copy/quick-filters";
import type { CollectionCombos, CollectionComboSides, ComboSide } from "../../lib/combos/collection-combos";

const open = vi.fn();
const addToWishlist = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock("../cards/card-detail-context", () => ({
  useCardDetail: () => ({ open }),
  comboOpenOpts: (id: string) => ({ combo: true, comboVariantId: id }),
}));
vi.mock("../stores/store-provider", () => ({ useStoreInfo: () => ({ name: "Mana Pool" }) }));
vi.mock("../../app/collection/wishlist/actions", () => ({ addToWishlistAction: addToWishlist }));

import { CombosView, comboResultWord, useCollectionCombos } from "./combos-view";

const copy = quickFilterCopy.combos;
const piece = (id: string, name: string) => ({ oracleId: id, name, imageUri: null, artCropUri: null, colorIdentity: [], typeLine: "Creature" });
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

function stubFetch(body: CollectionComboSides | null) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: body !== null, json: async () => body })));
}

/** The browser's wiring without the filters: the hook, the side, the pairs of that side. */
function Harness({ side: first = "both", onSide, newVariantId = null }: { side?: ComboSide; onSide?: (s: ComboSide) => void; newVariantId?: string | null }) {
  const [side, setSide] = useState<ComboSide>(first);
  const { load, retry } = useCollectionCombos(true, "served");
  const sides = load.kind === "ready" ? load.sides : null;
  return (
    <CombosView
      side={side}
      onSide={(s) => {
        onSide?.(s);
        setSide(s);
      }}
      load={load}
      retry={retry}
      pairs={sides ? sides[side].pairs : []}
      counts={sides ? { both: sides.both.total, one: sides.one.total } : null}
      filtered={false}
      newVariantId={newVariantId}
      wide
    />
  );
}
const empty = (side: ComboSide): CollectionCombos => ({ side, total: 0, pairs: [] });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  open.mockClear();
});

describe("CombosView", () => {
  it("draws both fact lines and the NEW tag on the announced pair", async () => {
    stubFetch({ both, one });
    render(<Harness newVariantId="v1" />);
    await waitFor(() => expect(screen.getByText(copy.inNoDeck)).toBeTruthy());
    expect(screen.getByText(copy.bothIn("Edgar's Bloodline"))).toBeTruthy();
    expect(screen.getAllByText(copy.newTag)).toHaveLength(1);
    expect(screen.getByText("Infinite damage")).toBeTruthy();
  });

  it("own one: the missing slot, its price, and Add to wishlist writes the missing card", async () => {
    stubFetch({ both, one });
    render(<Harness side="one" />);
    await waitFor(() => expect(screen.getByText(`${copy.missing("Key")} · ${copy.priced("$1.10", "Mana Pool")}`)).toBeTruthy());
    expect(screen.getByText(copy.notOwned)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.addToWishlist }));
    expect(addToWishlist).toHaveBeenCalledWith("f");
    await waitFor(() => expect(screen.getByRole("button", { name: copy.wishlisted })).toBeTruthy());
  });

  it("the toggle reports the side, and How it works opens the pair's combo sheet", async () => {
    stubFetch({ both, one });
    const onSide = vi.fn();
    render(<Harness onSide={onSide} />);
    await waitFor(() => screen.getAllByRole("button", { name: copy.howItWorks }));
    fireEvent.click(screen.getAllByRole("button", { name: copy.howItWorks })[0]);
    expect(open.mock.calls[0][3]).toMatchObject({ combo: true, comboVariantId: "v1" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.ownOne) }));
    expect(onSide).toHaveBeenCalledWith("one");
  });

  it("one request fetches both sides, both toggle counts show with the first pairs, and the toggle costs no request", async () => {
    stubFetch({ both, one });
    render(<Harness />);
    await waitFor(() => expect(screen.getByText(copy.inNoDeck)).toBeTruthy());
    const toggle = (label: string) => screen.getByRole("button", { name: new RegExp(label) }).textContent;
    expect(toggle(copy.ownBoth)).toContain("2");
    expect(toggle(copy.ownOne)).toContain("1");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.ownOne) }));
    await waitFor(() => expect(screen.getByText(copy.notOwned)).toBeTruthy());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("draws the list's skeleton, not a blank, until the pairs arrive", async () => {
    stubFetch({ both, one });
    const { container } = render(<Harness />);
    expect(container.querySelector("[data-combos-loading]")).not.toBeNull();
    await waitFor(() => expect(container.querySelector("[data-combos-loading]")).toBeNull());
  });

  it("an empty side is one quiet line, a failed one says so", async () => {
    stubFetch({ both: empty("both"), one: empty("one") });
    const { unmount } = render(<Harness />);
    await waitFor(() => expect(screen.getByText(copy.emptyBoth)).toBeTruthy());
    unmount();
    stubFetch(null);
    render(<Harness side="one" />);
    await waitFor(() => expect(screen.getByText(copy.loadFailed)).toBeTruthy());
    // Try again asks once more.
    stubFetch({ both, one });
    fireEvent.click(screen.getByRole("button", { name: copy.tryAgain }));
    await waitFor(() => expect(screen.getByText(copy.notOwned)).toBeTruthy());
  });

  it("the result word prefers the unbounded or game-ending feature", () => {
    expect(comboResultWord(["Create a token", "Infinite damage"])).toBe("Infinite damage");
    expect(comboResultWord([])).toBeNull();
  });
});
