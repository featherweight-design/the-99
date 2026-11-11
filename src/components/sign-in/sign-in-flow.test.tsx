// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { joinCopy, signInCopy, type Parts } from "../../lib/copy/join";

// Clerk's signal sign-in, as a mutable double: each test sets what a call answers and the status it leaves behind.
const m = vi.hoisted(() => ({
  signIn: {} as Record<string, unknown>,
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useSignIn: () => ({ signIn: m.signIn, errors: {}, fetchStatus: "idle" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, replace: m.replace }) }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { FLOOR_MS, RESET_FLOOR_MS, SignInFlow } from "./sign-in-flow";

const ok = () => vi.fn(async () => ({ error: null }));
const refusal = (code: string, status = 422) => new ClerkAPIResponseError(code, { data: [{ code, message: code }], status });
const fails = (code: string, status?: number) => vi.fn(async () => ({ error: refusal(code, status) }));

function fresh() {
  const s = {
    status: "needs_identifier" as string,
    identifier: null as string | null,
    supportedSecondFactors: [{ strategy: "email_code" }] as { strategy: string }[],
    password: ok(),
    create: ok(),
    emailCode: { sendCode: ok(), verifyCode: ok() },
    resetPasswordEmailCode: { sendCode: ok(), verifyCode: ok(), submitPassword: ok() },
    mfa: { sendEmailCode: ok(), verifyEmailCode: ok() },
    sso: ok(),
    finalize: vi.fn(async ({ navigate }: { navigate: (p: { decorateUrl: (u: string) => string }) => void }) => {
      navigate({ decorateUrl: (u) => u });
      return { error: null };
    }),
  };
  m.signIn = s;
  return s;
}
let s = fresh();

const line = (parts: Parts) => {
  const want = parts.map((p) => (typeof p === "object" && "em" in p ? p.em : String(p))).join("");
  return (_: string, el: Element | null) => el?.tagName === "P" && el.textContent === want;
};
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const settle = (ms = FLOOR_MS) => act(() => vi.advanceTimersByTimeAsync(ms));
const alert = () => screen.queryByRole("alert")?.textContent ?? null;

function toPassword(email = "sam@example.com") {
  render(<SignInFlow />);
  type(joinCopy.emailLabel, email);
  press(signInCopy.continue);
}
async function signInWith(password = "hunter22") {
  toPassword();
  type(signInCopy.passwordLabel, password);
  press(signInCopy.signIn);
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
  s = fresh();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  m.push.mockReset();
  m.replace.mockReset();
});

describe("SignInFlow: P1 and P2", () => {
  it("P1 → P2 for every email, and asks Clerk nothing", () => {
    toPassword("nobody@example.com");
    expect(screen.getByRole("heading", { name: signInCopy.passwordTitle })).toBeTruthy();
    expect(screen.getByText(line(signInCopy.forEmail("nobody@example.com")))).toBeTruthy();
    expect(s.password).not.toHaveBeenCalled();
    expect(s.create).not.toHaveBeenCalled();
    expect(s.emailCode.sendCode).not.toHaveBeenCalled();
  });

  it("refuses a shapeless address on P1", () => {
    render(<SignInFlow />);
    type(joinCopy.emailLabel, "nope");
    press(signInCopy.continue);
    expect(alert()).toBe(joinCopy.notAnEmail);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(signInCopy.title);
  });

  it("a right password signs in and goes Home", async () => {
    s.password.mockImplementation(async () => { s.status = "complete"; return { error: null }; });
    await signInWith();
    expect(s.password).toHaveBeenCalledWith({ identifier: "sam@example.com", password: "hunter22" });
    expect(s.finalize).toHaveBeenCalled();
    expect(m.push).toHaveBeenCalledWith("/");
  });
});

describe("SignInFlow: never says whether an email has an account (ruling 2)", () => {
  // Each answer Clerk can give for a password that does not sign in, drawn and navigated alike.
  async function drawnFor(error: ClerkAPIResponseError) {
    s = fresh();
    s.password.mockResolvedValue({ error } as never);
    await signInWith();
    const html = document.body.innerHTML;
    const nav = [m.push.mock.calls.length, m.replace.mock.calls.length, s.finalize.mock.calls.length];
    cleanup();
    return { html, nav };
  }

  it("P3: a wrong password, an unknown email, protection's merged code and a locked account draw the same page", async () => {
    const wrong = await drawnFor(refusal("form_password_incorrect"));
    expect(wrong.html).toContain(signInCopy.wrong);
    expect(wrong.nav).toEqual([0, 0, 0]);
    for (const code of ["form_identifier_not_found", "form_password_or_identifier_incorrect", "user_locked", "strategy_for_user_invalid"]) {
      const other = await drawnFor(refusal(code, code === "user_locked" ? 403 : 422));
      expect(other, code).toEqual(wrong);
    }
  });

  it("user_locked renders P3's line, on the password screen", async () => {
    s.password.mockResolvedValue({ error: refusal("user_locked", 403) } as never);
    await signInWith();
    expect(alert()).toBe(signInCopy.wrong);
    expect(screen.getByRole("heading", { name: signInCopy.passwordTitle })).toBeTruthy();
    expect(screen.getByRole("button", { name: signInCopy.signIn })).toBeTruthy();
  });

  it("a 429 is the failed line, never P3", async () => {
    s.password.mockResolvedValue({ error: refusal("too_many_requests", 429) } as never);
    await signInWith();
    expect(alert()).toBe(joinCopy.failed);
  });

  it("an unmapped refusal and a throw are the failed line", async () => {
    s.password.mockResolvedValue({ error: refusal("captcha_invalid") } as never);
    await signInWith();
    expect(alert()).toBe(joinCopy.failed);
    cleanup();
    s = fresh();
    s.password.mockRejectedValue(new Error("network"));
    await signInWith();
    expect(alert()).toBe(joinCopy.failed);
  });

  it("P4: the code page is the same whether Clerk sent the code, refused the email or threw", async () => {
    const drawn: string[] = [];
    for (const send of [ok(), fails("form_identifier_not_found"), vi.fn(async () => { throw new Error("network"); })]) {
      s = fresh();
      s.emailCode.sendCode = send as never;
      toPassword();
      press(signInCopy.codeInstead);
      await settle();
      expect(send).toHaveBeenCalledWith({ emailAddress: "sam@example.com" });
      expect(screen.getByText(line(signInCopy.codeBody("sam@example.com")))).toBeTruthy();
      expect(m.push).not.toHaveBeenCalled();
      drawn.push(document.body.innerHTML);
      cleanup();
    }
    expect(new Set(drawn).size).toBe(1);
  });

  it("P5: any refused code is the shipped wrong-code line, and a right one signs in", async () => {
    s.emailCode.verifyCode = fails("form_code_incorrect") as never;
    toPassword();
    press(signInCopy.codeInstead);
    await settle();
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "123456" } });
    press(joinCopy.confirm);
    await settle();
    expect(alert()).toBe(joinCopy.codeWrong);
    s.emailCode.verifyCode = vi.fn(async () => { s.status = "complete"; return { error: null }; }) as never;
    press(joinCopy.confirm);
    await settle();
    expect(s.emailCode.verifyCode).toHaveBeenCalledWith({ code: "123456" });
    expect(m.push).toHaveBeenCalledWith("/");
  });

  it("P6: the reset page is the same whether Clerk knew the email or not", async () => {
    const drawn: string[] = [];
    for (const create of [ok(), fails("form_identifier_not_found")]) {
      s = fresh();
      s.create = create as never;
      toPassword();
      press(signInCopy.forgot);
      await settle(RESET_FLOOR_MS);
      expect(create).toHaveBeenCalledWith({ identifier: "sam@example.com" });
      expect(screen.getByRole("heading", { name: signInCopy.resetTitle })).toBeTruthy();
      expect(screen.getByText(line(signInCopy.resetBody("sam@example.com")))).toBeTruthy();
      drawn.push(document.body.innerHTML);
      cleanup();
    }
    expect(new Set(drawn).size).toBe(1);
  });

  /** Nothing lands before `floor`, and the screen is there at `floor`. */
  async function holds(floor: number, before: () => boolean, after: () => boolean) {
    await act(() => vi.advanceTimersByTimeAsync(floor - 1));
    expect(before()).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(after()).toBe(true);
  }
  const onCode = () => !!screen.queryByText(line(signInCopy.codeBody("sam@example.com")));
  const onReset = () => !!screen.queryByRole("heading", { name: signInCopy.resetTitle });
  const throws = () => vi.fn(async () => { throw new Error("network"); });

  it("holds Sign in to the floor, however fast Clerk refuses", async () => {
    s.password.mockResolvedValue({ error: refusal("form_identifier_not_found") } as never);
    toPassword();
    type(signInCopy.passwordLabel, "hunter22");
    press(signInCopy.signIn);
    await holds(FLOOR_MS, () => alert() === null, () => alert() === signInCopy.wrong);
  });

  it.each([["sent", ok], ["refused", () => fails("form_identifier_not_found")], ["thrown", throws]] as const)(
    "holds P4 to the floor when the send is %s",
    async (_, send) => {
      s.emailCode.sendCode = send() as never;
      toPassword();
      press(signInCopy.codeInstead);
      await holds(FLOOR_MS, () => !onCode(), onCode);
    },
  );

  it.each([["known", ok], ["refused", () => fails("form_identifier_not_found")], ["thrown", throws]] as const)(
    "holds P6 to its own longer floor when the email is %s",
    async (_, create) => {
      s.create = create() as never;
      toPassword();
      press(signInCopy.forgot);
      await holds(RESET_FLOOR_MS, () => !onReset(), onReset);
    },
  );

  it("holds a refused code to the floor, on P4, P6 and N2 alike", async () => {
    s.emailCode.verifyCode = fails("form_identifier_not_found") as never;
    toPassword();
    press(signInCopy.codeInstead);
    await settle();
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "123456" } });
    press(joinCopy.confirm);
    await holds(FLOOR_MS, () => alert() === null, () => alert() === joinCopy.codeWrong);
    cleanup();

    s.resetPasswordEmailCode.verifyCode = throws() as never;
    toPassword();
    press(signInCopy.forgot);
    await settle(RESET_FLOOR_MS);
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "123456" } });
    press(joinCopy.confirm);
    await holds(FLOOR_MS, () => alert() === null, () => alert() === joinCopy.codeWrong);
    cleanup();

    s.password.mockImplementation(async () => { s.status = "needs_second_factor"; return { error: null }; });
    s.mfa.verifyEmailCode = fails("form_code_incorrect") as never;
    await signInWith();
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "123456" } });
    press(joinCopy.confirm);
    await holds(FLOOR_MS, () => alert() === null, () => alert() === joinCopy.codeWrong);
  });

  it("counts the floor from the press: an answer at 600ms lands at 900ms, not later", async () => {
    s.emailCode.sendCode = vi.fn(() => new Promise((done) => setTimeout(() => done({ error: null }), 600))) as never;
    toPassword();
    press(signInCopy.codeInstead);
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(onCode()).toBe(false);
    await holds(FLOOR_MS - 600, () => !onCode(), onCode);
  });
});

