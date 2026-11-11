import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { runKey } from "../../../../lib/precons/upgrade/targets";

const press = vi.hoisted(() => vi.fn());
const read = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const own = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/precons/upgrade/actions", () => ({ pressUpgradeAction: press, readUpgradeAction: read }));
vi.mock("../../../../app/decks/precon-actions", () => ({ createDeckFromPrecon: create, startPreconOwned: own }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user_A" }) }));
import { UpgradeEntry } from "./upgrade-entry";

const lead: OfferedCommander = {
  key: "rootha", isFace: true, line: null,
  cards: [{ oracleId: "rootha", name: "Rootha", manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }],
  strategies: [{ key: "spellslinger", label: "Spells", blurb: "b", source: "edhrec", backingIds: ["c1"], backing: [{ oracleId: "c1", name: "Card One" }] }],
};
const run = (over: Partial<PanelRun> = {}): PanelRun => ({
  id: "r1", status: "done", strategyKey: runKey("rootha", 3, "spellslinger"), strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"),
  pairs: [{ cutId: "c", cut: "Cut", addId: "a", add: "Add", addCents: 100, reason: "r", position: 1 }], buyTotalCents: 100,
  bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy: { cards: 1, cents: 100 }, owned: 0, themes: {}, started: false, ...over,
});
const panel = (runs: PanelRun[] = []): UpgradePanel => ({
  boxBracket: 2, commanders: [lead], runs, listFp: "x", cards: {}, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
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
const mount = (p: UpgradePanel) => render(<UpgradeEntry fileName="f" precon="Prismari" panel={p} art={new Map()} start={startProps} />);

describe("UpgradeEntry", () => {
  beforeEach(() => { press.mockReset(); read.mockReset(); read.mockResolvedValue(null); create.mockReset(); own.mockReset(); });

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

  it("opens on the newest result, and the row reads the run while one is pending", () => {
    mount(panel([run()]));
    fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
    expect(screen.getByRole("dialog", { name: "Your upgrade" })).toBeInTheDocument();
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
    finish({ ok: true, panel: panel([run()]), run: run() });
    // The row is back to the press, and opening it shows the panel's own newest result.
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
      fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
      fireEvent.click(screen.getByRole("button", { name: /Start the deck with these/ }));
    };

    it("opens the Start dialog with the swaps in its facts, and starts the deck from the run", async () => {
      create.mockResolvedValue(undefined);
      openStart();
      expect(screen.getByText(/Led by Rootha, with the 1 swap toward Spells\./)).toBeInTheDocument();
      expect(screen.getByText("all 100 · 1 swapped")).toBeInTheDocument();
      expect(screen.getByText("2 → 3 · Upgraded, as chosen")).toBeInTheDocument();
      expect(screen.getByText("written for this list as it starts")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
      await waitFor(() => expect(create).toHaveBeenCalledWith("f", "Prismari", "r1"));
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
      fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
      fireEvent.click(screen.getByRole("button", { name: /Start the deck with these/ }));
      fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
      await waitFor(() => expect(create).toHaveBeenCalledWith("f", "Prismari", "r1"));
      await waitFor(() => expect(read).toHaveBeenCalled());
    });

    it("keeps the Start press off for a run made over another list, and says why", () => {
      mount(panel([run({ listFp: "old" })]));
      fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
      expect(screen.getByText(/The precon’s list changed after this upgrade/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start the deck with these/ })).toBeDisabled();
    });

    it("opens on the intro, not the result, once a deck was started from the newest run, whatever older runs hold", () => {
      mount(panel([run({ started: true }), run({ id: "older", createdAt: new Date("2026-11-09T12:00:00Z"), strategyKey: runKey("rootha", 4, "spellslinger"), bracketTarget: 4 })]));
      fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
      expect(screen.getByText(/We swap 12 to 18 cards/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    });
  });
});
