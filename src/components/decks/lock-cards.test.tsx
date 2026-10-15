// Locked (never cut), PRs 4a and 4b: the mark, the rows' and the tiles' lock, the toolbar's Lock cards mode, and the
// sweep that leaves a locked auto card where it is. The leaves are rendered alone where a rule is
// theirs; the mode, the optimism and the sweep go through BuilderShell, because the seam under test
// is the shell's own state feeding the toolbar, the key line and every row at once.
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { proxyCopy } from "../../lib/copy/proxies";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { Availability } from "../../lib/decks/availability";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { recommendedMix } from "../../lib/decks/mix";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { SwapToolsProvider } from "../../lib/swaps/context";

const TEST_MIX = recommendedMix(null, false);

const { setCardLocked, clearAutoCards, addCardToDeck, setBasicQuantity } = vi.hoisted(() => ({
  setCardLocked: vi.fn(),
  clearAutoCards: vi.fn(),
  addCardToDeck: vi.fn(),
  setBasicQuantity: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  setCardLocked,
  clearAutoCards,
  addCardToDeck,
  setBasicQuantity,
  restoreAutoCards: vi.fn(),
  keepAllAutoCards: vi.fn(),
  keepAutoCard: vi.fn(),
  removeCardFromDeck: vi.fn(),
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("../../lib/swaps/actions", () => ({ loadStandInsAction: vi.fn(async () => null), setShoppingLimitAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { LockMark } = await import("./lock-mark");
const { GroupToggle, DECK_VIEW_KEY } = await import("./group-toggle");
const { ClearAutoButton, SweepReceipt } = await import("./clear-auto");
const { buildMarkKeyEntries } = await import("./decklist");
const { DecklistRow } = await import("./decklist-row");
const { DeckCardTile } = await import("./deck-card-tile");
const { PendingChangeProvider } = await import("./pending-change");
const { LockCardsProvider, useCardLocks } = await import("./lock-cards");
const { BuilderShell } = await import("./builder-shell");

afterEach(() => {
  setCardLocked.mockReset();
  clearAutoCards.mockReset();
  addCardToDeck.mockReset();
  setBasicQuantity.mockReset();
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const mk = (id: string, name: string, extra: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: id,
  name,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  ...extra,
});

// ── The glyph ──────────────────────────────────────────────────────────────────

describe("LockMark", () => {
  const ink = () => screen.getByTestId("lock-mark").style.color;

  it("draws closed in --fg-body at rest, exactly as its existing callers draw it", () => {
    render(<LockMark />);
    expect(ink()).toBe("var(--fg-body)");
    expect(screen.getByTestId("lock-mark").dataset.lockState).toBe("closed");
  });

  it("draws open in --fg-faint at rest, and takes the mode's inks inside the mode", () => {
    render(<LockMark open />);
    expect(ink()).toBe("var(--fg-faint)");
    cleanup();
    render(<LockMark tone="mode" />);
    expect(ink()).toBe("var(--accent)");
    cleanup();
    render(<LockMark tone="mode" open />);
    expect(ink()).toBe("var(--fg-muted)");
  });

  it("lifts the shackle's right leg when open, and draws it whole when closed", () => {
    const shackle = (el: HTMLElement) => el.querySelector("[data-lock-part=shackle]")!.getAttribute("d")!;
    const { container } = render(<LockMark open />);
    const open = shackle(container.querySelector<HTMLElement>("[data-testid=lock-mark]")!);
    cleanup();
    const closed = shackle(render(<LockMark />).container.querySelector<HTMLElement>("[data-testid=lock-mark]")!);
    expect(closed).toMatch(/V6$/);
    expect(open).not.toMatch(/V6$/);
    expect(open).toBe(closed.replace(/V6$/, ""));
  });
});

// ── The toolbar ────────────────────────────────────────────────────────────────

const toolbar = {
  allCount: 42,
  shoppingCount: 8,
  grouping: "type" as const,
  onFilterChange: () => {},
  onGroupingChange: () => {},
  view: "list" as const,
  onViewChange: () => {},
  shoppingCards: [],
  sort: { key: "name" as const, direction: "asc" as const },
  onSortChange: () => {},
};
const autoControls = { onClear: () => {}, onKeepAll: () => {} };
const lockButton = () => screen.queryByRole("button", { name: lockedCardsCopy.mode.button });
const doneButton = () => screen.queryByRole("button", { name: lockedCardsCopy.mode.done });

describe("GroupToggle's Lock cards", () => {
  it("is absent with the switch off, and draws no cluster for it", () => {
    render(<GroupToggle {...toolbar} filter="all" />);
    expect(lockButton()).toBeNull();
  });

  it("renders under All even with no auto or kept cards, named by its label alone", () => {
    const onLockModeChange = vi.fn();
    render(<GroupToggle {...toolbar} filter="all" onLockModeChange={onLockModeChange} />);
    const button = lockButton()!;
    expect(button).not.toBeNull();
    // T6: no aria-label and no aria-pressed. The name is the visible label.
    expect(button.getAttribute("aria-label")).toBeNull();
    expect(button.getAttribute("aria-pressed")).toBeNull();
    expect(button.className).toContain("min-w-[116px]");
    fireEvent.click(button);
    expect(onLockModeChange).toHaveBeenCalledWith(true);
  });

  it("is absent under Shopping, not disabled", () => {
    render(<GroupToggle {...toolbar} filter="shopping" onLockModeChange={() => {}} />);
    expect(lockButton()).toBeNull();
    expect(doneButton()).toBeNull();
  });

  it("reads Done in accent while on, and leaves Keep all and Clear in place, disabled", () => {
    const onLockModeChange = vi.fn();
    render(
      <GroupToggle
        {...toolbar}
        filter="all"
        autoCount={4}
        keptCount={2}
        autoControls={autoControls}
        lockMode
        onLockModeChange={onLockModeChange}
      />,
    );
    const done = doneButton()!;
    expect(done.className).toContain("text-accent");
    expect(done.className).toContain("border-accent");
    expect(screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria("4") })).toBeDisabled();
    expect(screen.getByRole("button", { name: recommendationsCopy.auto.clearAllAria("4") })).toBeDisabled();
    fireEvent.click(done);
    expect(onLockModeChange).toHaveBeenCalledWith(false);
  });

  it("stands down while Keep all's question is open, and returns when it closes", async () => {
    render(
      <GroupToggle {...toolbar} filter="all" autoCount={4} autoControls={autoControls} onLockModeChange={() => {}} />,
    );
    expect(lockButton()).not.toBeNull();
    await act(async () => {
      screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria("4") }).click();
    });
    expect(lockButton()).toBeNull();
    await act(async () => {
      screen.getByRole("button", { name: recommendationsCopy.auto.keepAllConfirmNo }).click();
    });
    expect(lockButton()).not.toBeNull();
  });

  it("is the last child of cluster 2, after the bulk pair", () => {
    render(
      <GroupToggle {...toolbar} filter="all" autoCount={4} autoControls={autoControls} onLockModeChange={() => {}} />,
    );
    const clear = screen.getByRole("button", { name: recommendationsCopy.auto.clearAllAria("4") });
    const lock = lockButton()!;
    expect(clear.compareDocumentPosition(lock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Inside cluster 2's wrapper, which also holds the bulk pair.
    const cluster = lock.parentElement!;
    expect(cluster.contains(clear)).toBe(true);
    expect(cluster.lastElementChild).toBe(lock);
  });
});

// ── Clear all auto (T5) ────────────────────────────────────────────────────────

describe("ClearAutoButton with locked auto cards", () => {
  const base = { keptCount: 0, onClear: () => {}, pending: false, onKeepAll: () => {}, keepAllPending: false };

  it("counts the clearable copies on Clear and every auto copy on Keep", () => {
    render(<ClearAutoButton {...base} count={5} lockedCount={2} />);
    const clear = screen.getByRole("button", { name: recommendationsCopy.auto.clearAllAriaLocked("3", "2") });
    expect(clear).toHaveTextContent(recommendationsCopy.auto.clearAll("3"));
    expect(screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria("5") })).toBeInTheDocument();
  });

  it("drops Clear when every auto card left is locked, and keeps Keep all", () => {
    render(<ClearAutoButton {...base} count={3} lockedCount={3} />);
    expect(screen.queryByText(recommendationsCopy.auto.clearAll("0"))).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria("3") })).toBeEnabled();
  });

  it("is busy while the Lock cards mode is on", () => {
    render(<ClearAutoButton {...base} count={3} lockMode />);
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });

  // A sweep that reached the deck row before a lock write would take a card the client already
  // draws as locked, and its receipt would count it as one that stayed. So Clear waits for every
  // lock write to settle, even after Done.
  it("is busy while a lock write is still in flight", () => {
    const writing = { mode: false, toggle: () => {}, pending: new Set(["o1"]), errors: new Map<string, string>() };
    render(
      <LockCardsProvider value={writing}>
        <ClearAutoButton {...base} count={3} lockedCount={1} />
      </LockCardsProvider>,
    );
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });
});

