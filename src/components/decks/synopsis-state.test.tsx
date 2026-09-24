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
});
