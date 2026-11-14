import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pingHeartbeat } from "./heartbeat";

const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("pingHeartbeat", () => {
  it("does nothing when the URL is unset or empty", async () => {
    await pingHeartbeat(undefined);
    await pingHeartbeat("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GETs the URL with a 3 second timeout signal", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await pingHeartbeat("https://uptime.example/api/v1/heartbeat/abc");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://uptime.example/api/v1/heartbeat/abc");
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(3_000);
    timeout.mockRestore();
  });

  it("swallows a failed ping and logs only the error name", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("network down at https://uptime.example/x"));
    await expect(pingHeartbeat("https://uptime.example/x")).resolves.toBeUndefined();
    expect(warn.mock.calls.flat().join(" ")).toContain("TypeError");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("uptime.example");
    warn.mockRestore();
  });

  it("logs the status, not the URL, when the monitor answers an error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await pingHeartbeat("https://uptime.example/x");
    expect(warn.mock.calls.flat().join(" ")).toContain("404");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("uptime.example");
    warn.mockRestore();
  });
});
