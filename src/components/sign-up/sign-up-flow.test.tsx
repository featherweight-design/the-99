// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { joinCopy, signInCopy, signUpCopy, type Parts } from "../../lib/copy/join";

// Clerk's signal sign-up, as a mutable double: each test sets what a call answers and the status it leaves behind. The
// sign-in is mocked too, only so a test can say the page never touches it (ruling C).
const m = vi.hoisted(() => ({
  signUp: {} as Record<string, unknown>,
  signInTicket: vi.fn(),
  loaded: true,
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ loaded: m.loaded }),
  useSignUp: () => ({ signUp: m.signUp, errors: {}, fetchStatus: "idle" }),
  useSignIn: () => ({ signIn: { ticket: m.signInTicket }, errors: {}, fetchStatus: "idle" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, replace: m.replace }) }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { SignUpFlow } from "./sign-up-flow";

const refusal = (codes: string | string[], status = 422) => {
  const list = typeof codes === "string" ? [codes] : codes;
  return new ClerkAPIResponseError(list[0], { data: list.map((code) => ({ code, message: code })), status });
};
// A refusal Clerk files under the ticket param, whatever its code.
const ticketParam = (code: string) =>
  new ClerkAPIResponseError(code, { data: [{ code, message: code, meta: { param_name: "ticket" } }], status: 422 });
const ok = () => vi.fn(async () => ({ error: null as unknown }));

function fresh() {
  const s = {
    status: "missing_requirements" as string,
    emailAddress: "sam@example.com" as string | null,
    missingFields: ["first_name", "password"] as string[],
    verifications: { externalAccount: { status: null as string | null } },
    ticket: ok(),
    create: ok(),
    update: ok(),
    sso: ok(),
    finalize: vi.fn(async ({ navigate }: { navigate: (p: { decorateUrl: (u: string) => string }) => void }) => {
      navigate({ decorateUrl: (u) => u });
      return { error: null as unknown };
    }),
  };
  m.signUp = s;
  return s;
}
let s = fresh();

const line = (parts: Parts) => {
  const want = parts.map((p) => (typeof p === "object" && "em" in p ? p.em : String(p))).join("");
  return (_: string, el: Element | null) => el?.tagName === "P" && el.textContent === want;
};
const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const alert = () => screen.queryByRole("alert")?.textContent ?? null;
const settle = () => act(async () => {});

async function toQ1(ticket = "tkt_1") {
  const view = render(<SignUpFlow ticket={ticket} />);
  await screen.findByRole("heading", { name: signUpCopy.title });
  await screen.findByRole("button", { name: signUpCopy.make });
  return view;
}
async function makeWith(name = "Sam", password = "a long password") {
  await toQ1();
  type(signUpCopy.nameLabel, name);
  type(signInCopy.passwordLabel, password);
  press(signUpCopy.make);
  await settle();
}

beforeEach(() => {
  s = fresh();
  m.loaded = true;
});
afterEach(() => {
  cleanup();
  m.push.mockReset();
  m.replace.mockReset();
  m.signInTicket.mockReset();
});

