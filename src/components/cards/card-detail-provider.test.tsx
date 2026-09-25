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
  fetchCard: (
    oracleId: string,
    deckOracleIds?: readonly string[],
  ) => Promise<BrowseCard | null>,
  siblings?: string[],
  comboDeckOracleIds?: readonly string[],
) {
  return render(
    <CardDetailProvider fetchCard={fetchCard} comboDeckOracleIds={comboDeckOracleIds}>
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
  // THE PARTNER LINK REACHES `load`, which is the last link in this chain and the fourth
  // place it has been possible to lose a value between two tested ends.
  //
  // `card-modal-combo.test.tsx` mounts `CardModal` directly with a spy, so it proves the
  // modal calls what it is given and nothing about what the PROVIDER gives it: removing
  // `onSelectCard` at this mount site left that file green while pressing a partner did
  // nothing at all.
  it("opens a partner through the provider's own load", async () => {
    const withPartner = {
      ...SIGNET,
      comboPartners: [
        { oracleId: "o-sol", name: "Sol Ring", state: "owned" as const, popularity: 9 },
      ],
    };
    const fetchCard = vi.fn(async (id: string) => (id === "o-sol" ? SOL : withPartner));
    renderTriggers(fetchCard);
    await click(screen.getByText("Arcane Signet"));

    await act(async () => {
      screen.getByRole("button", { name: /Two-card combos/ }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: "Sol Ring" }).click();
    });

    // The provider fetched the PARTNER, which is what `load` does and a spy on the modal
    // cannot see.
    expect(fetchCard).toHaveBeenCalledWith("o-sol", undefined);
  });

  // THE COMBO SCOPE REACHES THE READ. It is what makes `in this deck` sayable and the scope
  // line renderable, and it is the deck page's alone — every other route sends nothing.
  //
  // Nothing asserted it before: the other cases all check the `undefined` a route with no
  // deck sends, so removing the argument here — or handing over the PROXY-ELIGIBLE set,
  // which answers a different question — left the suite green while every deck modal lost
  // its most useful state.
  it("sends the deck's cards with the read, and nothing without a deck", async () => {
    const fetchCard = vi.fn().mockResolvedValue(SIGNET);
    const { unmount } = renderTriggers(fetchCard, undefined, ["a", "b"]);
    await click(screen.getByText("Arcane Signet"));
    expect(fetchCard).toHaveBeenCalledWith("o-signet", ["a", "b"]);
    unmount();

    const plain = vi.fn().mockResolvedValue(SIGNET);
    renderTriggers(plain);
    await click(screen.getByText("Arcane Signet"));
    expect(plain).toHaveBeenCalledWith("o-signet", undefined);
  });

  it("opens the modal for the clicked card", async () => {
    const fetchCard = vi.fn().mockResolvedValue(SIGNET);
    renderTriggers(fetchCard);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));

    // The second argument is the COMBO SCOPE — the deck's own cards — and is `undefined` on
    // every route but the deck page. Asserted rather than loosened to `expect.anything()`, so
    // a scope leaking onto a route that has no deck would fail here.
    expect(fetchCard).toHaveBeenCalledWith("o-signet", undefined);
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
    await waitFor(() => expect(fetchCard).toHaveBeenCalledWith("o-signet", undefined));
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

    // ONE re-read, not two. The modal reports a pick twice — optimistically, then on
    // settlement — and the optimistic call precedes the write, so a read started there
    // answers with the preference the write is about to replace: work nobody can file.
    expect(fetchCard.mock.calls).toHaveLength(2);
  });
});

