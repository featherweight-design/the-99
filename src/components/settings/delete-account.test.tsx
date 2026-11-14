// Deleting the account: D1's word gate and money lines, the delete inside Clerk's window, D2's step-up (password, code,
// Google) through useReverification's own-UI hook, ‹ as cancel, the on-device steps only once the delete goes ahead, and
// the sign-out that lands on `/?deleted=1`.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REVERIFY = { clerk_error: { type: "forbidden", reason: "reverification-error" } };

const m = vi.hoisted(() => ({
  action: vi.fn(),
  checkAuthorization: vi.fn(),
  startVerification: vi.fn(),
  prepare: vi.fn(),
  attempt: vi.fn(),
  signOut: vi.fn(),
  clearRecent: vi.fn(),
  forget: vi.fn(),
  noteSignOut: vi.fn(),
}));

class Cancelled extends Error {}
class FakeClerkError extends Error {
  constructor(readonly status: number, readonly errors: { code: string }[]) {
    super("clerk");
  }
}

vi.mock("../../app/settings/account-actions", () => ({ deleteAccountAction: m.action }));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({
    session: {
      checkAuthorization: m.checkAuthorization,
      startVerification: m.startVerification,
      prepareFirstFactorVerification: m.prepare,
      attemptFirstFactorVerification: m.attempt,
    },
    signOut: m.signOut,
  }),
  useUser: () => ({ user: { id: "user_me", primaryEmailAddress: { emailAddress: "wren@example.com" } } }),
  // Clerk's hook, as it behaves: the action's reverification error goes to onNeedsReverification; complete() runs the
  // action again, cancel() rejects with Clerk's cancelled error.
  useReverification: (fn: () => Promise<unknown>, opts: { onNeedsReverification: (p: { cancel: () => void; complete: () => void; level: string }) => void }) =>
    async () => {
      const first = await fn();
      if (first !== REVERIFY) return first;
      return new Promise((resolve, reject) => {
        opts.onNeedsReverification({ level: "second_factor", complete: () => resolve(fn()), cancel: () => reject(new Cancelled()) });
      });
    },
}));
vi.mock("@clerk/nextjs/errors", () => ({
  isReverificationCancelledError: (e: unknown) => e instanceof Cancelled,
  isClerkAPIResponseError: (e: unknown) => e instanceof FakeClerkError,
}));
vi.mock("../sign-in/auth-parts", async (orig) => {
  const real = await orig<typeof import("../sign-in/auth-parts")>();
  return { ...real, codesOf: (e: unknown) => (e instanceof FakeClerkError && e.status !== 429 ? e.errors.map((x) => x.code) : []) };
});
vi.mock("../../lib/card-search/recent", () => ({ clearRecent: m.clearRecent }));
vi.mock("../../lib/push/forget-device", () => ({ forgetThisDevice: m.forget }));
vi.mock("../../lib/analytics/sign-out-evidence", () => ({ noteSignOutPressed: m.noteSignOut }));
vi.mock("../credits/support-link", () => ({ SupportLink: () => <a href="mailto:support@the-99.dev">support@the-99.dev</a> }));

import { DeleteAccount, type DeleteFacts } from "./delete-account";
import { accountCopy } from "../../lib/copy/account";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import { joinCopy, signInCopy } from "../../lib/copy/join";

const a = accountCopy.del;
const NONE: DeleteFacts = { held: null, planLive: false, methods: ["password", "code"] };
const word = () => screen.getByLabelText(a.typeLabel);
const go = () => screen.getByRole("button", { name: a.go });

function typeAndDelete() {
  fireEvent.change(word(), { target: { value: "  DELETE " } });
  fireEvent.click(go());
}

beforeEach(() => {
  vi.clearAllMocks();
  m.checkAuthorization.mockReturnValue(true);
  m.action.mockResolvedValue({ ok: true });
  m.signOut.mockResolvedValue(undefined);
  m.forget.mockResolvedValue(undefined);
  m.prepare.mockResolvedValue({});
  m.startVerification.mockResolvedValue({
    supportedFirstFactors: [{ strategy: "password" }, { strategy: "email_code", safeIdentifier: "wren@example.com", emailAddressId: "idn_1" }],
  });
  m.attempt.mockResolvedValue({ status: "complete" });
});
afterEach(cleanup);