describe("SweepReceipt's locked clause (L3, T2)", () => {
  it("adds the clause after a middot, the separator inside the second nowrap clause", () => {
    render(<SweepReceipt removed={38} stayed={2} onUndo={() => {}} />);
    const clause = screen.getByTestId("sweep-receipt-locked");
    expect(clause.textContent).toBe(`· ${recommendationsCopy.auto.sweptLeftLocked("2")}`);
    expect(clause.className).toContain("whitespace-nowrap");
    const first = screen.getByText(recommendationsCopy.auto.swept("38"));
    expect(first.className).toContain("whitespace-nowrap");
  });

  it("draws no clause at zero", () => {
    render(<SweepReceipt removed={38} onUndo={() => {}} />);
    expect(screen.queryByTestId("sweep-receipt-locked")).toBeNull();
    expect(screen.queryByText(/·/)).toBeNull();
  });
});

// ── The key ────────────────────────────────────────────────────────────────────

describe("the key's locked entry", () => {
  const ids = (cards: DeckDetailCard[], inCardView = false) =>
    buildMarkKeyEntries({ cards, filter: "all", inCardView }).map((e) => e.id);

  it("glosses the lock only when the view holds a locked card", () => {
    expect(ids([mk("a", "A")])).not.toContain("locked");
    expect(ids([mk("a", "A", { locked: true })])).toContain("locked");
    const entry = buildMarkKeyEntries({ cards: [mk("a", "A", { locked: true })], filter: "all", inCardView: false }).find(
      (e) => e.id === "locked",
    )!;
    expect(entry.word).toBe(lockedCardsCopy.mark.key);
  });

  // Since 4b the tiles draw the lock on their meta line, so the card view's key glosses it too,
  // on the same condition.
  it("glosses the lock in the card view too, when the view holds a locked card", () => {
    expect(ids([mk("a", "A", { locked: true })], true)).toContain("locked");
    expect(ids([mk("a", "A")], true)).not.toContain("locked");
  });
});

