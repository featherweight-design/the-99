// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inviteOnlyCopy, joinCopy } from "../../lib/copy/join";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((to: string) => { throw new Error(`redirect:${to}`); }),
  readJoin: vi.fn(),
  cookie: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: m.cookie }) }));
vi.mock("../../lib/invites/join-read", () => ({ readJoin: m.readJoin }));
vi.mock("./actions", () => ({ claimInviteAction: vi.fn(), confirmCodeAction: vi.fn(), handOverAction: vi.fn() }));
vi.mock("../../components/ui/hydrated-art", () => ({ FadingImg: () => null, useHydrated: () => true }));
vi.mock("../../components/ui/art-layer", () => ({ ArtLayer: () => null }));

import JoinPage from "./[token]/page";
import SignUpPage from "../sign-up/page";

afterEach(() => { cleanup(); Object.values(m).forEach((f) => f.mockClear()); });

describe("/join/[token]", () => {
  it("sends a signed-in reader Home: they already have an account", async () => {
    m.auth.mockResolvedValue({ userId: "u" });
    await expect(JoinPage({ params: Promise.resolve({ token: "t" }) })).rejects.toThrow("redirect:/");
    expect(m.readJoin).not.toHaveBeenCalled();
  });

  it("reads the row against the claim cookie and draws the step", async () => {
    m.auth.mockResolvedValue({ userId: null });
    m.cookie.mockReturnValue({ value: "secret" });
    m.readJoin.mockResolvedValue({ kind: "ended" });
    render(await JoinPage({ params: Promise.resolve({ token: "tok" }) }));
    expect(m.readJoin).toHaveBeenCalledWith("tok", "secret");
    expect(screen.getByRole("heading", { name: joinCopy.endedTitle })).toBeTruthy();
  });
});

describe("/sign-up", () => {
  it("sends a signed-in reader Home", async () => {
    m.auth.mockResolvedValue({ userId: "u" });
    await expect(SignUpPage()).rejects.toThrow("redirect:/");
  });

  it("tells a signed-out reader the app is invite-only, with Sign in", async () => {
    m.auth.mockResolvedValue({ userId: null });
    render(await SignUpPage());
    expect(screen.getByRole("heading", { name: inviteOnlyCopy.title })).toBeTruthy();
    expect(screen.getByRole("button", { name: inviteOnlyCopy.signIn })).toBeTruthy();
    expect(screen.getByText(inviteOnlyCopy.fine)).toBeTruthy();
  });
});
