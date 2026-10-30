// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flyerJoinCopy, inviteOnlyCopy, joinCopy } from "../../lib/copy/join";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((to: string) => { throw new Error(`redirect:${to}`); }),
  readJoin: vi.fn(),
  readFlyerJoin: vi.fn(),
  cookie: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: m.cookie }) }));
vi.mock("../../lib/invites/join-read", () => ({ readJoin: m.readJoin }));
vi.mock("../../lib/flyer/join-read", () => ({ readFlyerJoin: m.readFlyerJoin }));
vi.mock("./flyer-actions", () => ({ startFlyerClaimAction: vi.fn(), confirmFlyerCodeAction: vi.fn(), handOverFlyerAction: vi.fn(), saveLaunchListAction: vi.fn() }));
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

  it("is one centred column at every width, with the 22px heading 28px under the card", async () => {
    m.auth.mockResolvedValue({ userId: null });
    m.cookie.mockReturnValue(undefined);
    m.readJoin.mockResolvedValue({ kind: "ended" });
    const { container } = render(await JoinPage({ params: Promise.resolve({ token: "tok" }) }));
    const main = container.querySelector("main")!;
    expect(main.className).not.toContain("md:flex-row");
    expect(main.className).not.toContain("md:gap");
    expect(main.className).toContain("pt-[44px]");
    const h1 = screen.getByRole("heading", { name: joinCopy.endedTitle });
    expect(h1.className).toContain("mt-[28px]");
    expect(h1.className).toContain("text-[22px]");
    expect(h1.className).not.toContain("md:");
  });
});

describe("/join/[code] for a flyer code", () => {
  it("redirects a lower-case code to its upper-case form before reading anything: the cookie path is case-sensitive", async () => {
    m.auth.mockResolvedValue({ userId: null });
    await expect(JoinPage({ params: Promise.resolve({ token: "max4qk" }) })).rejects.toThrow("redirect:/join/MAX4QK");
    expect(m.readFlyerJoin).not.toHaveBeenCalled();
    expect(m.readJoin).not.toHaveBeenCalled();
  });

  it("reads the code against this code's own claim cookie, and never reads an invite", async () => {
    m.auth.mockResolvedValue({ userId: null });
    m.cookie.mockImplementation((name: string) => (name === "flyer_claim_MAX4QK" ? { value: "secret" } : undefined));
    m.readFlyerJoin.mockResolvedValue({ kind: "email" });
    render(await JoinPage({ params: Promise.resolve({ token: "MAX4QK" }) }));
    expect(m.readFlyerJoin).toHaveBeenCalledWith("MAX4QK", "secret");
    expect(m.readJoin).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: flyerJoinCopy.title })).toBeTruthy();
  });

  it("sends a signed-in reader Home for a code too", async () => {
    m.auth.mockResolvedValue({ userId: "u" });
    await expect(JoinPage({ params: Promise.resolve({ token: "MAX4QK" }) })).rejects.toThrow("redirect:/");
    expect(m.readFlyerJoin).not.toHaveBeenCalled();
  });

  it("is the join frame on a phone and the desktop wash, 72px down, from md", async () => {
    m.auth.mockResolvedValue({ userId: null });
    m.cookie.mockReturnValue(undefined);
    m.readFlyerJoin.mockResolvedValue({ kind: "email" });
    const { container } = render(await JoinPage({ params: Promise.resolve({ token: "MAX4QK" }) }));
    const main = container.querySelector("main")!;
    expect(main.className).toContain("pt-[44px]");
    expect(main.className).toContain("md:pt-[72px]");
    expect(main.className).toContain("at_50%_8%");
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

  it("draws the three-back fan, the front back carrying the word, aria-hidden", async () => {
    m.auth.mockResolvedValue({ userId: null });
    render(await SignUpPage());
    const fan = screen.getByTestId("invite-fan");
    expect(fan.getAttribute("aria-hidden")).toBe("true");
    expect([...fan.querySelectorAll("[data-fan]")].map((e) => e.getAttribute("data-fan"))).toEqual(["left", "right", "front"]);
    expect(screen.getAllByTestId("friend-card-word").length).toBe(1);
    expect(screen.getByTestId("friend-card-word").textContent).toBe(inviteOnlyCopy.backWord);
    const b = screen.getByText("Invite someone new");
    expect(b.tagName).toBe("B");
    expect(b.className).toContain("font-medium");
  });

  it("is a column on a phone and the fan beside the column from md, on the invite frame", async () => {
    m.auth.mockResolvedValue({ userId: null });
    const { container } = render(await SignUpPage());
    const main = container.querySelector("main")!;
    expect(main.className).toContain("flex-col");
    expect(main.className).toContain("md:flex-row");
    expect(main.className).toContain("md:gap-[64px]");
    expect(main.className).toContain("pt-[56px]");
    expect(main.className).toContain("at_50%_18%");
  });
});
