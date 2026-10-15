import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/dev/model-stand-in", () => {
  it("answers 404 from a production build, exactly as a route that does not exist", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
  });

  it("reports each path's mode in development, and never the key itself", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-do-not-echo");
    vi.stubEnv("TUNING_STUB_DELAY_MS", "");
    const res = await GET();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("do-not-echo");
    expect(JSON.parse(text)).toMatchObject({ synopsis: "stand-in", tuning: "live", key: "real" });
  });
});
