// The reducer's duplicate-oracleId branch, which the builder-level test cannot
// reach: a suggestion row flips to "✓ In deck" after its first add, so the only
// way to add the same card twice before revalidation is from a second surface
// (search). The prediction has to match the server, which increments quantity
// for basics and no-ops for everything else.
import { act, render, screen } from "@testing-library/react";
import { startTransition } from "react";
import { describe, expect, it } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { useOptimisticDeckCards } from "./optimistic-deck";

const solRing: DeckDetailCard = {
  oracleId: "sol-ring", name: "Sol Ring", typeLine: "Artifact",
  cardTypeGroup: "Artifacts", role: "ramp", owned: false, quantity: 1, auto: false,
};
const forest: DeckDetailCard = {
  oracleId: "forest", name: "Forest", typeLine: "Basic Land — Forest",
  cardTypeGroup: "Lands", role: "land", owned: true, quantity: 1, auto: false,
};

type Edit = { add: DeckDetailCard } | { remove: string };

function Harness({ server, edits }: { server: DeckDetailCard[]; edits: Edit[] }) {
  const { cards, addOptimisticCard, removeOptimisticCard } = useOptimisticDeckCards(server);
  return (
    <button
      onClick={() => {
        // Dispatched inside a transition and never resolved, so the overrides
        // stay applied for the assertion.
        startTransition(async () => {
          for (const edit of edits) {
            if ("add" in edit) addOptimisticCard(edit.add);
            else removeOptimisticCard(edit.remove);
          }
          await new Promise(() => {});
        });
      }}
    >
      {cards.map((c) => `${c.name}:${c.quantity}`).join("|") || "empty"}
    </button>
  );
}

async function apply(server: DeckDetailCard[], edits: Edit[]) {
  render(<Harness server={server} edits={edits} />);
  const button = screen.getByRole("button");
  await act(async () => { button.click(); });
  return button.textContent;
}

describe("useOptimisticDeckCards", () => {
  it("appends a card the deck does not hold", async () => {
    expect(await apply([], [{ add: solRing }])).toBe("Sol Ring:1");
  });

  it("leaves a non-basic alone when it is already in the deck", async () => {
    expect(await apply([solRing], [{ add: solRing }])).toBe("Sol Ring:1");
  });

  it("increments a basic land, which may run copies", async () => {
    expect(await apply([forest], [{ add: forest }])).toBe("Forest:2");
  });

  it("drops a removed card from the deck-wide list", async () => {
    expect(await apply([solRing, forest], [{ remove: "sol-ring" }])).toBe("Forest:1");
  });

  // `removeCardFromDeck` decrements while more than one copy remains, so a
  // prediction that dropped the stack would read 90 cards until revalidation.
  it("decrements a stack rather than dropping it", async () => {
    expect(await apply([{ ...forest, quantity: 9 }], [{ remove: "forest" }])).toBe("Forest:8");
  });
});
