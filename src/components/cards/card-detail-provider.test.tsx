import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { printingPickerCopy } from "../../lib/copy/collection";
import { cardCarouselCopy } from "../../lib/copy/card-carousel";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const {
  CardDetailProvider, CardDetailTrigger, cardDetailCopy, useCardDetail, INTENT_DELAY_MS, PREFETCH_WAIT_MS,
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

/**
 * The desktop footer's Prev/Next. A sibling known only by id gives the phone's peek the same bare
 * name, and jsdom lays out neither width, so a test that means the footer says so.
 */
function footer(name: "Previous card" | "Next card"): HTMLElement {
  const found = screen.getAllByRole("button", { name }).filter((el) => !el.closest('[data-testid="card-band"]'));
  if (found.length !== 1) throw new Error(`expected one footer "${name}", found ${found.length}`);
  return found[0];
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

    expect(footer("Previous card")).toHaveAttribute("aria-disabled", "true");
    await click(footer("Next card"));

    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Sol Ring"));
    expect(footer("Next card")).toHaveAttribute("aria-disabled", "true");
    expect(footer("Previous card")).toHaveAttribute("aria-disabled", "false");
  });

  // The commander and a suggestion belong to no list; forcing paging there would page
  // through a list of one — decision 6 drops the whole counter and both controls rather
  // than disabling them, so the link beside it stands alone.
  it("draws no carousel at all for a card with no siblings", async () => {
    const fetchCard = vi.fn().mockResolvedValue(SIGNET);
    renderTriggers(fetchCard);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Arcane Signet") }));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Previous card" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next card" })).not.toBeInTheDocument();
    expect(screen.queryByText("1 of 1")).not.toBeInTheDocument();
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
    // A list of one at open: decision 6 draws no carousel, so there is no button yet.
    expect(screen.queryByRole("button", { name: "Next card" })).not.toBeInTheDocument();

    await click(screen.getByRole("button", { name: "refile" }));
    await click(footer("Next card"));
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

    await click(footer("Next card"));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Sol Ring"));
    await click(footer("Previous card"));

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

    await click(footer("Next card"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await click(footer("Previous card"));

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

    await click(footer("Next card"));
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

describe("CardDetailProvider prefetch on intent", () => {
  // jsdom never matches :focus-visible, so keyboard focus is stood in for here; the two cases at
  // the foot put the real answer back to prove a press's own focus reads nothing.
  let keyboard = true;
  const realMatches = Element.prototype.matches;
  beforeEach(() => {
    keyboard = true;
    vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" ? keyboard : realMatches.call(this, selector);
    });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const deferred = () => {
    let resolve!: (c: BrowseCard | null) => void;
    const promise = new Promise<BrowseCard | null>((r) => { resolve = r; });
    return { promise, resolve };
  };
  const pause = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
  const trigger = (name: string) => screen.getByRole("button", { name: cardDetailCopy.triggerAria(name) });
  const mount = (fetchCard: (id: string) => Promise<BrowseCard | null>) =>
    render(
      // One stub behind both reads, so the counts below are every read the provider made.
      <CardDetailProvider fetchCard={fetchCard} prefetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">Arcane Signet</CardDetailTrigger>
        <CardDetailTrigger oracleId="o-sol" name="Sol Ring">Sol Ring</CardDetailTrigger>
        <Evicter oracleId="o-signet" />
      </CardDetailProvider>,
    );

  it("reads a card the pointer rests on, and nothing for a pointer passing over", async () => {
    const fetchCard = vi.fn(async (id: string) => (id === "o-sol" ? SOL : SIGNET));
    mount(fetchCard);
    fireEvent.pointerEnter(trigger("Sol Ring"));
    await pause(INTENT_DELAY_MS / 2);
    fireEvent.pointerLeave(trigger("Sol Ring"));
    await pause(INTENT_DELAY_MS * 2);
    expect(fetchCard).not.toHaveBeenCalled();

    fireEvent.pointerEnter(trigger("Arcane Signet"));
    await pause(INTENT_DELAY_MS * 2);
    expect(fetchCard.mock.calls.map((c) => c[0])).toEqual(["o-signet"]);
  });

  it("reads nothing for a finger resting on a card, which is a tap about to land", async () => {
    const fetchCard = vi.fn(async (_id: string) => SIGNET);
    mount(fetchCard);
    fireEvent.pointerEnter(trigger("Arcane Signet"), { pointerType: "touch" });
    await pause(INTENT_DELAY_MS * 2);
    expect(fetchCard).not.toHaveBeenCalled();
  });

  // A press while its card's prefetch is still reading WAITS on it, for up to PREFETCH_WAIT_MS.
  // Answered in time, no action is sent at all; otherwise the press reads for itself and only its
  // own answer paints, so no action is ever left pending after the modal has moved on.
  const mountSplit = (prefetchCard: (id: string) => Promise<BrowseCard | null>, fetchCard: (id: string) => Promise<BrowseCard | null>) =>
    render(
      <CardDetailProvider prefetchCard={prefetchCard} fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-signet" name="Arcane Signet">Arcane Signet</CardDetailTrigger>
      </CardDetailProvider>,
    );

  it("takes a prefetch that answers within the wait, and sends no action", async () => {
    const guess = deferred();
    const prefetchCard = vi.fn((_id: string) => guess.promise);
    const fetchCard = vi.fn(async (_id: string) => SIGNET_AFTER_WRITE);
    mountSplit(prefetchCard, fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    await act(async () => { guess.resolve(SIGNET); });
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(SIGNET.name);
    expect(fetchCard).not.toHaveBeenCalled();
  });

  it("reads for itself when the prefetch outlasts the wait, and shows only its own answer", async () => {
    const guess = deferred();
    const own = deferred();
    const fetchCard = vi.fn((_id: string) => own.promise);
    mountSplit(() => guess.promise, fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(fetchCard).not.toHaveBeenCalled();
    await pause(PREFETCH_WAIT_MS + 50);
    expect(fetchCard).toHaveBeenCalledTimes(1);
    // The cold prefetch answers while the press's action is pending: it must not paint.
    await act(async () => { guess.resolve(SIGNET); });
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => { own.resolve(SIGNET_AFTER_WRITE); });
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);
  });

  it("never files a late prefetch over the answer the press's own action already filed", async () => {
    const guess = deferred();
    const own = deferred();
    const fetchCard = vi.fn().mockReturnValueOnce(own.promise).mockReturnValue(new Promise(() => {}));
    mountSplit(() => guess.promise, fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    await pause(PREFETCH_WAIT_MS + 50);
    await act(async () => { own.resolve(SIGNET_AFTER_WRITE); });
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Reopened while the prefetch is STILL reading: it paints the action's answer from the cache,
    // and its check read goes to the action rather than joining the older prefetch.
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);
    expect(fetchCard).toHaveBeenCalledTimes(2);
    // The prefetch lands at last, and neither the modal nor the cache moves back to it.
    await act(async () => { guess.resolve(SIGNET); });
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);
  });

  it("never files a late prefetch over a press that found the card missing", async () => {
    const guess = deferred();
    const fetchCard = vi.fn().mockResolvedValueOnce(null).mockReturnValue(new Promise(() => {}));
    mountSplit(() => guess.promise, fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    await pause(PREFETCH_WAIT_MS + 50);
    expect(fetchCard).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The older prefetch lands with a card; the next press must not paint it from the cache.
    await act(async () => { guess.resolve(SIGNET); });
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchCard).toHaveBeenCalledTimes(2);
  });

  it("reads for itself at once when the prefetch fails", async () => {
    const fetchCard = vi.fn(async (_id: string) => SIGNET);
    mountSplit(async () => { throw new Error("route down"); }, fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(SIGNET.name);
    expect(fetchCard).toHaveBeenCalledTimes(1);
  });

  it("paints a prefetched card at the press, before its check read answers", async () => {
    const check = deferred();
    const fetchCard = vi.fn().mockResolvedValueOnce(SIGNET).mockReturnValueOnce(check.promise);
    mount(fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    await act(async () => {});
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET.name);
    expect(fetchCard).toHaveBeenCalledTimes(2);
  });

  it("yields to a read already running, one prefetch at a time", async () => {
    const read = deferred();
    const fetchCard = vi.fn((_id: string) => read.promise);
    mount(fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    fireEvent.focus(trigger("Sol Ring"));
    expect(fetchCard.mock.calls.map((c) => c[0])).toEqual(["o-signet"]);
    await act(async () => { read.resolve(SIGNET); });

    // An open's check read running, and a prefetch asked for an uncached card beside it: the
    // guess waits. Pressed with no focus or pointerdown, so the open is the only read it starts.
    const open = deferred();
    fetchCard.mockReturnValueOnce(open.promise);
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    fireEvent.focus(trigger("Sol Ring"));
    expect(fetchCard.mock.calls.map((c) => c[0])).toEqual(["o-signet", "o-signet"]);
    await act(async () => { open.resolve(SIGNET); });
  });

  it("files nothing, and is not joined, when a write lands under it", async () => {
    const stale = deferred();
    const fetchCard = vi.fn().mockReturnValueOnce(stale.promise).mockResolvedValueOnce(SIGNET_AFTER_WRITE);
    mount(fetchCard);
    fireEvent.focus(trigger("Arcane Signet"));
    fireEvent.click(screen.getByRole("button", { name: "evict" }));
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(fetchCard).toHaveBeenCalledTimes(2);
    await act(async () => { stale.resolve(SIGNET); });
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);

    // The stale answer landed after the fresh one and must not have replaced it: reopened,
    // the card paints from the cache before its check read answers.
    fetchCard.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }); });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await act(async () => { fireEvent.click(trigger("Arcane Signet")); });
    expect(screen.getByRole("dialog")).toHaveAccessibleName(SIGNET_AFTER_WRITE.name);
  });

  // A prefetch the press starts has no head start on the press's own read, so a press never
  // starts one: not its pointerdown, and not the focus the press brings with it.
  it("reads nothing on a press going down", async () => {
    const prefetchCard = vi.fn((_id: string) => deferred().promise);
    mountSplit(prefetchCard, async () => SIGNET);
    fireEvent.pointerDown(trigger("Arcane Signet"));
    expect(prefetchCard).not.toHaveBeenCalled();
  });

  it("reads nothing on focus a pointer brought, and on keyboard focus reads ahead", async () => {
    const prefetchCard = vi.fn((_id: string) => deferred().promise);
    mountSplit(prefetchCard, async () => SIGNET);
    keyboard = false;
    fireEvent.focus(trigger("Arcane Signet"));
    expect(prefetchCard).not.toHaveBeenCalled();
    keyboard = true;
    fireEvent.focus(trigger("Arcane Signet"));
    expect(prefetchCard).toHaveBeenCalledTimes(1);
  });
});

