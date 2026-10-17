import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
const env = vi.fn();
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: () => env() }));

const { POST } = await import("./route");

const row = { layout: "phone", frames: 84, read: 410, guess: [2900, 3100], add: [1900], mode: [], review: 950 };
const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new NextRequest("http://localhost/api/card-scan/timing", { method: "POST", body, headers }));

let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  auth.mockResolvedValue({ userId: "user_reader" });
  env.mockResolvedValue({ SCAN_LAB_ENABLED: "true" });
});
afterEach(() => info.mockRestore());

describe("POST /api/card-scan/timing", () => {
  it("logs one [scan-timing] line, without the reader, and answers 204", async () => {
    const res = await post(JSON.stringify(row));
    expect(res.status).toBe(204);
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]![0]);
    expect(line).toBe("[scan-timing] layout=phone frames=84 read=410 guess=2900,3100 add=1900 mode=- review=950");
    expect(line).not.toContain("user_reader");
  });
  it("logs nothing while the switch is off for this reader", async () => {
    env.mockResolvedValue({ SCAN_LAB_ENABLED: "false" });
    expect((await post(JSON.stringify(row))).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
  it("logs nothing without a signed-in reader", async () => {
    auth.mockResolvedValue({ userId: null });
    expect((await post(JSON.stringify(row))).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
  it("logs nothing for junk, an extra field, a name, or a body over the cap", async () => {
    for (const body of ["not json", "{}", JSON.stringify({ ...row, name: "Sol Ring" }), JSON.stringify({ ...row, layout: "Sol Ring" })]) {
      expect((await post(body)).status).toBe(204);
    }
    expect((await post(JSON.stringify(row), { "content-length": "99999" })).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
});