// ── The row ────────────────────────────────────────────────────────────────────

type Lock = React.ComponentProps<typeof LockCardsProvider>["value"];
const lockValue = (over: Partial<NonNullable<Lock>> = {}): NonNullable<Lock> => ({
  mode: false,
  toggle: vi.fn(),
  pending: new Set(),
  errors: new Map(),
  ...over,
});
function renderRow(ui: React.ReactNode, lock: Lock) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <LockCardsProvider value={lock}>{ui}</LockCardsProvider>
    </CardDetailProvider>,
  );
}
const trigger = () => screen.getByRole("button", { name: /Sol Ring/, description: /./ });

describe("DecklistRow's lock", () => {
  const sol = mk("sol-ring", "Sol Ring");

  it("draws nothing of the lock with the switch off", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...sol, locked: true }} newestAsOf={null} />, null);
    expect(screen.queryByTestId("row-lock-mark")).toBeNull();
    expect(screen.queryByTestId("lock-mark")).toBeNull();
    expect(screen.queryByText(lockedCardsCopy.mark.a11y)).toBeNull();
  });

  // Hugh, staging walk 2026-09-25: no hover shortcut and no reserved slot. Lock cards mode is the
  // one way to set a lock, and an unlocked row reserves nothing at either width.
  it("gives an unlocked row nothing of the lock outside the mode: no control, no slot", () => {
    const lock = lockValue();
    const { container } = renderRow(<DecklistRow deckId="d1" card={sol} newestAsOf={null} />, lock);
    expect(screen.queryByTestId("row-lock-mark")).toBeNull();
    expect(screen.queryByTestId("lock-mark")).toBeNull();
    // Nothing 22px wide stands in for it either (the retired slot's width).
    expect(container.querySelector('[class*="w-[22px]"]')).toBeNull();
    expect(lock.toggle).not.toHaveBeenCalled();
  });

  it("draws a locked row's 14px mark left of the ✕ at both widths, as a mark and not a control", () => {
    const lock = lockValue();
    const card = { ...sol, locked: true };
    renderRow(<DecklistRow deckId="d1" card={card} newestAsOf={null} />, lock);
    const mark = screen.getByTestId("row-lock-mark");
    expect(mark.className).toContain("w-[14px]");
    // Both widths: no `md:hidden` or `hidden md:` on it.
    expect(mark.className).not.toMatch(/(^|\s)(md:hidden|hidden)(\s|$)/);
    expect(mark.closest("button")).toBeNull();
    expect(within(mark).getByTestId("lock-mark").dataset.lockState).toBe("closed");
    expect(within(mark).getByTestId("lock-mark").style.color).toBe("var(--fg-body)");
    // The mark sits just left of the ✕, which stays at rest.
    const remove = screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") });
    expect(mark.nextElementSibling).toBe(remove);
  });

  it("says the lock on the trigger's description, right after the availability word", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...sol, locked: true }} newestAsOf={null} />, lockValue());
    const ids = trigger().getAttribute("aria-describedby")!.split(" ");
    expect(document.getElementById(ids[0])!.textContent).toBe("Owned");
    expect(document.getElementById(ids[1])!.textContent).toBe(lockedCardsCopy.mark.a11y);
  });

  it("turns the ✕ into a pressed lock toggle in the mode", () => {
    const lock = lockValue({ mode: true });
    renderRow(<DecklistRow deckId="d1" card={{ ...sol, locked: true }} newestAsOf={null} />, lock);
    expect(screen.queryByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeNull();
    // The at-rest mark gives way to the toggle, which carries the state itself.
    expect(screen.queryByTestId("row-lock-mark")).toBeNull();
    const toggle = screen.getByRole("button", { name: lockedCardsCopy.mode.toggleAria("Sol Ring") });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(within(toggle).getByTestId("lock-mark").style.color).toBe("var(--accent)");
    fireEvent.click(toggle);
    expect(lock.toggle).toHaveBeenCalledOnce();
  });

  it("draws an unlocked row's toggle open and unpressed", () => {
    renderRow(<DecklistRow deckId="d1" card={sol} newestAsOf={null} />, lockValue({ mode: true }));
    const toggle = screen.getByRole("button", { name: lockedCardsCopy.mode.toggleAria("Sol Ring") });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(within(toggle).getByTestId("lock-mark").dataset.lockState).toBe("open");
  });

  it("says a refused lock under the row", () => {
    renderRow(
      <DecklistRow deckId="d1" card={sol} newestAsOf={null} />,
      lockValue({ errors: new Map([["sol-ring", lockedCardsCopy.mode.refused]]) }),
    );
    expect(screen.getByText(lockedCardsCopy.mode.refused)).toBeInTheDocument();
  });

  describe("on the Shopping list, over the limit", () => {
    const asOf = new Date("2026-09-20T00:00:00Z");
    const over = { ...sol, owned: false, price: { cents: 1500, foilCents: null, etchedCents: null, asOf } };
    const swap = () => screen.queryByRole("button", { name: swapToolsCopy.row.swapOverAria("Sol Ring", "$10") });
    const inTools = (card: DeckDetailCard) =>
      renderRow(
        <SwapToolsProvider deckId="d1" deckName="Test deck" storedLimitCents={null}>
          <DecklistRow deckId="d1" card={card} shoppingFigure={24} inShopping newestAsOf={asOf} />
        </SwapToolsProvider>,
        lockValue(),
      );

    it("keeps the ⇄ on an unlocked row", () => {
      inTools(over);
      expect(swap()).not.toBeNull();
    });

    it("drops the ⇄ on a locked row and keeps its slot", () => {
      const { container } = inTools({ ...over, locked: true });
      expect(swap()).toBeNull();
      // The desktop slot the ⇄ would have filled, empty, so every ✕ stays in one column.
      expect(container.querySelector("span.hidden.md\\:block.w-\\[22px\\]")).not.toBeNull();
    });
  });
});


