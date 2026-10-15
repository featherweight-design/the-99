import { describe, expect, it } from "vitest";
import { standInReport } from "./stand-in-report";

describe("standInReport", () => {
  it("a development server: every path but tuning is a stand-in, and tuning needs its own knob", () => {
    const r = standInReport({ NODE_ENV: "development", ANTHROPIC_API_KEY: "sk-ant-real" });
    expect(r).toEqual({ synopsis: "stand-in", intake: "stand-in", fits: "stand-in", tuning: "live", key: "real", baseUrl: false });
    expect(standInReport({ NODE_ENV: "development", TUNING_STUB_DELAY_MS: "8000" }).tuning).toBe("stand-in");
  });

  it("a production build is live on every path, whatever the knobs say", () => {
    const r = standInReport({ NODE_ENV: "production", TUNING_STUB_DELAY_MS: "8000", ANTHROPIC_API_KEY: "sk-ant-x" });
    expect([r.synopsis, r.intake, r.fits, r.tuning]).toEqual(["live", "live", "live", "live"]);
  });

  it("each path's own opt-in makes it live in development", () => {
    const r = standInReport({ NODE_ENV: "development", SYNOPSIS_LIVE: "1", INTAKE_LIVE: "1", FITS_READ_LIVE: "1" });
    expect([r.synopsis, r.intake, r.fits]).toEqual(["live", "live", "live"]);
  });

  it("names the key's kind without ever echoing it, and a base URL override", () => {
    expect(standInReport({}).key).toBe("absent");
    expect(standInReport({ ANTHROPIC_API_KEY: "  " }).key).toBe("absent");
    expect(standInReport({ ANTHROPIC_API_KEY: "probe-no-live-calls" }).key).toBe("dummy");
    expect(JSON.stringify(standInReport({ ANTHROPIC_API_KEY: "sk-ant-secret" }))).not.toContain("secret");
    expect(standInReport({ ANTHROPIC_BASE_URL: "https://proxy.example" }).baseUrl).toBe(true);
  });
});
