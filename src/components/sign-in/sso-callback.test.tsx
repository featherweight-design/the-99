// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  loaded: true,
  signIn: {} as Record<string, unknown>,
  replace: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ loaded: m.loaded }), useSignIn: () => ({ signIn: m.signIn, errors: {}, fetchStatus: "idle" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace, push: vi.fn() }) }));
vi.mock("../ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../ui/art-layer", () => ({ ArtLayer: () => null }));

import { GOOGLE_REFUSED, SsoCallback } from "./sso-callback";

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
  });

  it.each(["needs_identifier", "needs_second_factor", "needs_new_password"])("G1: a sign-in left at %s is refused too", async (status) => {
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

  it("waits for Clerk to load before reading the sign-in", async () => {
    m.loaded = false;
    m.signIn.status = "needs_identifier";
    render(<SsoCallback />);
    await new Promise((r) => setTimeout(r, 0));
    expect(m.replace).not.toHaveBeenCalled();
  });
});
