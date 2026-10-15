import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

const addPrecons = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock("../../../app/decks/precon-actions", () => ({ addPrecons }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user_1" }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../../shell/pending-reporter", () => ({ PendingReporter: () => null }));
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl: () => {} }));
import { PreconPickView } from "./precon-pick-view";

const row = (fileName: string, name: string, tokens: number, twin: { fileName: string; copies: number; tokens: number } | null = null): PreconRow => ({
  fileName, name, setCode: "TDC", releaseDate: "2025-04-11", twinName: twin ? `${name} CE` : null, commanders: [], identity: ["W"],
  owned: 0, of: 99, unmapped: 0, built: [], box: { copies: 100, tokens, twin },
});
const rows = [
  row("Abzan", "Abzan Armor", 10),
  row("Sultai", "Sultai Arisen", 11),
  row("Temur", "Temur Roar", 10),
  row("Revival", "Revival Trance", 8, { fileName: "Revival_CE", copies: 101, tokens: 9 }),
];
const draw = () => render(<PreconPickView rows={rows} entry="home" initial={{ q: "", colours: [] }} />);
const tick = (name: string) => fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(name) }));
const addButton = () => screen.getByRole("button", { name: /^Add|^Adding/ });
const foot = () => addButton().parentElement!.textContent;

beforeEach(() => {
  window.sessionStorage.clear();
  addPrecons.mockReset();
  push.mockReset();
  vi.stubGlobal("crypto", { ...crypto, randomUUID: (() => { let n = 0; return () => `00000000-0000-4000-8000-0000000000${String(++n).padStart(2, "0")}`; })() });
});

describe("Precons I own: the foot", () => {
  it("holds the add at zero, and the press moves focus to the search", () => {
    draw();
    expect(foot()).toContain("Tick the boxes you own.");
    expect(addButton()).toHaveTextContent("Add boxes");
    expect(addButton()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(addButton());
    expect(addPrecons).not.toHaveBeenCalled();
    expect(document.activeElement?.tagName).toBe("INPUT");
    expect(document.activeElement).toHaveAttribute("placeholder", "Search by name, commander or set");
  });

  it("counts boxes, cards and tokens, and a twin's edition moves them", () => {
    draw();
    tick("Abzan Armor");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    tick("Revival Trance");
    expect(foot()).toContain("2 boxes · 200 cards and 18 tokens");
    expect(addButton()).toHaveTextContent("Add 2 boxes · 200 cards");
    expect(addButton()).toHaveAttribute("aria-disabled", "false");
    // The twin's edition is under its row once ticked, Regular first, and never inside the checkbox's label.
    const group = screen.getByRole("radiogroup", { name: "Edition" });
    expect(screen.getByRole("radio", { name: "Regular" })).toBeChecked();
    expect(group.closest("label")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Collector’s Edition/ }));
    expect(foot()).toContain("2 boxes · 201 cards and 19 tokens");
  });

  it("goes inert while adding, and lands on the entry with every box's receipt", async () => {
    let settle!: (v: unknown) => void;
    addPrecons.mockReturnValueOnce(new Promise((r) => { settle = r; }));
    draw();
    tick("Abzan Armor");
    tick("Revival Trance");
    fireEvent.click(screen.getByRole("radio", { name: /Collector’s Edition/ }));
    fireEvent.click(addButton());
    expect(addButton()).toHaveTextContent("Adding…");
    expect(foot()).toContain("Adding 2 boxes to your collection…");
    expect(screen.getByRole("checkbox", { name: /Abzan Armor/ }).closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("checkbox", { name: /Abzan Armor/, hidden: true }).closest("[aria-busy]")).toHaveAttribute("inert");
    expect(screen.getByPlaceholderText(/Search/)).toBeDisabled();
    expect(addPrecons).toHaveBeenCalledWith([
      { fileName: "Abzan", edition: "regular", file: "Abzan", actionId: expect.any(String) },
      { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: expect.any(String) },
    ]);
    await act(async () => settle([{ rowFile: "Abzan", ok: true, entryId: "e1" }, { rowFile: "Revival", ok: true, entryId: "e2" }]));
    expect(push).toHaveBeenCalledWith("/?precons=e1,e2");
  });
});

