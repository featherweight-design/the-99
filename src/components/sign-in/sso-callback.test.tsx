// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { signInCopy } from "../../lib/copy/join";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  loaded: true,
  signIn: {} as Record<string, unknown>,
  replace: vi.fn(),
  signUpCreate: vi.fn(),
  signUp: {} as Record<string, unknown>,
  protect: vi.fn(async () => undefined) as unknown as ((flow?: string) => Promise<void>) | undefined,
  capture: vi.fn(),
  message: vi.fn(),
  reset: vi.fn(async () => ({ error: null })),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: m.capture, captureMessage: m.message }));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ loaded: m.loaded, __internal_resolvePendingProtectCheck: m.protect }),
  useSignIn: () => ({ signIn: m.signIn, errors: {}, fetchStatus: "idle" }),
  useSignUp: () => ({ signUp: m.signUp, errors: {}, fetchStatus: "idle" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace, push: vi.fn() }) }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { GOOGLE_CODE, GOOGLE_MISSING, GOOGLE_REFUSED, SSO_STEP_TIMEOUT_MS, SsoCallback } from "./sso-callback";
import { act } from "@testing-library/react";

const finalize = vi.fn(async ({ navigate }: { navigate: (p: { decorateUrl: (u: string) => string }) => void }) => {
  navigate({ decorateUrl: (u) => u });
  return { error: null as unknown };
});
const create = vi.fn();
const signUpFinalize = vi.fn(async ({ navigate }: { navigate: (p: { decorateUrl: (u: string) => string }) => void }) => {
  navigate({ decorateUrl: (u) => u });
  return { error: null as unknown };
});

beforeEach(() => {
  m.loaded = true;
  m.protect = vi.fn(async () => undefined);
  m.capture.mockReset();
  m.message.mockReset();
  m.signIn = { status: "needs_identifier", isTransferable: false, finalize, create, reset: m.reset };
  // A transferable sign-up the callback must leave alone, unless a test gives it Google's verified account.
  m.signUp = { create: m.signUpCreate, isTransferable: true, status: null, finalize: signUpFinalize, verifications: { externalAccount: { status: null } } };
});
afterEach(() => {
  cleanup();
  m.replace.mockReset();
  finalize.mockClear();
  create.mockReset();
  m.signUpCreate.mockReset();
  signUpFinalize.mockClear();
});

