import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { FullCardTrigger } from "./full-card-trigger";

const ATRAXA: BrowseCard = {
  oracleId: "o-atraxa",
  name: "Atraxa, Praetors' Voice",
  typeLine: "Legendary Creature — Phyrexian Angel Horror",
  manaCost: "{G}{W}{U}{B}",
  oracleText: "Flying, vigilance, deathtouch, lifelink",
  keywords: ["Flying"],
  rarity: "mythic",
  colorIdentity: ["W", "U", "B", "G"],
  imageUri: null,
  quantity: 0,
  printings: [],
  setCodes: [],
  primarySetCode: "",
  preferredPrinting: null,
};

function renderTrigger(fetchCard = vi.fn(async () => ATRAXA)) {
  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <FullCardTrigger oracleId="o-atraxa" />
    </CardDetailProvider>,
  );
  return fetchCard;
}

async function click(el: HTMLElement) {
  el.focus();
  await act(async () => {
    fireEvent.click(el);
  });
}

describe("FullCardTrigger", () => {
  // The label is the amendment's only player-visible change: the modal draws
  // the art smaller than the lightbox it replaces, so "Full card" would be
  // promising a picture this control no longer opens.
  it("labels the chip 'Card details', not 'Full card'", () => {
    renderTrigger();
    const chip = screen.getByRole("button", { name: "View card details" });
    expect(chip).toHaveTextContent("Card details");
    expect(screen.queryByText("Full card")).toBeNull();
  });

  it("opens the shared card modal for its oracle id", async () => {
    const fetchCard = renderTrigger();
    await click(screen.getByRole("button", { name: "View card details" }));

    expect(fetchCard).toHaveBeenCalledWith("o-atraxa");
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByRole("dialog")).toHaveTextContent("Atraxa, Praetors' Voice");
  });

  // Parity with CardDetailTrigger: the fetch is a round trip, and a chip that
  // looks inert until the modal appears invites a second click.
  it("marks the chip busy while the fetch is in flight", async () => {
    let release: (card: BrowseCard) => void = () => {};
    renderTrigger(vi.fn(() => new Promise<BrowseCard>((resolve) => { release = resolve; })));
    const chip = screen.getByRole("button", { name: "View card details" });
    expect(chip).toHaveAttribute("aria-busy", "false");

    await click(chip);
    expect(chip).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      release(ATRAXA);
    });
    await waitFor(() => {
      expect(chip).toHaveAttribute("aria-busy", "false");
    });
  });

  // Tapping the art band is the mobile gesture the lightbox carried, and it
  // survives the swap. It stays aria-hidden because the labeled chip is the
  // accessible control — two names for one action would double it in the
  // accessibility tree.
  it("keeps the art band tappable and out of the accessibility tree", async () => {
    const fetchCard = renderTrigger();
    const band = document.querySelector('[aria-hidden="true"]');
    expect(band).not.toBeNull();

    await act(async () => {
      fireEvent.click(band as Element);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-atraxa");
  });
});
