// The deeper look's panel: its states by allowance, where a delivered read sends the player, and
// the Stop contract (believed only when it took; a Stop the server refused leaves the press to
// answer, so a read the player paid for is never thrown away).

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("../../app/decks/new/choose/actions", () => ({ lookDeeper: vi.fn(), lookStatus: vi.fn() }));

const { DeeperLook, DeeperLookScope, DimWhileLooking, standingLine } = await import("./deeper-look");
const { emptyParams } = await import("../../lib/intake/params");

const params = { ...emptyParams(), results: true, words: "big stompy lizards", themes: ["dinosaurs"] };
const standing = (over = {}) => ({
  used: 1, limit: 3, nextAt: null, reopensAt: null, paused: null, ownerShare: false, now: "2026-09-25T12:00:00Z", ...over,
});

function draw(deps: { look: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; status?: ReturnType<typeof vi.fn> }, over: object | null = {}, settled: "read" | "nothing" | null = null) {
  return render(
    <DeeperLookScope>
      <DeeperLook params={params} standing={over === null ? null : standing(over)} settled={settled} deps={deps as never} />
      <DimWhileLooking><p>results</p></DimWhileLooking>
    </DeeperLookScope>,
  );
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
});

describe("the deeper look", () => {
  it("draws a settled look with no count and no press when the standing could not be read", () => {
    for (const settled of ["read", "nothing"] as const) {
      const { unmount } = draw({ look: vi.fn(), stop: vi.fn() }, null, settled);
      expect(screen.getByTestId("deeper-look").dataset.phase).toBe(settled === "read" ? "done" : "nothing");
      expect(screen.queryByTestId("deeper-line")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      unmount();
    }
  });

  it("offers one credit, named first in the button, with the standing under it", () => {
    draw({ look: vi.fn(), stop: vi.fn() });
    expect(screen.getByRole("button", { name: "1 credit. Look deeper." })).toBeTruthy();
    expect(screen.getByTestId("deeper-line").textContent).toBe("Uses a credit. 2 of 3 left.");
  });

  it("closes the press when spent, paused, or on the owner's share, in the tuning panel's order", () => {
    expect(standingLine(standing({ used: 3 }))).toMatch(/^0 of 3 left/);
    expect(standingLine(standing({ ownerShare: true, used: 3 }))).toMatch(/testing share/);
    expect(standingLine(standing({ paused: "2026-10-01T00:00:00Z", ownerShare: true }))).toMatch(/^Paused until October 1/);
    draw({ look: vi.fn(), stop: vi.fn() }, { used: 3 });
    const button = screen.getByRole("button", { name: /Look deeper/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("0 left");
  });

  it("dims the first results while it looks, and sends a delivered read to its own results", async () => {
    let answer!: (v: unknown) => void;
    const look = vi.fn(() => new Promise((r) => { answer = r; }));
    draw({ look, stop: vi.fn() });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
    expect(screen.getByTestId("results-dim").dataset.looking).toBe("true");
    const readId = (look.mock.calls[0] as unknown as [{ readId: string }])[0].readId;
    await act(async () => answer({ kind: "read", readId, chips: [{ kind: "theme", slug: "tokens", label: "Tokens" }], notUsed: [], notUnderstood: ["stompy"] }));
    const to = new URL(push.mock.calls[0][0], "http://x");
    expect(to.searchParams.get("r")).toBe(readId);
    expect(to.searchParams.get("t")).toBe("dinosaurs,tokens");
    expect(to.searchParams.get("d")).toBe("t:tokens");
  });

  it("sends a repeated ask to the stored read's own id, which is the one the page can verify", async () => {
    const STORED = "0000aaaa-0000-4000-8000-0000000000ff";
    const look = vi.fn(async () => ({ kind: "read", readId: STORED, chips: [], notUsed: [], notUnderstood: [] }));
    draw({ look, stop: vi.fn() });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
    expect(new URL(push.mock.calls[0][0], "http://x").searchParams.get("r")).toBe(STORED);
  });

  describe("a press that finds another look already running", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());
    const poll = () => act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    for (const kind of ["in_flight", "reused"] as const) {
      it(`stays Looking on ${kind}, polls, and delivers that look's read of this ask`, async () => {
        const look = vi.fn(async () => ({ kind }));
        const status = vi.fn()
          .mockResolvedValueOnce({ kind: "running" })
          .mockResolvedValueOnce({ kind: "read", readId: "0000aaaa-0000-4000-8000-0000000000dd", chips: [], notUsed: [], notUnderstood: [] });
        draw({ look, stop: vi.fn(), status });
        await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
        expect(screen.getByTestId("deeper-look").dataset.phase).toBe("looking");
        await poll();
        expect(screen.getByTestId("deeper-look").dataset.phase).toBe("looking");
        expect(push).not.toHaveBeenCalled();
        await poll();
        expect(status).toHaveBeenCalledWith({ words: params.words, budgetDollars: null, bracket: null });
        expect(new URL(push.mock.calls[0][0], "http://x").searchParams.get("r")).toBe("0000aaaa-0000-4000-8000-0000000000dd");
      });
    }

    it("returns the offer when that look ended without answering this ask, since nothing was spent", async () => {
      const status = vi.fn().mockResolvedValue({ kind: "idle" });
      draw({ look: vi.fn(async () => ({ kind: "in_flight" })), stop: vi.fn(), status });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
      await poll();
      expect(screen.getByTestId("deeper-look").dataset.phase).toBe("offer");
    });

    it("lets Stop end the wait, asking nothing more", async () => {
      const status = vi.fn().mockResolvedValue({ kind: "running" });
      const stop = vi.fn();
      draw({ look: vi.fn(async () => ({ kind: "in_flight" })), stop, status });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop" })));
      expect(screen.getByTestId("deeper-look").dataset.phase).toBe("offer");
      expect(stop).not.toHaveBeenCalled();
      await poll();
      expect(status).not.toHaveBeenCalled();
    });

    it("stops a press sent twice by its own id, since its first send is the read running", async () => {
      const status = vi.fn().mockResolvedValue({ kind: "running" });
      const stop = vi.fn(async () => true);
      const look = vi.fn(async () => ({ kind: "reused" }));
      draw({ look, stop, status });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop" })));
      expect(stop).toHaveBeenCalledWith((look.mock.calls[0] as unknown as [{ readId: string }])[0].readId);
      expect(screen.getByTestId("deeper-look").dataset.phase).toBe("offer");
      await poll();
      expect(status).not.toHaveBeenCalled();
    });

    it("reads as failed when that look is still running at the wait's end", async () => {
      const status = vi.fn().mockResolvedValue({ kind: "running" });
      draw({ look: vi.fn(async () => ({ kind: "in_flight" })), stop: vi.fn(), status });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
      await act(async () => { await vi.advanceTimersByTimeAsync(122_000); });
      expect(screen.getByTestId("deeper-look").dataset.phase).toBe("failed");
    });
  });

  it("reads a refused press as failed, without waiting", async () => {
    const status = vi.fn();
    draw({ look: vi.fn(async () => ({ kind: "refused" })), stop: vi.fn(), status });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
    expect(screen.getByTestId("deeper-look").dataset.phase).toBe("failed");
    expect(status).not.toHaveBeenCalled();
  });

  it("believes a Stop only when it took: the credit is back and the offer returns", async () => {
    const look = vi.fn(() => new Promise(() => {}));
    const stop = vi.fn(async () => true);
    draw({ look, stop });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop" })));
    expect(stop).toHaveBeenCalledWith((look.mock.calls[0] as unknown as [{ readId: string }])[0].readId);
    expect(screen.getByTestId("deeper-look").dataset.phase).toBe("offer");
    expect(screen.getByTestId("results-dim").dataset.looking).toBeUndefined();
  });

  it("puts Stop back when the request to stop failed, so the player can press it again", async () => {
    const look = vi.fn(() => new Promise(() => {}));
    const stop = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(true);
    draw({ look, stop });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop" })));
    const again = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(again.disabled).toBe(false);
    await act(async () => fireEvent.click(again));
    expect(stop).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("deeper-look").dataset.phase).toBe("offer");
  });

  it("lets the press answer when the Stop came too late, so a paid read is still shown", async () => {
    let answer!: (v: unknown) => void;
    const look = vi.fn(() => new Promise((r) => { answer = r; }));
    const stop = vi.fn(async () => false);
    draw({ look, stop });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Look deeper/ })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop" })));
    expect(screen.getByTestId("deeper-look").dataset.phase).toBe("looking");
    await act(async () => answer({ kind: "read", readId: "0000aaaa-0000-4000-8000-0000000000ee", chips: [], notUsed: [], notUnderstood: [] }));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("draws done and nothing-to-add from the page's settled read, with no second press", () => {
    draw({ look: vi.fn(), stop: vi.fn() }, {}, "read");
    expect(screen.getByTestId("deeper-look").dataset.phase).toBe("done");
    expect(screen.queryByRole("button", { name: /Look deeper/ })).toBeNull();
  });
});
