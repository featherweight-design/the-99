import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const m = vi.hoisted(() => ({
  userId: null as string | null,
  admin: vi.fn(),
  env: vi.fn(),
  stats: vi.fn(),
  commanders: vi.fn(),
  precon: vi.fn(),
  save: vi.fn(),
  store: vi.fn(),
}));
class NotFound extends Error {}
vi.mock("next/navigation", () => ({ notFound: () => { throw new NotFound("NEXT_NOT_FOUND"); } }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: m.userId }) }));
vi.mock("../../../lib/admin/access", () => ({
  requireAdmin: async () => {
    if (!m.userId || !m.admin(m.userId)) throw new NotFound("NEXT_NOT_FOUND");
    return { userId: m.userId, env: "staging" };
  },
  adminMetadata: async (meta: object) => (m.userId && m.admin(m.userId) ? meta : {}),
}));
vi.mock("../../../lib/flags/snapshot", () => ({ resolveFlags: m.env }));
vi.mock("../../../lib/public/landing-stats", () => ({ readLandingStats: m.stats }));
vi.mock("../../../lib/public/landing-commanders", () => ({ readLandingCommanders: m.commanders }));
vi.mock("../../../lib/public/landing-precon", () => ({ readLandingPrecon: m.precon }));
vi.mock("../../../lib/rate/anon", () => ({ observeAnonymousHit: vi.fn() }));
vi.mock("../../landing-actions", () => ({ saveLandingLaunchEmailAction: m.save }));
vi.mock("../../../lib/flyer/launch-list", () => ({ saveLaunchEmailNoCode: m.store }));

import { landingCopy } from "../../../lib/copy/landing";
import { Landing } from "../../../components/landing/landing";
import { previewLaunchEmailAction } from "./actions";
import LandingPreviewPage, { generateMetadata } from "./page";

beforeEach(() => {
  Object.values(m).forEach((f) => typeof f === "function" && "mockReset" in f && f.mockReset());
  m.userId = "admin_1";
  m.admin.mockImplementation((id: string) => id === "admin_1");
  m.env.mockResolvedValue({});
  m.stats.mockResolvedValue({ commanders: 3 });
  m.commanders.mockResolvedValue([]);
  m.precon.mockResolvedValue(null);
});

describe("/preview/landing", () => {
  it("draws the landing for an admin with the no-op action and the banner, whatever the landing switch says", async () => {
    const page = (await LandingPreviewPage()) as ReactElement<{ children: ReactElement[] }>;
    const [banner, landing] = page.props.children as [ReactElement<{ children: string }>, ReactElement<Record<string, unknown>>];
    expect(banner.props.children).toBe(landingCopy.preview.note);
    expect(landing.type).toBe(Landing);
    expect(landing.props.launchAction).toBe(previewLaunchEmailAction);
    expect(landing.props.launchAction).not.toBe(m.save);
    expect(m.env).toHaveBeenCalledWith(null);
  });

  it("answers the no-op action ok and writes nothing", async () => {
    expect(await previewLaunchEmailAction("a@b.co")).toEqual({ ok: true });
    expect(m.save).not.toHaveBeenCalled();
    expect(m.store).not.toHaveBeenCalled();
  });

  it("refuses a malformed address like the real action, and still writes nothing", async () => {
    expect(await previewLaunchEmailAction("nope")).toEqual({ ok: false, reason: "invalid" });
    expect(await previewLaunchEmailAction(42)).toEqual({ ok: false, reason: "invalid" });
    expect(m.save).not.toHaveBeenCalled();
    expect(m.store).not.toHaveBeenCalled();
  });

  it("is a 404 for a signed-in non-admin and for a signed-out visitor, page and action", async () => {
    for (const id of ["someone", null]) {
      m.userId = id;
      await expect(LandingPreviewPage()).rejects.toBeInstanceOf(NotFound);
      await expect(previewLaunchEmailAction("a@b.co")).rejects.toBeInstanceOf(NotFound);
    }
    expect(m.stats).not.toHaveBeenCalled();
  });

  it("is noindex, nofollow with no canonical or Open Graph for the admin, and carries nothing for a stranger", async () => {
    const meta = await generateMetadata();
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.title).toBe("The 99 landing preview");
    expect(meta.alternates).toBeUndefined();
    expect(meta.openGraph).toBeUndefined();
    m.userId = null;
    expect(await generateMetadata()).toEqual({});
  });
});
