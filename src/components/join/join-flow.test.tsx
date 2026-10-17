// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { joinCopy } from "../../lib/copy/join";

const m = vi.hoisted(() => ({ claim: vi.fn(), confirm: vi.fn(), hand: vi.fn() }));
vi.mock("../../app/join/actions", () => ({ claimInviteAction: m.claim, confirmCodeAction: m.confirm, handOverAction: m.hand }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { JoinFlow, type JoinStart } from "./join-flow";

const sender = { displayName: "Ada", commander: null };
const start = (s: JoinStart) => render(<JoinFlow token={"t".repeat(43)} start={s} />);

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.values(m).forEach((f) => f.mockReset());
});

describe("JoinFlow", () => {
  it("N1 to N3: sends the code and moves to the code step naming the address", async () => {
    m.claim.mockResolvedValue({ ok: true, mailed: true });
    start({ kind: "email", sender });
    expect(screen.getByRole("heading", { name: joinCopy.title("Ada") })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "new@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(joinCopy.codeBody("new@x.dev"));
    expect(m.claim).toHaveBeenCalledWith("t".repeat(43), "new@x.dev");
  });

  it("refuses a shapeless address before asking the server", () => {
    start({ kind: "email", sender });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    expect(screen.getByRole("alert").textContent).toBe(joinCopy.notAnEmail);
    expect(m.claim).not.toHaveBeenCalled();
  });

  it("R14: a throw is the toast with Try again, and the field keeps its text", async () => {
    m.claim.mockRejectedValue(new Error("network"));
    start({ kind: "email", sender });
    const field = screen.getByLabelText(joinCopy.emailLabel) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "new@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(joinCopy.failed);
    expect(field.value).toBe("new@x.dev");
    expect(screen.getByRole("button", { name: joinCopy.retry })).toBeTruthy();
  });

  it("N4 and N5: a wrong code and an expired one each say so and stay on the code step", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    const input = screen.getByLabelText(joinCopy.codeAria);
    m.confirm.mockResolvedValueOnce({ ok: false, reason: "wrong", triesLeft: 3 });
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.codeWrong);
    m.confirm.mockResolvedValueOnce({ ok: false, reason: "expired" });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.codeExpired);
  });

  it("N12: a fifth wrong try ends the invite and names nobody", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    m.confirm.mockResolvedValue({ ok: false, reason: "ended" });
    fireEvent.change(screen.getByLabelText(joinCopy.codeAria), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.endedTitle);
    expect(screen.queryByText(/Ada/)).toBeNull();
  });

  it("N6 and N9: Continue hands over; an existing account draws N9 instead", async () => {
    m.hand.mockResolvedValue({ ok: false, reason: "account" });
    start({ kind: "proven", sender, email: "a@x.dev" });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.toSignUp }));
    await waitFor(() => expect(screen.getByText(joinCopy.haveAccountTitle)).toBeTruthy());
    expect(screen.getByText(joinCopy.haveAccountBody("a@x.dev", "Ada"))).toBeTruthy();
  });

  it("N11 and N12 draw their cards with the quiet Sign in link", () => {
    start({ kind: "expired" });
    expect(screen.getByRole("heading", { name: joinCopy.expiredTitle })).toBeTruthy();
    expect(screen.getByRole("button", { name: joinCopy.signIn })).toBeTruthy();
    cleanup();
    start({ kind: "ended" });
    expect(screen.getByRole("heading", { name: joinCopy.endedTitle })).toBeTruthy();
  });
  it("a claim whose mail did not go is the toast, on the email step, with the cooldown running", async () => {
    m.claim.mockResolvedValue({ ok: true, mailed: false });
    start({ kind: "email", sender });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "new@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(joinCopy.failed);
    expect(screen.queryByText(joinCopy.codeBody("new@x.dev"))).toBeNull();
    expect((screen.getByLabelText(joinCopy.emailLabel) as HTMLInputElement).value).toBe("new@x.dev");
    expect((screen.getByRole("button", { name: /Send a new code in/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("a replacement address refused for the cooldown keeps the email step and its draft", async () => {
    m.claim.mockResolvedValue({ ok: false, reason: "wait", waitMs: 30_000 });
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.otherEmail }));
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "b@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByRole("button", { name: /Send a new code in 0:30/ });
    expect(screen.queryByText(joinCopy.codeBody("b@x.dev"))).toBeNull();
    expect((screen.getByLabelText(joinCopy.emailLabel) as HTMLInputElement).value).toBe("b@x.dev");
  });

  it("a manual Confirm retires the old Try again, so it cannot resubmit a spent code", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    m.confirm.mockRejectedValueOnce(new Error("network"));
    fireEvent.change(screen.getByLabelText(joinCopy.codeAria), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.failed);
    m.confirm.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.okTitle);
    expect(screen.queryByText(joinCopy.failed)).toBeNull();
    expect(m.confirm).toHaveBeenCalledTimes(2);
  });
  it("editing a field retires a Try again that captured the old value", async () => {
    m.claim.mockRejectedValue(new Error("network"));
    start({ kind: "email", sender });
    const field = screen.getByLabelText(joinCopy.emailLabel);
    fireEvent.change(field, { target: { value: "a@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(joinCopy.failed);
    fireEvent.change(field, { target: { value: "b@x.dev" } });
    expect(screen.queryByText(joinCopy.failed)).toBeNull();
  });

  it("keeps the focus mark on the active code box while an error shows", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: true });
    const boxes = document.querySelectorAll("[aria-hidden] > span");
    expect(boxes[0].className).toContain("group-focus-within:shadow");
    expect(boxes[0].className).toContain("--danger");
  });
  it("holds the code field read-only while Confirm is pending, so a retry cannot carry other digits", async () => {
    let release: (v: unknown) => void = () => {};
    m.confirm.mockReturnValue(new Promise((r) => { release = r; }));
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    const input = screen.getByLabelText(joinCopy.codeAria) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await waitFor(() => expect(input.readOnly).toBe(true));
    release({ ok: true });
    await screen.findByText(joinCopy.okTitle);
  });
  it("moves focus to the new step's heading after a confirmation, and to the code field on the code step", async () => {
    m.confirm.mockResolvedValue({ ok: true });
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    fireEvent.change(screen.getByLabelText(joinCopy.codeAria), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.okTitle);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: joinCopy.okTitle })));
    cleanup();
    m.claim.mockResolvedValue({ ok: true, mailed: true });
    start({ kind: "email", sender });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "new@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(joinCopy.codeBody("new@x.dev"));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(joinCopy.codeAria)));
  });
  it("keeps Continue disabled after a successful hand-over, while the page navigates", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    m.hand.mockResolvedValue({ ok: true, url: "https://clerk.example/ticket" });
    start({ kind: "proven", sender, email: "a@x.dev" });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.toSignUp }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://clerk.example/ticket"));
    const button = screen.getByRole("button", { name: joinCopy.continuing }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(m.hand).toHaveBeenCalledTimes(1);
  });
  it("re-enables Continue when the page is restored from the back/forward cache", async () => {
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
    m.hand.mockResolvedValue({ ok: true, url: "https://clerk.example/ticket" });
    start({ kind: "proven", sender, email: "a@x.dev" });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.toSignUp }));
    await screen.findByRole("button", { name: joinCopy.continuing });
    fireEvent(window, Object.assign(new Event("pageshow"), { persisted: true }));
    await waitFor(() => expect((screen.getByRole("button", { name: joinCopy.toSignUp }) as HTMLButtonElement).disabled).toBe(false));
  });
});
