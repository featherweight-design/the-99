import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ReactNode } from "react";

import {
  useOptimisticVerdict,
  useVerdictOverrides,
  useVerdictOverrideView,
  VerdictOverridesProvider,
  type RowVerdict,
} from "./use-optimistic-verdict";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("useOptimisticVerdict", () => {
  it("shows the pressed verdict at once, before the action answers, and keeps it until the server's catches up", async () => {
    const answer = deferred<{ ok: true } | { ok: false; message: string }>();
    const { result, rerender } = renderHook(({ server }: { server: RowVerdict }) => useOptimisticVerdict(server), { initialProps: { server: "pending" as RowVerdict } });
    let settled: Promise<unknown> = Promise.resolve();
    act(() => { settled = result.current.press("accepted", () => answer.promise); });
    expect(result.current.verdict).toBe("accepted");
    expect(result.current.inFlight).toBe(true);
    await act(async () => { answer.resolve({ ok: true }); await settled; });
    // The action answered, the re-read has not landed: still the pressed verdict.
    expect(result.current.verdict).toBe("accepted");
    rerender({ server: "accepted" });
    expect(result.current.verdict).toBe("accepted");
    expect(result.current.inFlight).toBe(false);
  });

  it("rolls back on a refusal, and hands back the refusal", async () => {
    const { result } = renderHook(() => useOptimisticVerdict("pending"));
    let out: unknown;
    await act(async () => { out = await result.current.press("dismissed", async () => ({ ok: false as const, message: "No." })); });
    expect(result.current.verdict).toBe("pending");
    expect(out).toEqual({ ok: false, message: "No." });
  });

  it("rolls back when the action throws, as a refusal", async () => {
    const { result } = renderHook(() => useOptimisticVerdict("pending"));
    let out: unknown;
    await act(async () => { out = await result.current.press("accepted", async () => { throw new Error("down"); }, "Refused."); });
    expect(result.current.verdict).toBe("pending");
    expect(out).toEqual({ ok: false, message: "Refused." });
  });

  it("rolls back when the action throws synchronously, and takes the next press", async () => {
    const { result } = renderHook(() => useOptimisticVerdict("pending"));
    let out: unknown;
    await act(async () => { out = await result.current.press("accepted", () => { throw new Error("sync"); }, "Refused."); });
    expect(result.current.verdict).toBe("pending");
    expect(result.current.inFlight).toBe(false);
    expect(out).toEqual({ ok: false, message: "Refused." });
    let calls = 0;
    await act(async () => { await result.current.press("dismissed", async () => { calls += 1; return { ok: true as const }; }); });
    expect(calls).toBe(1);
  });

  it("ignores a second press while one is in flight", async () => {
    const answer = deferred<{ ok: true }>();
    const { result } = renderHook(() => useOptimisticVerdict("pending"));
    let calls = 0;
    act(() => { void result.current.press("accepted", () => { calls += 1; return answer.promise; }); });
    act(() => { void result.current.press("dismissed", async () => { calls += 1; return { ok: true as const }; }); });
    expect(calls).toBe(1);
    expect(result.current.verdict).toBe("accepted");
    await act(async () => { answer.resolve({ ok: true }); });
  });

  it("returns to the server's verdict on release, even when the re-read did not move it", async () => {
    const { result } = renderHook(() => useOptimisticVerdict("pending"));
    await act(async () => { await result.current.press("accepted", async () => ({ ok: true as const })); });
    expect(result.current.verdict).toBe("accepted");
    act(() => result.current.release());
    expect(result.current.verdict).toBe("pending");
  });

  it("gives way to a server verdict that moved some other way", () => {
    const { result, rerender } = renderHook(({ server }: { server: RowVerdict }) => useOptimisticVerdict(server), { initialProps: { server: "pending" as RowVerdict } });
    act(() => { void result.current.press("accepted", () => new Promise(() => {})); });
    rerender({ server: "dismissed" });
    expect(result.current.verdict).toBe("dismissed");
  });
});

describe("useVerdictOverrideView", () => {
  it("lets a bulk control see a row's held answer, so it can stand down while that answer is in flight", async () => {
    const answer = deferred<{ ok: true }>();
    function Panel({ children }: { children: ReactNode }) {
      const overrides = useVerdictOverrides();
      return <VerdictOverridesProvider value={overrides.value}>{children}</VerdictOverridesProvider>;
    }
    const { result } = renderHook(
      () => ({ row: useOptimisticVerdict("pending", "a"), view: useVerdictOverrideView() }),
      { wrapper: Panel },
    );
    expect(result.current.view.anyBusy).toBe(false);
    let settled: Promise<unknown> = Promise.resolve();
    act(() => { settled = result.current.row.press("accepted", () => answer.promise); });
    expect(result.current.view.anyBusy).toBe(true);
    expect(result.current.view.verdictOf({ id: "a", verdict: "pending" })).toBe("accepted");
    await act(async () => { answer.resolve({ ok: true }); await settled; });
    // Answered, re-read not landed (or failed): the row still reads its answer, and the bulk
    // control is free again, since the flipped row is already out of the open set.
    expect(result.current.view.verdictOf({ id: "a", verdict: "pending" })).toBe("accepted");
    expect(result.current.view.anyBusy).toBe(false);
    act(() => result.current.row.release());
    expect(result.current.view.anyBusy).toBe(false);
  });

  it("stays busy while a row's action is unanswered, even once a re-read has ended its flip", async () => {
    const answer = deferred<{ ok: true }>();
    function Panel({ children }: { children: ReactNode }) {
      const overrides = useVerdictOverrides();
      return <VerdictOverridesProvider value={overrides.value}>{children}</VerdictOverridesProvider>;
    }
    const { result, rerender } = renderHook(
      ({ server }: { server: RowVerdict }) => ({ row: useOptimisticVerdict(server, "a"), view: useVerdictOverrideView() }),
      { wrapper: Panel, initialProps: { server: "pending" as RowVerdict } },
    );
    let settled: Promise<unknown> = Promise.resolve();
    act(() => { settled = result.current.row.press("accepted", () => answer.promise); });
    // Another row's answer re-read the panel and moved this row's server verdict: the flip ends.
    rerender({ server: "dismissed" });
    expect(result.current.row.verdict).toBe("dismissed");
    expect(result.current.view.anyBusy).toBe(true);
    await act(async () => { answer.resolve({ ok: true }); await settled; });
    expect(result.current.view.anyBusy).toBe(false);
  });
});