describe("SignInFlow: N1, N2 and K5", () => {
  it.each(["form_password_pwned", "form_password_compromised"])("N1: %s says the password can't be used, and the press resets it", async (code) => {
    s.password.mockResolvedValue({ error: refusal(code) } as never);
    await signInWith();
    expect(alert()).toBe(signInCopy.cantUse);
    press(signInCopy.resetPassword);
    await settle(RESET_FLOOR_MS);
    expect(s.create).toHaveBeenCalledWith({ identifier: "sam@example.com" });
    expect(s.resetPasswordEmailCode.sendCode).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: signInCopy.resetTitle })).toBeTruthy();
  });

  it("N1: a right password Clerk wants replaced (needs_new_password) is the same line", async () => {
    s.password.mockImplementation(async () => { s.status = "needs_new_password"; return { error: null }; });
    await signInWith();
    expect(alert()).toBe(signInCopy.cantUse);
    expect(screen.getByRole("button", { name: signInCopy.resetPassword })).toBeTruthy();
    expect(s.finalize).not.toHaveBeenCalled();
  });

  it.each(["needs_second_factor", "needs_client_trust"])("N2: %s emails a code and draws S2, and its code signs in", async (status) => {
    s.password.mockImplementation(async () => { s.status = status; return { error: null }; });
    await signInWith();
    expect(s.mfa.sendEmailCode).toHaveBeenCalled();
    expect(screen.getByText(line(joinCopy.codeBody("sam@example.com")))).toBeTruthy();
    s.mfa.verifyEmailCode = vi.fn(async () => { s.status = "complete"; return { error: null }; }) as never;
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "654321" } });
    press(joinCopy.confirm);
    await settle();
    expect(s.mfa.verifyEmailCode).toHaveBeenCalledWith({ code: "654321" });
    expect(m.push).toHaveBeenCalledWith("/");
  });

  it("N2: a refused second-factor code is the wrong-code line", async () => {
    s.password.mockImplementation(async () => { s.status = "needs_second_factor"; return { error: null }; });
    s.mfa.verifyEmailCode = fails("form_code_incorrect") as never;
    await signInWith();
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "654321" } });
    press(joinCopy.confirm);
    await settle();
    expect(alert()).toBe(joinCopy.codeWrong);
    expect(m.push).not.toHaveBeenCalled();
  });

  it("N2: an account whose second factor is not the emailed code gets the failed line (known limit)", async () => {
    s.password.mockImplementation(async () => { s.status = "needs_second_factor"; return { error: null }; });
    s.supportedSecondFactors = [{ strategy: "totp" }];
    await signInWith();
    expect(alert()).toBe(joinCopy.failed);
    expect(s.mfa.sendEmailCode).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: signInCopy.passwordTitle })).toBeTruthy();
  });

  it("a finalize that throws unlocks the page with the failed line", async () => {
    s.password.mockImplementation(async () => { s.status = "complete"; return { error: null }; });
    s.finalize.mockRejectedValueOnce(new Error("network"));
    await signInWith();
    expect(alert()).toBe(joinCopy.failed);
    expect((screen.getByRole("button", { name: signInCopy.signIn }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: signInCopy.forgot }) as HTMLButtonElement).disabled).toBe(false);
  });

  async function toK5() {
    toPassword();
    press(signInCopy.forgot);
    await settle(RESET_FLOOR_MS);
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "111111" } });
    press(joinCopy.confirm);
    await settle();
    expect(screen.getByRole("heading", { name: signInCopy.newPasswordTitle })).toBeTruthy();
  }
  const save = async (password: string) => {
    type(signInCopy.newPasswordLabel, password);
    press(signInCopy.save);
    await settle();
  };

  it("P6: a refused reset code stays on P6 with the wrong-code line", async () => {
    s.resetPasswordEmailCode.verifyCode = fails("form_code_incorrect") as never;
    toPassword();
    press(signInCopy.forgot);
    await settle(RESET_FLOOR_MS);
    fireEvent.change(screen.getByRole("textbox", { name: joinCopy.codeAria }), { target: { value: "111111" } });
    press(joinCopy.confirm);
    await settle();
    expect(alert()).toBe(joinCopy.codeWrong);
    expect(screen.getByRole("heading", { name: signInCopy.resetTitle })).toBeTruthy();
  });

  it("K5: refuses a short password before asking Clerk", async () => {
    await toK5();
    await save("short");
    expect(alert()).toBe(signInCopy.tooShort);
    expect(s.resetPasswordEmailCode.submitPassword).not.toHaveBeenCalled();
  });

  it.each([
    ["form_password_not_strong_enough", signInCopy.tooWeak],
    ["form_password_pwned", signInCopy.breached],
    ["something_else", joinCopy.failed],
  ])("K5: Clerk's %s is its own line, and the password stays", async (code, want) => {
    s.resetPasswordEmailCode.submitPassword = fails(code) as never;
    await toK5();
    await save("longenough");
    expect(alert()).toBe(want);
    expect((screen.getByLabelText(signInCopy.newPasswordLabel) as HTMLInputElement).value).toBe("longenough");
    expect(m.push).not.toHaveBeenCalled();
  });

  it("K5: Save and sign in sets the password and goes Home", async () => {
    s.resetPasswordEmailCode.submitPassword = vi.fn(async () => { s.status = "complete"; return { error: null }; }) as never;
    await toK5();
    await save("longenough");
    expect(s.resetPasswordEmailCode.submitPassword).toHaveBeenCalledWith({ password: "longenough" });
    expect(m.push).toHaveBeenCalledWith("/");
  });
});