describe("D1", () => {
  it("lists what goes and holds Delete account until the word is typed, any case, trimmed", () => {
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    for (const x of a.erased) expect(screen.getByText(x)).toBeTruthy();
    expect(screen.getByText(a.pods)).toBeTruthy();
    expect((go() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(word(), { target: { value: "delet" } });
    expect((go() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(word(), { target: { value: "  DeLeTe " } });
    expect((go() as HTMLButtonElement).disabled).toBe(false);
    expect(word().getAttribute("autocapitalize")).toBe("none");
    expect(word().getAttribute("autocorrect")).toBe("off");
  });

  it("draws no money lines with no paid credits and no plan", () => {
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    expect(document.querySelector("[data-delete-split]")).toBeNull();
    expect(document.querySelector("[data-delete-money]")).toBeNull();
  });

  it("draws the split, the forfeit sentence and the plan line for a subscriber holding both, with the widened refund line", () => {
    render(<DeleteAccount facts={{ ...NONE, held: { plan: 50, pack: 40 }, planLive: true }} onClose={() => {}} />);
    expect(document.querySelectorAll("[data-delete-split] li")).toHaveLength(2);
    const money = document.querySelector("[data-delete-money]")!.textContent!;
    expect(money).toContain(creditsPageCopy.del.title(90));
    expect(money).toContain(a.heldSays(50, 40));
    expect(money).toContain(a.plan);
    expect(screen.getByText(a.refundBefore, { exact: false })).toBeTruthy();
  });

  it("draws packs alone with the shipped refund line", () => {
    render(<DeleteAccount facts={{ ...NONE, held: { plan: 0, pack: 40 } }} onClose={() => {}} />);
    expect(document.querySelectorAll("[data-delete-split] li")).toHaveLength(1);
    expect(document.querySelector("[data-delete-money]")!.textContent).not.toContain(a.plan);
    expect(screen.getByText(creditsPageCopy.del.refundBefore, { exact: false })).toBeTruthy();
  });

  it("tells a subscriber with no credits left that the plan ends, with no split", () => {
    render(<DeleteAccount facts={{ ...NONE, planLive: true }} onClose={() => {}} />);
    expect(document.querySelector("[data-delete-split]")).toBeNull();
    expect(document.querySelector("[data-delete-money]")!.textContent).toBe(a.plan);
    expect(screen.getByText(a.refundBefore, { exact: false })).toBeTruthy();
  });
});

describe("the delete inside Clerk's window", () => {
  it("does Sign out's on-device steps first, deletes, and lands on /?deleted=1 through Clerk's sign-out", async () => {
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    typeAndDelete();
    await waitFor(() => expect(m.signOut).toHaveBeenCalledWith({ redirectUrl: "/?deleted=1" }));
    expect(m.clearRecent).toHaveBeenCalledWith("user_me");
    expect(m.noteSignOut).toHaveBeenCalled();
    expect(m.forget.mock.invocationCallOrder[0]).toBeLessThan(m.action.mock.invocationCallOrder[0]);
    expect(m.startVerification).not.toHaveBeenCalled();
  });

  it("says too many tries when limited, keeping the word, and never signs out", async () => {
    m.action.mockResolvedValue({ ok: false, reason: "limited" });
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    typeAndDelete();
    expect((await screen.findByRole("alert")).textContent).toBe(a.tooMany);
    expect((word() as HTMLInputElement).value).toBe("  DELETE ");
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it("says nothing was deleted when the delete fails", async () => {
    m.action.mockResolvedValue({ ok: false, reason: "failed" });
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    typeAndDelete();
    expect((await screen.findByRole("alert")).textContent).toBe(a.failed);
  });
});

describe("D2, the step-up", () => {
  beforeEach(() => {
    m.checkAuthorization.mockReturnValue(false);
    m.action.mockResolvedValueOnce(REVERIFY).mockResolvedValue({ ok: true });
  });

  it("asks a password account for its password, refuses a wrong one, then deletes", async () => {
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    typeAndDelete();
    const field = await screen.findByLabelText(signInCopy.passwordLabel);
    expect(screen.getByText("wren@example.com")).toBeTruthy();
    expect(m.clearRecent).not.toHaveBeenCalled();
    m.attempt.mockRejectedValueOnce(new FakeClerkError(422, [{ code: "form_password_incorrect" }]));
    fireEvent.change(field, { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: a.confirm }));
    expect((await screen.findByRole("alert")).textContent).toBe(a.wrongPassword);
    fireEvent.change(field, { target: { value: "right" } });
    fireEvent.click(screen.getByRole("button", { name: a.confirm }));
    await waitFor(() => expect(m.signOut).toHaveBeenCalledWith({ redirectUrl: "/?deleted=1" }));
    expect(m.attempt).toHaveBeenLastCalledWith({ strategy: "password", password: "right" });
    // The on-device steps ran after the step-up passed, before the delete ran again.
    expect(m.clearRecent.mock.invocationCallOrder[0]).toBeLessThan(m.action.mock.invocationCallOrder[1]);
  });

  it("sends a Google-only account's code to the address Clerk offers, with the Google line", async () => {
    m.startVerification.mockResolvedValue({
      supportedFirstFactors: [{ strategy: "email_code", safeIdentifier: "wren.g@gmail.com", emailAddressId: "idn_g" }],
    });
    render(<DeleteAccount facts={{ ...NONE, methods: ["google", "code"] }} onClose={() => {}} />);
    typeAndDelete();
    expect(await screen.findByText("wren.g@gmail.com")).toBeTruthy();
    expect(screen.getByText(/You sign in with Google/)).toBeTruthy();
    expect(m.prepare).toHaveBeenCalledWith({ strategy: "email_code", emailAddressId: "idn_g" });
    m.attempt.mockRejectedValueOnce(new FakeClerkError(422, [{ code: "verification_expired" }]));
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: a.confirm }));
    expect((await screen.findByRole("alert")).textContent).toBe(joinCopy.codeExpired);
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: a.confirm }));
    await waitFor(() => expect(m.signOut).toHaveBeenCalled());
    expect(m.attempt).toHaveBeenLastCalledWith({ strategy: "email_code", code: "654321" });
  });

  it("lets a password account take a code instead", async () => {
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    typeAndDelete();
    fireEvent.click(await screen.findByRole("button", { name: signInCopy.codeInstead }));
    await waitFor(() => expect(m.prepare).toHaveBeenCalledWith({ strategy: "email_code", emailAddressId: "idn_1" }));
    expect(screen.getByRole("textbox", { name: joinCopy.codeAria })).toBeTruthy();
  });

  it("goes back to D1 on ‹, deleting nothing and touching nothing on the device", async () => {
    render(<DeleteAccount facts={NONE} onClose={() => {}} />);
    typeAndDelete();
    await screen.findByLabelText(signInCopy.passwordLabel);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: a.back })));
    expect((await screen.findByRole("status")).textContent).toBe(a.notDeleted);
    expect(m.action).toHaveBeenCalledTimes(1);
    expect(m.clearRecent).not.toHaveBeenCalled();
    expect(m.forget).not.toHaveBeenCalled();
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it("says too many tries on Clerk's 429, keeping the code", async () => {
    m.startVerification.mockResolvedValue({ supportedFirstFactors: [{ strategy: "email_code", safeIdentifier: "w@e.com", emailAddressId: "idn_1" }] });
    render(<DeleteAccount facts={{ ...NONE, methods: ["code"] }} onClose={() => {}} />);
    typeAndDelete();
    const boxes = await screen.findByRole("textbox", { name: joinCopy.codeAria });
    m.attempt.mockRejectedValueOnce(new FakeClerkError(429, []));
    fireEvent.change(boxes, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: a.confirm }));
    expect((await screen.findByRole("alert")).textContent).toBe(a.tooMany);
    expect((screen.getByRole("textbox", { name: joinCopy.codeAria }) as HTMLInputElement).value).toBe("123456");
  });
});
