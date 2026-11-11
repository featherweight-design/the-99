// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { signInCopy } from "../../lib/copy/join";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  loaded: true,
  signIn: {} as Record<string, unknown>,
  replace: vi.fn(),
  signUpCreate: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ loaded: m.loaded }),
  useSignIn: () => ({ signIn: m.signIn, errors: {}, fetchStatus: "idle" }),
  // A transferable sign-up the callback must leave alone.
  useSignUp: () => ({ signUp: { create: m.signUpCreate, isTransferable: true, status: null }, errors: {}, fetchStatus: "idle" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace, push: vi.fn() }) }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { GOOGLE_CODE, GOOGLE_REFUSED, SsoCallback } from "./sso-callback";

const finalize = vi.fn(async ({ navigate }: { navigate: (p: { decorateUrl: (u: string) => string }) => void }) => {
  navigate({ decorateUrl: (u) => u });
  return { error: null as unknown };
});
const create = vi.fn();

beforeEach(() => {
  m.loaded = true;
  m.signIn = { status: "needs_identifier", isTransferable: false, finalize, create };
});
afterEach(() => {
  cleanup();
  m.replace.mockReset();
  finalize.mockClear();
  create.mockReset();
  m.signUpCreate.mockReset();
});

describe("SsoCallback", () => {
  it("M2: a Google account that matches an account signs in and goes Home", async () => {
    m.signIn.status = "complete";
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/"));
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(m.replace).not.toHaveBeenCalledWith(GOOGLE_REFUSED);
  });

  it("G1: a Google account with no account behind it returns to sign-in refused, and is never made a sign-up", async () => {
    m.signIn.isTransferable = true;
    m.signIn.status = "needs_first_factor";
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_REFUSED));
    expect(GOOGLE_REFUSED).toBe("/sign-in/new?google=refused");
    expect(finalize).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(m.signUpCreate).not.toHaveBeenCalled();
  });

  it.each(["needs_second_factor", "needs_client_trust"])("N2: a real account at %s goes on to the emailed code, never G1", async (status) => {
    m.signIn.status = status;
    render(<SsoCallback />);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith(GOOGLE_CODE));
    expect(GOOGLE_CODE).toBe("/sign-in/new?google=code");
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

  it("draws P1 with the Google press busy while it works, and the captcha slot", () => {
    m.loaded = false;
    const { container } = render(<SsoCallback />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(signInCopy.title);
    const google = screen.getByRole("button", { name: signInCopy.signingIn }) as HTMLButtonElement;
    expect(google.disabled).toBe(true);
    expect(google.className).toContain("disabled:opacity-60");
    expect(container.querySelector("#clerk-captcha")).toBeTruthy();
  });

  it("waits for Clerk to load before reading the sign-in", async () => {
    m.loaded = false;
    m.signIn.status = "needs_identifier";
    render(<SsoCallback />);
    await new Promise((r) => setTimeout(r, 0));
    expect(m.replace).not.toHaveBeenCalled();
  });
});
