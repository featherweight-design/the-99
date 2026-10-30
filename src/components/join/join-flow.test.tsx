// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { joinCopy, type Parts } from "../../lib/copy/join";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const m = vi.hoisted(() => ({ claim: vi.fn(), confirm: vi.fn(), hand: vi.fn() }));
vi.mock("../../app/join/actions", () => ({ claimInviteAction: m.claim, confirmCodeAction: m.confirm, handOverAction: m.hand }));
vi.mock("../../app/join/flyer-actions", () => ({ startFlyerClaimAction: vi.fn(), confirmFlyerCodeAction: vi.fn(), handOverFlyerAction: vi.fn(), saveLaunchListAction: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { JoinFlow, type JoinStart } from "./join-flow";

const sender = { displayName: named("Ada"), commander: null };
// A body with an emphasized phrase is several nodes: match the paragraph whose whole text is the line.
const line = (parts: Parts) => {
  const want = parts.map((p) => (typeof p === "object" && "em" in p ? p.em : plain(p))).join("");
  return (_: string, el: Element | null) => el?.tagName === "P" && el.textContent === want;
};
// The group and the field carry the same label; the field is the textbox.
const codeInput = () => screen.getByRole("textbox", { name: joinCopy.codeAria }) as HTMLInputElement;
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
    expect(screen.getByRole("heading", { name: plain(joinCopy.title(sender.displayName)) })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "new@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(line(joinCopy.codeBody("new@x.dev")));
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
    const input = codeInput();
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
    fireEvent.change(codeInput(), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.endedTitle);
    expect(screen.queryByText(/Ada/)).toBeNull();
  });

  it("N6 and N9: Continue hands over; an existing account draws N9 instead", async () => {
    m.hand.mockResolvedValue({ ok: false, reason: "account" });
    start({ kind: "proven", sender, email: "a@x.dev" });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.toSignUp }));
    await waitFor(() => expect(screen.getByText(joinCopy.haveAccountTitle)).toBeTruthy());
    expect(screen.getByText(line(joinCopy.haveAccountBody("a@x.dev", sender.displayName)))).toBeTruthy();
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
    expect(screen.queryByText(line(joinCopy.codeBody("new@x.dev")))).toBeNull();
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
    expect(screen.queryByText(line(joinCopy.codeBody("b@x.dev")))).toBeNull();
    expect((screen.getByLabelText(joinCopy.emailLabel) as HTMLInputElement).value).toBe("b@x.dev");
  });

  it("a manual Confirm retires the old Try again, so it cannot resubmit a spent code", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    m.confirm.mockRejectedValueOnce(new Error("network"));
    fireEvent.change(codeInput(), { target: { value: "123456" } });
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
    // N5: an expired code is neutral, never the danger border.
    expect(boxes[0].className).not.toContain("--danger");
  });
  it("holds the code field read-only while Confirm is pending, so a retry cannot carry other digits", async () => {
    let release: (v: unknown) => void = () => {};
    m.confirm.mockReturnValue(new Promise((r) => { release = r; }));
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    const input = codeInput();
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await waitFor(() => expect(input.readOnly).toBe(true));
    release({ ok: true });
    await screen.findByText(joinCopy.okTitle);
  });
  it("moves focus to the new step's heading after a confirmation, and to the code field on the code step", async () => {
    m.confirm.mockResolvedValue({ ok: true });
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    fireEvent.change(codeInput(), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.okTitle);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: joinCopy.okTitle })));
    cleanup();
    m.claim.mockResolvedValue({ ok: true, mailed: true });
    start({ kind: "email", sender });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "new@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    await screen.findByText(line(joinCopy.codeBody("new@x.dev")));
    await waitFor(() => expect(document.activeElement).toBe(codeInput()));
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
  it("takes a pasted code with spaces or dashes whole, and sends the digits it draws", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    const input = codeInput();
    // A browser cuts a paste to maxLength before any handler runs, so the field must not carry one: the digits are
    // taken from the text and capped in the handler.
    expect(input.hasAttribute("maxlength")).toBe(false);
    fireEvent.change(input, { target: { value: "12-34 56" } });
    m.confirm.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    // What is sent is what is drawn: the six digits, not the raw text with its dashes.
    await waitFor(() => expect(m.confirm).toHaveBeenCalledWith("t".repeat(43), "123456"));
  });

  // Newcomer design review (boards R1 - Newcomer): the pieces the property table pins.
  it("draws the compact, tilted card with the invitation word on its back", () => {
    start({ kind: "email", sender });
    const card = screen.getByTestId("friend-card");
    expect(card.dataset.variant).toBe("compact");
    expect(card.className).toContain("w-[150px]");
    expect(card.className).toContain("rotate-[-3deg]");
    expect(screen.getByTestId("friend-card-word").textContent).toBe(joinCopy.cardType);
    expect(screen.queryByTestId("friend-card-badge")).toBeNull();
    // The face is drawn at twice the board's size, then halved: padding 4px, rules 7px, type line 7.5px after the scale.
    const front = screen.getByTestId("friend-card-front");
    expect(front.className).toContain("p-[8px]");
    expect(front.className).toContain("text-left"); // the page column centres text; the card face reads left, as the table has it
    // The rules name the sender, so they are a marked span inside the text box.
    expect(screen.getByText(plain(joinCopy.cardRules(sender.displayName)), { exact: false }).closest("p")!.className).toContain("text-[14px]");
  });

  it("N6: the check badge sits on the card, hidden from assistive tech", () => {
    start({ kind: "proven", sender, email: "a@x.dev" });
    const badge = screen.getByTestId("friend-card-badge");
    expect(badge.textContent).toBe("✓");
    expect(badge.getAttribute("aria-hidden")).toBe("true");
    expect(badge.className).toContain("var(--success)");
  });

  it("N9: an existing account turns the card face down and the card names nobody", async () => {
    m.hand.mockResolvedValue({ ok: false, reason: "account" });
    start({ kind: "proven", sender, email: "a@x.dev" });
    expect(screen.getByTestId("friend-card-front")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: joinCopy.toSignUp }));
    await screen.findByText(joinCopy.haveAccountTitle);
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
    expect(screen.queryByTestId("friend-card-badge")).toBeNull();
  });

  it("emphasizes the email in the code and account bodies in --fg at weight 500", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    const b = screen.getByText("a@x.dev");
    expect(b.tagName).toBe("B");
    expect(b.className).toContain("font-medium");
    expect(b.className).toContain("var(--fg)");
  });

  it("the email form: a 13px/600 label, a 48px field, accent border once typed, a full-width Send code", () => {
    start({ kind: "email", sender });
    const field = screen.getByLabelText(joinCopy.emailLabel) as HTMLInputElement;
    expect(screen.getByText(joinCopy.emailLabel).closest("label")!.className).toContain("font-semibold");
    expect(field.className).toContain("h-[48px]");
    expect(field.className).not.toContain("md:h-");
    expect(field.className).toContain("var(--border-strong)");
    fireEvent.change(field, { target: { value: "a" } });
    expect(field.className).toContain("1px_solid_var(--accent)");
    const send = screen.getByRole("button", { name: joinCopy.sendCode });
    expect(send.className).toContain("w-full");
    expect(send.className).toContain("h-[48px]");
    expect(send.className).not.toContain("md:");
  });

  it("N2: while sending, the press is --accent-strong", async () => {
    m.claim.mockReturnValue(new Promise(() => {}));
    start({ kind: "email", sender });
    fireEvent.change(screen.getByLabelText(joinCopy.emailLabel), { target: { value: "new@x.dev" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.sendCode }));
    const sending = await screen.findByRole("button", { name: joinCopy.sendingCode });
    expect(sending.className).toContain("var(--accent-strong)");
  });

  it("N3: a labelled group of six 44x54 boxes; empty slots draw a dot, filled ones the accent border", () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    expect(screen.getByRole("group", { name: joinCopy.codeAria })).toBeTruthy();
    fireEvent.change(codeInput(), { target: { value: "12" } });
    const boxes = Array.from(document.querySelectorAll("[aria-hidden] > span"));
    expect(boxes).toHaveLength(6);
    expect(boxes[0].className).toContain("w-[44px]");
    expect(boxes[0].className).toContain("h-[54px]");
    expect(boxes[0].className).toContain("1px_solid_var(--accent)");
    expect(boxes[2].textContent).toBe("·");
    expect(boxes[2].className).toContain("var(--fg-disabled)");
    expect(boxes[2].className).toContain("var(--border-strong)");
  });

  it("N4: only a wrong code draws the danger border", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    m.confirm.mockResolvedValue({ ok: false, reason: "wrong", triesLeft: 3 });
    fireEvent.change(codeInput(), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.codeWrong);
    const boxes = Array.from(document.querySelectorAll("[aria-hidden] > span"));
    expect(boxes.every((b) => b.className.includes("var(--danger)"))).toBe(true);
    // Confirm stays the filled press, here with six digits in the boxes.
    expect(screen.getByRole("button", { name: joinCopy.confirm }).dataset.quiet).toBeUndefined();
  });

  it("N5: an expired code clears the boxes, stays neutral and demotes Confirm to the outline", async () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 0, expired: false });
    m.confirm.mockResolvedValue({ ok: false, reason: "expired" });
    fireEvent.change(codeInput(), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: joinCopy.confirm }));
    await screen.findByText(joinCopy.codeExpired);
    expect(codeInput().value).toBe("");
    const boxes = Array.from(document.querySelectorAll("[aria-hidden] > span"));
    expect(boxes.some((b) => b.className.includes("var(--danger)"))).toBe(false);
    const confirm = screen.getByRole("button", { name: joinCopy.confirm });
    expect(confirm.dataset.quiet).toBe("true");
    expect(confirm.className).toContain("mt-[8px]");
    expect(confirm.className).toContain("bg-transparent");
    expect(confirm.className).not.toContain("bg-[color:var(--accent)]");
    // Typing a new code brings the filled press back.
    fireEvent.change(codeInput(), { target: { value: "654321" } });
    expect(screen.getByRole("button", { name: joinCopy.confirm }).dataset.quiet).toBeUndefined();
  });

  it("the links row: 44px targets, and the resend is --fg-locked while it cools down", () => {
    start({ kind: "code", sender, email: "a@x.dev", resendWaitMs: 38_000, expired: false });
    const resend = screen.getByRole("button", { name: /Send a new code in/ });
    expect(resend.className).toContain("min-h-[44px]");
    expect(resend.className).toContain("var(--fg-locked)");
    const other = screen.getByRole("button", { name: joinCopy.otherEmail });
    expect(other.className).toContain("var(--accent-text)");
    expect(other.className).toContain("no-underline");
  });

  it("N11 and N12: the sign-in line is the quiet 11px mono line with an accent link", () => {
    start({ kind: "ended" });
    const link = screen.getByRole("button", { name: joinCopy.signIn });
    expect(link.className).toContain("var(--accent-text)");
    expect(link.className).toContain("no-underline");
    const quiet = link.closest("p")!;
    expect(quiet.className).toContain("mt-[22px]");
    expect(quiet.className).toContain("var(--fg-faint)");
    expect(quiet.className).toContain("font-mono");
  });
});
