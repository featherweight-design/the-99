import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
const env = vi.fn();
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: () => env() }));

const { POST } = await import("./route");

const report = {
  kind: "pending", from: "/decks/[x]/import", to: "/decks", at: "/decks", moved: true, elapsedMs: 8000,
  loader: "fallback", rsc: "done", rscStatus: 200, rscMs: 420, rscBytes: 5120, visible: true, wasHidden: false,
  online: true, connection: "4g", worker: true, deployment: "dpl_abc",
};
const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new NextRequest("http://localhost/api/nav-stall", { method: "POST", body, headers }));

let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  auth.mockResolvedValue({ userId: "user_reader" });
  env.mockResolvedValue({ NAV_STALL_LOG_ENABLED: "true" });
  vi.stubEnv("VERCEL_DEPLOYMENT_ID", "dpl_abc");
});
afterEach(() => {
  info.mockRestore();
  vi.unstubAllEnvs();
});

describe("POST /api/nav-stall", () => {
  it("logs one [nav-stall] line, without the reader or the deployment, and answers 204", async () => {
    const res = await post(JSON.stringify(report));
    expect(res.status).toBe(204);
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]![0]);
    expect(line).toMatch(/^\[nav-stall\] kind=pending from=\/decks\/\[x\]\/import to=\/decks .* skew=same$/);
    expect(line).not.toContain("user_reader");
    expect(line).not.toContain("dpl_");
  });
  it("logs nothing while the switch is off for this reader", async () => {
    env.mockResolvedValue({ NAV_STALL_LOG_ENABLED: "false" });
    expect((await post(JSON.stringify(report))).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
  it("logs nothing without a signed-in reader", async () => {
    auth.mockResolvedValue({ userId: null });
    expect((await post(JSON.stringify(report))).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
  it("logs nothing for junk, a raw path, or a body over the cap", async () => {
    for (const body of ["not json", "{}", JSON.stringify({ ...report, to: "/decks/0b49cb44" })]) {
      expect((await post(body)).status).toBe(204);
    }
    expect((await post(JSON.stringify({ ...report, pad: "x".repeat(4000) }))).status).toBe(204);
    expect((await post(JSON.stringify(report), { "content-length": "99999" })).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
});
