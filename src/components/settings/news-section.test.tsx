// Settings' Notifications (menu and Home PR 4; announcements R1b-1): one in-app box per AVAILABLE kind in the board's
// order, under its In app column head, each its own press named by its kind (the row's text toggles nothing); an
// unavailable kind absent, each box saving the whole checked set as it changes, and a failed save putting the set back
// to what was last saved with the shared toast.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), save: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }), usePathname: () => "/settings" }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: m.save }));

import { NewsSection } from "./news-section";
import { feedCopy } from "../../lib/copy/feed";
import { FEED_KINDS } from "../../lib/feed/kinds";
import type { NewsSetting } from "../../lib/feed/prefs";

const C = feedCopy.news;
const ALL_BUT_SPARES: NewsSetting[] = [
  { kind: "new-set", on: false },
  { kind: "new-precon", on: false },
  { kind: "price-drop", on: true },
  { kind: "trade-match", on: true },
  { kind: "combo", on: false },
];
const OFFERED = ["new-set", "new-precon", "price-drop", "trade-match", "combo"];
const box = (kind: keyof typeof C.kinds) => screen.getByRole("checkbox", { name: C.inAppAria(C.kinds[kind].name) }) as HTMLInputElement;
const foot = () => document.querySelector("section > p") as HTMLElement;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("the news section", () => {
  it("draws the Notifications head, the In app column head, one box per available kind in the board's order, and the foot", () => {
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    expect(screen.getByRole("heading", { name: C.head }).textContent).toBe("Notifications");
    const heads = document.querySelector("[data-column-heads]")!;
    expect([...heads.children].map((h) => h.textContent)).toEqual([C.inApp]);
    const names = screen.getAllByRole("checkbox").map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual([
      "In app: New sets",
      "In app: New precons",
      "In app: Price drops on your wishlist",
      "In app: Trade matches",
      "In app: Combos you can make",
    ]);
    expect(box("price-drop").checked).toBe(true);
    expect(box("new-set").checked).toBe(false);
    expect(foot().textContent).toBe(`${C.inApp}${C.foot.home}${C.foot.email}`);
    expect(foot().querySelector("b")!.textContent).toBe(C.inApp);
  });

  // R1b-1: each box is its own 52px cell, a press at least 44px tall; the name and line sit outside every label.
  it("gives each box its own 52px press and leaves the row's text out of it", () => {
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    const cell = box("combo").closest("label")!;
    expect(cell.className).toContain("w-[52px]");
    expect(cell.className).toContain("min-h-[44px]");
    expect(cell.textContent).toBe("");
    expect(screen.getByText(C.kinds.combo.name).closest("label")).toBeNull();
  });

  it("never toggles a box from a press on the row's name or line", async () => {
    m.save.mockResolvedValue({ ok: true, changed: true });
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    await act(async () => fireEvent.click(screen.getByText(C.kinds.combo.name)));
    await act(async () => fireEvent.click(screen.getByText(C.kinds.combo.line)));
    expect(m.save).not.toHaveBeenCalled();
    expect(box("combo").checked).toBe(false);
  });

  // Spare requests PR 3d (board `Friend-Side`, Settings): the default-on kind reads checked as it arrives, and its line
  // says it starts on; no other kind's line does.
  it("draws Friends asking for your spares checked by default, its line saying it starts on", () => {
    render(<NewsSection kinds={[...ALL_BUT_SPARES, { kind: "spare-request", on: true }]} />);
    expect(box("spare-request").checked).toBe(true);
    expect(screen.getByText(`${C.kinds["spare-request"].line} ${C.defaultOn}`)).toBeTruthy();
    expect(screen.getByText("A friend asks for a card you have spare. On from the start.")).toBeTruthy();
    expect(screen.getAllByText(new RegExp(C.defaultOn))).toHaveLength(1);
  });

  // Every kind, the shipped six and any `FEED_KINDS` gains later, draws the same two-part row from its copy.
  it("draws every FEED_KINDS entry as a name, a line and its own named box", () => {
    render(<NewsSection kinds={FEED_KINDS.map((kind) => ({ kind, on: true }))} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(FEED_KINDS.length);
    for (const kind of FEED_KINDS) {
      expect(box(kind).checked).toBe(true);
      expect(screen.getByText(C.kinds[kind].name).closest("li")!.contains(box(kind))).toBe(true);
    }
  });

  it("leaves an unavailable kind out rather than drawing it disabled", () => {
    render(<NewsSection kinds={[{ kind: "new-set", on: true }, { kind: "combo", on: false }]} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.queryByText(C.kinds["price-drop"].name)).toBeNull();
    expect(screen.queryByText(C.kinds["spare-request"].name)).toBeNull();
    expect(screen.getAllByRole("checkbox").some((b) => (b as HTMLInputElement).disabled)).toBe(false);
  });

  it("draws nothing when no kind is available", () => {
    const { container } = render(<NewsSection kinds={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("saves the whole checked set as a box changes", async () => {
    m.save.mockResolvedValue({ ok: true, changed: true });
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    await act(async () => fireEvent.click(box("combo")));
    expect(m.save).toHaveBeenCalledWith(["price-drop", "trade-match", "combo"], OFFERED);
    expect(box("combo").checked).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("holds every box while a save is in flight, so only one save is ever pending", async () => {
    let finish!: (v: unknown) => void;
    m.save.mockReturnValue(new Promise((r) => (finish = r)));
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    await act(async () => fireEvent.click(box("combo")));
    expect(box("new-set").disabled).toBe(true);
    await act(async () => fireEvent.click(box("new-set")));
    expect(m.save).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: true, changed: true }));
    expect(box("new-set").disabled).toBe(false);
  });

  it("puts a failed save back to what was last saved and says so in the toast", async () => {
    m.save.mockResolvedValueOnce({ ok: true, changed: true }).mockResolvedValueOnce({ ok: false, reason: "invalid" });
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    await act(async () => fireEvent.click(box("new-set")));
    await act(async () => fireEvent.click(box("price-drop")));
    expect(m.save).toHaveBeenLastCalledWith(["new-set", "trade-match"], OFFERED);
    expect(box("price-drop").checked).toBe(true);
    expect(box("new-set").checked).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
    expect(m.refresh).toHaveBeenCalled();
  });

  it("puts the set back when the save throws", async () => {
    m.save.mockRejectedValue(new Error("network"));
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    await act(async () => fireEvent.click(box("trade-match")));
    expect(box("trade-match").checked).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });

  it("refreshes the page, with no toast, when the feed was switched off under it", async () => {
    m.save.mockResolvedValue({ ok: false, reason: "off" });
    render(<NewsSection kinds={ALL_BUT_SPARES} />);
    await act(async () => fireEvent.click(box("combo")));
    expect(m.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps a saved choice shown when another section's save redraws the page with the old choices", async () => {
    let finish!: (v: unknown) => void;
    m.save.mockReturnValueOnce(new Promise((r) => (finish = r))).mockResolvedValue({ ok: true, changed: true });
    const { rerender } = render(<NewsSection kinds={ALL_BUT_SPARES} />);
    await act(async () => fireEvent.click(box("combo")));
    rerender(<NewsSection kinds={ALL_BUT_SPARES.map((k) => ({ ...k }))} />);
    await act(async () => finish({ ok: true, changed: true }));
    expect(box("combo").checked).toBe(true);
    await act(async () => fireEvent.click(box("new-set")));
    expect(m.save).toHaveBeenLastCalledWith(["new-set", "price-drop", "trade-match", "combo"], OFFERED);
  });
});
