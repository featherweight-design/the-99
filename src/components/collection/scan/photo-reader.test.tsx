import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FrameRead } from "./use-card-scan";
import { usePhotoReader, type PhotoReaderDeps } from "./photo-reader";

const guess = (oracleId: string, name: string) => ({
  oracleId, name, scryfallId: `${oracleId}-p`, typeLine: "Creature", imageUri: `https://img/${oracleId}`, score: 0.9,
});
const answer = (guesses: ReturnType<typeof guess>[], margin: number | null) =>
  ({ ok: true, status: 200, json: async () => ({ index: "all", guesses, margin }) }) as unknown as Response;

/** A card read from every photo but the ones named `blank`, and a file named `heic` the browser cannot open. */
function deps(over: Partial<PhotoReaderDeps> = {}) {
  const closed: string[] = [];
  const revoked: string[] = [];
  const read: string[] = [];
  const d: PhotoReaderDeps = {
    decode: vi.fn(async (f: File) => {
      if (f.name.startsWith("heic")) throw new Error("cannot decode");
      return { width: 3024, height: 4032, close: () => closed.push(f.name), name: f.name } as unknown as ImageBitmap;
    }),
    readFrame: vi.fn(async (b) => {
      const name = (b as unknown as { name: string }).name;
      read.push(name);
      if (name.startsWith("blank")) return { frame: { kind: "none" }, cardInView: false, dark: false } as FrameRead;
      const embedding = new Float32Array(256);
      embedding[0] = 1;
      return { frame: { kind: "card", embedding }, cardInView: true, dark: false } as FrameRead;
    }),
    fetch: vi.fn(async () => answer([guess("a", "Killian, Decisive Mentor"), guess("b", "Rootha")], 0.3)),
    wait: async () => {},
    thumb: { create: (f) => `blob:${f.name}`, revoke: (u) => revoked.push(u) },
    ...over,
  };
  return { d, closed, revoked, read };
}
const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

