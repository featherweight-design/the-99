import { describe, expect, it, vi } from "vitest";
import { fallbackOf, fallbackReporter } from "./fallback-events";
import { resetScanMarks, scanMark, setScanMarkSink } from "./marks";

describe("fallbackOf", () => {
  it("reads the three fallback marks", () => {
    expect(fallbackOf("scan:reader", { path: "main", reason: "no-worker" })).toEqual({ kind: "reader", from: "worker", to: "main", reason: "no-worker" });
    expect(fallbackOf("scan:reader-off", { stage: "hang" })).toEqual({ kind: "reader", from: "worker", to: "main", reason: "hang" });
    expect(fallbackOf("scan:webgpu-off", { stage: "run" })).toEqual({ kind: "webgpu", from: "webgpu", to: "wasm", reason: "run" });
  });
  it("ignores the worker path, no adapter and every other mark", () => {
    expect(fallbackOf("scan:reader", { path: "worker" })).toBeNull();
    expect(fallbackOf("scan:webgpu-none")).toBeNull();
    expect(fallbackOf("scan:ready")).toBeNull();
  });
  it("refuses a reason outside the closed set, so no free text rides along", () => {
    expect(fallbackOf("scan:reader", { path: "main", reason: "a card name" })).toBeNull();
    expect(fallbackOf("scan:webgpu-off", { stage: "TypeError: x" })).toBeNull();
    expect(fallbackOf("scan:reader-off", {})).toBeNull();
  });
});

describe("fallbackReporter", () => {
  it("sends each kind once, not per mark", () => {
    const send = vi.fn();
    const report = fallbackReporter(send);
    report("scan:webgpu-off", { stage: "load" });
    report("scan:webgpu-off", { stage: "run" });
    report("scan:reader", { path: "main", reason: "init" });
    report("scan:reader-off", { stage: "crash" });
    report("scan:ready");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((c) => c[0].kind)).toEqual(["webgpu", "reader"]);
  });
  it("fires once through scanMark as the sink, though a second open of the same page marks it again", () => {
    const send = vi.fn();
    resetScanMarks();
    setScanMarkSink(fallbackReporter(send));
    scanMark("scan:webgpu-off", { stage: "run" });
    scanMark("scan:webgpu-off", { stage: "run" });
    resetScanMarks();
    scanMark("scan:webgpu-off", { stage: "load" });
    setScanMarkSink(null);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
