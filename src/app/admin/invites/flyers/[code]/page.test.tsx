import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const findFlyerCode = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }));
const switchEnv = vi.hoisted(() => ({ FLYER_TRIAL_ENABLED: "true" } as Record<string, string>));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("../../../../../lib/admin/access", () => ({ requireAdmin, adminMetadata: async (m: object) => m }));
vi.mock("../../../../../lib/flyer/claim", () => ({ findFlyerCode }));
vi.mock("../../../../../lib/flags/request", () => ({ requestFlags: async () => switchEnv }));
vi.mock("../../../../../components/admin/flyer-print-bar", () => ({ FlyerPrintBar: ({ code, revoked }: { code: string; revoked?: string | null }) => <div data-bar={code} data-revoked={revoked ?? undefined} /> }));
vi.mock("../../../../../components/admin/flyer-fit", () => ({ FlyerFit: ({ children, dimmed }: { children: React.ReactNode; dimmed?: boolean }) => <div data-dimmed={dimmed ? "true" : undefined}>{children}</div> }));
const { default: Page } = await import("./page");
const { flyerCopy } = await import("../../../../../lib/copy/join");

const render = async (code: string) => renderToStaticMarkup(await Page({ params: Promise.resolve({ code }) }));

describe("the flyer print page", () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({ userId: "u_admin", env: "local" });
    findFlyerCode.mockReset().mockResolvedValue({ code: "MZX4QK", label: "Mox Boston", revokedAt: null });
    notFound.mockClear();
    switchEnv.FLYER_TRIAL_ENABLED = "true";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "the-99.dev";
  });

  it("gates on the admin before it reads anything", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("NEXT_NOT_FOUND"));
    await expect(render("MZX4QK")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findFlyerCode).not.toHaveBeenCalled();
  });

  it("draws a live code's flyer with the join address typed and encoded", async () => {
    const html = await render("MZX4QK");
    expect(html).toContain("data-bar=\"MZX4QK\"");
    expect(html).toContain("the-99.dev/join/");
    expect(html).toContain("<em>MZX4QK</em>");
    expect(html).toContain("QR code for the-99.dev/join/MZX4QK");
    expect(html).toMatch(/<path fill="currentColor" d="M\d+ \d+h1v1h-1z/);
    expect(html).toContain("unofficial Fan Content");
    // The footer's domain is the QR's own host, not a constant.
    expect(html).toContain("<span>the-99.dev</span>");
  });

  it("carries the pitch, the three points as a list and the feedback line (addendum-flyer-copy)", async () => {
    const html = await render("MZX4QK");
    expect(html).toContain(`<h2 class="fs-h1">${flyerCopy.pitch}</h2>`);
    // The approved B3 strings, pinned literally so a copy edit has to change this test too.
    expect(flyerCopy.pitch).toBe("Search your library for a commander.");
    expect(flyerCopy.points).toEqual([
      "Find the commanders hiding in your binder.",
      "Learn which combo is only one card away.",
      "Borrow a friend’s spare before you pay for one.",
    ]);
    expect(flyerCopy.sub).toBe("Try it before it launches. Scan, sign up, tell us what you think.");
    for (const point of flyerCopy.points) expect(html).toContain(`<li><i aria-hidden="true"></i>${point}</li>`);
    expect(html).toContain(`<p class="fs-sub">${flyerCopy.sub}</p>`);
    // The board sets each point on one line at 20px across the 696px column; 52 characters is the measured headroom.
    for (const point of flyerCopy.points) expect(point.length).toBeLessThanOrEqual(52);
  });

  it("is the app's 404 for an unknown or switched-off code", async () => {
    findFlyerCode.mockResolvedValueOnce(null);
    await expect(render("ZZZZZZ")).rejects.toThrow("NEXT_NOT_FOUND");
    switchEnv.FLYER_TRIAL_ENABLED = "off";
    await expect(render("MZX4QK")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(2);
  });

  it("still opens a revoked code: the bar gets the real revoked day and the flyer is dimmed (Print-Revoked.dc.html)", async () => {
    findFlyerCode.mockResolvedValueOnce({ code: "PZA9TC", label: "Pizza Pod test", revokedAt: new Date(Date.UTC(2026, 10, 2, 9)) });
    const html = await render("PZA9TC");
    expect(notFound).not.toHaveBeenCalled();
    expect(html).toContain("data-revoked=\"Nov 2\"");
    expect(html).toContain("data-dimmed=\"true\"");
    expect(html).toContain("<em>PZA9TC</em>");
  });

  it("gives a live code no revoked day and no dimming", async () => {
    const html = await render("MZX4QK");
    expect(html).not.toContain("data-revoked");
    expect(html).not.toContain("data-dimmed");
  });
});