describe("usePhotoReader", () => {
  it("shows every photo pending at once, then decides each in place, in the order chosen", async () => {
    const { d, closed, read } = deps();
    const { result } = renderHook(() => usePhotoReader(d, vi.fn(async () => true), "fast", vi.fn()));
    act(() => result.current.choose([file("one.jpg"), file("blank.jpg")]));
    expect(result.current.rows.map((r) => [r.thumb, r.state.kind])).toEqual([["blob:one.jpg", "pending"], ["blob:blank.jpg", "pending"]]);
    await waitFor(() => expect(result.current.rows.map((r) => r.state.kind)).toEqual(["sure", "failed"]));
    expect(result.current.rows[0].state).toMatchObject({ kind: "sure", guess: { name: "Killian, Decisive Mentor" } });
    expect(read).toEqual(["one.jpg", "blank.jpg"]);
    // Every bitmap is released after its read, and only one lookup ran per photo with a card.
    expect(closed).toEqual(["one.jpg", "blank.jpg"]);
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });

  it("offers the top three when the margin is under the gate, and reads a file it cannot open as no card", async () => {
    const { d } = deps({ fetch: vi.fn(async () => answer([guess("a", "A"), guess("b", "B"), guess("c", "C"), guess("d", "D")], 0.001)) });
    const { result } = renderHook(() => usePhotoReader(d, vi.fn(async () => true), "fast", vi.fn()));
    act(() => result.current.choose([file("one.jpg"), file("heic.heic")]));
    await waitFor(() => expect(result.current.rows.map((r) => r.state.kind)).toEqual(["notSure", "failed"]));
    const s = result.current.rows[0].state;
    expect(s.kind === "notSure" && s.guesses.map((g) => g.name)).toEqual(["A", "B", "C"]);
    expect(d.readFrame).toHaveBeenCalledTimes(1);
  });

  it("reads a lookup that never answered as no card, and says so once per photo", async () => {
    const onProblem = vi.fn();
    const { d } = deps({ fetch: vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response) });
    const { result } = renderHook(() => usePhotoReader(d, vi.fn(async () => true), "fast", onProblem));
    act(() => result.current.choose([file("one.jpg")]));
    await waitFor(() => expect(result.current.rows[0].state.kind).toBe("failed"));
    // The lookup's own retries, and no more: three tries.
    expect(d.fetch).toHaveBeenCalledTimes(3);
    expect(onProblem).toHaveBeenCalledTimes(1);
    expect(onProblem).toHaveBeenCalledWith("photoFailed");
  });

  it("adds every sure row with one press, under the mode, and never adds a row twice", async () => {
    const onAdd = vi.fn(async () => true);
    const { d } = deps();
    const { result } = renderHook(() => usePhotoReader(d, onAdd, "normal", vi.fn()));
    act(() => result.current.choose([file("one.jpg"), file("two.jpg")]));
    await waitFor(() => expect(result.current.rows.map((r) => r.state.kind)).toEqual(["sure", "sure"]));
    await act(() => result.current.addSure());
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: "a" }), "normal", expect.objectContaining({ photo: null }));
    expect(result.current.rows.map((r) => r.state.kind)).toEqual(["added", "added"]);
    // More photos append; the press then adds only the new sure one.
    act(() => result.current.choose([file("three.jpg")]));
    await waitFor(() => expect(result.current.rows[2]?.state.kind).toBe("sure"));
    await act(() => result.current.addSure());
    expect(onAdd).toHaveBeenCalledTimes(3);
  });

  it("stops the bulk add at a card that could not be added, and leaves it to press again", async () => {
    const onProblem = vi.fn();
    const onAdd = vi.fn(async () => false);
    const { d } = deps();
    const { result } = renderHook(() => usePhotoReader(d, onAdd, "fast", onProblem));
    act(() => result.current.choose([file("one.jpg"), file("two.jpg")]));
    await waitFor(() => expect(result.current.rows.map((r) => r.state.kind)).toEqual(["sure", "sure"]));
    await act(() => result.current.addSure());
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onProblem).toHaveBeenCalledWith("notAdded");
    expect(result.current.rows.map((r) => r.state.kind)).toEqual(["sure", "sure"]);
  });

  it("adds the guess pressed on a Not sure row, and only that one", async () => {
    const onAdd = vi.fn(async () => true);
    const { d } = deps({ fetch: vi.fn(async () => answer([guess("a", "A"), guess("b", "B")], 0.001)) });
    const { result } = renderHook(() => usePhotoReader(d, onAdd, "fast", vi.fn()));
    act(() => result.current.choose([file("one.jpg")]));
    await waitFor(() => expect(result.current.rows[0].state.kind).toBe("notSure"));
    await act(() => result.current.addSure());
    expect(onAdd).not.toHaveBeenCalled();
    await act(() => result.current.pick(result.current.rows[0].id, "b"));
    // The line carries the photo's closest cards for the fix, the one pressed first.
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: "b", name: "B" }), "fast", expect.objectContaining({ photo: null }));
    expect((onAdd.mock.calls[0] as unknown[])[2]).toMatchObject({ guesses: [expect.objectContaining({ oracleId: "b" }), expect.objectContaining({ oracleId: "a" })] });
    expect(result.current.rows[0].state).toMatchObject({ kind: "added", guess: { oracleId: "b" } });
  });

  it("keeps every thumbnail while the list stands, and releases them all when the scanner closes", async () => {
    const { d, revoked } = deps();
    const { result, unmount } = renderHook(() => usePhotoReader(d, vi.fn(async () => true), "fast", vi.fn()));
    act(() => result.current.choose([file("one.jpg"), file("two.jpg")]));
    await waitFor(() => expect(result.current.rows.every((r) => r.state.kind !== "pending")).toBe(true));
    expect(revoked).toEqual([]);
    unmount();
    expect(revoked).toEqual(["blob:one.jpg", "blob:two.jpg"]);
  });

  it("stops reading when the scanner closes mid-batch", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const { d, read } = deps();
    const first = d.readFrame;
    d.readFrame = vi.fn(async (b) => {
      await gate;
      return first(b);
    });
    const { result, unmount } = renderHook(() => usePhotoReader(d, vi.fn(async () => true), "fast", vi.fn()));
    act(() => result.current.choose([file("one.jpg"), file("two.jpg")]));
    await waitFor(() => expect(d.readFrame).toHaveBeenCalledTimes(1));
    unmount();
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(read).toEqual(["one.jpg"]);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("never reads a photo whose decode finishes after the scanner closed, and still releases its bitmap", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const { d, closed } = deps();
    const decode = d.decode!;
    d.decode = vi.fn(async (f: File) => {
      await gate;
      return decode(f);
    });
    const { result, unmount } = renderHook(() => usePhotoReader(d, vi.fn(async () => true), "fast", vi.fn()));
    act(() => result.current.choose([file("one.jpg")]));
    await waitFor(() => expect(d.decode).toHaveBeenCalledTimes(1));
    unmount();
    release();
    await waitFor(() => expect(closed).toEqual(["one.jpg"]));
    expect(d.readFrame).not.toHaveBeenCalled();
  });

  it("adds each card under the mode at its own add, so a change mid-batch reaches the cards after it", async () => {
    let first: () => void = () => {};
    const onAdd = vi.fn(async () => {
      if (onAdd.mock.calls.length === 1) await new Promise<void>((r) => (first = r));
      return true;
    });
    const { d } = deps();
    const { result, rerender } = renderHook(({ mode }) => usePhotoReader(d, onAdd, mode, vi.fn()), { initialProps: { mode: "fast" as "fast" | "normal" } });
    act(() => result.current.choose([file("one.jpg"), file("two.jpg")]));
    await waitFor(() => expect(result.current.rows.map((r) => r.state.kind)).toEqual(["sure", "sure"]));
    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = result.current.addSure();
    });
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    rerender({ mode: "normal" });
    await act(async () => {
      first();
      await run;
    });
    expect(onAdd.mock.calls.map((c) => (c as unknown as [unknown, string])[1])).toEqual(["fast", "normal"]);
  });

  it("is busy while an add is in flight, and free again once it lands", async () => {
    let land: (ok: boolean) => void = () => {};
    const onAdd = vi.fn(() => new Promise<boolean>((r) => (land = r)));
    const { d } = deps({ fetch: vi.fn(async () => answer([guess("a", "A"), guess("b", "B")], 0.001)) });
    const { result } = renderHook(() => usePhotoReader(d, onAdd, "fast", vi.fn()));
    act(() => result.current.choose([file("one.jpg")]));
    await waitFor(() => expect(result.current.rows[0].state.kind).toBe("notSure"));
    expect(result.current.busy).toBe(false);
    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = result.current.pick(result.current.rows[0].id, "a");
    });
    await waitFor(() => expect(result.current.busy).toBe(true));
    await act(async () => {
      land(true);
      await run;
    });
    expect(result.current.busy).toBe(false);
  });
});
