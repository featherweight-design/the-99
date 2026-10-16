import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardDetailProvider, CardDetailTrigger, useCardDetail } = await import("./card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("./card-detail-provider")).warmCardModal();

const sol: BrowseCard = {
  oracleId: "o-sol", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
  rarity: "uncommon", colorIdentity: [], imageUri: null, printedName: null, quantity: 1, printings: [], setCodes: [],
  primarySetCode: "", preferredPrinting: null,
};

/** A press that closes the card the way Find a deck's links, Edit copies and a navigation do: `close`, not `dismiss`. */
function CloseFromCode() {
  const { close } = useCardDetail();
  return <button onClick={close}>close from code</button>;
}

function mount(onDismiss: () => void) {
  render(
    <CardDetailProvider fetchCard={vi.fn(async () => sol)} onDismiss={onDismiss}>
      <CardDetailTrigger oracleId={sol.oracleId} name={sol.name}>open</CardDetailTrigger>
      <CloseFromCode />
    </CardDetailProvider>,
  );
}

async function openCard() {
  await act(async () => fireEvent.click(screen.getByRole("button", { name: /View details for Sol Ring/ })));
  await screen.findByRole("dialog");
}

afterEach(cleanup);

describe("onDismiss (card search, resolution 2)", () => {
  it("fires once, after the close, when the reader dismisses the card", async () => {
    const onDismiss = vi.fn();
    mount(onDismiss);
    await openCard();
    await act(async () => fireEvent.keyDown(window, { key: "Escape" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not fire for a close the app makes", async () => {
    const onDismiss = vi.fn();
    mount(onDismiss);
    await openCard();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "close from code" })));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
