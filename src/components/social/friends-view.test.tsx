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

const SOKKA = { oracleId: "o-sokka", name: "Sokka, Tenacious Tactician", artCropUri: "https://x/sokka.jpg" };

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
});
