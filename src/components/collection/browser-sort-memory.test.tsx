import { describe, expect, it, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  // The browser refreshes a page whose list a fields batch shows to be stale.
  useRouter: () => ({ refresh: () => {} }),
}));

import { CollectionBrowser } from "./browser";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import type { BrowseListCard } from "../../lib/collection/browse";

// The remembered sort and the address bar, through the hydrated mirror effect: the server-render tests never run it.
const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o1", name: "Lightning Bolt", quantity: 2, colorIdentity: ["R"], typeLine: "Instant", setCodes: ["LEA"],
    setCounts: [["LEA", 2]], primarySetCode: "LEA", rarity: "common", cmc: 1, ...over,
  }) as BrowseListCard;

const REMEMBERED = { stored: null, wide: false, sort: { sort: "quantity", direction: "desc" } } as const;
function view(hint: typeof REMEMBERED | undefined) {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <CollectionBrowser cards={[card(), card({ oracleId: "o2", name: "Counterspell", quantity: 5 })]} ownedSets={[]} availabilityOk viewHint={hint} />
    </CardDetailProvider>
  );
}

describe("the remembered sort and the address", () => {
  beforeEach(() => window.history.replaceState(null, "", "/collection"));

  it("an explicit ?sort=name over a remembered Quantity keeps its override through the mirror, so a reload does not flip back", () => {
    window.history.replaceState(null, "", "/collection?sort=name");
    render(view(REMEMBERED));
    expect(new URLSearchParams(window.location.search).get("sort")).toBe("name");
  });

  it("an explicit ?dir=asc over a remembered Quantity keeps its order too", () => {
    window.history.replaceState(null, "", "/collection?sort=quantity&dir=asc");
    render(view(REMEMBERED));
    expect(new URLSearchParams(window.location.search).get("dir")).toBe("asc");
  });

  it("a bare visit restored to the remembered order writes it into the address", () => {
    render(view(REMEMBERED));
    expect(new URLSearchParams(window.location.search).get("sort")).toBe("quantity");
  });

  it("with nothing remembered, the default order leaves the address bare", () => {
    render(view(undefined));
    expect(window.location.search).toBe("");
  });
});