describe("SignUpFlow: the landing", () => {
  it("starts the sign-up with the link's ticket and draws Q1 naming the email it proved", async () => {
    await toQ1("tkt_abc");
    expect(s.ticket).toHaveBeenCalledWith({ ticket: "tkt_abc" });
    expect(screen.getByText(line(signUpCopy.body("sam@example.com")))).toBeTruthy();
    expect(screen.getByLabelText(signUpCopy.nameLabel)).toBeTruthy();
    expect(screen.getByLabelText(signInCopy.passwordLabel)).toBeTruthy();
    expect(screen.getByText(signUpCopy.nameHint)).toBeTruthy();
    expect(screen.getByText(signInCopy.newPasswordHint)).toBeTruthy();
    expect(screen.getByRole("button", { name: signInCopy.google })).toBeTruthy();
    expect(screen.getByText(signUpCopy.googleHint("sam@example.com"))).toBeTruthy();
  });

  it("is busy, checking the invitation, until Clerk has loaded, and asks nothing before", async () => {
    m.loaded = false;
    render(<SignUpFlow ticket="tkt_1" />);
    const busy = screen.getByRole("button", { name: signUpCopy.checking }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    await settle();
    expect(s.ticket).not.toHaveBeenCalled();
  });

  it("a ticket that needs nothing more makes the account and goes Home", async () => {
    s.ticket.mockImplementation(async () => { s.status = "complete"; return { error: null }; });
    render(<SignUpFlow ticket="tkt_1" />);
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/"));
    expect(s.finalize).toHaveBeenCalledTimes(1);
  });

  // One page for every refusal of the invitation: a used, revoked, expired or unknown ticket, and an invited email that has
  // an account.
  const REFUSALS: [string, () => unknown][] = [
    ...["invitation_account_exists", "invitation_already_accepted", "ticket_expired", "ticket_invalid", "form_identifier_exists"].map(
      (code): [string, () => unknown] => [code, () => refusal(code)],
    ),
    ["form_param_nil on the ticket", () => ticketParam("form_param_nil")],
  ];
  it.each(REFUSALS)("refusal %s is R3, and never signs in with the ticket (ruling C)", async (_, error) => {
    s.ticket.mockResolvedValue({ error: error() });
    render(<SignUpFlow ticket="tkt_1" />);
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
    expect(screen.getByText(signUpCopy.refusedBody)).toBeTruthy();
    const signIn = screen.getByRole("link", { name: joinCopy.signIn });
    expect(signIn.getAttribute("href")).toBe("/sign-in");
    expect(m.signInTicket).not.toHaveBeenCalled();
    expect(m.push).not.toHaveBeenCalled();
    expect(m.replace).not.toHaveBeenCalled();
    expect(screen.queryByText("sam@example.com", { exact: false })).toBeNull();
  });

  it("draws R3 identically for an existing holder and for a dead ticket", async () => {
    const draw = async (code: string) => {
      s = fresh();
      s.ticket.mockResolvedValue({ error: refusal(code) });
      const { container } = render(<SignUpFlow ticket="tkt_1" />);
      await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
      const html = container.innerHTML;
      cleanup();
      return html;
    };
    const holder = await draw("invitation_account_exists");
    expect(await draw("ticket_expired")).toBe(holder);
    expect(await draw("form_identifier_exists")).toBe(holder);
  });

  it("a throw or a 429 is no answer: the failed line, and Try again checks the ticket again", async () => {
    s.ticket.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ error: refusal("too_many_requests", 429) });
    render(<SignUpFlow ticket="tkt_1" />);
    await screen.findByRole("button", { name: joinCopy.retry });
    expect(alert()).toBe(joinCopy.failed);
    press(joinCopy.retry);
    await screen.findByRole("button", { name: joinCopy.retry });
    expect(heading()).toBe(signUpCopy.title);
    press(joinCopy.retry);
    await screen.findByRole("button", { name: signUpCopy.make });
    expect(s.ticket).toHaveBeenCalledTimes(3);
  });

  // Refusals that are not the invitation's: Clerk's bot check, and a code this page does not know. R3 would tell a reader
  // with a good invitation that it does not work; the failed line keeps the retry.
  it.each(["captcha_invalid", "captcha_missing_token", "anything_else"])("%s at the landing is the failed line with its retry, never R3", async (code) => {
    s.ticket.mockResolvedValueOnce({ error: refusal(code) });
    render(<SignUpFlow ticket="tkt_1" />);
    await screen.findByRole("button", { name: joinCopy.retry });
    expect(alert()).toBe(joinCopy.failed);
    expect(screen.queryByRole("heading", { name: signUpCopy.refusedTitle })).toBeNull();
    press(joinCopy.retry);
    await screen.findByRole("button", { name: signUpCopy.make });
    expect(s.ticket).toHaveBeenCalledTimes(2);
  });

  it("a sign-up that also needs something the page does not draw (the legal consent) is R3, never consented for", async () => {
    s.missingFields = ["first_name", "password", "legal_accepted"];
    render(<SignUpFlow ticket="tkt_1" />);
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
    expect(s.create).not.toHaveBeenCalled();
    expect(s.update).not.toHaveBeenCalled();
  });

  it("keeps one captcha mount, the same node, from the ticket's check through Q1", async () => {
    // The landing's `signUp.ticket` is the call Clerk's bot check runs on, so its mount must already be drawn, and a widget
    // drawn into it there must survive the move to Q1: the node is never replaced.
    let answer!: (v: { error: null }) => void;
    s.ticket = vi.fn(() => new Promise<{ error: null }>((done) => { answer = done; }));
    const { container } = render(<SignUpFlow ticket="tkt_1" />);
    await waitFor(() => expect(s.ticket).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: signUpCopy.make })).toBeNull();
    const mount = container.querySelector("#clerk-captcha");
    expect(mount).toBeTruthy();
    await act(async () => answer({ error: null }));
    await screen.findByRole("button", { name: signUpCopy.make });
    expect(container.querySelectorAll("#clerk-captcha")).toHaveLength(1);
    expect(container.querySelector("#clerk-captcha")).toBe(mount);
  });
});

