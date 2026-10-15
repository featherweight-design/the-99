// /friends drawn (Social R1 PR C): the head, its name field and the picker it opens, and their failure toasts on
// the shared frame (E15).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({
  setDisplayNameAction: vi.fn(),
  setCommanderAction: vi.fn(),
  createInviteAction: vi.fn(),
  revokeInviteAction: vi.fn(),
  unfriendAction: vi.fn(),
  listDeckCommandersAction: vi.fn(),
  searchFaceCommandersAction: vi.fn(),
}));
vi.mock("../../app/friends/actions", () => a);

import { FriendsView } from "./friends-view";
import { socialCopy } from "../../lib/copy/social";
import { TOAST_MS } from "../collection/edit-toast";

const SOKKA = { oracleId: "o-sokka", name: "Sokka, Tenacious Tactician", artCropUri: "https://x/sokka.jpg", colorIdentity: ["W", "U"] };

function draw(over: Partial<Parameters<typeof FriendsView>[0]> = {}) {
  return render(
    <FriendsView profile={{ publicId: "p-me", displayName: "Hugh", commander: null }} {...over} />,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
});
afterEach(cleanup);

const alert = () => screen.getByRole("alert");

describe("the head", () => {
  it("names you as friends see you, and offers the commander while none is set", () => {
    draw();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
    expect(screen.getByText("Hugh").tagName).toBe("B");
    // The dashed tile, the line's press at desktop and the line under the head at phone (one shown per width).
    expect(screen.getAllByRole("button", { name: socialCopy.commander.choose })).toHaveLength(3);
  });

  it("draws your face with its Change label once one is set, and no Choose", () => {
    draw({ profile: { publicId: "p-me", displayName: "Hugh", commander: SOKKA } });
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeTruthy();
    expect(screen.queryByRole("button", { name: socialCopy.commander.choose })).toBeNull();
  });

  it("saves a changed name, capped by code points, and draws it", async () => {
    a.setDisplayNameAction.mockResolvedValue({ ok: true, displayName: "Hugh H." });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "🐉".repeat(31) } });
    expect([...field.value]).toHaveLength(30);
    fireEvent.change(field, { target: { value: "Hugh H." } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    expect(a.setDisplayNameAction).toHaveBeenCalledTimes(1);
    expect(a.setDisplayNameAction).toHaveBeenCalledWith("Hugh H.");
    expect(screen.getByText("Hugh H.").tagName).toBe("B");
  });

  it("puts the name back on Escape, and on an empty or unchanged one, without a write", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Someone" } });
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save }));
    expect(a.setDisplayNameAction).not.toHaveBeenCalled();
    expect(screen.getByText("Hugh").tagName).toBe("B");
  });

  it("toasts a name that could not be saved, and puts the old one back", async () => {
    a.setDisplayNameAction.mockResolvedValue({ ok: false, reason: "invalid" });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "New" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    expect(alert().textContent).toContain(socialCopy.page.nameField.failed);
    expect(screen.getByText("Hugh").tagName).toBe("B");
  });

  it("toasts a commander that could not be saved, and keeps the face it had", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA] });
    a.setCommanderAction.mockRejectedValue(new Error("down"));
    draw();
    fireEvent.click(screen.getAllByRole("button", { name: socialCopy.commander.choose })[0]);
    const tile = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(tile));
    expect(a.setCommanderAction).toHaveBeenCalledWith(SOKKA.oracleId);
    expect(alert().textContent).toContain(socialCopy.commander.failed);
    expect(screen.queryByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeNull();
  });

  it("cancels the name on a browser that focuses no clicked button (Safari), without a write", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Someone" } });
    const cancel = screen.getByRole("button", { name: socialCopy.page.nameField.cancel });
    // Safari: the press focuses nothing, so the field blurs with no relatedTarget unless the mousedown is held.
    if (fireEvent.mouseDown(cancel)) fireEvent.blur(field, { relatedTarget: null });
    fireEvent.click(cancel);
    expect(a.setDisplayNameAction).not.toHaveBeenCalled();
    expect(screen.getByText("Hugh").tagName).toBe("B");
  });

  it("rings the face while the picker is open, and puts focus on it once a pick removes the opener", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA] });
    a.setCommanderAction.mockResolvedValue({ ok: true });
    draw();
    const chooses = screen.getAllByRole("button", { name: socialCopy.commander.choose });
    const face = chooses[0];
    // The line's press under the head: it is gone once a commander is set.
    fireEvent.click(chooses[2]);
    expect(face.hasAttribute("data-picking")).toBe(true);
    const tile = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(tile));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(face.hasAttribute("data-picking")).toBe(false);
    expect(face.getAttribute("aria-label")).toBe(socialCopy.commander.changeAria(SOKKA.name));
    expect(document.activeElement).toBe(face);
  });

  it("puts back the saved name, not an unsaved one, when two pending renames both fail", async () => {
    const answers: ((v: unknown) => void)[] = [];
    a.setDisplayNameAction.mockImplementation(() => new Promise((r) => answers.push(r)));
    draw();
    for (const next of ["First", "Second"]) {
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: next } });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    }
    expect(screen.getByText("Second").tagName).toBe("B");
    await act(async () => answers[0]({ ok: false, reason: "invalid" }));
    // The newer write is still in flight: its value stands.
    expect(screen.getByText("Second").tagName).toBe("B");
    await act(async () => answers[1]({ ok: false, reason: "invalid" }));
    expect(screen.getByText("Hugh").tagName).toBe("B");
    expect(screen.queryByText("First")).toBeNull();
  });

  it("puts back the saved face, not an unsaved one, when two pending picks both fail", async () => {
    const AANG = { oracleId: "o-aang", name: "Avatar Aang", artCropUri: "https://x/aang.jpg", colorIdentity: ["W", "U", "B", "R", "G"] };
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [SOKKA, AANG] });
    const answers: ((v: unknown) => void)[] = [];
    a.setCommanderAction.mockImplementation(() => new Promise((r) => answers.push(r)));
    draw();
    fireEvent.click(screen.getAllByRole("button", { name: socialCopy.commander.choose })[0]);
    const sokka = await screen.findByRole("button", { name: SOKKA.name });
    await act(async () => fireEvent.click(sokka));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) }));
    const aang = await screen.findByRole("button", { name: AANG.name });
    await act(async () => fireEvent.click(aang));
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(AANG.name) })).toBeTruthy();
    await act(async () => answers[0]({ ok: false }));
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(AANG.name) })).toBeTruthy();
    await act(async () => answers[1]({ ok: false }));
    // No commander was ever saved: the face is the dashed tile again, not Sokka's.
    expect(screen.queryByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeNull();
    expect(screen.getAllByRole("button", { name: socialCopy.commander.choose })).toHaveLength(3);
  });

  it("leaves focus where the reader moved it when the name field blurs, and on Change only when it fell to the page", async () => {
    a.setDisplayNameAction.mockReturnValue(new Promise(() => {}));
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    draw();
    const frame = async () => act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    // Escape removes the field and focus falls to the page: it goes back to Change.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.keyDown(screen.getByLabelText(socialCopy.page.nameField.label), { key: "Escape" });
    await frame();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Change" }));
    // While editing, the reader presses the face: the field blurs to it, the picker opens and takes focus.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "New" } });
    const face = screen.getAllByRole("button", { name: socialCopy.commander.choose })[0];
    face.focus();
    fireEvent.click(face);
    await frame();
    const search = screen.getByRole("combobox", { name: socialCopy.commander.search });
    expect(document.activeElement).toBe(search);
  });

  it("holds the toast's window while it is hovered or holds focus, and runs it once both let go", async () => {
    vi.useFakeTimers();
    try {
      a.setDisplayNameAction.mockResolvedValue({ ok: false, reason: "invalid" });
      draw();
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "New" } });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
      const toast = alert();
      fireEvent.pointerEnter(toast);
      fireEvent.focus(toast);
      act(() => {
        vi.advanceTimersByTime(TOAST_MS * 2);
      });
      expect(screen.queryByRole("alert")).not.toBeNull();
      // The pointer leaves; focus still holds it.
      fireEvent.pointerLeave(toast);
      act(() => {
        vi.advanceTimersByTime(TOAST_MS * 2);
      });
      expect(screen.queryByRole("alert")).not.toBeNull();
      fireEvent.blur(toast, { relatedTarget: null });
      act(() => {
        vi.advanceTimersByTime(TOAST_MS + 500);
      });
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("follows the server's redraw of the name and the face, keeping a pending name only until it lands", async () => {
    a.setDisplayNameAction.mockReturnValue(new Promise(() => {}));
    const { rerender } = draw();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText(socialCopy.page.nameField.label), { target: { value: "New" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: socialCopy.page.nameField.save })));
    expect(screen.getByText("New").tagName).toBe("B");
    // The same profile drawn again changes nothing: the pending name stands.
    rerender(<FriendsView profile={{ publicId: "p-me", displayName: "Hugh", commander: null }} />);
    expect(screen.getByText("New").tagName).toBe("B");
    // The redraw lands, from this write or another tab's: the head takes it.
    rerender(<FriendsView profile={{ publicId: "p-me", displayName: "Hugh H.", commander: SOKKA }} />);
    expect(screen.getByText("Hugh H.").tagName).toBe("B");
    expect(screen.getByRole("button", { name: socialCopy.commander.changeAria(SOKKA.name) })).toBeTruthy();
  });
});
