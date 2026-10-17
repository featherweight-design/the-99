// The Checkout return band (R1 to R6): its states, and the re-read's cadence driven through the injectable timing and
// read, never a real clock or server. Credits are only ever added by the webhook; the band only reports.
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReturnOutcome } from "../../app/credits/actions";

vi.mock("../../app/credits/actions", () => ({ readReturnAction: vi.fn(), receiptAction: vi.fn() }));

import { CancelledBand, ReturnBand } from "./return-band";

const TIMING = { fastMs: 2000, slowMs: 10_000, slowAfterMs: 60_000 };
const processing: ReturnOutcome = { ok: true, read: { kind: "processing", units: 40 } };
const added: ReturnOutcome = { ok: true, read: { kind: "added", units: 40 } };

function band(read: ReturnType<typeof vi.fn>, extra: Partial<React.ComponentProps<typeof ReturnBand>> = {}) {
  const onAdded = vi.fn();
  const onReadFailed = vi.fn();
  const utils = render(
    <ReturnBand sessionId="cs_1" initial={{ kind: "processing", units: 40 }} timing={TIMING} read={read as unknown as (id: string) => Promise<ReturnOutcome>} onAdded={onAdded} onReadFailed={onReadFailed} onReceiptFailed={vi.fn()} {...extra} />,
  );
  return { ...utils, onAdded, onReadFailed };
}
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("ReturnBand states", () => {
  it("R1: names what is being added and claims nothing landed", () => {
    band(vi.fn().mockResolvedValue(processing));
    expect(screen.getByText("Adding your 40 credits")).toBeTruthy();
    expect(screen.getByText(/Payment received/)).toBeTruthy();
    expect(screen.queryByText(/credits added/)).toBeNull();
  });

  it("R2: the server's own read of an added grant draws the count and a Receipt link, and never re-reads", async () => {
    const read = vi.fn();
    band(read, { initial: { kind: "added", units: 40 } });
    expect(screen.getByText("40 pack credits added")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Receipt/ })).toBeTruthy();
    await tick(120_000);
    expect(read).not.toHaveBeenCalled();
  });

  it("draws nothing for a Session that read as none", () => {
    const { container } = band(vi.fn(), { initial: { kind: "none" } });
    expect(container.textContent).toBe("");
  });

  it("R4: after a minute it is the honest copy, with no bar", async () => {
    const read = vi.fn().mockResolvedValue(processing);
    const { container } = band(read);
    expect(container.querySelector(".anim-search-progress")).not.toBeNull();
    await tick(60_000);
    expect(screen.getByText("Still adding your credits")).toBeTruthy();
    expect(screen.getByText(/You won’t be charged twice/)).toBeTruthy();
    expect(container.querySelector(".anim-search-progress")).toBeNull();
  });
});

describe("ReturnBand cadence", () => {
  it("re-reads every 2s for a minute, then every 10s", async () => {
    const read = vi.fn().mockResolvedValue(processing);
    band(read);
    await tick(1999);
    expect(read).toHaveBeenCalledTimes(0);
    await tick(1);
    expect(read).toHaveBeenCalledTimes(1);
    await tick(58_000); // t = 60s: 30 reads at 2s
    expect(read).toHaveBeenCalledTimes(30);
    await tick(9999);
    expect(read).toHaveBeenCalledTimes(30);
    await tick(1);
    expect(read).toHaveBeenCalledTimes(31);
    await tick(10_000);
    expect(read).toHaveBeenCalledTimes(32);
  });

  it("asks at once when the server could not read, and says so on a failure", async () => {
    const read = vi.fn().mockResolvedValue({ ok: false, reason: "failed" } satisfies ReturnOutcome);
    const { onReadFailed } = band(read, { initial: null });
    await tick(0);
    expect(read).toHaveBeenCalledTimes(1);
    expect(onReadFailed).toHaveBeenCalledTimes(1);
  });

  it("stops once added, and hands the units up once", async () => {
    const read = vi.fn().mockResolvedValueOnce(processing).mockResolvedValueOnce(added).mockResolvedValue(processing);
    const { onAdded } = band(read);
    await tick(2000);
    await tick(2000);
    expect(screen.getByText("40 pack credits added")).toBeTruthy();
    expect(onAdded).toHaveBeenCalledExactlyOnceWith(40);
    await tick(60_000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("R6: a failed re-read is reported, the band stays as it was, and the next re-read tries again", async () => {
    const read = vi.fn().mockResolvedValueOnce({ ok: false, reason: "failed" } satisfies ReturnOutcome).mockResolvedValue(processing);
    const { onReadFailed } = band(read);
    await tick(2000);
    expect(onReadFailed).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Adding your 40 credits")).toBeTruthy();
    await tick(2000);
    expect(read).toHaveBeenCalledTimes(2);
    expect(onReadFailed).toHaveBeenCalledTimes(1);
  });

  it("a thrown read counts as a failed one", async () => {
    const read = vi.fn().mockRejectedValue(new Error("network"));
    const { onReadFailed } = band(read);
    await tick(2000);
    expect(onReadFailed).toHaveBeenCalledTimes(1);
  });

  it("stops on a none, on an off, and on unmount", async () => {
    const none = vi.fn().mockResolvedValue({ ok: true, read: { kind: "none" } } satisfies ReturnOutcome);
    const a = band(none);
    await tick(2000);
    await tick(30_000);
    expect(none).toHaveBeenCalledTimes(1);
    expect(a.container.textContent).toBe("");
    a.unmount();

    const off = vi.fn().mockResolvedValue({ ok: false, reason: "off" } satisfies ReturnOutcome);
    band(off);
    await tick(2000);
    await tick(30_000);
    expect(off).toHaveBeenCalledTimes(1);

    const live = vi.fn().mockResolvedValue(processing);
    const c = band(live);
    await tick(2000);
    c.unmount();
    await tick(60_000);
    expect(live).toHaveBeenCalledTimes(1);
  });
});

describe("CancelledBand (R5)", () => {
  it("is one quiet line with a bare close, and the close removes it", () => {
    vi.useRealTimers();
    const { container } = render(<CancelledBand />);
    expect(screen.getByText("Checkout closed. Nothing was charged.")).toBeTruthy();
    act(() => screen.getByRole("button", { name: "Dismiss" }).click());
    expect(container.textContent).toBe("");
  });
});