describe("CardDetailProvider reads the neighbors ahead (carousel, H23)", () => {
  afterEach(() => { vi.restoreAllMocks(); });
  const A = card("o-a", "Card A");
  const B = card("o-b", "Card B");
  const C = card("o-c", "Card C");
  const byId: Record<string, BrowseCard> = { "o-a": A, "o-b": B, "o-c": C };
  const mount = (
    oracleId: string,
    siblings: Parameters<typeof CardDetailTrigger>[0]["siblings"],
    prefetchCard: (id: string) => Promise<BrowseCard | null>,
  ) =>
    render(
      <CardDetailProvider fetchCard={async (id) => byId[id] ?? null} prefetchCard={prefetchCard}>
        <CardDetailTrigger oracleId={oracleId} name={byId[oracleId].name} siblings={siblings}>open</CardDetailTrigger>
      </CardDetailProvider>,
    );
  const press = () => act(async () => { fireEvent.click(screen.getByRole("button", { name: /open|Card/ })); });

  it("reads the next card, then the previous one, once a mid-list card arrives", async () => {
    const prefetchCard = vi.fn(async (id: string) => byId[id] ?? null);
    mount("o-b", ["o-a", "o-b", "o-c"], prefetchCard);
    await press();
    await waitFor(() => expect(prefetchCard.mock.calls.map((c) => c[0])).toEqual(["o-c", "o-a"]));
  });

  it("reads only the one neighbor a card at an end has", async () => {
    const prefetchCard = vi.fn(async (id: string) => byId[id] ?? null);
    mount("o-c", ["o-a", "o-b", "o-c"], prefetchCard);
    await press();
    await waitFor(() => expect(prefetchCard).toHaveBeenCalled());
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(prefetchCard.mock.calls.map((c) => c[0])).toEqual(["o-b"]);
  });

  it("reads nothing for a card with no list", async () => {
    const prefetchCard = vi.fn(async (id: string) => byId[id] ?? null);
    mount("o-b", undefined, prefetchCard);
    await press();
    await screen.findByRole("dialog");
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(prefetchCard).not.toHaveBeenCalled();
  });

  it("still reads the neighbors when another card's prefetch was reading as this one arrived", async () => {
    // The provider keeps one speculative read at a time: with an intent prefetch of another card
    // still running when the pressed card arrives, both neighbor reads would start nothing.
    const X = card("o-x", "Card X");
    let releaseX!: () => void;
    const prefetchCard = vi.fn((id: string) =>
      id === "o-x"
        ? new Promise<BrowseCard | null>((r) => { releaseX = () => r(X); })
        : Promise.resolve(byId[id] ?? null));
    render(
      <CardDetailProvider fetchCard={async (id) => byId[id] ?? null} prefetchCard={prefetchCard}>
        <CardDetailTrigger oracleId="o-x" name="Card X">rest here</CardDetailTrigger>
        <CardDetailTrigger oracleId="o-b" name="Card B" siblings={["o-a", "o-b", "o-c"]}>open</CardDetailTrigger>
      </CardDetailProvider>,
    );
    fireEvent.pointerEnter(screen.getByText("rest here"));
    await act(() => new Promise((r) => setTimeout(r, INTENT_DELAY_MS * 2)));
    expect(prefetchCard.mock.calls.map((c) => c[0])).toEqual(["o-x"]);
    await act(async () => { fireEvent.click(screen.getByText("open")); });
    await screen.findByRole("dialog");
    await act(async () => { releaseX(); });
    await waitFor(() => expect(prefetchCard.mock.calls.map((c) => c[0])).toEqual(["o-x", "o-c", "o-a"]));
  });

  it("reads the neighbors ahead on a cache-hit reopen even when the correction re-ask fails", async () => {
    // A cache-hit reopen paints `show(hit)` immediately, then re-asks the server for a correction
    // while `inFlight` stays set — which, on its own, would make `prefetch` bail for both
    // neighbors (a read is already running). If the re-ask fails, nothing else changes `card`
    // again, so the read-ahead effect must retry once that re-ask SETTLES rather than waiting on
    // `card` to change a second time. The first open carries no siblings, so its own read-ahead
    // and cache writes never touch "o-c"/"o-a" — the reopen is the first time either is asked for.
    const prefetchCard = vi.fn(async (id: string) => byId[id] ?? null);
    const fetchCard = vi.fn()
      .mockResolvedValueOnce(B)
      .mockRejectedValueOnce(new Error("offline"));
    render(
      <CardDetailProvider fetchCard={fetchCard} prefetchCard={prefetchCard}>
        <CardDetailTrigger oracleId="o-b" name="Card B">open plain</CardDetailTrigger>
        <CardDetailTrigger oracleId="o-b" name="Card B" siblings={["o-a", "o-b", "o-c"]}>open with list</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await act(async () => { fireEvent.click(screen.getByText("open plain")); });
    await screen.findByRole("dialog");
    expect(prefetchCard).not.toHaveBeenCalled();
    await click(screen.getAllByRole("button", { name: "Close card details" })[0]);

    await act(async () => { fireEvent.click(screen.getByText("open with list")); });
    await screen.findByRole("dialog");
    await waitFor(() => expect(fetchCard).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(prefetchCard.mock.calls.map((c) => c[0])).toEqual(["o-c", "o-a"]));
  });

    it("takes a list of cards carrying art as readily as a list of ids", async () => {
    const prefetchCard = vi.fn(async (id: string) => byId[id] ?? null);
    mount("o-b", [
      { oracleId: "o-a", name: "Card A", imageUri: "https://img/a.jpg", colorIdentity: ["W"] },
      { oracleId: "o-b" },
      "o-c",
    ], prefetchCard);
    await press();
    // The phone's counter plate and the desktop footer both draw it; jsdom lays out neither width.
    expect(await screen.findAllByText("2 of 3")).not.toHaveLength(0);
    await waitFor(() => expect(prefetchCard.mock.calls.map((c) => c[0])).toEqual(["o-c", "o-a"]));
  });
});

describe("CardDetailProvider pages the desktop carousel (H23 PR 2)", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  function stubMinWidth(matches: boolean) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    }));
  }
  const allLive = () =>
    [...document.querySelectorAll('[aria-live="polite"]')].map((el) => el.textContent).join("|");
  const A = card("o-a", "Card A");
  const B = card("o-b", "Card B");
  const C = card("o-c", "Card C");
  const byId: Record<string, BrowseCard> = { "o-a": A, "o-b": B, "o-c": C };
  const siblings = [
    { oracleId: "o-a", name: "Card A", imageUri: "https://img/a.jpg" },
    { oracleId: "o-b", name: "Card B" },
    { oracleId: "o-c", name: "Card C", colorIdentity: ["U"] },
  ];
  const mount = (oracleId: string) =>
    render(
      <CardDetailProvider fetchCard={async (id) => byId[id] ?? null}>
        <CardDetailTrigger oracleId={oracleId} name={byId[oracleId].name} siblings={siblings}>open</CardDetailTrigger>
      </CardDetailProvider>,
    );
  const press = () => act(async () => { fireEvent.click(screen.getByText("open")); });

  it("carries a phone swipe's release offset through to the arriving card's entrance", async () => {
    // End to end: the gesture's `onNext(offset)`, the provider's `enterOffset` state, and the
    // arriving modal's `--enter-x`. Each half has its own test; this one breaks if the bridge does.
    stubMinWidth(false);
    mount("o-b");
    await press();
    const band = await screen.findByTestId("card-band");
    await act(async () => {
      fireEvent.pointerDown(band, { pointerId: 1, clientX: 700, clientY: 300, button: 0, pointerType: "touch" });
      for (let i = 1; i <= 4; i++) {
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 700 - (450 * i) / 4, clientY: 300 + i, pointerType: "touch" });
      }
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 305, pointerType: "touch" });
    });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName(/Card C/));
    const art = screen.getByTestId("modal-art-mobile");
    expect(art).toHaveClass("anim-phone-card-enter");
    expect(art.style.getPropertyValue("--enter-x")).toBe("calc(86.875% + 12px + -450px)");
  });

  it("draws both neighbor plates at the wide threshold, with art and with a gradient", async () => {
    stubMinWidth(true);
    mount("o-b");
    await press();
    await screen.findByRole("dialog");
    const prevPlate = screen.getByRole("button", { name: "Previous card: Card A" });
    const nextPlate = screen.getByRole("button", { name: "Next card: Card C" });
    expect(within(prevPlate).getByText("Card A")).toBeInTheDocument();
    expect(within(nextPlate).getByText("Card C")).toBeInTheDocument();
  });

  it("draws each plate at D1's resting .55 with a hidden chevron toward its side", async () => {
    // jsdom computes no styles, so the specimen's values are read off the classes the plate wears.
    stubMinWidth(true);
    mount("o-b");
    await press();
    await screen.findByRole("dialog");
    for (const [name, glyph] of [["Previous card: Card A", "‹"], ["Next card: Card C", "›"]] as const) {
      const plate = screen.getByRole("button", { name });
      const art = plate.firstElementChild as HTMLElement;
      expect(art).toHaveClass("opacity-[.55]", "group-hover:opacity-[.92]", "rounded-[9px]");
      const chevron = within(plate).getByText(glyph);
      expect(chevron).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("draws a bare plate with no text for a sibling carrying only an id", async () => {
    stubMinWidth(true);
    render(
      <CardDetailProvider fetchCard={async (id) => byId[id] ?? null}>
        <CardDetailTrigger oracleId="o-b" name="Card B" siblings={["o-a", "o-b"]}>open</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await press();
    const dialog = await screen.findByRole("dialog");
    // The footer's own Prev button shares this exact bare label when a sibling carries no
    // name, so the plate is the match OUTSIDE the dialog rather than inside it.
    const prevPlate = screen.getAllByRole("button", { name: cardCarouselCopy.prevAria })
      .find((el) => !dialog.contains(el));
    expect(prevPlate).toBeTruthy();
    expect(within(prevPlate as HTMLElement).queryByText(/./)).not.toBeInTheDocument();
  });

  it("draws no plates under the width threshold", async () => {
    stubMinWidth(false);
    mount("o-b");
    await press();
    await screen.findByRole("dialog");
    // Named with the neighbor's own title, which only a plate or the phone's peek carries. Under
    // the threshold the phone draws its peeks INSIDE the dialog, so a desktop plate, which sits on
    // the backdrop outside it, is what must be absent.
    const dialog = screen.getByRole("dialog");
    const plates = (name: string) => screen.queryAllByRole("button", { name }).filter((el) => !dialog.contains(el));
    expect(plates("Previous card: Card A")).toHaveLength(0);
    expect(plates("Next card: Card C")).toHaveLength(0);
  });

  it("pages when a neighbor plate is pressed", async () => {
    stubMinWidth(true);
    mount("o-b");
    await press();
    await screen.findByRole("dialog");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next card: Card C" }));
    });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Card C"));
  });

  // Pre-open review, round 1: the plates used to be flex siblings of the centered dialog,
  // so a plate present on only one side (every list end) shifted the dialog by its own
  // width-plus-gap. Positioned absolutely from the backdrop's center now, independent of
  // how many plates are drawn.
  it("positions each neighbor plate from the backdrop's center, not as a flex sibling", async () => {
    stubMinWidth(true);
    mount("o-b");
    await press();
    await screen.findByRole("dialog");
    const prevPlate = screen.getByRole("button", { name: "Previous card: Card A" });
    const nextPlate = screen.getByRole("button", { name: "Next card: Card C" });
    expect(prevPlate.className).toContain("absolute");
    expect(nextPlate.className).toContain("absolute");
    expect(prevPlate.style.left).toContain("calc(50% -");
    expect(nextPlate.style.left).toContain("calc(50% +");
  });

  // Pre-open review, round 1: at >=1252px a plate sat beside the zoom layer rather than
  // under it, so it stayed visible and clickable while the zoom was open — pressing one
  // paged the carousel and unmounted the zoom mid-look, contrary to decision 1 ("a look,
  // not a browser").
  it("hides both neighbor plates while the zoom is open", async () => {
    stubMinWidth(true);
    mount("o-b");
    await press();
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Next card: Card C" })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(within(dialog).getAllByRole("button", { name: /^Look at /i })[0]);
    });
    // Named with the neighbor's own title — only a plate ever carries that form, so this
    // cannot collide with the footer's bare "Previous card"/"Next card" buttons, which stay
    // mounted (inert behind the zoom) regardless.
    expect(screen.queryByRole("button", { name: "Previous card: Card A" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next card: Card C" })).not.toBeInTheDocument();
  });

  // Pre-open review, round 1: the arrow-key listener lived on the dialog element alone, so
  // once a peek press moved focus onto the (pressed) plate — a sibling of the dialog, not a
  // descendant — a further arrow key never reached it and paging stalled.
  it("keeps paging on arrow keys after focus has moved to a neighbor plate", async () => {
    stubMinWidth(true);
    mount("o-a");
    await press();
    await screen.findByRole("dialog");
    const nextPlate = screen.getByRole("button", { name: "Next card: Card B" });
    await act(async () => { fireEvent.click(nextPlate); });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Card B"));
    // The remounted instance restores focus to its own peek plate (H23 PR 2), which jsdom's
    // zero-rect layout can't exercise through the real focus-restoration path here — moved
    // by hand instead, to put document.activeElement on an element OUTSIDE the dialog, the
    // exact condition the old dialog-only listener went deaf under.
    const arrivedPlate = screen.getByRole("button", { name: "Next card: Card C" });
    arrivedPlate.focus();
    expect(arrivedPlate).toHaveFocus();
    fireEvent.keyDown(arrivedPlate, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Card C"));
  });

  it("announces the arrival on a page, and nothing new on the first open", async () => {
    stubMinWidth(true);
    mount("o-b");
    await press();
    await screen.findByRole("dialog");
    expect(allLive()).not.toContain(" of ");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: cardCarouselCopy.nextAria }));
    });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Card C"));
    await waitFor(() => expect(allLive()).toContain(cardCarouselCopy.arrived("Card C", 3, 3)));
  });

  it("pages with the arrow keys, and announces an end rather than paging past it", async () => {
    stubMinWidth(true);
    mount("o-a");
    await press();
    await screen.findByRole("dialog");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    await waitFor(() => expect(allLive()).toContain(cardCarouselCopy.firstCard));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Card B"));
  });

  // A click on plain text in the dialog focuses nothing, so focus falls to <body>; the arrow keys
  // must still page from there, and must not page for a key aimed at something else on the page.
  it("keeps paging on arrow keys after a click on plain text drops focus to the body", async () => {
    stubMinWidth(true);
    mount("o-b");
    await press();
    await screen.findByRole("dialog");
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Card C"));
  });

  it("leaves an arrow key alone when it is aimed at something outside the modal", async () => {
    stubMinWidth(true);
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    try {
      mount("o-b");
      await press();
      await screen.findByRole("dialog");
      fireEvent.keyDown(outside, { key: "ArrowRight" });
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByRole("dialog")).toHaveAccessibleName("Card B");
    } finally {
      outside.remove();
    }
  });

  // Pre-open review, round 1: an aria-live region only announces a CHANGE of text, so going
  // straight from one announcement to an identical one — the same end pressed twice, or
  // paging A→B, closing, reopening A and paging to B again — was silent the second time.
  it("re-announces an identical message, by clearing it first", async () => {
    stubMinWidth(true);
    mount("o-a");
    await press();
    await screen.findByRole("dialog");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    await waitFor(() => expect(allLive()).toContain(cardCarouselCopy.firstCard));
    // A second press at the same end repeats the identical message. The clear happens
    // synchronously, before the real text is set on the next frame — a plain repeat of the
    // same `setState` call would skip the render entirely, since React bails out on an
    // unchanged primitive value.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(allLive()).not.toContain(cardCarouselCopy.firstCard);
    await waitFor(() => expect(allLive()).toContain(cardCarouselCopy.firstCard));
  });

  // Pre-open review (H23 PR 2): a page's `load` and a second, unrelated `load` landing on the
  // very card the page was headed to used to leave the first call's paging intent standing,
  // since only the paging handlers ever touched `enterFrom`/`enterTargetId`. A combo-partner
  // click reaching the same card mid-page is the real-world shape; a second, plain
  // `CardDetailTrigger` stands in for it here, since both reach `load` with no `page` argument.
  it("a non-paging read that lands on the card a page was headed to is never announced as one", async () => {
    stubMinWidth(true);
    let resolvePaged!: (c: BrowseCard) => void;
    let resolvePlain!: (c: BrowseCard) => void;
    let calls = 0;
    const fetchCard = vi.fn((id: string) => {
      if (id !== "o-b") return Promise.resolve(byId[id] ?? null);
      calls += 1;
      return new Promise<BrowseCard>((r) => { if (calls === 1) resolvePaged = r; else resolvePlain = r; });
    });
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CardDetailTrigger oracleId="o-a" name="Card A" siblings={siblings}>open</CardDetailTrigger>
        <CardDetailTrigger oracleId="o-b" name="Card B">open plain</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await act(async () => { fireEvent.click(screen.getByText("open")); });
    await screen.findByRole("dialog");
    // Pages toward B; its read is left pending.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: cardCarouselCopy.nextAria }));
    });
    // An unrelated, non-paging read for the SAME card starts and wins the race.
    await act(async () => {
      fireEvent.click(screen.getByText("open plain"));
      resolvePlain(B);
    });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAccessibleName("Card B"));
    expect(allLive()).not.toContain(" of ");
    // The superseded paging read finally resolves too; it must not resurrect the announcement.
    await act(async () => { resolvePaged(B); });
    expect(allLive()).not.toContain(" of ");
  });

  // The exclusion zones themselves (printing search, printing radiogroup, zoom region) are
  // proved against a real overflowing printing list in card-modal.test.tsx, which can build
  // that fixture directly; this provider-level suite only proves arrow keys page at all.
});
