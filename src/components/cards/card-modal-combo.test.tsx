import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { CardModal } from "./card-modal";

/**
 * THE MODAL'S OWN WIRING, which the block's tests cannot reach.
 *
 * `ComboPartnersDetail` is exercised directly everywhere else, with its props handed to it —
 * so removing them at the MOUNT SITE left every one of those green. It is the same shape as
 * the bug this file was written after: the first wiring called `open(id)`, which resolved to
 * `window.open`, typechecked, and passed the whole suite while navigating the browser instead
 * of changing the card.
 */
/** The shipped modal fixture's own shape, copied rather than invented: a field the modal
 *  reads and a hand-built literal omits throws before any assertion runs. */
const card = (): BrowseCard => ({
  oracleId: "c-1",
  name: "Basalt Monolith",
  typeLine: "Artifact",
  manaCost: "{3}", cmc: 3,
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: [],
  imageUri: null,
  printedName: null,
  quantity: 1,
  printings: [],
  setCodes: ["3ED"],
  primarySetCode: "3ED",
  preferredPrinting: null,
  comboPartners: [
    { oracleId: "p-1", name: "Power Artifact", state: "owned", popularity: 900 },
  ],
});

function mount(over: Partial<React.ComponentProps<typeof CardModal>> = {}) {
  return render(
    <CardModal
      card={card()}
      position={1}
      total={1}
      onClose={() => {}}
      onPrev={null}
      onNext={null}
      {...over}
    />,
  );
}

const openBlock = async () => {
  await act(async () => {
    screen.getByRole("button", { name: /Two-card combos/ }).click();
  });
};

describe("CardModal — the combo block's wiring", () => {
  // THE COMMANDERS COUNT AS HELD (§4.3b rule 3), and the scope the deck page sends has to
  // include them. Without it a partner that IS the commander reads `you own it` — with the
  // scope line naming that very commander directly above it — and a brew holding only its
  // commander misclassifies every partner it has.
  //
  // Asserted at the BLOCK, because the classification happens server-side from that list:
  // what this pins is that a partner the deck holds is labelled as held rather than owned.
  it("labels a partner the deck holds as in this deck", async () => {
    mount({
      card: {
        ...card(),
        comboPartners: [
          { oracleId: "p-1", name: "Power Artifact", state: "inDeck", popularity: 900 },
        ],
      } as never,
    });
    await openBlock();
    expect(screen.getByText(comboAwarenessCopy.modal.state.inDeck)).toBeInTheDocument();
    expect(screen.queryByText(comboAwarenessCopy.modal.state.owned)).toBeNull();
  });

  it("hands the block the deck it was opened from", async () => {
    mount({ deckName: "Kykar, Wind's Fury" });
    await openBlock();
    expect(
      screen.getByText(comboAwarenessCopy.modal.scope("Kykar, Wind's Fury")),
    ).toBeInTheDocument();
  });

  // THE PARTNER REPLACES THIS CARD rather than stacking a second modal on it, and the modal
  // reaches that through the same `onSelectCard` the provider pages Prev/Next with.
  it("opens a partner through onSelectCard", async () => {
    const onSelectCard = vi.fn();
    mount({ onSelectCard });
    await openBlock();
    await act(async () => {
      screen.getByRole("button", { name: "Power Artifact" }).click();
    });
    expect(onSelectCard).toHaveBeenCalledWith("p-1");
  });

  // WITHOUT A HANDLER the name is emphasis, not a dead control — `/collection` opens this
  // modal too and passes none.
  it("leaves the partner unpressable when the modal was given no handler", async () => {
    mount();
    await openBlock();
    expect(screen.queryByRole("button", { name: "Power Artifact" })).toBeNull();
    expect(screen.getByText("Power Artifact")).toBeInTheDocument();
  });

  // OPENED FOR THE COMBO (a feed item's See the combo): the block starts open, and a plain open leaves it closed.
  it("starts the block open when the card was opened for its combo, closed otherwise", () => {
    mount({ openCombo: true });
    expect(screen.getByRole("button", { name: /Two-card combos/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("leaves the block closed on a plain open", () => {
    mount();
    expect(screen.getByRole("button", { name: /Two-card combos/ })).toHaveAttribute("aria-expanded", "false");
  });
});