describe("SignInFlow: Google", () => {
  it("starts Google's sign-in, coming back through /sso-callback, and reads Signing in… on the way", async () => {
    s.sso.mockImplementation(() => new Promise(() => {}));
    render(<SignInFlow />);
    press(signInCopy.google);
    expect(s.sso).toHaveBeenCalledWith({ strategy: "oauth_google", redirectUrl: "/", redirectCallbackUrl: "/sso-callback" });
    expect(screen.getByRole("button", { name: signInCopy.signingIn })).toBeTruthy();
  });

  it("N2 back from Google: sends the emailed code on arrival and names the email Clerk holds", async () => {
    s.identifier = "sam@example.com";
    s.status = "needs_second_factor";
    render(<SignInFlow googleCode />);
    await settle();
    expect(s.mfa.sendEmailCode).toHaveBeenCalledTimes(1);
    expect(screen.getByText(line(joinCopy.codeBody("sam@example.com")))).toBeTruthy();
  });

  it("N2 back from Google without an email draws the body that names none", async () => {
    s.status = "needs_client_trust";
    render(<SignInFlow googleCode />);
    await settle();
    expect(screen.getByText(signInCopy.codeBodyNoEmail)).toBeTruthy();
    expect(screen.getByRole("textbox", { name: joinCopy.codeAria })).toBeTruthy();
  });

  it("G1: back from a refusal, P1 carries the line under the Google press", () => {
    render(<SignInFlow googleRefused />);
    expect(alert()).toBe(signInCopy.googleRefused);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(signInCopy.title);
    cleanup();
    render(<SignInFlow />);
    expect(alert()).toBeNull();
  });
});
