import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { runKey } from "../../../../lib/precons/upgrade/targets";

const press = vi.hoisted(() => vi.fn());
const read = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const own = vi.hoisted(() => vi.fn());
const picked = vi.hoisted(() => vi.fn(async (_r: string, lineId: string) => ({ ok: true as const, unpicked: [lineId] })));
const setBracket = vi.hoisted(() => vi.fn(async (..._a: unknown[]): Promise<{ permits: number[]; bracket: number | null } | null> => null));
vi.mock("../../../../lib/precons/upgrade/actions", () => ({
  pressUpgradeAction: press, readUpgradeAction: read, markUpgradeSeenAction: vi.fn(async () => ({ ok: true })),
  pickUpgradeLineAction: picked, upgradeSetBracketAction: setBracket,
}));
// The result's lists are Suggested changes' own (fresh start R2): their lines read the precon page's card details.
vi.mock("../../../cards/card-detail-context", async (importActual) => ({
  ...(await importActual<typeof import("../../../cards/card-detail-context")>()),
  useCardDetail: () => ({ open: vi.fn(), registerSheet: () => () => {}, openOracleId: null, revealing: false, prefetch: () => {} }),
  useCardIntent: () => ({}),
}));
vi.mock("../../../../app/decks/actions", () => ({ pullCardFromDeck: vi.fn() }));
vi.mock("../../../../app/decks/precon-actions", () => ({ createDeckFromPrecon: create, startPreconOwned: own }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user_A" }) }));
import { UpgradeEntry } from "./upgrade-entry";

const lead: OfferedCommander = {
  key: "rootha", isFace: true, line: null,
  cards: [{ oracleId: "rootha", name: "Rootha", manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }],
  strategies: [{ key: "spellslinger", label: "Spells", blurb: "b", source: "edhrec", backingIds: ["c1"], backing: [{ oracleId: "c1", name: "Card One" }] }],
};
const run = (over: Partial<PanelRun> = {}): PanelRun => ({
  id: "r1", status: "done", strategyKey: runKey("rootha", 3, "spellslinger"), strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"), pricesAsOf: new Date("2026-11-10T12:00:00Z"),
  pairs: [{ cutId: "c", cut: "Cut", addId: "a", add: "Add", addCents: 100, reason: "r", cutReason: null, position: 1 }], buyTotalCents: 100,
  bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy: { cards: 1, cents: 100, priced: 1 }, pricesDated: { behind: false, when: "Monday" }, owned: 0, themes: {}, deck: null, seenAt: new Date("2026-11-10T12:01:00Z"), unpicked: [], ...over,
});
const panel = (runs: PanelRun[] = []): UpgradePanel => ({
  boxBracket: 2, boxPermits: [1, 2], commanders: [lead], runs, listFp: "x", cards: {}, figures: {}, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null }, priceStore: null,
});

function toConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
  fireEvent.click(screen.getByRole("button", { name: "Next · Bracket" }));
  fireEvent.click(screen.getAllByRole("radio")[1]);
  fireEvent.click(screen.getByRole("button", { name: "Next · Strategy" }));
  fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
}
const startProps = {
  row: {
    fileName: "f", name: "Prismari", setCode: "SOC", releaseDate: "2026-01-01", twinName: null,
    commanders: [{ oracleId: "rootha", name: "Rootha", imageUri: null, colorIdentity: ["U", "R"] }],
    identity: ["U", "R"], owned: 40, of: 80, unmapped: 0, built: [],
  },
  cards: 100, body: 99, illegal: [] as string[],
};
/** The press, then the start screen's `Your last upgrade` row: the newest kept run's result, free (addendum fresh start, call 2). */
function openLast() {
  fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
  fireEvent.click(document.querySelector("[data-last-run] button")!);
}
const mount = (p: UpgradePanel) => render(<UpgradeEntry fileName="f" precon="Prismari" panel={p} art={new Map()} start={startProps} />);

