// The commander picker (Social R1 PR C), with the frames the boards never drew (E15):
// the picker with no decks of your own and with no results, and its search in flight (E16).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({ listDeckCommandersAction: vi.fn(), searchFaceCommandersAction: vi.fn() }));
vi.mock("../../app/friends/actions", () => a);

import { CommanderPicker } from "./commander-picker";
import { socialCopy } from "../../lib/copy/social";

const c = socialCopy.commander;
const tile = (name: string) => ({ oracleId: `o-${name}`, name, artCropUri: `https://x/${name}.jpg` });
const AANG = tile("Avatar Aang");
const BARAL = tile("Baral, Chief of Compliance");

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function type(value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: c.search }), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe("CommanderPicker", () => {
  it("opens on the search, with your decks' commanders first, and one press picks", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG, BARAL] });
    const onPick = vi.fn();
    render(<CommanderPicker current={null} onPick={onPick} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: c.title })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: c.search })).toHaveFocus();
    expect(await screen.findByRole("heading", { name: c.fromDecks })).toBeTruthy();
    expect(screen.getByText(c.savedNote)).toBeTruthy();
    expect(screen.queryByRole("button", { name: c.clear })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: BARAL.name }));
    expect(onPick).toHaveBeenCalledWith(BARAL);
  });

  it("hides the deck row with no decks of your own, and is the search alone", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await act(async () => {});
    expect(screen.queryByRole("heading", { name: c.fromDecks })).toBeNull();
    expect(screen.getByText(c.anyNote)).toBeTruthy();
  });

  it("searches the catalog by name, keeps results standing while the next is in flight, and picks with the keys", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG] });
    a.searchFaceCommandersAction.mockResolvedValueOnce({ ok: true, tiles: [AANG, BARAL] });
    const onPick = vi.fn();
    render(<CommanderPicker current={AANG.oracleId} onPick={onPick} onClose={() => {}} />);
    await type("a");
    expect(a.searchFaceCommandersAction).not.toHaveBeenCalled();
    await type("av");
    expect(a.searchFaceCommandersAction).toHaveBeenCalledWith("av");
    const list = screen.getByRole("listbox");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([AANG.name, BARAL.name]);
    expect(screen.queryByRole("heading", { name: c.fromDecks })).toBeNull();

    let answer!: (v: unknown) => void;
    a.searchFaceCommandersAction.mockReturnValueOnce(new Promise((r) => (answer = r)));
    await type("ava");
    expect(list.getAttribute("aria-busy")).toBe("true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await act(async () => answer({ ok: true, tiles: [AANG, BARAL] }));

    const box = screen.getByRole("combobox", { name: c.search });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(BARAL);
  });

  it("says so when nothing matches", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG] });
    a.searchFaceCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await type("zzq");
    expect(screen.getByRole("status").textContent).toBe(c.noResults("zzq"));
  });

  it("offers Use initials instead once a commander is set, which picks none", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG] });
    const onPick = vi.fn();
    render(<CommanderPicker current={AANG.oracleId} onPick={onPick} onClose={() => {}} />);
    expect((await screen.findByRole("button", { name: AANG.name })).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: c.clear }));
    expect(onPick).toHaveBeenCalledWith(null);
  });
});