// The printing a caller opens at belongs to ONE card. `open` sets it in the same pass as
// the click, but the card behind it stays whatever was painted until the read lands — so
// opening a second card from inside an open modal put the first card's face under the
// second card's printing for the length of that read.
describe("CardDetailProvider open-at-printing scope", () => {
  function Harness() {
    const { open } = useCardDetail();
    return (
      <>
        <button
          type="button"
          onClick={() => open("o-signet", [], {
            setCode: "RVR", collectorNumber: "24",
            imageUri: "https://cards.scryfall.io/normal/rvr-24.jpg",
          })}
        >
          open signet at RVR
        </button>
        <button
          type="button"
          onClick={() => open("o-sol", [], {
            setCode: "M21", collectorNumber: "268",
            imageUri: "https://cards.scryfall.io/normal/m21-268.jpg",
          })}
        >
          open sol at M21
        </button>
      </>
    );
  }

  const backgrounds = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
      .map((el) => el.style.backgroundImage);

  it("does not dress the card on screen in the printing of the one being read", async () => {
    // The second read never settles, which is the whole window under test.
    let release: (() => void) | null = null;
    const fetchCard = vi.fn(async (oracleId: string) => {
      if (oracleId === "o-signet") return SIGNET;
      await new Promise<void>((resolve) => { release = resolve; });
      return SOL;
    });
    const { container } = render(
      <CardDetailProvider fetchCard={fetchCard}>
        <Harness />
      </CardDetailProvider>,
    );

    await click(screen.getByRole("button", { name: "open signet at RVR" }));
    await screen.findByRole("dialog");
    expect(backgrounds(container).some((b) => b.includes("rvr-24"))).toBe(true);

    // Sol Ring is still being read; Arcane Signet is still the card on screen. It must not
    // be wearing Sol Ring's printing.
    await click(screen.getByRole("button", { name: "open sol at M21" }));
    expect(backgrounds(container).some((b) => b.includes("m21-268"))).toBe(false);

    // And once the read lands, the printing applies to the card it was asked for.
    await act(async () => { release?.(); });
    await waitFor(() =>
      expect(backgrounds(container).some((b) => b.includes("m21-268"))).toBe(true),
    );
  });

  // Paging is not the read window from the other side — it is the reader leaving the cell.
  // The id pairing alone would match again on the way back and resurrect a printing they
  // had already paged out of, so Prev/Next clears outright.
  it("does not resurrect the opened-at printing when paging back to that card", async () => {
    const fetchCard = vi.fn(async (oracleId: string) =>
      oracleId === "o-signet" ? SIGNET : SOL);
    function Pair() {
      const { open } = useCardDetail();
      return (
        <button
          type="button"
          onClick={() => open("o-signet", ["o-signet", "o-sol"], {
            setCode: "RVR", collectorNumber: "24",
            imageUri: "https://cards.scryfall.io/normal/rvr-24.jpg",
          })}
        >
          open signet at RVR
        </button>
      );
    }
    const { container } = render(
      <CardDetailProvider fetchCard={fetchCard}>
        <Pair />
      </CardDetailProvider>,
    );
    const art = () =>
      [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
        .map((el) => el.style.backgroundImage);

    await click(screen.getByRole("button", { name: "open signet at RVR" }));
    await screen.findByRole("dialog");
    expect(art().some((b) => b.includes("rvr-24"))).toBe(true);

    await click(screen.getAllByRole("button", { name: "Next card" })[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await click(screen.getAllByRole("button", { name: "Previous card" })[0]);

    await waitFor(() => expect(art().some((b) => b.includes("rvr-24"))).toBe(false));
  });

  // `load` leaves the card on screen standing when a read fails. Clearing the printing at
  // the paging callback would therefore strip the art off a card the reader is still
  // looking at, and leave it wrong for good.
  it("keeps the printing when paging away fails and the card stays put", async () => {
    const fetchCard = vi.fn(async (oracleId: string) => {
      if (oracleId === "o-signet") return SIGNET;
      throw new Error("read failed");
    });
    function Pair() {
      const { open } = useCardDetail();
      return (
        <button
          type="button"
          onClick={() => open("o-signet", ["o-signet", "o-sol"], {
            setCode: "RVR", collectorNumber: "24",
            imageUri: "https://cards.scryfall.io/normal/rvr-24.jpg",
          })}
        >
          open signet at RVR
        </button>
      );
    }
    const { container } = render(
      <CardDetailProvider fetchCard={fetchCard}>
        <Pair />
      </CardDetailProvider>,
    );
    const art = () =>
      [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
        .map((el) => el.style.backgroundImage);

    await click(screen.getByRole("button", { name: "open signet at RVR" }));
    await screen.findByRole("dialog");
    expect(art().some((b) => b.includes("rvr-24"))).toBe(true);

    await click(screen.getAllByRole("button", { name: "Next card" })[0]);
    await waitFor(() => expect(fetchCard).toHaveBeenCalledWith("o-sol", undefined));
    // Arcane Signet is still the card on screen, and still wearing the printing that was
    // clicked. The page did not happen.
    expect(art().some((b) => b.includes("rvr-24"))).toBe(true);
  });

  // The mirror of the failed-page case: opening a SECOND card while the first is still
  // painted must not take the first card's printing away from it either. Committing at
  // click time reverted the visible card to its resolver art, and a failed read left it
  // reverted for good.
  it("leaves the visible card's printing alone while a second card is being read", async () => {
    let release: (() => void) | null = null;
    const fetchCard = vi.fn(async (oracleId: string) => {
      if (oracleId === "o-signet") return SIGNET;
      await new Promise<void>((resolve) => { release = resolve; });
      return SOL;
    });
    function Pair() {
      const { open } = useCardDetail();
      return (
        <>
          <button
            type="button"
            onClick={() => open("o-signet", [], {
              setCode: "RVR", collectorNumber: "24",
              imageUri: "https://cards.scryfall.io/normal/rvr-24.jpg",
            })}
          >
            open signet at RVR
          </button>
          <button type="button" onClick={() => open("o-sol", [])}>open sol plain</button>
        </>
      );
    }
    const { container } = render(
      <CardDetailProvider fetchCard={fetchCard}>
        <Pair />
      </CardDetailProvider>,
    );
    const art = () =>
      [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
        .map((el) => el.style.backgroundImage);

    await click(screen.getByRole("button", { name: "open signet at RVR" }));
    await screen.findByRole("dialog");
    expect(art().some((b) => b.includes("rvr-24"))).toBe(true);

    // Sol Ring is being read and will never land. Arcane Signet is still on screen, and
    // still wearing the printing it was opened at.
    await click(screen.getByRole("button", { name: "open sol plain" }));
    expect(art().some((b) => b.includes("rvr-24"))).toBe(true);

    await act(async () => { release?.(); });
    await waitFor(() => expect(art().some((b) => b.includes("rvr-24"))).toBe(false));
  });

  // A pending printing belongs to ONE read. Held by oracle id alone, a failed open sat
  // waiting and committed its cell's printing the next time the reader paged onto that
  // card — a page that supplied no printing at all.
  it("drops a pending printing whose read never landed", async () => {
    let failNext = true;
    const fetchCard = vi.fn(async (oracleId: string) => {
      if (oracleId === "o-sol" && failNext) throw new Error("read failed");
      return oracleId === "o-signet" ? SIGNET : SOL;
    });
    function Pair() {
      const { open } = useCardDetail();
      return (
        <>
          <button
            type="button"
            onClick={() => open("o-sol", [], {
              setCode: "M21", collectorNumber: "268",
              imageUri: "https://cards.scryfall.io/normal/m21-268.jpg",
            })}
          >
            open sol at M21
          </button>
          <button type="button" onClick={() => open("o-sol", [])}>open sol plain</button>
        </>
      );
    }
    const { container } = render(
      <CardDetailProvider fetchCard={fetchCard}>
        <Pair />
      </CardDetailProvider>,
    );
    const art = () =>
      [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
        .map((el) => el.style.backgroundImage);

    // The open fails, so nothing is painted and its printing is owed to a read that is over.
    await click(screen.getByRole("button", { name: "open sol at M21" }));
    await waitFor(() => expect(fetchCard).toHaveBeenCalledWith("o-sol", undefined));

    // The same card, opened again with NO printing. It must arrive wearing none.
    failNext = false;
    await click(screen.getByRole("button", { name: "open sol plain" }));
    await screen.findByRole("dialog");
    expect(art().some((b) => b.includes("m21-268"))).toBe(false);
  });

  // Reopening the SAME card with no printing is an explicit ask for no printing, and has to
  // clear one. Held by id alone it read as a same-card refresh and preserved the cell the
  // reader opened at last time.
  it("clears the printing when the same card is reopened without one", async () => {
    const fetchCard = vi.fn(async () => SIGNET);
    function Pair() {
      const { open } = useCardDetail();
      return (
        <>
          <button
            type="button"
            onClick={() => open("o-signet", [], {
              setCode: "RVR", collectorNumber: "24",
              imageUri: "https://cards.scryfall.io/normal/rvr-24.jpg",
            })}
          >
            open at RVR
          </button>
          <button type="button" onClick={() => open("o-signet", [])}>open plain</button>
        </>
      );
    }
    const { container } = render(
      <CardDetailProvider fetchCard={fetchCard}>
        <Pair />
      </CardDetailProvider>,
    );
    const art = () =>
      [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
        .map((el) => el.style.backgroundImage);

    await click(screen.getByRole("button", { name: "open at RVR" }));
    await screen.findByRole("dialog");
    expect(art().some((b) => b.includes("rvr-24"))).toBe(true);

    await click(screen.getByRole("button", { name: "open plain" }));
    await waitFor(() => expect(art().some((b) => b.includes("rvr-24"))).toBe(false));
  });
});

// The modal's art is asked for on the PRESS, alongside the details read, when the opener knows it:
// otherwise it could only be asked for once the read answered and named the printing.
describe("CardDetailTrigger's art preload", () => {
  // A cached card was drawn when it was cached, and after a printing pick the provider re-reads and
  // re-caches it: so a hit asks for nothing, and an opener's stale URL is never fetched.
  it("asks for nothing when the card is already cached", async () => {
    const asked: string[] = [];
    const Real = window.Image;
    window.Image = class { set src(v: string) { asked.push(v); } } as unknown as typeof Image;
    try {
      const fetchCard = vi.fn(async () => card("o-signet", "Arcane Signet"));
      render(
        <CardDetailProvider fetchCard={fetchCard}>
          <CardDetailTrigger oracleId="o-signet" name="Arcane Signet" imageUri="https://cards.scryfall.io/old.jpg">
            Arcane Signet
          </CardDetailTrigger>
        </CardDetailProvider>,
      );
      const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") });
      await click(trigger);
      expect(asked).toHaveLength(1);
      await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }); });
      await click(trigger);
      expect(asked).toHaveLength(1);
    } finally {
      window.Image = Real;
    }
  });

  it("asks for the art before the details read answers", async () => {
    const asked: string[] = [];
    const Real = window.Image;
    class Spy { set src(v: string) { asked.push(v); } }
    vi.stubGlobal("Image", Spy);
    window.Image = Spy as unknown as typeof Image;
    try {
      // The ORDER: when the details read starts, the art has already been asked for. A read that
      // never answers, so whatever was asked for, the press asked for it.
      const askedWhenReadStarted: number[] = [];
      const fetchCard = vi.fn(() => {
        askedWhenReadStarted.push(asked.length);
        return new Promise<BrowseCard | null>(() => {});
      });
      render(
        <CardDetailProvider fetchCard={fetchCard}>
          <CardDetailTrigger oracleId="o-signet" name="Arcane Signet" imageUri="https://cards.scryfall.io/normal/front/a/b/signet.jpg">
            Arcane Signet
          </CardDetailTrigger>
          <CardDetailTrigger oracleId="o-sol" name="Sol Ring">Sol Ring</CardDetailTrigger>
        </CardDetailProvider>,
      );
      await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
      expect(fetchCard).toHaveBeenCalledTimes(1);
      expect(asked).toEqual(["https://cards.scryfall.io/normal/front/a/b/signet.jpg"]);
      expect(askedWhenReadStarted).toEqual([1]);

      // A trigger that does not know the art asks for nothing.
      await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }));
      expect(asked).toHaveLength(1);
    } finally {
      window.Image = Real;
      vi.unstubAllGlobals();
    }
  });
});
