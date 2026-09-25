// The shell's hold on the overview: it reads only while the tab is open, reads again when the list
// or the reading moves, never writes by itself, and a press re-reads the stored truth after it.

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  fetchSynopsis: vi.fn(),
  writeSynopsis: vi.fn(),
  retrySynopsisSections: vi.fn(),
}));
vi.mock("../../app/decks/synopsis-actions", () => actions);

import { synopsisState } from "./__fixtures__/synopsis";
import { useDeckSynopsis } from "./synopsis-state";

beforeEach(() => {
  for (const f of Object.values(actions)) f.mockReset();
  actions.fetchSynopsis.mockResolvedValue(synopsisState());
  actions.writeSynopsis.mockResolvedValue({ kind: "reused" });
  actions.retrySynopsisSections.mockResolvedValue({ kind: "reused" });
});

describe("useDeckSynopsis", () => {
  // The tab's opening waits on this: settled once the first read answers OR fails, so a failed
  // overview read never holds the loader up.
  it("is settled once its first read answers, and once one fails", async () => {
    const ok = renderHook(() => useDeckSynopsis("d1", true, "k"));
    expect(ok.result.current.settled).toBe(false);
    await waitFor(() => expect(ok.result.current.settled).toBe(true));
    ok.unmount();
    actions.fetchSynopsis.mockRejectedValueOnce(new Error("down"));
    const failed = renderHook(() => useDeckSynopsis("d2", true, "k"));
    await waitFor(() => expect(failed.result.current.settled).toBe(true));
    expect(failed.result.current.view.kind).toBe("idle");
  });

  it("reads nothing while the tab is closed", () => {
    const { result } = renderHook(() => useDeckSynopsis("d1", false, "k"));
    expect(actions.fetchSynopsis).not.toHaveBeenCalled();
    expect(result.current.view.kind).toBe("idle");
  });

  it("reads once the tab opens, and again when the key moves", async () => {
    const { result, rerender } = renderHook(({ key }) => useDeckSynopsis("d1", true, key), { initialProps: { key: "a" } });
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    expect(actions.fetchSynopsis).toHaveBeenCalledTimes(1);
    rerender({ key: "b" });
    await waitFor(() => expect(actions.fetchSynopsis).toHaveBeenCalledTimes(2));
    expect(actions.writeSynopsis).not.toHaveBeenCalled();
  });

  // Until the read for a new key lands, what the state says about a write is about the list or
  // reading before; the tab offers no press over it.
  it("is not current until the read for the key on screen lands", async () => {
    let second!: (v: unknown) => void;
    const { result, rerender } = renderHook(({ key }) => useDeckSynopsis("d1", true, key), { initialProps: { key: "a" } });
    await waitFor(() => expect(result.current.view.kind === "ready" && result.current.view.current).toBe(true));
    actions.fetchSynopsis.mockImplementationOnce(() => new Promise((r) => { second = r; }));
    rerender({ key: "b" });
    expect(result.current.view.kind === "ready" && result.current.view.current).toBe(false);
    await act(async () => second(synopsisState({ wouldSpend: true })));
    expect(result.current.view.kind === "ready" && result.current.view.current).toBe(true);
  });

  it("drops an answer overtaken by a newer read", async () => {
    let first!: (v: unknown) => void;
    actions.fetchSynopsis
      .mockImplementationOnce(() => new Promise((r) => { first = r; }))
      .mockResolvedValueOnce(synopsisState({ stale: true }));
    const { result, rerender } = renderHook(({ key }) => useDeckSynopsis("d1", true, key), { initialProps: { key: "a" } });
    rerender({ key: "b" });
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    await act(async () => first(synopsisState({ stale: false })));
    expect(result.current.view.kind === "ready" && result.current.view.state.stale).toBe(true);
  });

  it("writes on a press, busy while it runs, then re-reads", async () => {
    let finish!: (v: unknown) => void;
    actions.writeSynopsis.mockImplementationOnce(() => new Promise((r) => { finish = r; }));
    const { result } = renderHook(() => useDeckSynopsis("d1", true, "k"));
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    let pressed!: Promise<void>;
    act(() => { pressed = result.current.write(); });
    expect(result.current.view.kind === "ready" && result.current.view.busy).toBe(true);
    await act(async () => { finish({ kind: "reused" }); await pressed; });
    expect(actions.writeSynopsis).toHaveBeenCalledWith("d1");
    expect(actions.fetchSynopsis).toHaveBeenCalledTimes(2);
    expect(result.current.view.kind === "ready" && result.current.view.busy).toBe(false);
  });

  it("retries the named run's refused sections", async () => {
    const { result } = renderHook(() => useDeckSynopsis("d1", true, "k"));
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    await act(() => result.current.retry("syn-1"));
    expect(actions.retrySynopsisSections).toHaveBeenCalledWith("d1", "syn-1");
  });
  it("stays busy until the re-read after a press lands", async () => {
    let reread!: (v: unknown) => void;
    const { result } = renderHook(() => useDeckSynopsis("d1", true, "k"));
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    actions.fetchSynopsis.mockImplementationOnce(() => new Promise((r) => { reread = r; }));
    let pressed!: Promise<void>;
    act(() => { pressed = result.current.write(); });
    await waitFor(() => expect(actions.fetchSynopsis).toHaveBeenCalledTimes(2));
    expect(result.current.view.kind === "ready" && result.current.view.busy).toBe(true);
    await act(async () => { reread(synopsisState()); await pressed; });
    expect(result.current.view.kind === "ready" && result.current.view.busy).toBe(false);
  });

  it("never draws one deck's answer on another's tab", async () => {
    const { result, rerender } = renderHook(({ deck }) => useDeckSynopsis(deck, true, "k"), { initialProps: { deck: "d1" } });
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    actions.fetchSynopsis.mockImplementationOnce(() => new Promise(() => {}));
    rerender({ deck: "d2" });
    expect(result.current.view.kind).toBe("idle");
  });

  it("keeps what it has when a read fails, and raises nothing", async () => {
    const { result, rerender } = renderHook(({ key }) => useDeckSynopsis("d1", true, key), { initialProps: { key: "a" } });
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    actions.fetchSynopsis.mockRejectedValueOnce(new Error("down"));
    rerender({ key: "b" });
    await waitFor(() => expect(actions.fetchSynopsis).toHaveBeenCalledTimes(2));
    expect(result.current.view.kind === "ready" && result.current.view.current).toBe(false);
    actions.writeSynopsis.mockRejectedValueOnce(new Error("down"));
    await act(() => result.current.write());
    expect(result.current.view.kind === "ready" && result.current.view.busy).toBe(false);
  });
  it("lets a press on a deck the reader left finish without cancelling the new deck's read", async () => {
    let finish!: (v: unknown) => void;
    actions.writeSynopsis.mockImplementationOnce(() => new Promise((r) => { finish = r; }));
    const { result, rerender } = renderHook(({ deck }) => useDeckSynopsis(deck, true, "k"), { initialProps: { deck: "d1" } });
    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    let pressed!: Promise<void>;
    act(() => { pressed = result.current.write(); });
    let second!: (v: unknown) => void;
    actions.fetchSynopsis.mockImplementationOnce(() => new Promise((r) => { second = r; }));
    rerender({ deck: "d2" });
    await act(async () => { finish({ kind: "reused" }); await pressed; });
    await act(async () => second(synopsisState({ stale: true })));
    expect(result.current.view.kind === "ready" && result.current.view.state.stale).toBe(true);
    expect(actions.fetchSynopsis).toHaveBeenCalledTimes(2);
  });
});
