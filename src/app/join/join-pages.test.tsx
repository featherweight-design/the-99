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
