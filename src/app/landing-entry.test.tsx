import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const m = vi.hoisted(() => ({
  env: vi.fn(),
  hit: vi.fn(async (_h: unknown) => {}),
  stats: vi.fn(),
  commanders: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "203.0.113.9" }) }));
vi.mock("../lib/flags/snapshot", () => ({ resolveFlags: m.env }));
vi.mock("../lib/rate/anon", () => ({ observeAnonymousHit: m.hit }));
vi.mock("../lib/public/landing-stats", () => ({ readLandingStats: m.stats }));
vi.mock("../lib/public/landing-commanders", () => ({ readLandingCommanders: m.commanders }));
vi.mock("./landing-actions", () => ({ saveLandingLaunchEmailAction: vi.fn() }));

import { landingCopy } from "../lib/copy/landing";
import { Landing } from "../components/landing/landing";
import { saveLandingLaunchEmailAction } from "./landing-actions";
import { LANDING_ROBOTS, SignedOutLanding, landingMetadata } from "./landing-entry";

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.stats.mockResolvedValue({ commanders: 3 });
  m.commanders.mockResolvedValue([]);
});

describe("SignedOutLanding", () => {
  it("is null while PUBLIC_LANDING_ENABLED is off, and counts and reads nothing", async () => {
    m.env.mockResolvedValue({});
    expect(await SignedOutLanding()).toBeNull();
    expect(m.hit).not.toHaveBeenCalled();
    expect(m.stats).not.toHaveBeenCalled();
  });

  it("decides the switch with no account", async () => {
    m.env.mockResolvedValue({});
    await SignedOutLanding();
    expect(m.env).toHaveBeenCalledWith(null);
  });

  it("draws the landing with the catalog's data and the launch action as a prop, and counts the read with the request's headers", async () => {
    m.env.mockResolvedValue({ PUBLIC_LANDING_ENABLED: "true" });
    const page = (await SignedOutLanding()) as ReactElement<Record<string, unknown>>;
    expect(page.type).toBe(Landing);
    expect(page.props.stats).toEqual({ commanders: 3 });
    expect(page.props.launchAction).toBe(saveLandingLaunchEmailAction);
    expect((m.hit.mock.calls[0]![0] as Headers).get("x-real-ip")).toBe("203.0.113.9");
  });
});

describe("landingMetadata", () => {
  it("is null while PUBLIC_LANDING_ENABLED is off, decided with no account", async () => {
    m.env.mockResolvedValue({});
    expect(await landingMetadata()).toBeNull();
    expect(m.env).toHaveBeenCalledWith(null);
  });

  it("carries title, description, canonical, a text-only Open Graph card and no robots override while on", async () => {
    m.env.mockResolvedValue({ PUBLIC_LANDING_ENABLED: "true" });
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "the99.example");
    const meta = (await landingMetadata())!;
    vi.unstubAllEnvs();
    expect(String(meta.metadataBase)).toBe("https://the99.example/");
    expect(new URL(meta.alternates!.canonical as string, meta.metadataBase as URL).href).toBe("https://the99.example/");
    expect(new URL(meta.openGraph!.url as string, meta.metadataBase as URL).href).toBe("https://the99.example/");
    expect(meta.title).toBe(landingCopy.meta.title);
    expect(meta.description).toBe(landingCopy.meta.description);
    expect(meta.alternates).toEqual({ canonical: "/" });
    expect(meta.openGraph).toEqual({
      title: landingCopy.meta.title,
      description: landingCopy.meta.description,
      url: "/",
      type: "website",
      siteName: "The 99",
    });
    expect(meta.openGraph).not.toHaveProperty("images");
    expect(meta.twitter).toMatchObject({ card: "summary" });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(LANDING_ROBOTS).toEqual({ index: false, follow: true });
  });
});
