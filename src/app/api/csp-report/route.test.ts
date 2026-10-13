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
  it("answers 204 and logs nothing for junk, an oversized body or invalid JSON", async () => {
    for (const body of ["not json", "{}", JSON.stringify({ "csp-report": 5 }), "x".repeat(20_000)]) {
      expect((await post(body)).status).toBe(204);
    }
    expect((await post("{}", { "content-length": "99999" })).status).toBe(204);
    expect(info).not.toHaveBeenCalled();
  });
});
