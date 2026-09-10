import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import {
  CardDetailProvider, CardDetailTrigger, cardDetailCopy, useCardDetail,
} from "./card-detail-provider";

const card = (oracleId: string, name: string): BrowseCard => ({
  oracleId,
  name,
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: null,
  keywords: [],
  rarity: "common",
  colorIdentity: [],
  imageUri: null,
  quantity: 0,
  printings: [],
  setCodes: [],
  primarySetCode: "",
  preferredPrinting: null,
});

const SIGNET = card("o-signet", "Arcane Signet");
const SOL = card("o-sol", "Sol Ring");

// The repo has no user-event; a real pointer click focuses its target, so the helper does
// too — the focus-return assertion depends on it.
async function click(el: HTMLElement) {
  el.focus();
  await act(async () => {
    fireEvent.click(el);
  });
}

function renderTriggers(
  fetchCard: (oracleId: string) => Promise<BrowseCard | null>,
  siblings?: string[],
) {
  return render(
    <CardDetailProvider fetchCard={fetchCard}>
      <CardDetailTrigger oracleId="o-signet" name="Arcane Signet" siblings={siblings}>
        Arcane Signet
      </CardDetailTrigger>
      <CardDetailTrigger oracleId="o-sol" name="Sol Ring" siblings={siblings}>
        Sol Ring
      </CardDetailTrigger>
    </CardDetailProvider>,
  );
}

/** Stands in for a surface whose list changes while the modal is open. */
function Refiler({ list }: { list: string[] }) {
  const { setSiblings } = useCardDetail();
  return <button type="button" onClick={() => setSiblings(list)}>refile</button>;
}

/** Stands in for a surface closing the modal because its card left the list. */
function Closer() {
  const { close } = useCardDetail();
  return <button type="button" onClick={close}>close</button>;
}

describe("CardDetailProvider", () => {
  it("opens the modal for the clicked card", async () => {
    const fetchCard = vi.fn().mockResolvedValue(SIGNET);
    renderTriggers(fetchCard);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));

    expect(fetchCard).toHaveBeenCalledWith("o-signet");
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Arcane Signet");
  });

  it("announces the wait and marks the clicked trigger busy while the fetch runs", async () => {
    let resolve!: (c: BrowseCard) => void;
    const fetchCard = vi.fn(() => new Promise<BrowseCard>((r) => { resolve = r; }));
    renderTriggers(fetchCard);
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);

    expect(trigger).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(cardDetailCopy.loading)).toBeInTheDocument();
    // The other trigger is untouched — the signal names the card that was clicked.
    expect(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }))
      .toHaveAttribute("aria-busy", "false");

    await act(async () => { resolve(SIGNET); });
    expect(trigger).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText(cardDetailCopy.loading)).not.toBeInTheDocument();
  });

  // Disabling would blur the focused trigger and leave the modal's focus-return with nowhere
  // to go on close.
  it("keeps the trigger enabled and focused while the fetch runs", async () => {
    let resolve!: (c: BrowseCard) => void;
    const fetchCard = vi.fn(() => new Promise<BrowseCard>((r) => { resolve = r; }));
    renderTriggers(fetchCard);
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);

    expect(trigger).toBeEnabled();
    expect(document.activeElement).toBe(trigger);
    await act(async () => { resolve(SIGNET); });
  });

  it("returns focus to the trigger when the modal closes", async () => {
    const fetchCard = vi.fn().mockResolvedValue(SIGNET);
    renderTriggers(fetchCard);
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);
    await screen.findByRole("dialog");

    await click(screen.getAllByRole("button", { name: "Close card details" })[0]);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("announces an unavailable card rather than looking inert", async () => {
    const fetchCard = vi.fn().mockResolvedValue(null);
    renderTriggers(fetchCard);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));

    expect(await screen.findByText(cardDetailCopy.unavailable)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pages Prev/Next through the sibling list it was opened with", async () => {
    const fetchCard = vi.fn(async (id: string) => (id === "o-signet" ? SIGNET : SOL));
    renderTriggers(fetchCard, ["o-signet", "o-sol"]);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: "Previous card" })).toBeDisabled();
    await click(screen.getByRole("button", { name: "Next card" }));

    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Sol Ring"));
    expect(screen.getByRole("button", { name: "Next card" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous card" })).toBeEnabled();
  });

  // The commander and a suggestion belong to no list; forcing paging there would page
  // through a list of one.
  it("disables paging when opened without siblings", async () => {
    const fetchCard = vi.fn().mockResolvedValue(SIGNET);
    renderTriggers(fetchCard);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: "Previous card" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next card" })).toBeDisabled();
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
  });

  // A surface whose list is a live filter re-files it as that filter moves, and the
  // modal must page the new order rather than the one it was opened with.
  it("pages the sibling list a surface re-files, not the one it opened with", async () => {
    const fetchCard = vi.fn(async (id: string) => (id === "o-signet" ? SIGNET : SOL));
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet" siblings={["o-signet"]}>
          Arcane Signet
        </CardDetailTrigger>
        <Refiler list={["o-signet", "o-sol"]} />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Next card" })).toBeDisabled();

    await click(screen.getByRole("button", { name: "refile" }));
    await click(screen.getByRole("button", { name: "Next card" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Sol Ring"));
  });

  it("closes on request, and a fetch already in flight does not reopen it", async () => {
    let resolve!: (c: BrowseCard) => void;
    const fetchCard = vi.fn(() => new Promise<BrowseCard>((r) => { resolve = r; }));
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Closer />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await click(screen.getByRole("button", { name: "close" }));

    await act(async () => { resolve(SIGNET); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(cardDetailCopy.loading)).not.toBeInTheDocument();
  });

  // Two overlapping clicks: the card the user asked for second has to be the one that lands.
  it("ignores a slow fetch that a later click has superseded", async () => {
    const pending = new Map<string, (c: BrowseCard) => void>();
    const fetchCard = vi.fn(
      (id: string) => new Promise<BrowseCard>((r) => pending.set(id, r)),
    );
    renderTriggers(fetchCard);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }));

    await act(async () => { pending.get("o-sol")!(SOL); });
    await act(async () => { pending.get("o-signet")!(SIGNET); });

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Sol Ring");
  });
});