// ── The tile (PR 4b) ───────────────────────────────────────────────────────────

const tileTrigger = () => screen.getByRole("button", { name: /Sol Ring/, description: /./ });

describe("DeckCardTile's lock", () => {
  const sol = mk("sol-ring", "Sol Ring", { imageUri: "https://cards.example/sol-ring.jpg" });

  it("draws nothing of the lock with the switch off", () => {
    renderRow(<DeckCardTile deckId="d1" card={{ ...sol, locked: true }} />, null);
    expect(screen.queryByTestId("tile-lock-mark")).toBeNull();
    expect(screen.queryByTestId("lock-mark")).toBeNull();
    expect(screen.queryByTestId("tile-lock-toggle")).toBeNull();
    expect(screen.queryByText(lockedCardsCopy.mark.a11y)).toBeNull();
    expect(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeInTheDocument();
  });

  it("draws nothing of the lock on an unlocked tile at rest: no hover shortcut, the ✕ column whole", () => {
    renderRow(<DeckCardTile deckId="d1" card={sol} />, lockValue());
    expect(screen.queryByTestId("lock-mark")).toBeNull();
    expect(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeInTheDocument();
  });

  it("draws the closed lock at rest on the meta line, after the dot and slot and before the facts", () => {
    const availability: Availability = { owned: 1, hard: 0, soft: 0, free: -1, claims: [] };
    renderRow(
      <DeckCardTile deckId="d1" card={{ ...sol, locked: true, availability, facts: ["gameChanger"] }} />,
      lockValue(),
    );
    const mark = screen.getByTestId("tile-lock-mark");
    expect(within(mark).getByTestId("lock-mark").dataset.lockState).toBe("closed");
    expect(within(mark).getByTestId("lock-mark").style.color).toBe("var(--fg-body)");
    expect(within(mark).getByTestId("lock-mark").getAttribute("title")).toBe(lockedCardsCopy.mark.title);
    const line = mark.parentElement!;
    const children = [...line.children];
    const facts = screen.getByTestId("tile-fact-marks");
    // The dot and the availability chip come first, and the facts after the lock.
    const chip = children.findIndex((el) => /short/.test(el.textContent ?? ""));
    expect(chip).toBeGreaterThan(0);
    expect(children.indexOf(mark)).toBeGreaterThan(chip);
    expect(children.indexOf(facts)).toBeGreaterThan(children.indexOf(mark));
    // The ✕ stays at rest.
    expect(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeInTheDocument();
  });

  // F8: the fullest meta line (dot, a claimed chip, a count and three fact marks) keeps the lock.
  // jsdom lays nothing out, so this asserts the TRUNCATION ORDER the layout follows: the lock is
  // rigid, and the facts are the one group on the line that shrinks, dropping whole marks into a
  // clipped second line. The probe measures it at 390.
  it("keeps the lock on the fullest meta line, where only the facts give way (F8)", () => {
    const availability: Availability = { owned: 1, hard: 0, soft: 0, free: -1, claims: [] };
    renderRow(
      <DeckCardTile
        deckId="d1"
        card={{
          ...sol,
          locked: true,
          quantity: 2,
          availability,
          facts: ["gameChanger", "extraTurns", "tutor"],
        }}
      />,
      lockValue(),
    );
    const mark = screen.getByTestId("tile-lock-mark");
    expect(mark.className.split(" ")).toContain("flex-none");
    const facts = screen.getByTestId("tile-fact-marks");
    // A zero-width lead, then the three marks, each whole and rigid.
    const [lead, ...marks] = [...facts.children];
    expect(lead.getAttribute("data-testid")).toBe("tile-fact-lead");
    expect(lead.className.split(" ")).toEqual(expect.arrayContaining(["w-0", "flex-none"]));
    expect(marks).toHaveLength(3);
    for (const m of marks) expect(m.className.split(" ")).toContain("flex-none");
    for (const c of ["min-w-0", "flex-wrap", "overflow-hidden", "h-[16px]"]) expect(facts.className.split(" ")).toContain(c);
    // Every other in-flow item on the line is rigid, so the facts absorb the whole deficit.
    const line = mark.parentElement!;
    const rigid = [...line.children].filter(
      (el) => el !== facts && !el.classList.contains("sr-only"),
    );
    // The dot, the over chip, the count and the lock.
    expect(rigid).toHaveLength(4);
    // The item ITSELF, never a descendant: an inner span that is flex-none says nothing about
    // whether the box the line lays out can shrink.
    for (const el of rigid) expect(el.classList.contains("flex-none"), el.outerHTML.slice(0, 80)).toBe(true);
  });

  it("says the lock on the trigger's description, before the draft's", () => {
    renderRow(
      <PendingChangeProvider value={{ moves: new Map([[sol.oracleId, { from: 0, to: 1 }]]) }}>
        <DeckCardTile deckId="d1" card={{ ...sol, locked: true }} />
      </PendingChangeProvider>,
      lockValue(),
    );
    const ids = tileTrigger().getAttribute("aria-describedby")!.split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0])!.textContent).toBe(lockedCardsCopy.mark.a11y);
    expect(document.getElementById(ids[1])!.textContent).not.toBe(lockedCardsCopy.mark.a11y);
  });

  it("turns the ✕ column into a pressed lock toggle in the mode, and hides the meta-line lock", () => {
    const lock = lockValue({ mode: true });
    renderRow(<DeckCardTile deckId="d1" card={{ ...sol, locked: true }} />, lock);
    expect(screen.queryByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeNull();
    expect(screen.queryByTestId("tile-lock-mark")).toBeNull();
    const toggle = screen.getByRole("button", { name: lockedCardsCopy.mode.toggleAria("Sol Ring") });
    expect(toggle.dataset.testid).toBe("tile-lock-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    // The column keeps the ✕'s widths and is drawn at rest, not on hover.
    expect(toggle.className).toContain("w-[44px]");
    expect(toggle.className).toContain("md:w-[32px]");
    expect(toggle.className).not.toContain("opacity-0");
    const box = toggle.firstElementChild!;
    for (const c of ["w-[36px]", "h-[36px]", "md:w-[26px]", "md:h-[24px]", "border-accent"]) {
      expect(box.className).toContain(c);
    }
    expect(within(toggle).getByTestId("lock-mark").style.color).toBe("var(--accent)");
    // Still described as locked while the drawn mark gives way to the toggle.
    const ids = tileTrigger().getAttribute("aria-describedby")!.split(" ");
    expect(document.getElementById(ids[0])!.textContent).toBe(lockedCardsCopy.mark.a11y);
    fireEvent.click(toggle);
    expect(lock.toggle).toHaveBeenCalledOnce();
  });

  it("draws an unlocked tile's toggle open and unpressed, on a --border-strong box", () => {
    renderRow(<DeckCardTile deckId="d1" card={sol} />, lockValue({ mode: true }));
    const toggle = screen.getByTestId("tile-lock-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.firstElementChild!.className).toContain("border-border-strong");
    expect(within(toggle).getByTestId("lock-mark").dataset.lockState).toBe("open");
  });

  it("says a refused lock under the tile", () => {
    renderRow(
      <DeckCardTile deckId="d1" card={sol} />,
      lockValue({ errors: new Map([["sol-ring", lockedCardsCopy.mode.refused]]) }),
    );
    expect(screen.getByText(lockedCardsCopy.mode.refused)).toBeInTheDocument();
  });
});

// ── Through the shell ──────────────────────────────────────────────────────────

function makeDeck(cards: DeckDetailCard[]): DeckDetail {
  const built = cards.reduce((n, c) => n + c.quantity, 0);
  return {
    id: "deck-lock",
    name: "Test Deck",
    createdAt: new Date("2026-01-01"),
    commander: {
      oracleId: "commander-id",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
      artCropUri: null,
    },
    partner: null,
    filled: true,
    cards,
    built,
    ownedCount: built,
    coveredCount: built,
    toBuyCount: 0,
    total: built,
    unresolvedRows: [],
    declaredBracket: null,
    intent: null,
    intentSeeded: false,
    noteCounts: { gameChanger: 0, extraTurns: 0, tutor: 0 },
  } as DeckDetail;
}

function renderShell(cards: DeckDetailCard[], neverCut = true) {
  return render(
    <BuilderShell
      mix={TEST_MIX}
      deck={makeDeck(cards)}
      suggestions={[]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={false}
      newestAsOf={null}
      neverCut={neverCut}
    />,
  );
}
const toggleFor = (name: string) => screen.getByRole("button", { name: lockedCardsCopy.mode.toggleAria(name) });
const liveRegion = () => document.querySelector<HTMLElement>("[aria-live=polite][aria-atomic=true]")!;

describe("the Lock cards mode, through BuilderShell", () => {
  const sol = mk("sol-ring", "Sol Ring");
  const signet = mk("arcane-signet", "Arcane Signet");

  it("draws none of it with the switch off", () => {
    renderShell([sol, signet], false);
    expect(lockButton()).toBeNull();
    expect(screen.queryByTestId("row-lock-mark")).toBeNull();
  });

  it("enters and leaves the mode, saying so in the live region", async () => {
    renderShell([sol, signet]);
    await act(async () => lockButton()!.click());
    expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceEnter);
    expect(doneButton()).not.toBeNull();
    expect(toggleFor("Sol Ring")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeNull();
    await act(async () => doneButton()!.click());
    expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceLeave);
    expect(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeInTheDocument();
  });

  // Both are laid in one grid cell so the slot never changes height (Hugh, 2026-09-26: entering the
  // mode moved the list); the one not in force is `invisible`, which is visibility:hidden and so out
  // of the tab order and the accessibility tree. jsdom computes no styles, so the class is the read.
  it("draws the key line OR the mode's line, never both, in one slot", async () => {
    renderShell([{ ...sol, locked: true }, signet]);
    const key = () => screen.getByRole("group", { name: proxyCopy.key.regionAria });
    const line = () => screen.getByTestId("lock-mode-line");
    const hidden = (el: HTMLElement) => el.parentElement!.className.includes("invisible");
    expect(within(key()).getByText(lockedCardsCopy.mark.key)).toBeInTheDocument();
    expect(hidden(key())).toBe(false);
    expect(hidden(line())).toBe(true);
    expect(key().parentElement!.parentElement).toBe(line().parentElement!.parentElement);
    await act(async () => lockButton()!.click());
    expect(hidden(key())).toBe(true);
    expect(hidden(line())).toBe(false);
    expect(line().textContent).toBe(`${lockedCardsCopy.mode.line} ${lockedCardsCopy.mode.count(1)}`);
  });

  // A deck with nothing to key (no lock, nothing to buy or print, no fact marks) still holds the
  // slot, blank until the press, so the mode's line cannot push the list down when it appears.
  it("holds the slot on a deck with no key, blank until the press", async () => {
    renderShell([sol, signet]);
    expect(screen.queryByRole("group", { name: proxyCopy.key.regionAria })).toBeNull();
    const line = () => screen.getByTestId("lock-mode-line");
    expect(line().parentElement!.className).toContain("invisible");
    await act(async () => lockButton()!.click());
    expect(line().parentElement!.className).not.toContain("invisible");
  });

  // Shopping has no mode, so it holds no slot for one: its key keeps its own size.
  it("holds no mode slot under Shopping", async () => {
    renderShell([sol, { ...signet, owned: false }]);
    expect(screen.queryByTestId("lock-mode-line")).not.toBeNull();
    await act(async () => screen.getAllByRole("tab", { name: /^Shopping/ })[0].click());
    expect(screen.queryByTestId("lock-mode-line")).toBeNull();
  });

  it("locks at once, holds the lock once the server agrees, and announces it", async () => {
    const write = deferred<DeckMutationResult>();
    setCardLocked.mockReturnValue(write.promise);
    renderShell([sol, signet]);
    await act(async () => lockButton()!.click());
    await act(async () => toggleFor("Sol Ring").click());
    expect(setCardLocked).toHaveBeenCalledWith("deck-lock", "sol-ring", true);
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("lock-mode-line").textContent).toContain(lockedCardsCopy.mode.count(1));
    await act(async () => write.resolve({ ok: true }));
    // The reply carries no fresh rows (the revalidation is deferred), so the lock must not snap back.
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
    expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceLocked("Sol Ring"));
  });

  it("lets a NEW server list speak for the lock once the write has settled", async () => {
    // A later write's re-render reads the lock back from the table, so the fresh list is the
    // answer: an override kept past it would outvote a lock that later left with its card.
    setCardLocked.mockResolvedValue({ ok: true });
    const view = renderShell([sol, signet]);
    await act(async () => lockButton()!.click());
    await act(async () => toggleFor("Sol Ring").click());
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      view.rerender(
        <BuilderShell
          mix={TEST_MIX}
          deck={makeDeck([{ ...sol, locked: false }, signet])}
          suggestions={[]}
          degraded={false}
          firstRun={false}
          commanderIdentity={["B", "R", "G"]}
          arrivedFromImport={false}
          newestAsOf={null}
          neverCut
        />,
      );
    });
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("false");
  });

  it("reverts a refused lock and says why under the row", async () => {
    const write = deferred<DeckMutationResult>();
    setCardLocked.mockReturnValue(write.promise);
    renderShell([sol, signet]);
    await act(async () => lockButton()!.click());
    await act(async () => toggleFor("Sol Ring").click());
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
    await act(async () => write.resolve({ ok: false, message: lockedCardsCopy.mode.refused }));
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText(lockedCardsCopy.mode.refused)).toBeInTheDocument();
  });

  it("unlocks a locked card, and announces that it can be cut again", async () => {
    setCardLocked.mockResolvedValue({ ok: true });
    renderShell([{ ...sol, locked: true }, signet]);
    await act(async () => lockButton()!.click());
    await act(async () => toggleFor("Sol Ring").click());
    expect(setCardLocked).toHaveBeenCalledWith("deck-lock", "sol-ring", false);
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("false");
    expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceUnlocked("Sol Ring"));
  });

  it("serialises a card's writes: a second press while one is in flight is ignored", async () => {
    const write = deferred<DeckMutationResult>();
    setCardLocked.mockReturnValue(write.promise);
    renderShell([sol, signet]);
    await act(async () => lockButton()!.click());
    await act(async () => toggleFor("Sol Ring").click());
    await act(async () => toggleFor("Sol Ring").click());
    expect(setCardLocked).toHaveBeenCalledOnce();
    expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
    await act(async () => write.resolve({ ok: true }));
  });

  it("ends the mode on a switch to Shopping", async () => {
    renderShell([sol, signet]);
    await act(async () => lockButton()!.click());
    await act(async () => screen.getByRole("tab", { name: /^Shopping/ }).click());
    expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceLeave);
    await act(async () => screen.getByRole("tab", { name: /^All/ }).click());
    expect(lockButton()).not.toBeNull();
    expect(doneButton()).toBeNull();
  });

  // Since 4b the mode is KEPT across List and Card (the addendum's rule): the tiles' ✕ columns are
  // toggles there as the rows' ✕ are here, and a tile's toggle locks exactly as a row's does.
  describe("across List and Card", () => {
    afterEach(() => window.localStorage.removeItem(DECK_VIEW_KEY));

    it("keeps the mode on a switch to Card, where every tile's ✕ column is a toggle", async () => {
      const write = deferred<DeckMutationResult>();
      setCardLocked.mockReturnValue(write.promise);
      renderShell([sol, signet]);
      await act(async () => lockButton()!.click());
      await act(async () => screen.getByRole("button", { name: viewToggleCopy.deck.card }).click());
      expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceEnter);
      expect(doneButton()).not.toBeNull();
      expect(screen.getByTestId("lock-mode-line")).toBeInTheDocument();
      expect(screen.getAllByTestId("tile-lock-toggle")).toHaveLength(2);
      expect(screen.queryByTestId("row-lock-toggle")).toBeNull();
      await act(async () => toggleFor("Sol Ring").click());
      expect(setCardLocked).toHaveBeenCalledWith("deck-lock", "sol-ring", true);
      expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByTestId("lock-mode-line").textContent).toContain(lockedCardsCopy.mode.count(1));
      await act(async () => write.resolve({ ok: true }));
      expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceLocked("Sol Ring"));
      // Back to List, still in the mode, and the row reads the tile's lock.
      await act(async () => screen.getByRole("button", { name: viewToggleCopy.deck.list }).click());
      expect(doneButton()).not.toBeNull();
      expect(toggleFor("Sol Ring").dataset.testid).toBe("row-lock-toggle");
      expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
    });

    it("reverts a refused tile toggle and says why under the tile", async () => {
      const write = deferred<DeckMutationResult>();
      setCardLocked.mockReturnValue(write.promise);
      renderShell([sol, signet]);
      await act(async () => screen.getByRole("button", { name: viewToggleCopy.deck.card }).click());
      await act(async () => lockButton()!.click());
      await act(async () => toggleFor("Sol Ring").click());
      expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
      await act(async () => write.resolve({ ok: false, message: lockedCardsCopy.mode.refused }));
      expect(toggleFor("Sol Ring").dataset.testid).toBe("tile-lock-toggle");
      expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("false");
      expect(screen.getByText(lockedCardsCopy.mode.refused)).toBeInTheDocument();
    });

    it("offers Lock cards in the card view, and the key there glosses a locked tile", async () => {
      renderShell([{ ...sol, locked: true }, signet]);
      await act(async () => screen.getByRole("button", { name: viewToggleCopy.deck.card }).click());
      expect(lockButton()).not.toBeNull();
      const key = screen.getByRole("group", { name: proxyCopy.key.regionAriaCards });
      expect(within(key).getByText(lockedCardsCopy.mark.key)).toBeInTheDocument();
      expect(screen.getAllByTestId("tile-lock-mark")).toHaveLength(1);
      await act(async () => lockButton()!.click());
      expect(screen.queryByTestId("tile-lock-mark")).toBeNull();
      expect(toggleFor("Sol Ring").getAttribute("aria-pressed")).toBe("true");
    });
  });
});

