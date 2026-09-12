import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { printingPickerCopy } from "../../lib/copy/collection";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const {
  CardDetailProvider, CardDetailTrigger, cardDetailCopy, useCardDetail,
} = await import("./card-detail-provider");

const card = (oracleId: string, name: string): BrowseCard => ({
  oracleId,
  name,
  typeLine: "Artifact",
  manaCost: "{2}", cmc: 2,
  oracleText: null,
  keywords: [],
  rarity: "common",
  colorIdentity: [],
  imageUri: null,
  printedName: null,
  quantity: 0,
  printings: [],
  setCodes: [],
  primarySetCode: "",
  preferredPrinting: null,
});

const SIGNET = card("o-signet", "Arcane Signet");
// The same card as the server answers for it once a write has landed. Only the name
// differs, because that is what the dialog's accessible name is read off.
const SIGNET_AFTER_WRITE = { ...SIGNET, name: "Arcane Signet (rewritten)" };
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

/** Stands in for the art picker, whose write makes the cached copy stale. */
function Evicter({ oracleId }: { oracleId: string }) {
  const { evict } = useCardDetail();
  return <button type="button" onClick={() => evict(oracleId)}>evict</button>;
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

  it("stops announcing a failure once the reader has dismissed it", async () => {
    const fetchCard = vi.fn().mockResolvedValue(null);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Closer />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    expect(await screen.findByText(cardDetailCopy.unavailable)).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByText(cardDetailCopy.unavailable)).not.toBeInTheDocument();
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

// The cache exists so a card the reader has already opened opens again with no
// wait at all: served from the click itself, not from a faster fetch.
describe("CardDetailProvider card cache", () => {
  it("reopens a card it has already fetched with nothing to wait for", async () => {
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
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);
    await act(async () => { resolve(SIGNET); });
    await click(screen.getByRole("button", { name: "close" }));

    // The re-ask is left unresolved on purpose: everything below has to be true while
    // the server has answered nothing, which is what "no wait" means.
    await click(trigger);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Arcane Signet");
    expect(trigger).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText(cardDetailCopy.loading)).not.toBeInTheDocument();
  });

  it("pages back onto a cached sibling with nothing to wait for", async () => {
    const fetchCard = vi.fn(async (id: string) => (id === "o-signet" ? SIGNET : SOL));
    renderTriggers(fetchCard, ["o-signet", "o-sol"]);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    await click(screen.getByRole("button", { name: "Next card" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Sol Ring"));
    await click(screen.getByRole("button", { name: "Previous card" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Arcane Signet");
    expect(screen.queryByText(cardDetailCopy.loading)).not.toBeInTheDocument();
  });

  // The cache holds a card across writes it cannot see — adding the card to a deck in the
  // builder changes the availability the card carries, and revalidating on the server sends
  // the client nothing to listen for. So a hit is shown and then checked.
  it("corrects a cached card with what the re-ask returns", async () => {
    const moved = { ...SIGNET, quantity: 4 };
    const fetchCard = vi.fn()
      .mockResolvedValueOnce(SIGNET)
      .mockResolvedValueOnce(moved);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Closer />
      </CardDetailProvider>,
    );
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);
    await screen.findByRole("dialog");
    await click(screen.getByRole("button", { name: "close" }));

    await click(trigger);
    await waitFor(() => expect(fetchCard).toHaveBeenCalledTimes(2));
    // Both breakpoint trees render, so the count is asserted as present, not as unique.
    await waitFor(() => expect(screen.getAllByText(/×4/).length).toBeGreaterThan(0));
  });

  // The reader is already looking at the card; a re-ask that fails is not a reason to
  // pull the modal out from under them.
  it("leaves a shown card alone when its re-ask fails", async () => {
    const fetchCard = vi.fn()
      .mockResolvedValueOnce(SIGNET)
      .mockRejectedValueOnce(new Error("offline"));
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Closer />
      </CardDetailProvider>,
    );
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);
    await screen.findByRole("dialog");
    await click(screen.getByRole("button", { name: "close" }));

    await click(trigger);
    await waitFor(() => expect(fetchCard).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Arcane Signet");
    expect(screen.queryByText(cardDetailCopy.unavailable)).not.toBeInTheDocument();
  });

  // A card nobody can find is the one result not worth keeping: it is rare, and
  // caching it would keep a card missing for the rest of the visit.
  it("does not cache a card the server could not find", async () => {
    const fetchCard = vi.fn().mockResolvedValue(null);
    renderTriggers(fetchCard);
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);
    await screen.findByText(cardDetailCopy.unavailable);

    await click(trigger);
    expect(fetchCard).toHaveBeenCalledTimes(2);
  });

  // An evicted card has nothing to paint, so its next open waits like a first open —
  // which is the point: what it would have painted is the change the reader just made,
  // undone.
  it("waits again for a card whose entry was evicted by a write", async () => {
    let resolve!: (c: BrowseCard) => void;
    const fetchCard = vi.fn(() => new Promise<BrowseCard>((r) => { resolve = r; }));
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Closer />
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);
    await act(async () => { resolve(SIGNET); });
    await click(screen.getByRole("button", { name: "evict" }));
    await click(screen.getByRole("button", { name: "close" }));

    await click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveAttribute("aria-busy", "true");
  });

  // The window a bare delete leaves open: the re-ask a reopen starts is already out when
  // the write lands, so its answer is from before the write. Filing it would put the
  // replaced printing back in the cache for the rest of the visit.
  it("retakes a read an eviction overtook rather than filing it", async () => {
    let resolveReask!: (c: BrowseCard) => void;
    const fetchCard = vi.fn()
      .mockResolvedValueOnce(SIGNET)
      .mockImplementationOnce(() => new Promise<BrowseCard>((r) => { resolveReask = r; }))
      .mockResolvedValue(SIGNET_AFTER_WRITE);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Closer />
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
    await click(trigger);
    await screen.findByRole("dialog");
    await click(screen.getByRole("button", { name: "close" }));

    await click(trigger);
    await click(screen.getByRole("button", { name: "evict" }));
    await act(async () => { resolveReask(SIGNET); });

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveAccessibleName(SIGNET_AFTER_WRITE.name));
  });

  // The same race on a miss, where there is nothing already on screen: abandoning the read
  // would leave the click looking like it did nothing at all.
  it("opens a card whose first read an eviction overtook", async () => {
    let resolveFirst!: (c: BrowseCard) => void;
    const fetchCard = vi.fn()
      .mockImplementationOnce(() => new Promise<BrowseCard>((r) => { resolveFirst = r; }))
      .mockResolvedValue(SIGNET_AFTER_WRITE);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await click(screen.getByRole("button", { name: "evict" }));
    await act(async () => { resolveFirst(SIGNET); });

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);
  });

  // A read every attempt of which raced a write never saw a settled world, so it is
  // reported as a read that failed rather than filed as the current answer.
  it("gives up on a read that races a write every time", async () => {
    const evictions: Array<() => void> = [];
    const fetchCard = vi.fn().mockImplementation(async () => {
      evictions.pop()?.();
      return SIGNET;
    });
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    const evicter = screen.getByRole("button", { name: "evict" });
    for (let i = 0; i < 3; i++) evictions.push(() => fireEvent.click(evicter));

    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));

    await waitFor(() => expect(fetchCard).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("dialog")).toBeNull();
    await screen.findByText(cardDetailCopy.unavailable);
  });

  // The window the eviction counter alone does not close: a card reopened inside a write's
  // own window is read before the write lands, so nothing about that read looks raced and
  // it is filed and painted. The reader is then sitting on the replaced printing, and only
  // the write landing can tell them otherwise.
  it("re-reads the card on screen when a write lands on it", async () => {
    const fetchCard = vi.fn()
      .mockResolvedValueOnce(SIGNET)
      .mockResolvedValue(SIGNET_AFTER_WRITE);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    // The reopen inside the window: it answers with the card as it was before the write.
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName(SIGNET.name);

    // The write lands.
    await click(screen.getByRole("button", { name: "evict" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name));
  });

  // A write landing on a card nobody is looking at costs no read — the entry is dropped and
  // the next open pays for it, which is the whole point of the cache.
  it("does not re-read a card the write landed on while it was closed", async () => {
    const fetchCard = vi.fn().mockResolvedValue(SIGNET);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Closer />
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");
    await click(screen.getByRole("button", { name: "close" }));

    await click(screen.getByRole("button", { name: "evict" }));
    expect(fetchCard).toHaveBeenCalledTimes(1);
  });

  // A write settles after the reader has moved on. The card it names is not the one they
  // are waiting for, so re-reading it would cancel the read that is actually in flight and
  // leave the click they just made looking like it did nothing.
  it("leaves a pending read alone when a write settles on the card behind it", async () => {
    let resolveSol!: (c: BrowseCard) => void;
    const fetchCard = vi.fn(async (oracleId: string) => {
      if (oracleId === "o-sol") return new Promise<BrowseCard>((r) => { resolveSol = r; });
      return SIGNET;
    });
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <CardDetailTrigger oracleId="o-sol" name="Sol Ring">
          Sol Ring
        </CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    // The reader moves on to a card that is not cached, and the earlier card's write lands
    // while they are still waiting for it.
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }));
    await click(screen.getByRole("button", { name: "evict" }));

    await act(async () => { resolveSol(SOL); });
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Sol Ring");
  });

  // The re-read a write starts has no cache entry to fall back on — the write deleted it —
  // but the card it re-reads is on screen. A server that cannot find it must not empty the
  // modal the reader is using.
  it("leaves the open card standing when the write's own re-read finds nothing", async () => {
    const fetchCard = vi.fn()
      .mockResolvedValueOnce(SIGNET)
      .mockResolvedValue(null);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    await click(screen.getByRole("button", { name: "evict" }));
    await waitFor(() => expect(fetchCard).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET.name);
    // Nor is a correction the reader never asked for announced as a wait or a failure.
    expect(screen.queryByText(cardDetailCopy.unavailable)).not.toBeInTheDocument();
    expect(screen.queryByText(cardDetailCopy.loading)).not.toBeInTheDocument();
  });

  // A read that fails leaves the card the reader came from on screen. That modal is still
  // theirs to use, so a write made in it has to reach the card it names.
  it("re-reads the card left standing after a read for another one failed", async () => {
    const fetchCard = vi.fn(async (oracleId: string) => {
      if (oracleId === "o-sol") throw new Error("nope");
      return SIGNET;
    });
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <CardDetailTrigger oracleId="o-sol" name="Sol Ring">
          Sol Ring
        </CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }));
    await screen.findByText(cardDetailCopy.unavailable);
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET.name);

    // The art pick the reader makes in that still-open modal.
    await click(screen.getByRole("button", { name: "evict" }));
    await waitFor(() => expect(fetchCard).toHaveBeenCalledWith("o-signet"));
    expect(fetchCard.mock.calls.filter(([id]) => id === "o-signet")).toHaveLength(2);
  });

  // A read that found nothing and a read that threw are the same failure, and neither is
  // worth emptying the modal the reader already has.
  it("leaves the card they came from painted when the card they asked for is gone", async () => {
    const fetchCard = vi.fn(async (oracleId: string) => (oracleId === "o-sol" ? null : SIGNET));
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <CardDetailTrigger oracleId="o-sol" name="Sol Ring">
          Sol Ring
        </CardDetailTrigger>
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }));
    await screen.findByText(cardDetailCopy.unavailable);
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET.name);
  });

  // Nothing is painted, so there is no fallback to leave the reader on.
  it("opens nothing when the first card asked for is gone", async () => {
    const fetchCard = vi.fn().mockResolvedValue(null);
    renderTriggers(fetchCard);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));

    await screen.findByText(cardDetailCopy.unavailable);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // A write in the modal still painted behind a read for another card cannot re-read there
  // and then — that would abandon the read the reader is waiting for. It is owed instead,
  // and paid once that read is done and the card turns out to still be the one on screen.
  it("pays a write owed to the card behind a read once that read is done", async () => {
    let resolveSol!: (c: BrowseCard | null) => void;
    const fetchCard = vi.fn(async (oracleId: string) => {
      if (oracleId === "o-sol") return new Promise<BrowseCard | null>((r) => { resolveSol = r; });
      return SIGNET;
    });
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
        <CardDetailTrigger oracleId="o-sol" name="Sol Ring">
          Sol Ring
        </CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }));

    // The art pick the reader makes in the modal still painted behind that read.
    await click(screen.getByRole("button", { name: "evict" }));
    expect(fetchCard.mock.calls.filter(([id]) => id === "o-signet")).toHaveLength(1);

    // Sol Ring turns out not to exist, so Arcane Signet is what the reader is left looking at.
    await act(async () => { resolveSol(null); });
    await waitFor(() =>
      expect(fetchCard.mock.calls.filter(([id]) => id === "o-signet")).toHaveLength(2));
  });

  // The write the eviction exists for, driven through the real picker rather than a
  // stand-in: a change that stopped calling `onArtChange` would leave every test above
  // passing while the reader reopened the card onto the printing they had replaced.
  it("evicts a card whose art pick was changed in the modal", async () => {
    const owned = {
      ...SIGNET,
      quantity: 3,
      printings: [
        {
          setCode: "RVR", setName: "Ravnica Remastered", collectorNumber: "24",
          releasedAt: "2024-01-12", quantity: 1, finishes: { nonfoil: 1 },
          imageUri: null, flavorName: null,
        },
        {
          setCode: "ELD", setName: "Throne of Eldraine", collectorNumber: "8",
          releasedAt: "2019-10-04", quantity: 2, finishes: { nonfoil: 2 },
          imageUri: null, flavorName: null,
        },
      ],
    };
    const fetchCard = vi.fn().mockResolvedValue(owned);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">
          Arcane Signet
        </CardDetailTrigger>
      </CardDetailProvider>,
    );
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    // Both breakpoint trees render the picker; either one drives the same write.
    await click(screen.getAllByRole("button", {
      name: printingPickerCopy.printing.triggerAria(2, "RVR · 24 +1 more"),
    })[0]);
    await click(screen.getAllByRole("radio", { name: /Throne of Eldraine/ })[0]);

    // The write reached the provider: the entry it held is gone, and the card on screen is
    // being re-read rather than left on the printing the reader just replaced.
    await waitFor(() => expect(fetchCard.mock.calls.length).toBeGreaterThan(1));
  });
});
