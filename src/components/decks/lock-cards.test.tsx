// Locked (never cut), PR 4a: the mark, the rows' lock, the toolbar's Lock cards mode, and the
// sweep that leaves a locked auto card where it is. The leaves are rendered alone where a rule is
// theirs; the mode, the optimism and the sweep go through BuilderShell, because the seam under test
// is the shell's own state feeding the toolbar, the key line and every row at once.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { proxyCopy } from "../../lib/copy/proxies";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { recommendedMix } from "../../lib/decks/mix";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SwapToolsProvider } from "../../lib/swaps/context";

const TEST_MIX = recommendedMix(null, false);

const { setCardLocked, clearAutoCards, addCardToDeck } = vi.hoisted(() => ({
  setCardLocked: vi.fn(),
  clearAutoCards: vi.fn(),
  addCardToDeck: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  setCardLocked,
  clearAutoCards,
  addCardToDeck,
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
const { GroupToggle } = await import("./group-toggle");
const { ClearAutoButton, SweepReceipt } = await import("./clear-auto");
const { buildMarkKeyEntries } = await import("./decklist");
const { DecklistRow } = await import("./decklist-row");
const { LockCardsProvider } = await import("./lock-cards");
const { BuilderShell } = await import("./builder-shell");

afterEach(() => {
  setCardLocked.mockReset();
  clearAutoCards.mockReset();
  addCardToDeck.mockReset();
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

  it("lets only the left leg into the body when open", () => {
    const { container } = render(<LockMark open />);
    const mark = container.querySelector<HTMLElement>("[data-testid=lock-mark]")!;
    // arch, left leg, body, keyhole
    expect(mark.children).toHaveLength(4);
    expect(mark.children[0].className).toContain("h-[4.5px]");
    cleanup();
    const closed = render(<LockMark />).container.querySelector<HTMLElement>("[data-testid=lock-mark]")!;
    expect(closed.children).toHaveLength(3);
    expect(closed.children[0].className).toContain("h-[7.5px]");
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

  it("stays out of the card view, whose tiles draw no lock yet", () => {
    expect(ids([mk("a", "A", { locked: true })], true)).not.toContain("locked");
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
    expect(screen.queryByTestId("row-lock-shortcut")).toBeNull();
    expect(screen.queryByTestId("lock-mark")).toBeNull();
    expect(screen.queryByText(lockedCardsCopy.mark.a11y)).toBeNull();
  });

  it("offers the hover lock on an unlocked row: pointer only, open, titled Lock", () => {
    const lock = lockValue();
    renderRow(<DecklistRow deckId="d1" card={sol} newestAsOf={null} />, lock);
    const shortcut = screen.getByTestId("row-lock-shortcut");
    expect(shortcut.tabIndex).toBe(-1);
    expect(shortcut.getAttribute("aria-hidden")).toBe("true");
    expect(shortcut.getAttribute("title")).toBe(lockedCardsCopy.row.titleOff);
    expect(within(shortcut).getByTestId("lock-mark").dataset.lockState).toBe("open");
    // The open lock shows on the row's hover only.
    expect(within(shortcut).getByTestId("lock-mark").parentElement!.className).toContain("invisible");
    expect(screen.queryByTestId("row-lock-mark")).toBeNull();
    fireEvent.click(shortcut);
    expect(lock.toggle).toHaveBeenCalledWith(sol);
  });

  it("draws the locked mark at rest, pressing to unlock, and the phone's 14px mark", () => {
    const lock = lockValue();
    const card = { ...sol, locked: true };
    renderRow(<DecklistRow deckId="d1" card={card} newestAsOf={null} />, lock);
    const shortcut = screen.getByTestId("row-lock-shortcut");
    expect(shortcut.getAttribute("title")).toBe(lockedCardsCopy.row.titleOn);
    expect(within(shortcut).getByTestId("lock-mark").dataset.lockState).toBe("closed");
    expect(screen.getByTestId("row-lock-mark").className).toContain("w-[14px]");
    fireEvent.click(shortcut);
    expect(lock.toggle).toHaveBeenCalledWith(card);
    // The ✕ stays at rest.
    expect(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeInTheDocument();
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
    expect(screen.queryByTestId("row-lock-shortcut")).toBeNull();
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
    expect(screen.queryByTestId("row-lock-shortcut")).toBeNull();
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

  it("holds the key line OR the mode's line, never both", async () => {
    renderShell([{ ...sol, locked: true }, signet]);
    const key = () => screen.queryByRole("group", { name: proxyCopy.key.regionAria });
    expect(key()).not.toBeNull();
    expect(within(key()!).getByText(lockedCardsCopy.mark.key)).toBeInTheDocument();
    expect(screen.queryByTestId("lock-mode-line")).toBeNull();
    await act(async () => lockButton()!.click());
    expect(key()).toBeNull();
    const line = screen.getByTestId("lock-mode-line");
    expect(line.textContent).toBe(`${lockedCardsCopy.mode.line} ${lockedCardsCopy.mode.count(1)}`);
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
    await act(async () => screen.getByRole("button", { name: /^Shopping/ }).click());
    expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceLeave);
    await act(async () => screen.getByRole("button", { name: /^All/ }).click());
    expect(lockButton()).not.toBeNull();
    expect(doneButton()).toBeNull();
  });

  // Until Locked 4b gives the card view's tiles a lock, the mode is the list's: in the card view a
  // Done button would disable the bulk pair while every tile's ✕ still removed its card. So the
  // switch to Card ends it, as Shopping does, and the button is absent there.
  it("ends the mode on a switch to Card, and offers no Lock cards there", async () => {
    renderShell([sol, signet]);
    await act(async () => lockButton()!.click());
    await act(async () => screen.getByRole("button", { name: viewToggleCopy.deck.card }).click());
    expect(liveRegion().textContent).toBe(lockedCardsCopy.mode.announceLeave);
    expect(doneButton()).toBeNull();
    expect(lockButton()).toBeNull();
    await act(async () => screen.getByRole("button", { name: viewToggleCopy.deck.list }).click());
    expect(lockButton()).not.toBeNull();
    expect(doneButton()).toBeNull();
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