describe("Precons I own: refusals", () => {
  it("names the boxes that landed and the one that didn't, unticks the landed and keeps the failed box's id", async () => {
    addPrecons.mockResolvedValueOnce([
      { rowFile: "Abzan", ok: true, entryId: "e1" }, { rowFile: "Sultai", ok: false }, { rowFile: "Temur", ok: true, entryId: "e3" },
    ]);
    draw();
    tick("Abzan Armor"); tick("Sultai Arisen"); tick("Temur Roar");
    fireEvent.click(addButton());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Added Abzan Armor and Temur Roar. We couldn’t add Sultai Arisen.");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: /Abzan Armor/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Sultai Arisen/ })).toBeChecked();
    expect(screen.getAllByText("✓ added just now").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(foot()).toContain("1 box · 100 cards and 11 tokens");
    const firstId = addPrecons.mock.calls[0][0][1].actionId;
    // Try again re-sends the one box, under the id it had: nothing is retried on its own.
    addPrecons.mockResolvedValueOnce([{ rowFile: "Sultai", ok: true, entryId: "e2" }]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/?precons=e1,e3,e2"));
    expect(addPrecons.mock.calls[1][0]).toEqual([{ fileName: "Sultai", edition: "regular", file: "Sultai", actionId: firstId }]);
  });

  // A changed edition after an unknown outcome would go out under a new id and add the other box too: the list holds
  // still until a press is answered, so the retry carries the same boxes under the same ids.
  it("holds the ticks and editions while an outcome is unknown", async () => {
    addPrecons.mockRejectedValueOnce(new Error("network"));
    draw();
    tick("Revival Trance");
    fireEvent.click(addButton());
    await screen.findByRole("alert");
    expect(screen.getByRole("checkbox", { name: /Revival Trance/, hidden: true }).closest("[inert]")).not.toBeNull();
    addPrecons.mockResolvedValueOnce([{ rowFile: "Revival", ok: false }]);
    fireEvent.click(addButton());
    await waitFor(() => expect(addPrecons).toHaveBeenCalledTimes(2));
    expect(addPrecons.mock.calls[1][0]).toEqual(addPrecons.mock.calls[0][0]);
    // Answered: the list is the reader's again.
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Revival Trance/ }).closest("[inert]")).toBeNull());
  });

  // Only Home draws the receipt, so a pick opened from Collection still lands there once boxes are added.
  it("lands on Home with the receipt even when opened from Collection", async () => {
    addPrecons.mockResolvedValueOnce([{ rowFile: "Abzan", ok: true, entryId: "e1" }]);
    render(<PreconPickView rows={rows} entry="collection" initial={{ q: "", colours: [] }} />);
    tick("Abzan Armor");
    fireEvent.click(addButton());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/?precons=e1"));
  });

  // A box whose add threw is unknown, not refused: it stays ticked and held, and the press says so.
  it("holds a box whose outcome is unknown, and says it may have landed", async () => {
    addPrecons.mockResolvedValueOnce([{ rowFile: "Abzan", ok: true, entryId: "e1" }, { rowFile: "Revival", ok: false, unknown: true }]);
    draw();
    tick("Abzan Armor");
    tick("Revival Trance");
    fireEvent.click(addButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t confirm the cards were added. Try again and they won’t be added twice.");
    expect(screen.getByRole("checkbox", { name: /Revival Trance/, hidden: true }).closest("[inert]")).not.toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem("the99:precon-pick-attempts:user_1")!)).toEqual({
      Revival: { edition: "regular", id: addPrecons.mock.calls[0][0][1].actionId },
    });
  });

  // An answer lost to a reload: the box comes back ticked at its edition, held, and the retry goes out under its id.
  it("restores an unknown box after a reload, under the id its add went out with", async () => {
    window.sessionStorage.setItem("the99:precon-pick-attempts:user_1", JSON.stringify({ Revival: { edition: "collector", id: "11111111-1111-4111-8111-111111111111" } }));
    draw();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t confirm the cards were added.");
    expect(screen.getByRole("checkbox", { name: /Revival Trance/, hidden: true })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Revival Trance/, hidden: true }).closest("[inert]")).not.toBeNull();
    addPrecons.mockResolvedValueOnce([{ rowFile: "Revival", ok: true, entryId: "e9" }]);
    fireEvent.click(addButton());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/?precons=e9"));
    expect(addPrecons.mock.calls[0][0]).toEqual([{ fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: "11111111-1111-4111-8111-111111111111" }]);
    expect(window.sessionStorage.getItem("the99:precon-pick-attempts:user_1")).toBeNull();
  });

  // A reader who left during the add is not pulled to Home when its answer arrives.
  it("does not navigate once the pick has unmounted", async () => {
    let settle!: (v: unknown) => void;
    addPrecons.mockReturnValueOnce(new Promise((r) => { settle = r; }));
    const view = draw();
    tick("Abzan Armor");
    fireEvent.click(addButton());
    view.unmount();
    await act(async () => settle([{ rowFile: "Abzan", ok: true, entryId: "e1" }]));
    expect(push).not.toHaveBeenCalled();
    // The kept attempt stays for the picker opened next, whose retry under the same id recovers the landed box.
    expect(JSON.parse(window.sessionStorage.getItem("the99:precon-pick-attempts:user_1")!)).toEqual({
      Abzan: { edition: "regular", id: addPrecons.mock.calls[0][0][0].actionId },
    });
  });

  it("keeps the ticks when nothing landed, and an unknown outcome retries under the same ids", async () => {
    addPrecons.mockRejectedValueOnce(new Error("network"));
    draw();
    tick("Abzan Armor");
    fireEvent.click(addButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t confirm the cards were added. Try again and they won’t be added twice.");
    expect(screen.getByRole("checkbox", { name: /Abzan Armor/ })).toBeChecked();
    addPrecons.mockResolvedValueOnce([{ rowFile: "Abzan", ok: false }]);
    fireEvent.click(addButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t add those. Your collection is unchanged.");
    expect(addPrecons.mock.calls[1][0][0].actionId).toBe(addPrecons.mock.calls[0][0][0].actionId);
    expect(screen.getByRole("checkbox", { name: /Abzan Armor/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
