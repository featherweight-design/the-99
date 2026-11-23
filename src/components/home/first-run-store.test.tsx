// The first-run store row (store choice handoff, Q1; STATES "First run · the store row"): the stores as one radio
// switch at the reader's store, a press shown at once and saved in the background, a failed save putting the last
// saved store back with the shared toast.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("../../app/settings/store-actions", () => ({ savePreferredStore: m.save }));

import { FirstRunStoreRow } from "./first-run-store";
import { storeCopy } from "../../lib/copy/store";

const radio = (name: string) => screen.getByRole("radio", { name });
const checked = (name: string) => radio(name).getAttribute("aria-checked") === "true";

beforeEach(() => {
  vi.clearAllMocks();
  m.save.mockResolvedValue({ ok: true, changed: true });
});
afterEach(cleanup);

describe("FirstRunStoreRow", () => {
  it("asks where the reader buys, over one radio per store with theirs chosen", () => {
    render(<FirstRunStoreRow store="manapool" />);
    expect(screen.getByRole("region", { name: storeCopy.firstRun.title })).toBeTruthy();
    expect(screen.getByText(storeCopy.firstRun.line)).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: storeCopy.settings.groupLabel })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Mana Pool", "TCGplayer", "Card Kingdom"]);
    expect(checked("Mana Pool")).toBe(true);
  });

  it("shows a store chosen in Settings first, not Mana Pool", () => {
    render(<FirstRunStoreRow store="cardkingdom" />);
    expect(checked("Card Kingdom")).toBe(true);
    expect(checked("Mana Pool")).toBe(false);
  });

  it("chooses the pressed store at once and saves it, without asking to confirm", async () => {
    let land!: (v: unknown) => void;
    m.save.mockReturnValueOnce(new Promise((r) => (land = r)));
    render(<FirstRunStoreRow store="manapool" />);
    fireEvent.click(radio("TCGplayer"));
    expect(m.save).toHaveBeenCalledWith("tcgplayer");
    expect(checked("TCGplayer")).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    // One write at a time: a press while it is in flight is refused.
    fireEvent.click(radio("Card Kingdom"));
    expect(m.save).toHaveBeenCalledTimes(1);
    await act(async () => land({ ok: true, changed: true }));
    expect(checked("TCGplayer")).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("puts the last saved store back and raises the Settings toast when the save fails", async () => {
    m.save.mockRejectedValueOnce(new Error("offline"));
    render(<FirstRunStoreRow store="manapool" />);
    await act(async () => fireEvent.click(radio("Card Kingdom")));
    expect(checked("Mana Pool")).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(storeCopy.settings.failed);
  });
});