describe("Clear all auto leaves a locked auto card, through BuilderShell (L3)", () => {
  const lockedAuto = mk("sol-ring", "Sol Ring", { auto: true, locked: true });
  const auto = mk("arcane-signet", "Arcane Signet", { auto: true });

  it("counts the clearable copies, keeps the locked card on screen, and names it in the receipt", async () => {
    const sweep = deferred<{ oracleId: string; quantity: number }[]>();
    clearAutoCards.mockReturnValue(sweep.promise);
    renderShell([lockedAuto, auto]);
    const clear = screen.getByRole("button", { name: recommendationsCopy.auto.clearAllAriaLocked("1", "1") });
    expect(screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria("2") })).toBeInTheDocument();
    await act(async () => clear.click());
    // The prediction keeps the locked card and takes the other.
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.queryByText("Arcane Signet")).toBeNull();
    await act(async () => sweep.resolve([{ oracleId: "arcane-signet", quantity: 1 }]));
    expect(screen.getByTestId("sweep-receipt-locked").textContent).toContain(
      recommendationsCopy.auto.sweptLeftLocked("1"),
    );
    expect(liveRegion().textContent).toContain(recommendationsCopy.auto.sweptLeftLocked("1"));
  });

  it("offers no Clear once every auto card is locked", () => {
    renderShell([lockedAuto]);
    expect(screen.queryByText(recommendationsCopy.auto.clearAll("0"))).toBeNull();
    expect(screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria("1") })).toBeInTheDocument();
  });

  it("keeps a card locked on THIS visit out of the sweep's prediction too", async () => {
    setCardLocked.mockResolvedValue({ ok: true });
    const sweep = deferred<{ oracleId: string; quantity: number }[]>();
    clearAutoCards.mockReturnValue(sweep.promise);
    renderShell([mk("sol-ring", "Sol Ring", { auto: true }), auto]);
    await act(async () => lockButton()!.click());
    await act(async () => toggleFor("Sol Ring").click());
    await act(async () => doneButton()!.click());
    await act(async () => screen.getByRole("button", { name: recommendationsCopy.auto.clearAllAriaLocked("1", "1") }).click());
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.queryByText("Arcane Signet")).toBeNull();
    await act(async () => sweep.resolve([{ oracleId: "arcane-signet", quantity: 1 }]));
  });
});

