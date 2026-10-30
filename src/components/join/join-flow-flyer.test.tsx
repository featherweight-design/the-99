// @vitest-environment jsdom
// The flyer's `/join/<CODE>` (flyer trial PR 3; boards `Join-Phone` V1 to E3): the sender-less variant of JoinFlow.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flyerJoinCopy, joinCopy, type Parts } from "../../lib/copy/join";

const m = vi.hoisted(() => ({ start: vi.fn(), confirm: vi.fn(), hand: vi.fn(), save: vi.fn() }));
vi.mock("../../app/join/actions", () => ({ claimInviteAction: vi.fn(), confirmCodeAction: vi.fn(), handOverAction: vi.fn() }));
vi.mock("../../app/join/flyer-actions", () => ({
  startFlyerClaimAction: m.start, confirmFlyerCodeAction: m.confirm, handOverFlyerAction: m.hand, saveLaunchListAction: m.save,
}));
vi.mock("@clerk/nextjs", () => ({ SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { JoinFlow } from "./join-flow";
import type { FlyerJoinView } from "../../lib/flyer/join-read";

const CODE = "MOX4QK";
const draw = (v: FlyerJoinView) => render(<JoinFlow token={CODE} start={v} flyer />);
const line = (parts: Parts) => {
  const want = parts.map((p) => (typeof p === "object" && "em" in p ? p.em : String(p))).join("");
  return (_: string, el: Element | null) => el?.tagName === "P" && el.textContent === want;
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.values(m).forEach((f) => f.mockReset());
});

describe("JoinFlow for a flyer code", () => {
  it("V1: the 99's own card face up, no sender named, the flyer's title and fine print", () => {
    draw({ kind: "email" });
    expect(screen.getByRole("heading", { name: flyerJoinCopy.title })).toBeTruthy();
    expect(screen.getByText(flyerJoinCopy.fine)).toBeTruthy();
    const face = screen.getByTestId("friend-card-front");
    expect(face.getAttribute("data-frame")).toBe("crown");
    expect(screen.getByTestId("friend-card-crown").textContent).toContain("99");
    expect(face.textContent).toContain(flyerJoinCopy.cardType);
    expect(face.textContent).toContain(flyerJoinCopy.cardRules);
    expect(face.textContent).toContain(flyerJoinCopy.cardCredit);
    expect(face.textContent).toContain(flyerJoinCopy.cardMark);
  });

  it("V1 to V2: Send code claims against the CODE and moves to the code step", async () => {
    m.start.mockResolvedValue({ ok: true, mailed: true });
    draw({ kind: "email" });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(line(joinCopy.codeBody("sam@example.com")));
    expect(m.start).toHaveBeenCalledWith(CODE, "sam@example.com");
  });

  it("V3: the proven step names what they start with, not a sender", () => {
    draw({ kind: "proven", email: "sam@example.com" });
    expect(screen.getByText(flyerJoinCopy.okBody)).toBeTruthy();
    expect(screen.getByRole("button", { name: joinCopy.toSignUp })).toBeTruthy();
    expect(screen.getByTestId("friend-card-badge")).toBeTruthy();
  });

  it("a claim refused as used up turns the card face down and offers the launch list", async () => {
    m.start.mockResolvedValue({ ok: false, reason: "closed", closed: "hugh" });
    draw({ kind: "email" });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByRole("heading", { name: flyerJoinCopy.fullTitle });
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
  });

  it("E1 and E2: the card back, the launch list form, and the quiet Sign in line", () => {
    draw({ kind: "closed", closed: "full" });
    expect(screen.getByRole("heading", { name: flyerJoinCopy.fullTitle })).toBeTruthy();
    expect(screen.getByText(flyerJoinCopy.listBody)).toBeTruthy();
    expect(screen.getByRole("button", { name: flyerJoinCopy.listPress })).toBeTruthy();
    expect(screen.getByRole("button", { name: joinCopy.signIn })).toBeTruthy();
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
    cleanup();
    draw({ kind: "closed", closed: "revoked" });
    expect(screen.getByRole("heading", { name: flyerJoinCopy.revokedTitle })).toBeTruthy();
  });

  it("E1b: leaving an address saves it against the code and says they are on the list", async () => {
    m.save.mockResolvedValue({ ok: true });
    draw({ kind: "closed", closed: "full" });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "Sam@Example.com" } });
    fireEvent.click(screen.getByRole("button", { name: flyerJoinCopy.listPress }));
    await screen.findByRole("heading", { name: flyerJoinCopy.listedTitle });
    expect(m.save).toHaveBeenCalledWith(CODE, "Sam@Example.com");
    expect(screen.getByText(line(flyerJoinCopy.listedBody("sam@example.com")))).toBeTruthy();
  });

  it("a shapeless address is refused before asking the server", () => {
    draw({ kind: "closed", closed: "revoked" });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: flyerJoinCopy.listPress }));
    expect(screen.getByRole("alert").textContent).toBe(joinCopy.notAnEmail);
    expect(m.save).not.toHaveBeenCalled();
  });

  it("a failed save is the toast with Try again, and the field keeps its text", async () => {
    m.save.mockRejectedValue(new Error("network"));
    draw({ kind: "closed", closed: "full" });
    const field = screen.getByLabelText(joinCopy.emailLabel) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: flyerJoinCopy.listPress }));
    await screen.findByText(joinCopy.failed);
    expect(field.value).toBe("sam@example.com");
    expect(screen.getByRole("button", { name: joinCopy.retry })).toBeTruthy();
  });

  it("a save that finds the trial retired turns to E3", async () => {
    m.save.mockResolvedValue({ ok: false, reason: "launched" });
    draw({ kind: "closed", closed: "full" });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: flyerJoinCopy.listPress }));
    await waitFor(() => expect(screen.getByRole("heading", { name: flyerJoinCopy.launchedTitle })).toBeTruthy());
  });

  it("E3: the dimmed back, and the press goes to sign-up", () => {
    draw({ kind: "launched" });
    expect(screen.getByRole("heading", { name: flyerJoinCopy.launchedTitle })).toBeTruthy();
    expect(screen.getByText(flyerJoinCopy.launchedBody)).toBeTruthy();
    const press = screen.getByRole("link", { name: flyerJoinCopy.launchedPress });
    expect(press.getAttribute("href")).toBe("/sign-up");
    expect(screen.getByTestId("friend-card-back").className).toContain("opacity-[.42]");
    expect(screen.queryByLabelText(joinCopy.emailLabel)).toBeNull();
  });

  it("an existing account at hand-over draws the sender-less account step", async () => {
    m.hand.mockResolvedValue({ ok: false, reason: "account" });
    draw({ kind: "proven", email: "sam@example.com" });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.toSignUp }));
    await screen.findByText(joinCopy.haveAccountTitle);
    expect(screen.getByText(line(flyerJoinCopy.haveAccountBody("sam@example.com")))).toBeTruthy();
  });
});
