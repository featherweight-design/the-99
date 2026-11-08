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

import { Landing } from "../components/landing/landing";
import { saveLandingLaunchEmailAction } from "./landing-actions";
import { SignedOutLanding } from "./landing-entry";

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
