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
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(3_000);
    timeout.mockRestore();
  });

  it("swallows a failed ping", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(pingHeartbeat("https://uptime.example/x")).resolves.toBeUndefined();
  });
});
