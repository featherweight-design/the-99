import { describe, expect, it } from "vitest";
import { assertModelStandIn, standInDecision } from "./model-stand-in.mjs";

const devManifest = { status: 200, text: JSON.stringify({ pages: ["/favicon.ico"] }) };
const report = (over: Record<string, unknown> = {}) => ({
  status: 200,
  text: JSON.stringify({ synopsis: "stand-in", intake: "stand-in", fits: "stand-in", tuning: "live", key: "real", baseUrl: false, ...over }),
});

describe("standInDecision", () => {
  it("refuses a production server: the dev manifest is a 404 there", () => {
    const d = standInDecision({ manifest: { status: 404, text: "" }, report: { status: 404, text: "" } }, ["synopsis"]);
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/not a `next dev` server/);
  });

  it("refuses a dev server that does not report its stand-ins (signed out, or an older build)", () => {
    expect(standInDecision({ manifest: devManifest, report: { status: 307, text: "" } }, ["synopsis"]).ok).toBe(false);
    expect(standInDecision({ manifest: devManifest, report: { status: 200, text: "<html>" } }, ["synopsis"]).ok).toBe(false);
  });

  it("passes a path the server reports as a stand-in", () => {
    expect(standInDecision({ manifest: devManifest, report: report() }, ["synopsis", "intake", "fits"])).toEqual({ ok: true });
  });

  it("refuses a live path while the server holds a real key, naming it", () => {
    const d = standInDecision({ manifest: devManifest, report: report() }, ["synopsis", "tuning"]);
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/for tuning/);
    expect(d.reason).not.toMatch(/synopsis/);
  });

  it("passes a live path when the key is dummy or absent, but not through a base URL override", () => {
    expect(standInDecision({ manifest: devManifest, report: report({ key: "dummy" }) }, ["tuning"]).ok).toBe(true);
    expect(standInDecision({ manifest: devManifest, report: report({ key: "absent" }) }, ["tuning"]).ok).toBe(true);
    expect(standInDecision({ manifest: devManifest, report: report({ key: "dummy", baseUrl: true }) }, ["tuning"]).ok).toBe(false);
  });

  it("refuses a manifest that is not Next's, and a path it does not know", () => {
    expect(standInDecision({ manifest: { status: 200, text: "{}" }, report: report() }, ["synopsis"]).ok).toBe(false);
    expect(standInDecision({ manifest: devManifest, report: report() }, ["overview"]).ok).toBe(false);
  });
});

describe("assertModelStandIn", () => {
  it("throws before anything is pressed when a read fails, and resolves when both prove it", async () => {
    await expect(assertModelStandIn("http://localhost:1", ["synopsis"], { get: async () => { throw new Error("down"); } }))
      .rejects.toThrow(/spend guard/);
    const get = async (url: string) => (url.endsWith("_devPagesManifest.json") ? devManifest : report());
    await expect(assertModelStandIn("http://localhost:1", ["synopsis"], { get })).resolves.toEqual({ ok: true });
  });
});
