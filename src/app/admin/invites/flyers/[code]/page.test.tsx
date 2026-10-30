import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const findFlyerCode = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }));
const switchEnv = vi.hoisted(() => ({ FLYER_TRIAL_ENABLED: "true" } as Record<string, string>));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("../../../../../lib/admin/access", () => ({ requireAdmin, adminMetadata: async (m: object) => m }));
vi.mock("../../../../../lib/flyer/claim", () => ({ findFlyerCode }));
vi.mock("../../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => switchEnv }));
vi.mock("../../../../../components/admin/flyer-print-bar", () => ({ FlyerPrintBar: ({ code }: { code: string }) => <div data-bar={code} /> }));
vi.mock("../../../../../components/admin/flyer-fit", () => ({ FlyerFit: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const { default: Page } = await import("./page");

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

  it("is the app's 404 for an unknown, revoked or switched-off code", async () => {
    findFlyerCode.mockResolvedValueOnce(null);
    await expect(render("ZZZZZZ")).rejects.toThrow("NEXT_NOT_FOUND");
    findFlyerCode.mockResolvedValueOnce({ code: "MZX4QK", label: "Mox", revokedAt: new Date() });
    await expect(render("MZX4QK")).rejects.toThrow("NEXT_NOT_FOUND");
    switchEnv.FLYER_TRIAL_ENABLED = "off";
    await expect(render("MZX4QK")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(3);
  });
});