describe("SignUpFlow: Make my account (Q2 to Q5)", () => {
  it("wakes only when the name and the password both have text", async () => {
    await toQ1();
    const make = () => screen.getByRole("button", { name: signUpCopy.make }) as HTMLButtonElement;
    expect(make().disabled).toBe(true);
    type(signUpCopy.nameLabel, "Sam");
    expect(make().disabled).toBe(true);
    type(signInCopy.passwordLabel, "x");
    expect(make().disabled).toBe(false);
    type(signUpCopy.nameLabel, "  ");
    expect(make().disabled).toBe(true);
  });

  it("Q2: under 8 characters is refused before Clerk is asked, and both fields keep their text", async () => {
    await makeWith("Sam", "short12");
    expect(alert()).toBe(signInCopy.tooShort);
    expect(s.create).not.toHaveBeenCalled();
    expect(input(signUpCopy.nameLabel).value).toBe("Sam");
    expect(input(signInCopy.passwordLabel).value).toBe("short12");
    expect(input(signInCopy.passwordLabel).getAttribute("aria-invalid")).toBe("true");
    // The line takes the hint's slot.
    expect(screen.queryByText(signInCopy.newPasswordHint)).toBeNull();
  });

  it.each([
    [["form_password_not_strong_enough"], signInCopy.tooWeak],
    [["form_password_pwned"], signInCopy.breached],
    [["form_password_not_strong_enough", "form_password_pwned"], signInCopy.breached],
    [["form_password_length_too_short"], signInCopy.tooShort],
  ])("Q3, Q4: %j reads its line, and the fields stay", async (codes, want) => {
    s.create.mockResolvedValue({ error: refusal(codes) });
    await makeWith("Sam", "password123");
    await waitFor(() => expect(alert()).toBe(want));
    expect(input(signUpCopy.nameLabel).value).toBe("Sam");
    expect(input(signInCopy.passwordLabel).value).toBe("password123");
    expect(m.push).not.toHaveBeenCalled();
  });

  it("Q5: locks both fields and reads Making your account…, then makes the account with the ticket, the name and the password", async () => {
    let answer!: (v: { error: null }) => void;
    s.create.mockImplementation(() => new Promise((done) => { answer = done; }));
    await makeWith(" Sam ", "a long password");
    const busy = screen.getByRole("button", { name: signUpCopy.making }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(input(signUpCopy.nameLabel).readOnly).toBe(true);
    expect(input(signInCopy.passwordLabel).readOnly).toBe(true);
    // Q5 draws the fields locked (the resting edge, the locked ink), with the password's hint and Google gone.
    expect(input(signUpCopy.nameLabel).className).toContain("text-[color:var(--fg-locked)]");
    expect(input(signInCopy.passwordLabel).className).toContain("[border:1px_solid_var(--border-strong)]");
    expect(screen.queryByText(signInCopy.newPasswordHint)).toBeNull();
    expect(screen.queryByRole("button", { name: signInCopy.google })).toBeNull();
    expect(s.create).toHaveBeenCalledWith({ strategy: "ticket", ticket: "tkt_1", firstName: "Sam", password: "a long password" });
    s.status = "complete";
    await act(async () => answer({ error: null }));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/"));
    expect(s.finalize).toHaveBeenCalledTimes(1);
  });

  it("a ticket refused at Make my account is R3 too", async () => {
    s.create.mockResolvedValue({ error: refusal("invitation_account_exists") });
    await makeWith();
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
    expect(m.signInTicket).not.toHaveBeenCalled();
  });

  it.each([
    ["an unmapped refusal", () => ({ error: refusal("something_new") })],
    ["a sign-up still missing something", () => ({ error: null })],
  ])("%s is the failed line, and the press stays", async (_, answer) => {
    s.create.mockImplementation(async () => answer());
    await makeWith();
    await waitFor(() => expect(alert()).toBe(joinCopy.failed));
    expect(screen.getByRole("button", { name: signUpCopy.make })).toBeTruthy();
    expect(s.finalize).not.toHaveBeenCalled();
  });

  it.each([
    ["holds it for something the page does not draw", () => { s.missingFields = ["legal_accepted"]; }],
    ["no longer holds it", () => { s.status = "abandoned"; }],
  ])("a make Clerk answers without an error but %s is R3, not a failed line that loops", async (_, leave) => {
    s.create.mockImplementation(async () => { leave(); return { error: null }; });
    await makeWith();
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
    expect(s.finalize).not.toHaveBeenCalled();
  });

  it("a finalize Clerk refuses is the failed line", async () => {
    s.create.mockImplementation(async () => { s.status = "complete"; return { error: null }; });
    s.finalize.mockResolvedValueOnce({ error: new Error("refused") });
    await makeWith();
    await waitFor(() => expect(alert()).toBe(joinCopy.failed));
    expect(m.push).not.toHaveBeenCalled();
  });

  it("after a finalize Clerk refuses, the press retries only the finalize, never the spent ticket, and goes Home", async () => {
    s.create.mockImplementation(async () => { s.status = "complete"; return { error: null }; });
    s.finalize.mockResolvedValueOnce({ error: new Error("refused") });
    await makeWith();
    await waitFor(() => expect(alert()).toBe(joinCopy.failed));
    press(signUpCopy.make);
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/"));
    expect(s.create).toHaveBeenCalledTimes(1);
    expect(s.finalize).toHaveBeenCalledTimes(2);
  });
});

describe("SignUpFlow: Google (R2)", () => {
  it("dims and reads Checking your invitation…, sends the ticket again, then continues that sign-up into Google", async () => {
    await toQ1();
    type(signUpCopy.nameLabel, "Sam");
    let answer!: (v: { error: null }) => void;
    s.ticket.mockImplementationOnce(() => new Promise((done) => { answer = done; }));
    press(signInCopy.google);
    const google = screen.getByRole("button", { name: signUpCopy.checking }) as HTMLButtonElement;
    expect(google.disabled).toBe(true);
    expect(google.className).toContain("disabled:opacity-60");
    // R2 keeps the fields as typed (`.jfld.on`), unlike Q5.
    expect(input(signUpCopy.nameLabel).className).toContain("[border:1px_solid_var(--accent)]");
    expect(s.sso).not.toHaveBeenCalled();
    await act(async () => answer({ error: null }));
    expect(s.ticket).toHaveBeenCalledTimes(2);
    expect(s.ticket).toHaveBeenLastCalledWith({ ticket: "tkt_1" });
    // The Future `sso()` runs after the ticket, so it continues (PATCHes) the ticket's own sign-up; none is created.
    // The way back is marked as the invitation's, the only one `/sso-callback` reads as a sign-up.
    expect(s.sso).toHaveBeenCalledWith({ strategy: "oauth_google", redirectCallbackUrl: "/sso-callback?from=invite", redirectUrl: "/" });
    expect(s.ticket.mock.invocationCallOrder[1]).toBeLessThan(s.sso.mock.invocationCallOrder[0]);
    expect(s.create).not.toHaveBeenCalled();
  });

  it("a ticket refused when Google is pressed is R3, before Google opens", async () => {
    await toQ1();
    s.ticket.mockResolvedValueOnce({ error: refusal("ticket_expired") });
    press(signInCopy.google);
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
    expect(s.sso).not.toHaveBeenCalled();
  });

  it("Clerk's bot check refusing the ticket at Google's press is the failed line under it, on Q1, never R3", async () => {
    await toQ1();
    s.ticket.mockResolvedValueOnce({ error: refusal("captcha_invalid") });
    press(signInCopy.google);
    await waitFor(() => expect(alert()).toBe(joinCopy.failed));
    expect(heading()).toBe(signUpCopy.title);
    expect(screen.getByRole("button", { name: signUpCopy.make })).toBeTruthy();
    expect((screen.getByRole("button", { name: signInCopy.google }) as HTMLButtonElement).disabled).toBe(false);
    expect(s.sso).not.toHaveBeenCalled();
  });

  it("an invitation already accepted when Google is pressed is R3", async () => {
    await toQ1();
    s.ticket.mockResolvedValueOnce({ error: refusal("invitation_already_accepted") });
    press(signInCopy.google);
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
    expect(s.sso).not.toHaveBeenCalled();
  });

  it.each([
    ["answers with an error", () => s.sso.mockResolvedValueOnce({ error: refusal("oauth_failed") })],
    ["throws", () => s.sso.mockRejectedValueOnce(new Error("network"))],
  ])("a Google press Clerk refuses (%s) frees the press with the failed line under it", async (_, refuse) => {
    await toQ1();
    refuse();
    press(signInCopy.google);
    await waitFor(() => expect(alert()).toBe(joinCopy.failed));
    expect((screen.getByRole("button", { name: signInCopy.google }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("a page restored from the back/forward cache un-busies the Google press", async () => {
    await toQ1();
    s.sso.mockImplementation(() => new Promise(() => {}));
    press(signInCopy.google);
    await settle();
    expect((screen.getByRole("button", { name: signUpCopy.checking }) as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    expect((screen.getByRole("button", { name: signInCopy.google }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("SignUpFlow: back from Google with something missing (Q6)", () => {
  beforeEach(() => {
    s.verifications.externalAccount.status = "verified";
  });
  const q6 = async () => {
    render(<SignUpFlow ticket={null} googleMissing />);
    await screen.findByRole("button", { name: signUpCopy.make });
  };

  it.each([
    [["first_name"], true, false],
    [["password"], false, true],
    [["first_name", "password"], true, true],
  ])("asks only for what Clerk lacks: %j", async (missing, name, password) => {
    s.missingFields = missing;
    s.emailAddress = "sam.plays@gmail.com";
    await q6();
    expect(!!screen.queryByLabelText(signUpCopy.nameLabel)).toBe(name);
    expect(!!screen.queryByLabelText(signInCopy.passwordLabel)).toBe(password);
    expect(screen.getByText(line(signUpCopy.googleBody("sam.plays@gmail.com")))).toBeTruthy();
    // No second way to Google from here, and no ticket to send.
    expect(screen.queryByRole("button", { name: signInCopy.google })).toBeNull();
    expect(s.ticket).not.toHaveBeenCalled();
  });

  it("sends only the missing fields to Google's own sign-up, then goes Home", async () => {
    s.missingFields = ["first_name"];
    s.update.mockImplementation(async () => { s.status = "complete"; return { error: null }; });
    await q6();
    type(signUpCopy.nameLabel, "Sam");
    press(signUpCopy.make);
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/"));
    expect(s.update).toHaveBeenCalledWith({ firstName: "Sam" });
    expect(s.create).not.toHaveBeenCalled();
  });

  it("a missing password goes to the same sign-up, held to 8 characters first", async () => {
    s.missingFields = ["password"];
    await q6();
    type(signInCopy.passwordLabel, "short");
    press(signUpCopy.make);
    expect(alert()).toBe(signInCopy.tooShort);
    type(signInCopy.passwordLabel, "a long password");
    press(signUpCopy.make);
    await settle();
    expect(s.update).toHaveBeenCalledWith({ password: "a long password" });
  });

  it("after a finalize Clerk refuses, the press retries only the finalize, never the finished sign-up's update, and goes Home", async () => {
    s.missingFields = ["first_name"];
    s.update.mockImplementation(async () => { s.status = "complete"; return { error: null }; });
    s.finalize.mockResolvedValueOnce({ error: new Error("refused") });
    await q6();
    type(signUpCopy.nameLabel, "Sam");
    press(signUpCopy.make);
    await waitFor(() => expect(alert()).toBe(joinCopy.failed));
    press(signUpCopy.make);
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/"));
    expect(s.update).toHaveBeenCalledTimes(1);
    expect(s.finalize).toHaveBeenCalledTimes(2);
  });

  it("a sign-up Google never verified (none on this browser, or a ticket's left behind) is R3", async () => {
    s.verifications.externalAccount.status = null;
    render(<SignUpFlow ticket={null} googleMissing />);
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
    expect(s.update).not.toHaveBeenCalled();
  });

  it("a sign-up that needs nothing more goes Home, and one Clerk no longer holds is R3", async () => {
    s.status = "complete";
    render(<SignUpFlow ticket={null} googleMissing />);
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/"));
    cleanup();
    s = fresh();
    s.verifications.externalAccount.status = "verified";
    s.status = "abandoned";
    render(<SignUpFlow ticket={null} googleMissing />);
    await screen.findByRole("heading", { name: signUpCopy.refusedTitle });
  });
});
