// Settings' Store section (store choice handoff, call 1): one radio per store at the reader's store, saved on press one
// write at a time, a failed save putting the last saved store back with the shared toast, and the Change store landing
// washing the whole section.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("../../app/settings/store-actions", () => ({ savePreferredStore: m.save }));

import { StoreSection } from "./store-section";
import { storeCopy } from "../../lib/copy/store";

const C = storeCopy.settings;
const radio = (name: string) => screen.getByRole("radio", { name: new RegExp(name) }) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  m.save.mockResolvedValue({ ok: true, changed: true });
});
afterEach(cleanup);

describe("Store", () => {
  it("draws the head, the intro, one radio per store with the reader's checked, and the default note", () => {
    render(<StoreSection store="tcgplayer" />);
    expect(screen.getByRole("heading", { name: C.head })).toBeTruthy();
    expect(screen.getByText(C.explain)).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: C.groupLabel })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["manapool", "tcgplayer", "cardkingdom"]);
    expect(radio("TCGplayer").checked).toBe(true);
    expect(radio("Mana Pool").checked).toBe(false);
    expect(screen.getByText(C.rows.cardkingdom)).toBeTruthy();
    expect(screen.getByText(C.foot)).toBeTruthy();
  });

  it("saves the pressed store, holding every row disabled until the write lands", async () => {
    let land!: (v: unknown) => void;
    m.save.mockReturnValueOnce(new Promise((r) => (land = r)));
    render(<StoreSection store="manapool" />);
    fireEvent.click(radio("Card Kingdom"));
    expect(m.save).toHaveBeenCalledWith("cardkingdom");
    expect(radio("Card Kingdom").checked).toBe(true);
    expect(screen.getAllByRole("radio").every((r) => (r as HTMLInputElement).disabled)).toBe(true);
    await act(async () => land({ ok: true, changed: true }));
    expect(radio("Card Kingdom").checked).toBe(true);
    expect(radio("Mana Pool").disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("puts the last saved store back and says so when the save is refused", async () => {
    m.save.mockResolvedValueOnce({ ok: false, reason: "off" });
    render(<StoreSection store="tcgplayer" />);
    await act(async () => fireEvent.click(radio("Mana Pool")));
    expect(radio("TCGplayer").checked).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });

  it("puts the last saved store back and says so when the save throws", async () => {
    m.save.mockRejectedValueOnce(new Error("network"));
    render(<StoreSection store="manapool" />);
    await act(async () => fireEvent.click(radio("TCGplayer")));
    expect(radio("Mana Pool").checked).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });

  it("after a good save, a later failure goes back to the store just saved, not the served one", async () => {
    render(<StoreSection store="manapool" />);
    await act(async () => fireEvent.click(radio("TCGplayer")));
    m.save.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    await act(async () => fireEvent.click(radio("Card Kingdom")));
    expect(radio("TCGplayer").checked).toBe(true);
  });
});

describe("the Change store landing", () => {
  const section = () => document.getElementById("settings-store")!;
  const realScroll = Element.prototype.scrollIntoView;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    Element.prototype.scrollIntoView = realScroll;
    window.history.replaceState(null, "", "/");
  });

  it("washes the whole section for two seconds on #settings-store, then lets it go", () => {
    window.history.replaceState(null, "", "#settings-store");
    render(<StoreSection store="manapool" />);
    expect(section().hasAttribute("data-washed")).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(section().hasAttribute("data-washed")).toBe(false);
  });

  it("washes nothing without the hash", () => {
    render(<StoreSection store="manapool" />);
    expect(document.querySelector("[data-washed]")).toBeNull();
  });
});
