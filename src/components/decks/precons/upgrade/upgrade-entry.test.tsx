import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { runKey } from "../../../../lib/precons/upgrade/targets";

const press = vi.hoisted(() => vi.fn());
const read = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/precons/upgrade/actions", () => ({ pressUpgradeAction: press, readUpgradeAction: read }));
import { UpgradeEntry } from "./upgrade-entry";

const lead: OfferedCommander = {
  key: "rootha", isFace: true, line: null,
  cards: [{ oracleId: "rootha", name: "Rootha", manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }],
  strategies: [{ key: "spellslinger", label: "Spells", blurb: "b", source: "edhrec", backingIds: ["c1"], backing: [{ oracleId: "c1", name: "Card One" }] }],
};
const run = (over: Partial<PanelRun> = {}): PanelRun => ({
  id: "r1", status: "done", strategyKey: runKey("rootha", 3, "spellslinger"), strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"),
  pairs: [{ cutId: "c", cut: "Cut", addId: "a", add: "Add", addCents: 100, reason: "r", position: 1 }], buyTotalCents: 100,
  bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy: { cards: 1, cents: 100 }, owned: 0, themes: {}, ...over,
});
const panel = (runs: PanelRun[] = []): UpgradePanel => ({
  boxBracket: 2, commanders: [lead], runs, cards: {}, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
});

function toConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "Upgrade this precon" }));
  fireEvent.click(screen.getByRole("button", { name: "Next · Bracket" }));
  fireEvent.click(screen.getAllByRole("radio")[1]);
  fireEvent.click(screen.getByRole("button", { name: "Next · Strategy" }));
  fireEvent.click(screen.getByRole("radio", { name: /Spells/ }));
}
const mount = (p: UpgradePanel) => render(<UpgradeEntry fileName="f" precon="Prismari" panel={p} art={new Map()} />);

describe("UpgradeEntry", () => {
  beforeEach(() => { press.mockReset(); read.mockReset(); read.mockResolvedValue(null); });

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
    read.mockResolvedValue(panel([run({ refunded: true })]));
    mount(panel());
    toConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade toward Spells" }));
    expect(await screen.findByText(/so both credits are back/)).toBeInTheDocument();
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
});
