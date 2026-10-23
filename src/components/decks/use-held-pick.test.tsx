import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHeldPick, type PickReply } from "./use-held-pick";

/** A send whose replies the test resolves by hand, in any order. */
function heldSend() {
  const pending = new Map<string, (r: PickReply<string | null>) => void>();
  const send = (_deck: string, value: string | null) =>
    new Promise<PickReply<string | null>>((resolve) => pending.set(String(value), resolve));
  return {
    send,
    sent: (value: string | null) => pending.has(String(value)),
    reply: (value: string | null, r: PickReply<string | null>) => pending.get(String(value))!(r),
  };
}

describe("useHeldPick's settled value", () => {
  it("follows the newest confirmed write, not the press in flight", async () => {
    const { send, sent, reply } = heldSend();
    const { result } = renderHook(() => useHeldPick<string | null>("d1", null, send));
    act(() => result.current.pick("tokens"));
    expect(result.current.value).toBe("tokens");
    expect(result.current.settled).toBeNull();
    await waitFor(() => expect(sent("tokens")).toBe(true));
    await act(async () => reply("tokens", { ok: true, value: "tokens" }));
    await waitFor(() => expect(result.current.settled).toBe("tokens"));
  });

  it("falls back to what a superseded success stored when the newest press is refused", async () => {
    const { send, sent, reply } = heldSend();
    const { result } = renderHook(() => useHeldPick<string | null>("d1", null, send));
    act(() => result.current.pick("tokens"));
    act(() => result.current.pick("lifegain"));
    await waitFor(() => expect(sent("tokens")).toBe(true));
    await act(async () => reply("tokens", { ok: true, value: "tokens" }));
    await waitFor(() => expect(sent("lifegain")).toBe(true));
    await act(async () => reply("lifegain", { ok: false }));
    await waitFor(() => expect(result.current.refused).toBe(true));
    expect(result.current.value).toBe("tokens");
    expect(result.current.settled).toBe("tokens");
  });

  // Review round 3: A, B, A settles on the value it started from, and a reader that took its read while the writes
  // were queued must still be told the writes settled.
  it("moves its revision when the newest press settles back onto the value it held", async () => {
    const { send, sent, reply } = heldSend();
    const { result } = renderHook(() => useHeldPick<string | null>("d1", "tokens", send));
    const before = result.current.revision;
    act(() => result.current.pick("lifegain"));
    act(() => result.current.pick("tokens"));
    await waitFor(() => expect(sent("lifegain")).toBe(true));
    await act(async () => reply("lifegain", { ok: true, value: "lifegain" }));
    await waitFor(() => expect(sent("tokens")).toBe(true));
    await act(async () => reply("tokens", { ok: true, value: "tokens" }));
    await waitFor(() => expect(result.current.revision).toBeGreaterThan(before));
    expect(result.current.settled).toBe("tokens");
  });
});
