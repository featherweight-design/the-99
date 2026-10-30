import { cardMarkCopy } from "../../lib/copy/card-mark";
// Settings' Spares (menu and Home PR 3): the stepper saves as it changes and puts a failed value back with the shared
// toast; who sees them names the shared pods and points to Friends; a kept card is the shipped collection row with a
// ✕ that releases it (and comes back on a failure); Keep a card back keeps a searched card.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  refresh: vi.fn(),
  setMin: vi.fn(),
  keep: vi.fn(),
  release: vi.fn(),
  search: vi.fn(),
}));
// One router for every render, as Next's is: a fresh object each render would re-run every effect that depends on it.
const router = { refresh: m.refresh, push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/settings" }));
vi.mock("../../app/settings/actions", () => ({
  setSpareMinAction: m.setMin,
  keepCardAction: m.keep,
  releaseCardAction: m.release,
  searchSpareCardsAction: m.search,
}));

import { SparesSection } from "./spares-section";
import { collectionRowSpoken } from "../collection/rows-view";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { settingsCopy } from "../../lib/copy/settings";
import type { BrowseListCard } from "../../lib/collection/browse";
import { named } from "../../lib/person-name/mint";

const C = settingsCopy.spares;
const SOL = "11111111-1111-4111-8111-111111111111";
const card = (over: Partial<BrowseListCard> = {}): BrowseListCard => ({
  oracleId: SOL, name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", rarity: "uncommon", colorIdentity: [],
  imageUri: null, printedName: null, quantity: 3, setCounts: [["C21", 3]], primarySetCode: "C21", ...over,
});

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("the threshold stepper", () => {
  it("saves each step as it changes", async () => {
    m.setMin.mockResolvedValue({ ok: true });
    render(<SparesSection spareMin={1} pods={[]} kept={[]} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: C.more })));
    expect(m.setMin).toHaveBeenCalledWith(2);
    expect(screen.getByRole("group", { name: C.stepperLabel }).textContent).toContain("2");
  });

  it("stops at 1 and at 9", () => {
    const { rerender } = render(<SparesSection spareMin={1} pods={[]} kept={[]} />);
    expect((screen.getByRole("button", { name: C.fewer }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<SparesSection spareMin={9} pods={[]} kept={[]} />);
    expect((screen.getByRole("button", { name: C.more }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("puts a failed value back and says so in the toast", async () => {
    m.setMin.mockResolvedValue({ ok: false, reason: "invalid" });
    render(<SparesSection spareMin={2} pods={[]} kept={[]} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: C.more })));
    expect(screen.getByRole("group", { name: C.stepperLabel }).textContent).toContain("2");
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });

  // One save at a time: while a save is in flight both buttons wait, and the value shows the pending choice.
  const deferred = () => {
    const settle: { ok: (v: unknown) => void; no: (e: unknown) => void } = { ok: () => {}, no: () => {} };
    m.setMin.mockImplementation(() => new Promise((ok, no) => Object.assign(settle, { ok, no })));
    return settle;
  };
  const value = () => screen.getByRole("group", { name: C.stepperLabel }).textContent;
  const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

  it("holds both buttons while a save is pending, and frees them when it answers", async () => {
    const settle = deferred();
    render(<SparesSection spareMin={2} pods={[]} kept={[]} />);
    await act(async () => fireEvent.click(button(C.more)));
    expect(value()).toContain("3");
    expect(button(C.more).disabled).toBe(true);
    expect(button(C.fewer).disabled).toBe(true);
    await act(async () => fireEvent.click(button(C.more)));
    expect(m.setMin.mock.calls).toEqual([[3]]);
    await act(async () => settle.ok({ ok: true }));
    expect(button(C.more).disabled).toBe(false);
    expect(value()).toContain("3");
  });

  it("rolls a refused or thrown save back to the last stored value", async () => {
    for (const answer of [(s: ReturnType<typeof deferred>) => s.ok({ ok: false, reason: "invalid" }), (s: ReturnType<typeof deferred>) => s.no(new Error("network"))]) {
      m.setMin.mockReset();
      m.setMin.mockResolvedValueOnce({ ok: true });
      render(<SparesSection spareMin={2} pods={[]} kept={[]} />);
      await act(async () => fireEvent.click(button(C.more)));
      const settle = deferred();
      await act(async () => fireEvent.click(button(C.more)));
      expect(value()).toContain("4");
      await act(async () => answer(settle));
      expect(value()).toContain("3");
      expect(screen.getByRole("alert").textContent).toContain(C.failed);
      cleanup();
    }
  });

  it("shows the server's value when a redraw lands during or after the save", async () => {
    const settle = deferred();
    const { rerender } = render(<SparesSection spareMin={2} pods={[]} kept={[]} />);
    await act(async () => fireEvent.click(button(C.more)));
    rerender(<SparesSection spareMin={5} pods={[]} kept={[]} />);
    expect(value()).toContain("5");
    await act(async () => settle.ok({ ok: true }));
    rerender(<SparesSection spareMin={3} pods={[]} kept={[]} />);
    expect(value()).toContain("3");
  });
});

describe("who sees them", () => {
  it("names the shared pods and points to Friends, where each pod's switch lives", () => {
    render(<SparesSection spareMin={1} pods={[named("Thursday pod"), named("Cube night")]} kept={[]} />);
    expect(screen.getByText(/Offered to/).textContent).toBe(`${C.offeredTo} Thursday pod and Cube night. ${C.choose}`);
    expect(screen.getByRole("link", { name: C.friendsAria }).getAttribute("href")).toBe("/friends");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("says when no pod sees them", () => {
    render(<SparesSection spareMin={1} pods={[]} kept={[]} />);
    expect(screen.getByText(new RegExp(C.offeredNone)).textContent).toBe(`${C.offeredNone} ${C.choose}`);
  });
});

describe("kept back", () => {
  it("draws a kept card as the collection row, counted in the head", () => {
    render(<SparesSection spareMin={1} pods={[]} kept={[card()]} />);
    expect(screen.getByText(C.keptHead(1))).toBeTruthy();
    expect(screen.getByText("Sol Ring")).toBeTruthy();
    expect(screen.getByText("×3")).toBeTruthy();
  });

  it("carries the collection's mark key with the kept rows, and none without them", () => {
    const { unmount } = render(<SparesSection spareMin={1} pods={[]} kept={[card()]} />);
    expect(screen.getByRole("group", { name: cardMarkCopy.keyRegionAria })).toBeTruthy();
    unmount();
    render(<SparesSection spareMin={1} pods={[]} kept={[]} />);
    expect(screen.queryByRole("group", { name: cardMarkCopy.keyRegionAria })).toBeNull();
  });

  it("speaks the facts the shared cells draw silently: cost, rarity and bracket marks", () => {
    render(<SparesSection spareMin={1} pods={[]} kept={[card({ facts: ["gameChanger"] })]} />);
    const x = screen.getByRole("button", { name: C.releaseAria("Sol Ring") });
    const said = x.getAttribute("aria-describedby") && document.getElementById(x.getAttribute("aria-describedby")!)?.textContent;
    expect(said).toBe(collectionRowSpoken(card({ facts: ["gameChanger"] })));
    expect(said).toMatch(/uncommon/);
    expect(said).toContain(spokenManaCost("{1}"));
    expect(said).toMatch(/game changer/i);
  });

  it("releases a card at once, and brings it back when the write fails", async () => {
    let answer: (v: unknown) => void = () => {};
    m.release.mockReturnValue(new Promise((r) => { answer = r; }));
    render(<SparesSection spareMin={1} pods={[]} kept={[card()]} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: C.releaseAria("Sol Ring") })));
    expect(m.release).toHaveBeenCalledWith(SOL);
    expect(screen.queryByText("Sol Ring")).toBeNull();
    await act(async () => answer({ ok: false, reason: "invalid" }));
    expect(screen.getByText("Sol Ring")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });

  it("re-asks an open search when a release lands, so the card let go appears", async () => {
    vi.useFakeTimers();
    try {
      m.search.mockResolvedValueOnce({ ok: true, hits: [] });
      m.release.mockResolvedValue({ ok: true });
      const { rerender } = render(<SparesSection spareMin={1} pods={[]} kept={[card()]} />);
      fireEvent.change(screen.getByRole("searchbox", { name: C.searchLabel }), { target: { value: "sol" } });
      await act(async () => { await vi.advanceTimersByTimeAsync(200); });
      expect(screen.getByText(C.noMatch)).toBeTruthy();
      await act(async () => fireEvent.click(screen.getByRole("button", { name: C.releaseAria("Sol Ring") })));
      m.search.mockResolvedValueOnce({ ok: true, hits: [{ oracleId: SOL, name: "Sol Ring", spare: 2 }] });
      rerender(<SparesSection spareMin={1} pods={[]} kept={[]} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(200); });
      expect(m.search).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: C.keepAria("Sol Ring", 2) })).toBeTruthy();
      expect((screen.getByRole("searchbox", { name: C.searchLabel }) as HTMLInputElement).value).toBe("sol");
    } finally {
      vi.useRealTimers();
    }
  });

  it("searches the reader's spares and keeps the card pressed", async () => {
    vi.useFakeTimers();
    try {
      m.search.mockResolvedValue({ ok: true, hits: [{ oracleId: SOL, name: "Sol Ring", spare: 2 }] });
      m.keep.mockResolvedValue({ ok: true });
      render(<SparesSection spareMin={1} pods={[]} kept={[]} />);
      fireEvent.change(screen.getByRole("searchbox", { name: C.searchLabel }), { target: { value: "sol" } });
      await act(async () => { await vi.advanceTimersByTimeAsync(200); });
      expect(m.search).toHaveBeenCalledWith("sol");
      await act(async () => fireEvent.click(screen.getByRole("button", { name: C.keepAria("Sol Ring", 2) })));
      expect(m.keep).toHaveBeenCalledWith(SOL);
      expect((screen.getByRole("searchbox", { name: C.searchLabel }) as HTMLInputElement).value).toBe("");
    } finally {
      vi.useRealTimers();
    }
  });
});
