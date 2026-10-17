import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  env: { HELP_PANEL_ENABLED: "true" } as Record<string, string>,
  limit: 5,
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../../db", () => ({ db: {} }));
vi.mock("../../../../lib/model/allowance", () => ({ dailyLimitFor: async () => stub.limit }));

import { GET } from "./route";
import { aboutEntries } from "../../../../lib/copy/about-entries";
import { visibleEntries } from "../../../../lib/about/visible";

beforeEach(() => {
  stub.userId = "user_1";
  stub.env = { HELP_PANEL_ENABLED: "true" };
  stub.limit = 5;
});

type Body = { entries: { id: string; caption: string; screen: string; view?: string; keys: string[] }[] };

describe("GET /api/about/entries", () => {
  it("answers the reader's visible entries with their place and no specimen, uncached", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const { entries } = (await res.json()) as Body;
    expect(entries.map((e) => e.id)).toEqual(visibleEntries(stub.env as unknown as NodeJS.ProcessEnv).map((e) => e.id));
    for (const e of entries) {
      expect(Object.keys(e).sort()).toEqual(["caption", "id", "keys", "screen", "title", ...(e.view ? ["view"] : [])].sort());
    }
  });

  it("leaves out an entry whose switch is off for the reader", async () => {
    const switched = aboutEntries.find((e) => e.switch)!;
    const { entries } = (await (await GET()).json()) as Body;
    expect(entries.map((e) => e.id)).not.toContain(switched.id);
  });

  it("fills the reader's own allowance into a caption", async () => {
    stub.limit = 7;
    const { entries } = (await (await GET()).json()) as Body;
    const credits = entries.find((e) => e.id === "credits")!;
    expect(credits.caption).toContain("seven");
    expect(credits.caption).not.toContain("{allowance}");
  });

  it("is not there with the switch off", async () => {
    stub.env = {};
    expect((await GET()).status).toBe(404);
  });

  it("refuses a reader who is not signed in", async () => {
    stub.userId = null;
    expect((await GET()).status).toBe(401);
  });
});