// A lock write that settles after a client navigation to another deck belongs to the deck it was
// pressed on: its refusal is not drawn and its announcement is not said on the new one.
describe("a lock write that settles on another deck", () => {
  const card = mk("o1", "Sol Ring");
  // One array for the whole run: a new one per render is a new server list every render.
  const list = [card];
  it("draws no error and says nothing there", async () => {
    const held = deferred<DeckMutationResult>();
    setCardLocked.mockReturnValue(held.promise);
    const announce = vi.fn();
    const { result, rerender } = renderHook(
      ({ deckId }) => useCardLocks({ enabled: true, deckId, cards: list, serverCards: list, announce }),
      { initialProps: { deckId: "deck-a" } },
    );
    act(() => result.current.value!.toggle(card));
    rerender({ deckId: "deck-b" });
    await act(async () => held.resolve({ ok: false, message: "refused" }));
    expect(result.current.value!.errors.size).toBe(0);
    expect(announce).not.toHaveBeenCalled();
  });

  // In flight is per deck AND card: a write still pending on deck A holds neither deck B's bulk
  // pair busy nor the same card's toggle there.
  it("keeps a write in flight on one deck from blocking the same card on another", async () => {
    const held = deferred<DeckMutationResult>();
    setCardLocked.mockReturnValue(held.promise);
    const { result, rerender } = renderHook(
      ({ deckId }) => useCardLocks({ enabled: true, deckId, cards: list, serverCards: list, announce: vi.fn() }),
      { initialProps: { deckId: "deck-a" } },
    );
    act(() => result.current.value!.toggle(card));
    expect(result.current.value!.pending.has("o1")).toBe(true);
    rerender({ deckId: "deck-b" });
    expect(result.current.value!.pending.size).toBe(0);
    act(() => result.current.value!.toggle(card));
    expect(setCardLocked).toHaveBeenCalledTimes(2);
    expect(setCardLocked).toHaveBeenLastCalledWith("deck-b", "o1", true);
    await act(async () => held.resolve({ ok: true }));
  });

  it("does not announce a lock that succeeded after the switch either", async () => {
    const held = deferred<DeckMutationResult>();
    setCardLocked.mockReturnValue(held.promise);
    const announce = vi.fn();
    const { result, rerender } = renderHook(
      ({ deckId }) => useCardLocks({ enabled: true, deckId, cards: list, serverCards: list, announce }),
      { initialProps: { deckId: "deck-a" } },
    );
    act(() => result.current.value!.toggle(card));
    rerender({ deckId: "deck-b" });
    await act(async () => held.resolve({ ok: true }));
    expect(announce).not.toHaveBeenCalled();
  });
});

