import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new NextRequest("http://localhost/api/csp-report", { method: "POST", body, headers }));
const report = JSON.stringify({
  "csp-report": { "document-uri": "https://x.test/about?a=1", "effective-directive": "img-src", "blocked-uri": "https://evil.example/x" },
});

let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => { info = vi.spyOn(console, "info").mockImplementation(() => {}); });
afterEach(() => { info.mockRestore(); });

describe("POST /api/csp-report", () => {
  it("logs one cut-down line per violation and answers 204", async () => {
    const res = await post(report);
    expect(res.status).toBe(204);
    expect(info).toHaveBeenCalledWith("[csp] img-src blocked=https://evil.example page=/about");
  });
  it("answers 204 and logs nothing for junk or invalid JSON", async () => {
    for (const body of ["not json", "{}", JSON.stringify({ "csp-report": 5 })]) {
      expect((await post(body)).status).toBe(204);
    }
    expect(info).not.toHaveBeenCalled();
  });
  it("reads nothing past the size cap: a VALID report padded over it is dropped", async () => {
    const padded = JSON.stringify({ ...JSON.parse(report), pad: "x".repeat(20_000) });
    expect((await post(padded)).status).toBe(204);
    // A declared length over the cap is refused before the body is read.
    expect((await post(report, { "content-length": "99999" })).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
});