describe("SsoCallback and Clerk's sign-up challenge", () => {
  it("settles the pending challenge for the sign-in flow before it reads any state", async () => {
    m.signIn.status = "complete";
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/"));
    expect(m.protect).toHaveBeenCalledWith("signIn");
  });

  it("settles it for the sign-up flow on the invitation's way back", async () => {
    m.signUp = { ...m.signUp, status: "complete", finalize: signUpFinalize, verifications: { externalAccount: { status: "verified" } } };
    render(<SsoCallback fromInvite />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/"));
    expect(m.protect).toHaveBeenCalledWith("signUp");
  });

  it("refuses and reports when the challenge fails", async () => {
    m.signIn.status = "complete";
    m.protect = vi.fn(async () => {
      throw new Error("challenge failed");
    });
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(finalize).not.toHaveBeenCalled();
    expect(m.capture).toHaveBeenCalledTimes(1);
  });

  it("refuses and reports when Clerk no longer has the step", async () => {
    m.signIn.status = "complete";
    m.protect = undefined;
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(finalize).not.toHaveBeenCalled();
    expect(m.capture).toHaveBeenCalledTimes(1);
  });
});

describe("SsoCallback reports which branch refuses, with Clerk's status words only", () => {
  it("reports a sign-in Google left unfinished with its statuses", async () => {
    m.signIn = { ...m.signIn, status: "needs_identifier", firstFactorVerification: { status: "transferable" } };
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(m.message).toHaveBeenCalledWith("sso-callback-refused", {
      level: "info",
      tags: { site: "sso-callback-refused", branch: "signin-state", signInStatus: "needs_identifier", firstFactor: "transferable", signUpStatus: "none" },
    });
  });

  it("reports nothing on a sign-in that finishes", async () => {
    m.signIn.status = "complete";
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/"));
    expect(m.message).not.toHaveBeenCalled();
  });
});

describe("SsoCallback clears what a refused round leaves", () => {
  it("resets the sign-in Google left before it sends the reader back to G1, so the next press is a fresh attempt", async () => {
    m.signIn = { ...m.signIn, status: "needs_identifier", firstFactorVerification: { status: "transferable" } };
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(m.reset).toHaveBeenCalled();
  });

  it("lands a sign-in that finalizes even after the watchdog gave up", async () => {
    vi.useFakeTimers();
    try {
      let done!: () => void;
      m.signIn = {
        ...m.signIn,
        status: "complete",
        finalize: vi.fn(({ navigate }: { navigate: (p: { decorateUrl: (u: string) => string }) => void }) =>
          new Promise((r) => (done = () => { navigate({ decorateUrl: (u) => u }); r({ error: null }); }))),
      };
      render(<SsoCallback />);
      await act(async () => {});
      await act(async () => vi.advanceTimersByTime(SSO_STEP_TIMEOUT_MS.finalize));
      expect(m.replace).toHaveBeenLastCalledWith(GOOGLE_REFUSED);
      await act(async () => done());
      expect(m.replace).toHaveBeenLastCalledWith("/");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("SsoCallback never leaves a reader on Signing in", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses and reports a protect step that never settles, after the timeout and not before", async () => {
    vi.useFakeTimers();
    m.protect = vi.fn(() => new Promise<void>(() => {}));
    m.signIn.status = "complete";
    render(<SsoCallback />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(SSO_STEP_TIMEOUT_MS.protect - 1));
    expect(m.replace).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED);
    expect(m.capture).toHaveBeenCalledWith(expect.any(Error), { tags: { site: "sso-callback-protect-timeout" } });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("does nothing more when the protect step settles after the timeout refused", async () => {
    vi.useFakeTimers();
    let settle!: () => void;
    m.protect = vi.fn(() => new Promise<void>((r) => (settle = r)));
    m.signIn.status = "complete";
    render(<SsoCallback />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(SSO_STEP_TIMEOUT_MS.protect));
    await act(async () => settle());
    expect(finalize).not.toHaveBeenCalled();
    expect(m.replace).toHaveBeenCalledTimes(1);
  });

  it("refuses and reports a Clerk that never loads", async () => {
    vi.useFakeTimers();
    m.loaded = false;
    render(<SsoCallback />);
    await act(async () => vi.advanceTimersByTime(SSO_STEP_TIMEOUT_MS.load));
    expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED);
    expect(m.capture).toHaveBeenCalledWith(expect.any(Error), { tags: { site: "sso-callback-load-timeout" } });
  });

  it("stands down once the way back has answered: a sign-in that finished is never refused later", async () => {
    vi.useFakeTimers();
    m.signIn.status = "complete";
    render(<SsoCallback />);
    await act(async () => {});
    expect(m.replace).toHaveBeenCalledWith("/");
    await act(async () => vi.advanceTimersByTime(SSO_STEP_TIMEOUT_MS.protect));
    expect(m.replace).toHaveBeenCalledTimes(1);
    expect(m.capture).not.toHaveBeenCalled();
  });
});

describe("SsoCallback", () => {
  it("M2: a Google account that matches an account signs in and goes Home", async () => {
    m.signIn.status = "complete";
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/"));
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(m.replace).not.toHaveBeenCalledWith(GOOGLE_REFUSED);
  });

  it("M2: a sign-in opened from a page lands back on it", async () => {
    m.signIn.status = "complete";
    render(<SsoCallback landing="/decks/abc?tab=cards" />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/decks/abc?tab=cards"));
    expect(m.replace).not.toHaveBeenCalledWith("/");
  });

  it("G1 and N2 carry the destination back to the sign-in, so a sign-in finished there lands on it too", async () => {
    m.signIn.status = "needs_first_factor";
    render(<SsoCallback landing="/decks" />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/sign-in?google=refused&redirect_url=%2Fdecks"));
    cleanup();
    m.signIn.status = "needs_second_factor";
    render(<SsoCallback landing="/decks" />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/sign-in?google=code&redirect_url=%2Fdecks"));
  });

  it("G1: a Google account with no account behind it returns to sign-in refused, and is never made a sign-up", async () => {
    m.signIn.isTransferable = true;
    m.signIn.status = "needs_first_factor";
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(GOOGLE_REFUSED).toBe("/sign-in?google=refused");
    expect(finalize).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(m.signUpCreate).not.toHaveBeenCalled();
  });

  it.each(["needs_second_factor", "needs_client_trust"])("N2: a real account at %s goes on to the emailed code, never G1", async (status) => {
    m.signIn.status = status;
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_CODE));
    expect(GOOGLE_CODE).toBe("/sign-in?google=code");
    expect(m.replace).not.toHaveBeenCalledWith(GOOGLE_REFUSED);
    expect(finalize).not.toHaveBeenCalled();
  });

  it.each(["needs_identifier", "needs_first_factor", "needs_new_password"])("G1: a sign-in left at %s is refused too", async (status) => {
    m.signIn.status = status;
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
  });

  it("G1: a finalize Clerk refuses, or one that throws, is refused", async () => {
    m.signIn.status = "complete";
    finalize.mockResolvedValueOnce({ error: new Error("refused") });
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    cleanup();
    m.replace.mockReset();
    finalize.mockRejectedValueOnce(new Error("network"));
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
  });

  // The invitation's Google press (R2) comes back here too, marked `?from=invite`, as a sign-up with Google's verified account.
  const googleSignUp = (status: string) => {
    m.signUp.status = status;
    m.signUp.verifications = { externalAccount: { status: "verified" } };
  };

  it("Q6: an invitation's sign-up Google left short goes to the sign-up's missing fields", async () => {
    googleSignUp("missing_requirements");
    render(<SsoCallback fromInvite />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_MISSING));
    expect(GOOGLE_MISSING).toBe("/sign-up?google=missing");
    expect(signUpFinalize).not.toHaveBeenCalled();
    expect(m.replace).not.toHaveBeenCalledWith(GOOGLE_REFUSED);
  });

  it("an invitation's sign-up Google completed makes the account and goes Home", async () => {
    googleSignUp("complete");
    render(<SsoCallback fromInvite />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/"));
    expect(signUpFinalize).toHaveBeenCalledTimes(1);
    expect(finalize).not.toHaveBeenCalled();
  });

  it("an invitation's sign-up Clerk will not finish, or one Google never verified, is G1", async () => {
    googleSignUp("abandoned");
    render(<SsoCallback fromInvite />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    cleanup();
    m.replace.mockReset();
    // A ticket sign-up Google never verified, even on the invitation's way back.
    m.signUp.status = "missing_requirements";
    m.signUp.verifications = { externalAccount: { status: "unverified" } };
    render(<SsoCallback fromInvite />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(m.replace).not.toHaveBeenCalledWith(GOOGLE_MISSING);
  });

  // A sign-in abandoned at a second factor earlier on this browser never sends the invitee to N2: the invitation's way back
  // reads its sign-up first.
  it.each([
    ["missing_requirements", GOOGLE_MISSING],
    ["complete", "/"],
  ])("a stale sign-in at a second factor never takes the invitation's way back (sign-up %s)", async (status, to) => {
    googleSignUp(status);
    m.signIn.status = "needs_second_factor";
    render(<SsoCallback fromInvite />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(to));
    expect(m.replace).not.toHaveBeenCalledWith(GOOGLE_CODE);
    expect(finalize).not.toHaveBeenCalled();
    expect(signUpFinalize).toHaveBeenCalledTimes(status === "complete" ? 1 : 0);
  });

  // An earlier visit to the invitation left a Google-verified sign-up on this browser; a later Google sign-in that failed comes
  // back unmarked, and must be G1, not the stale sign-up's Q6 or its account.
  it.each(["missing_requirements", "complete"])("G1: a stale Google sign-up (%s) never takes a sign-in's way back without the mark", async (status) => {
    googleSignUp(status);
    m.signIn.status = "needs_identifier";
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(m.replace).not.toHaveBeenCalledWith(GOOGLE_MISSING);
    expect(m.replace).not.toHaveBeenCalledWith("/");
    expect(signUpFinalize).not.toHaveBeenCalled();
  });

  it("draws P1 with the Google press busy while it works, and no legacy captcha slot (Clerk's challenge needs none)", () => {
    m.loaded = false;
    const { container } = render(<SsoCallback />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(signInCopy.title);
    const google = screen.getByRole("button", { name: signInCopy.signingIn }) as HTMLButtonElement;
    expect(google.disabled).toBe(true);
    expect(google.className).toContain("disabled:opacity-60");
    expect(container.querySelector("#clerk-captcha")).toBeNull();
  });

  it("waits for Clerk to load before reading the sign-in", async () => {
    m.loaded = false;
    m.signIn.status = "needs_identifier";
    render(<SsoCallback />);
    await new Promise((r) => setTimeout(r, 0));
    expect(m.replace).not.toHaveBeenCalled();
  });
});