// Clear auto and the basics stepper (round 2 of #1752): a fill-added basic the player has just re-counted is
// claimed by the stepper's save, which clears `auto`. The sweep must wait for that save, or it deletes the land.
describe("Clear auto waits for the basics stepper's settling save", () => {
  it("saves the stepped basic before the sweep runs", async () => {
    const order: string[] = [];
    setBasicQuantity.mockImplementation(async (_d: string, _o: string, n: number) => {
      order.push(`save ${n}`);
      return { ok: true, quantity: n, changed: true };
    });
    clearAutoCards.mockImplementation(async () => {
      order.push("sweep");
      return [];
    });
    const island = mk("island", "Island", { typeLine: "Basic Land — Island", cardTypeGroup: "Lands", role: "land", quantity: 6, auto: true } as Partial<DeckDetailCard>);
    const signet = mk("arcane-signet", "Arcane Signet", { auto: true });
    renderShell([island, signet], false);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: addPanelCopy.basicStepper.moreAria("Island", 7) }));
    });
    const clear = screen.getAllByRole("button").find((b) => /Clear all/.test(b.getAttribute("aria-label") ?? ""))!;
    await act(async () => clear.click());
    expect(order).toEqual(["save 7", "sweep"]);
  });
});

describe("Clear auto and a stepper save that did not confirm", () => {
  it("does not sweep over an unknown count, and says the sweep failed", async () => {
    setBasicQuantity.mockRejectedValue(new Error("lost"));
    clearAutoCards.mockResolvedValue([]);
    const island = mk("island", "Island", { typeLine: "Basic Land — Island", cardTypeGroup: "Lands", role: "land", quantity: 6, auto: true } as Partial<DeckDetailCard>);
    const signet = mk("arcane-signet", "Arcane Signet", { auto: true });
    renderShell([island, signet], false);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: addPanelCopy.basicStepper.moreAria("Island", 7) }));
    });
    const clear = screen.getAllByRole("button").find((b) => /Clear all/.test(b.getAttribute("aria-label") ?? ""))!;
    await act(async () => clear.click());
    expect(clearAutoCards).not.toHaveBeenCalled();
    expect(screen.getByText(recommendationsCopy.auto.sweepFailed)).toBeInTheDocument();
  });
});

describe("leaving the builder settles the basics stepper at once", () => {
  it("saves a pending count when the builder unmounts, without waiting out the settle", async () => {
    setBasicQuantity.mockResolvedValue({ ok: true, quantity: 7, changed: true });
    const island = mk("island", "Island", { typeLine: "Basic Land — Island", cardTypeGroup: "Lands", role: "land", quantity: 6 } as Partial<DeckDetailCard>);
    const view = renderShell([island], false);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: addPanelCopy.basicStepper.moreAria("Island", 7) }));
    });
    expect(setBasicQuantity).not.toHaveBeenCalled();
    await act(async () => view.unmount());
    expect(setBasicQuantity).toHaveBeenCalledWith(expect.any(String), "island", 7, 6);
  });
});