describe("UpgradeEntry", () => {
  beforeEach(() => { press.mockReset(); read.mockReset(); read.mockResolvedValue(null); create.mockReset(); own.mockReset(); setBracket.mockReset(); setBracket.mockResolvedValue(null); });

  it("presses the run with the three picks, shows the wait, then the result", async () => {
    let finish!: (v: unknown) => void;
    press.mockReturnValue(new Promise((r) => { finish = r; }));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    expect(press).toHaveBeenCalledWith("f", "rootha", 3, "spellslinger");
    expect(await screen.findByText("Finding swaps toward Spells")).toBeInTheDocument();
    finish({ ok: true, panel: panel([run()]), run: run() });
    expect(await screen.findByText("1 swaps toward Spells")).toBeInTheDocument();
  });

  it("a failure keeps the picks and Try again presses them again", async () => {
    press.mockResolvedValueOnce({ ok: false, reason: "failed" });
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    expect(await screen.findByText("That upgrade didn’t come through. Both credits are back.")).toBeInTheDocument();
    press.mockResolvedValueOnce({ ok: false, reason: "failed" });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(press).toHaveBeenCalledTimes(2));
    expect(press).toHaveBeenLastCalledWith("f", "rootha", 3, "spellslinger");
  });

  it("a short run is read back and shown as a result", async () => {
    press.mockResolvedValueOnce({ ok: false, reason: "short" });
    // An older kept run of other picks comes first: the result shown is the one these picks made.
    read.mockResolvedValue(panel([run({ id: "older", strategyKey: runKey("rootha", 4, "spellslinger"), bracketTarget: 4, strategyLabel: "Older" }), run({ refunded: true })]));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    expect(await screen.findByText(/so both credits are back/)).toBeInTheDocument();
    expect(screen.queryByText(/swaps toward Older/)).toBeNull();
  });

  it("a thrown press (a lapsed session) is a failure, never a silent spend", async () => {
    press.mockRejectedValueOnce(new Error("auth"));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    expect(await screen.findByText("That upgrade didn’t come through. Both credits are back.")).toBeInTheDocument();
  });

  it("opens on the start screen when every kept run was seen, the newest as Your last upgrade (fresh start, state 3)", () => {
    mount(panel([run(), run({ id: "older", strategyLabel: "Older", createdAt: new Date("2026-11-09T12:00:00Z") })]));
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Upgrade Prismari" })).toBeInTheDocument();
    expect(screen.getByText("Your last upgrade")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-last-run] [data-run-row]")).toHaveLength(1);
    expect(document.querySelector("[data-last-run] [data-run-row]")!.getAttribute("data-run-row")).toBe("r1");
    expect(screen.getByText(/We swap 12 to 18 cards/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
  });

  it("opens on the newest result once when it landed unseen, then on the start screen (state 2)", () => {
    mount(panel([run({ seenAt: null })]));
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Your upgrade" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Upgrade Prismari" })).toBeInTheDocument();
    expect(screen.getByText("Your last upgrade")).toBeInTheDocument();
  });

  it("an unseen older run never opens on its own: only the newest one does", () => {
    mount(panel([run(), run({ id: "older", seenAt: null, createdAt: new Date("2026-11-09T12:00:00Z") })]));
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Upgrade Prismari" })).toBeInTheDocument();
  });

  it("opens on the plain intro with no row and no History link when no run is kept (state 4)", () => {
    mount(panel());
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByText(/We swap 12 to 18 cards/)).toBeInTheDocument();
    expect(screen.queryByText("Your last upgrade")).toBeNull();
    expect(screen.queryByRole("button", { name: "History" })).toBeNull();
  });

  it("the row names a pending run and its flow opens on the wait", () => {
    mount(panel([run({ status: "pending", createdAt: new Date() })]));
    expect(screen.getByRole("button", { name: /^Upgrading toward Spells · 0:0\d$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Upgrading toward/ }));
    expect(screen.getByText("Finding swaps toward Spells")).toBeInTheDocument();
  });

  it("a press that settles after the flow closed leaves no stale view behind", async () => {
    let finish!: (v: unknown) => void;
    press.mockReturnValue(new Promise((r) => { finish = r; }));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    await screen.findByText("Finding swaps toward Spells");
    fireEvent.keyDown(document, { key: "Escape" });
    finish({ ok: true, panel: panel([run({ seenAt: null })]), run: run({ seenAt: null }) });
    // The row is back to the press, and opening it shows the panel's own newest result, landed and not yet seen.
    await waitFor(() => expect(screen.getByRole("button", { name: "Upgrade this precon" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Your upgrade" })).toBeInTheDocument();
  });

  it("a press reads the panel even while a poll is in flight, so a short run is not taken for a failure", async () => {
    press.mockResolvedValueOnce({ ok: false, reason: "short" });
    read.mockResolvedValue(panel([run({ refunded: true })]));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    expect(await screen.findByText(/so both credits are back/)).toBeInTheDocument();
  });

  describe("Start from a result", () => {
    const withRun = () => panel([run()]);
    const openStart = () => {
      mount(withRun());
      openLast();
      fireEvent.click(screen.getByRole("button", { name: /Start the deck with these/ }));
    };

    it("opens the Start dialog with the swaps in its facts, and starts the deck from the run", async () => {
      create.mockResolvedValue(undefined);
      openStart();
      expect(screen.getByText(/Led by Rootha, with the 1 swap toward Spells\./)).toBeInTheDocument();
      expect(screen.getByText("all 100 · 1 swapped")).toBeInTheDocument();
      expect(screen.getByText("2 → 3 · Upgraded, as chosen")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
      await waitFor(() => expect(create).toHaveBeenCalledWith("f", "Prismari", "r1", { adds: ["a"], cuts: ["c"] }));
    });

    it("starts with only the picks (fresh start R2): the dialog counts them, and an unpicked pair stays out", async () => {
      create.mockResolvedValue(undefined);
      const two = run({ pairs: [
        { cutId: "c", cut: "Cut", addId: "a", add: "Add", addCents: 100, reason: "r", cutReason: null, position: 1 },
        { cutId: "c2", cut: "Cut 2", addId: "a2", add: "Add 2", addCents: 100, reason: "r", cutReason: null, position: 2 },
      ], unpicked: ["a-a2", "c-c"] });
      mount(panel([two]));
      openLast();
      fireEvent.click(screen.getByRole("button", { name: "Start the deck with these 1 swaps" }));
      expect(screen.getByText(/with the 1 swap toward Spells\./)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
      await waitFor(() => expect(create).toHaveBeenCalledWith("f", "Prismari", "r1", { adds: ["a"], cuts: ["c2"] }));
    });

    it("unpicking the bracket-raising add shows the picked set's bracket, not the run's, and none while it is read", async () => {
      let land!: (v: { permits: number[]; bracket: number | null }) => void;
      const setRead = new Promise<{ permits: number[]; bracket: number | null }>((r) => { land = r; });
      setBracket.mockImplementation(async (_f, _r, adds) => ((adds as string[]).includes("a2") ? null : setRead));
      mount(panel([run({ pairs: [
        { cutId: "c", cut: "Cut", addId: "a", add: "Add", addCents: 100, reason: "r", cutReason: null, position: 1 },
        { cutId: "c2", cut: "Cut 2", addId: "a2", add: "Add 2", addCents: 100, reason: "r", cutReason: null, position: 2 },
      ], unpicked: ["a-a2", "c-c2"] })]));
      openLast();
      fireEvent.click(screen.getByRole("button", { name: "Start the deck with these 1 swaps" }));
      expect(screen.getByText(/with the 1 swap toward Spells\./)).toBeInTheDocument();
      await waitFor(() => expect(setBracket).toHaveBeenCalledWith("f", "r1", ["a"], ["c"]));
      // Pending: the fact is off, never the whole run's 2 → 3.
      expect(screen.queryByText("2 → 3 · Upgraded, as chosen")).toBeNull();
      await act(async () => { land({ permits: [2], bracket: 2 }); });
      expect(await screen.findByText("2 · Core, as chosen")).toBeInTheDocument();
      expect(screen.queryByText("2 → 3 · Upgraded, as chosen")).toBeNull();
    });

    it("keeps a stored pick when the result is opened again in the same visit", async () => {
      mount(panel([run({ pairs: [
        { cutId: "c", cut: "Cut", addId: "a", add: "Add", addCents: 100, reason: "r", cutReason: null, position: 1 },
        { cutId: "c2", cut: "Cut 2", addId: "a2", add: "Add 2", addCents: 100, reason: "r", cutReason: null, position: 2 },
      ] })]));
      openLast();
      fireEvent.click(screen.getByRole("button", { name: "✓ Picked Add 2" }));
      await waitFor(() => expect(picked).toHaveBeenCalledWith("r1", "a-a2", false));
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
      fireEvent.click(screen.getByRole("button", { name: "History" }));
      fireEvent.click(screen.getAllByRole("button", { name: /Spells/ })[0]);
      expect(screen.getByRole("button", { name: "Pick Add 2" })).toBeInTheDocument();
    });

    it("names the cards it will not add when the box is added", () => {
      openStart();
      fireEvent.click(screen.getByRole("checkbox"));
      expect(screen.getByText("Only what came in the box. The 1 card to buy isn’t added.")).toBeInTheDocument();
    });

    it("says the run no longer fits when the server refuses it", async () => {
      create.mockResolvedValue({ ok: false, reason: "upgradeUnavailable" });
      openStart();
      fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
      expect(await screen.findByText("This upgrade no longer fits the precon’s list. Run a new one to start from it.")).toBeInTheDocument();
    });

    it("names the plain edition's file whichever edition the page shows, and reads the panel again after a refusal", async () => {
      create.mockResolvedValue({ ok: false, reason: "upgradeUnavailable" });
      read.mockResolvedValue(panel([run({ listFp: "moved" })]));
      render(<UpgradeEntry fileName="f" precon="Prismari" panel={panel([run()])} art={new Map()} start={{ ...startProps, addFileName: "f-collector" }} />);
      openLast();
      fireEvent.click(screen.getByRole("button", { name: /Start the deck with these/ }));
      fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
      await waitFor(() => expect(create).toHaveBeenCalledWith("f", "Prismari", "r1", { adds: ["a"], cuts: ["c"] }));
      await waitFor(() => expect(read).toHaveBeenCalled());
    });

    it("keeps the Start press off for a run made over another list, and says why", () => {
      mount(panel([run({ listFp: "old" })]));
      openLast();
      expect(screen.getByText(/The precon’s list changed after this upgrade/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start the deck with these/ })).toHaveAttribute("aria-disabled", "true");
    });

    it("a run already in a deck opens from the start screen with ‹ Back, the note and its press live", () => {
      mount(panel([run({ deck: { id: "d1", name: "Prismari Artistry" } })]));
      fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
      expect(document.querySelector("[data-last-run] [data-run-went]")!.textContent).toBe("1 swaps · in Prismari Artistry");
      fireEvent.click(document.querySelector("[data-last-run] button")!);
      expect(screen.getByText("Already in Prismari Artistry. Opening it again uses no credit.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start the deck with these/ })).not.toHaveAttribute("aria-disabled");
      fireEvent.click(screen.getByRole("button", { name: "‹ Back" }));
      expect(screen.getByText("Your last upgrade")).toBeInTheDocument();
    });
  });
});

describe("UpgradeEntry's pulse when a run lands while the window is closed (addendum A3, G21)", () => {
  beforeEach(() => { press.mockReset(); read.mockReset(); read.mockResolvedValue(null); });
  afterEach(() => { vi.useRealTimers(); });
  const pulse = () => screen.getByRole("button", { name: /^(Upgrade this precon|Upgrading toward)/ }).querySelector(".anim-line-pulse");
  const closeIt = () => fireEvent.click(screen.getByRole("button", { name: "Close" }));

  it("replays the pulse when the confirm lands after the ✕, and the next open shows that result (the reopen rule)", async () => {
    let finish!: (v: unknown) => void;
    press.mockReturnValue(new Promise((r) => { finish = r; }));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    await screen.findByText("Finding swaps toward Spells");
    closeIt();
    expect(screen.getByRole("button", { name: /^Upgrading toward Spells/ })).toBeInTheDocument();
    expect(pulse()).toBeNull();
    finish({ ok: true, panel: panel([run({ seenAt: null })]), run: run({ seenAt: null }) });
    await waitFor(() => expect(pulse()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Your upgrade" })).toBeInTheDocument();
  });

  it("a short run kept while closed is refunded and still pulses (ruled)", async () => {
    let finish!: (v: unknown) => void;
    press.mockReturnValue(new Promise((r) => { finish = r; }));
    read.mockResolvedValue(panel([run({ refunded: true })]));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    await screen.findByText("Finding swaps toward Spells");
    closeIt();
    finish({ ok: false, reason: "short" });
    await waitFor(() => expect(pulse()).not.toBeNull());
  });

  it("a short run the read misses plays no pulse, though an older run of the same picks is kept", async () => {
    let finish!: (v: unknown) => void;
    const older = run({ id: "older", createdAt: new Date("2026-11-09T12:00:00Z") });
    // The read comes back without the new short row: only the older run of these picks is in it.
    read.mockResolvedValue(panel([older]));
    mount(panel([older]));
    openLast();
    press.mockReturnValue(new Promise((r) => { finish = r; }));
    fireEvent.click(screen.getByRole("button", { name: /Try another strategy/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    fireEvent.click(screen.getByRole("button", { name: "Run it again" }));
    await screen.findByText("Finding swaps toward Spells");
    closeIt();
    finish({ ok: false, reason: "short" });
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    expect(pulse()).toBeNull();
  });

  it("a failed run that lands while closed, with an older result kept, plays no pulse and opens on the start screen", async () => {
    let finish!: (v: unknown) => void;
    // The view moves from the wait to the start screen when the run fails: that is not a landing.
    const older = run({ id: "older", strategyKey: runKey("rootha", 4, "spellslinger"), bracketTarget: 4, strategyLabel: "Older", createdAt: new Date("2026-11-09T12:00:00Z") });
    read.mockResolvedValue(panel([older]));
    mount(panel([older]));
    openLast();
    press.mockReturnValue(new Promise((r) => { finish = r; }));
    fireEvent.click(screen.getByRole("button", { name: /Try another strategy/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    // The same picks as the older run: the foot is the ask, and Run it again presses a new run.
    fireEvent.click(screen.getByRole("button", { name: "Run it again" }));
    await screen.findByText("Finding swaps toward Spells");
    closeIt();
    finish({ ok: false, reason: "failed" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Upgrade this precon" })).toBeInTheDocument());
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    expect(pulse()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Upgrade Prismari" })).toBeInTheDocument();
    expect(document.querySelector("[data-last-run] [data-run-row]")!.getAttribute("data-run-row")).toBe("older");
  });

  it("a confirm that lands with the window still open shows the result and plays no pulse behind it", async () => {
    press.mockResolvedValueOnce({ ok: true, panel: panel([run()]), run: run() });
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    expect(await screen.findByText("1 swaps toward Spells")).toBeInTheDocument();
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(pulse()).toBeNull();
  });

  it("a run begun elsewhere pulses when the watch reads it done, and not when it reads it failed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pending = run({ status: "pending", createdAt: new Date() });
    read.mockResolvedValue(panel([run()]));
    const first = mount(panel([pending]));
    expect(pulse()).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(pulse()).not.toBeNull();
    first.unmount();

    read.mockResolvedValue(panel([run({ status: "failed", refunded: true, pairs: [] })]));
    mount(panel([pending]));
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(screen.getByRole("button", { name: "Upgrade this precon" })).toBeInTheDocument();
    expect(pulse()).toBeNull();
  });
});
