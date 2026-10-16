import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// One model loads and its sibling fails: the one that loaded must not be kept for a pipeline that never runs.
const released = vi.fn();
let attempts = 0;
vi.mock("../../../lib/scan/pipeline", () => ({
  loadOrt: async () => ({}),
  loadModels: async (_ort: unknown, hold: (s: { release(): void }) => unknown) => {
    attempts++;
    hold({ release: () => released(attempts) });
    throw new Error("the embedder failed to load");
  },
  framePipeline: () => ({ read: async () => null }),
}));

const { useFrameReader } = await import("./frame-reader");

describe("useFrameReader", () => {
  it("releases every session a failed load attempt kept, and tries again with its own", async () => {
    const { result } = renderHook(() => useFrameReader());
    const video = document.createElement("video");
    await expect(result.current(video)).rejects.toThrow();
    await vi.waitFor(() => expect(released).toHaveBeenCalledWith(1));
    await expect(result.current(video)).rejects.toThrow();
    await vi.waitFor(() => expect(released).toHaveBeenCalledWith(2));
  });
});
