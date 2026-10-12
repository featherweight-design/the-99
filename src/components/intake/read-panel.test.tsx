// The read's panel on the results (the read addendum R1, STATES 7d to 7n, with F10): every state, the
// poll that moves the step and refreshes on a settled read, Stop (believed only when it took), and
// Try again (the same answers and words, submitted again). Never a *Read it* press, never a `0 left`.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../../app/decks/new/choose/actions", () => ({ submitChoose: vi.fn(), theReadState: vi.fn() }));

const { ReadAnnouncer, ReadPanel, ReadScope, DimWhileReading, useReportPool } = await import("./read-panel");
const { phaseOf } = await import("../../lib/intake/read-phase");
const { emptyParams } = await import("../../lib/intake/params");
import type { TheReadState } from "../../lib/intake/run-store";
import type { ChooseParams } from "../../lib/intake/params";

const READ = "0000cccc-0000-4000-8000-000000000001";
const params: ChooseParams = { ...emptyParams(), results: true, words: "something scary", readId: READ };
const standing = (over = {}) => ({
  used: 2, limit: 10, nextAt: null, reopensAt: null, paused: null, ownerShare: false, now: "2026-10-11T12:00:00Z", ...over,
});
const done = (pool = 3445, weighed = 36): TheReadState => ({ kind: "done", result: { picks: [], pool, weighed } });

type Deps = { state: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; submit: ReturnType<typeof vi.fn> };
const deps = (over: Partial<Deps> = {}): Deps => ({
  state: vi.fn(() => new Promise(() => {})), stop: vi.fn(), submit: vi.fn(async () => undefined), ...over,
});

function Pool({ n }: { n: number }) {
  const report = useReportPool();
  useEffect(() => { report(n); }, [report, n]);
  return null;
}

function draw(
  served: TheReadState | null,
  { d = deps(), over = {} as object | null, p = params, repeat = false, busy = false, hasDecks = true as boolean | null, pool = null as number | null } = {},
) {
  return render(
    <>
    <ReadAnnouncer />
    <ReadScope initial={phaseOf(served)}>
      <ReadPanel
        readId={served ? READ : null}
        served={served}
        standing={over === null ? null : standing(over)}
        params={served ? p : { ...p, readId: null }}
        changeHref="/decks/new/choose?w=something+scary"
        repeat={repeat}
        busy={busy}
        hasDecks={hasDecks}
        deps={d as never}
      />
      <DimWhileReading><p>results</p></DimWhileReading>
      {pool !== null && <Pool n={pool} />}
    </ReadScope>
    </>,
  );
}

const panel = () => screen.getByTestId("read-panel");
const text = () => panel().textContent ?? "";

/** F10, on every state: no press to read on the results, and no `0 left` pill. */
function noReadIt() {
  expect(text()).not.toContain("Read it");
  expect(text()).not.toMatch(/(^|[^0-9])0 left/);
}

beforeEach(() => {
  router.refresh.mockReset();
  router.push.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("7d: reading", () => {
  it("draws the steps, the hairlined press with its cost, Stop and the refund line, and dims the results", () => {
    draw({ kind: "pending", phase: "shortlist" }, { pool: 3445 });
    expect(panel().dataset.phase).toBe("reading");
    expect(text()).toContain("Reading what you wrote…");
    expect(text()).toContain("These results stay until it’s done. It usually takes under a minute.");
    const steps = screen.getByTestId("read-steps").querySelectorAll("li");
    expect([...steps].map((s) => [s.dataset.step, s.textContent])).toEqual([
      ["now", "Scanning the 3,445 commanders your answers allownow"],
      ["next", "Weighing the closest few in fullnext"],
    ]);
    const press = screen.getByRole("button", { name: "1 credit. Reading…" }) as HTMLButtonElement;
    expect(press.disabled).toBe(true);
    expect(press.className).toContain("border-[color:var(--border-strong)]");
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
    expect(screen.getByTestId("read-line").textContent).toBe("Stopping gives the credit back.");
    expect(screen.getByTestId("results-dim").dataset.reading).toBe("true");
    noReadIt();
  });

  it("names no count before the results have said how many the answers allow", () => {
    draw({ kind: "pending", phase: null });
    expect(screen.getByTestId("read-steps").querySelector("li")!.textContent).toBe("Scanning the commanders your answers allownow");
  });

  it("starts on step 2 when the server says the judgement is running", () => {
    draw({ kind: "pending", phase: "judge" });
    const steps = [...screen.getByTestId("read-steps").querySelectorAll("li")].map((s) => s.dataset.step);
    expect(steps).toEqual(["done", "now"]);
  });

  it("moves the dot to step 2 when a poll finds the judgement, and refreshes once the read settles", async () => {
    vi.useFakeTimers();
    const state = vi.fn()
      .mockResolvedValueOnce({ kind: "pending", phase: "shortlist" })
      .mockResolvedValueOnce({ kind: "pending", phase: "judge" })
      .mockResolvedValueOnce(done());
    draw({ kind: "pending", phase: null }, { d: deps({ state }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(state).toHaveBeenCalledWith(READ);
    expect(screen.getByTestId("read-steps").querySelector("li")!.dataset.step).toBe("now");
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(screen.getByTestId("read-steps").querySelectorAll("li")[1].dataset.step).toBe("now");
    expect(router.refresh).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    // A done read waits for the refresh, whose server draws its order and counts: until then the
    // panel still reads and the results stay dimmed, never a done head over the free order.
    expect(panel().dataset.phase).toBe("reading");
    expect(screen.getByTestId("results-dim").dataset.reading).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("The read is done, and its picks now lead your results.");
    // And it asks no more.
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
    expect(state).toHaveBeenCalledTimes(3);
  });

  it("keeps asking through a failed poll, and reports a read that did not finish", async () => {
    vi.useFakeTimers();
    const state = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ kind: "failed" });
    draw({ kind: "pending", phase: null }, { d: deps({ state }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(panel().dataset.phase).toBe("reading");
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    // Announced at once, drawn once the refresh brings the refunded standing with it.
    expect(panel().dataset.phase).toBe("reading");
    expect(screen.getByRole("status").textContent).toBe("The read didn’t finish, so your credit came back.");
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe("Stop", () => {
  it("stops the read by its id, says so, and refreshes, when the stop took", async () => {
    const stop = vi.fn().mockResolvedValue(true);
    draw({ kind: "pending", phase: "shortlist" }, { d: deps({ stop }) });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Stop" })); });
    expect(stop).toHaveBeenCalledWith(READ);
    // The press holds at Stopping until the refresh draws the stopped panel with its refund.
    expect(panel().dataset.phase).toBe("reading");
    expect(screen.getByRole("status").textContent).toBe("Stopped. No credit was used.");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("keeps reading when the stop did not take: the read settled first, and the poll will say so", async () => {
    const stop = vi.fn().mockResolvedValue(false);
    draw({ kind: "pending", phase: "shortlist" }, { d: deps({ stop }) });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Stop" })); });
    expect(panel().dataset.phase).toBe("reading");
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("7e, 7f: stopped and failed", () => {
  it("tags a stopped read muted, says no credit was used, and offers Try again with its cost", () => {
    draw({ kind: "stopped" });
    expect(text()).toContain("Read what you wrote");
    const tag = screen.getByTestId("read-tag");
    expect(tag.textContent).toBe("stopped");
    expect(tag.className).toContain("text-[color:var(--fg-muted)]");
    expect(tag.className).toContain("var(--fg-muted)_12%");
    expect(text()).toContain("Nothing was read, and no credit was used. These are the results for your answers alone.");
    const retry = screen.getByRole("button", { name: "1 credit. Try again." });
    expect(retry.textContent).toBe("1 creditTry again");
    noReadIt();
  });

  it("tags a failed read in danger and says the credit came back", () => {
    draw({ kind: "failed" });
    const tag = screen.getByTestId("read-tag");
    expect(tag.textContent).toBe("didn’t finish");
    expect(tag.className).toContain("text-[color:var(--danger)]");
    expect(text()).toContain("The read didn’t finish, so your credit came back.");
    expect(screen.getByRole("button", { name: "1 credit. Try again." })).toBeTruthy();
    noReadIt();
  });

  it("draws Try again plain when the standing could not be read: the pill only for a credit known to be free", () => {
    draw({ kind: "failed" }, { over: null });
    expect(screen.getByRole("button", { name: /Try again/ }).textContent).toBe("Try again");
  });

  it("tries again with the same answers and words, and no read id", async () => {
    const submit = vi.fn<(query: string) => Promise<undefined>>(async () => undefined);
    draw({ kind: "failed" }, { d: deps({ submit }), p: { ...params, themes: ["horrors"], colors: ["b"] } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Try again/ })); });
    const sent = new URLSearchParams(String(submit.mock.calls[0][0]).slice(1));
    expect([sent.get("w"), sent.get("t"), sent.get("c"), sent.get("r"), sent.get("v")]).toEqual(["something scary", "horrors", "b", null, null]);
  });

  it("draws Try again with no pill when no credit is left", () => {
    draw({ kind: "stopped" }, { over: { used: 10 } });
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry.textContent).toBe("Try again");
    noReadIt();
  });
});

describe("7g to 7k, 7m: done", () => {
  it("tags it done, says what it read and weighed, and the credit it used, with no press", () => {
    draw(done());
    expect(screen.getByTestId("read-tag").textContent).toBe("done");
    expect(screen.getByTestId("read-lead").textContent).toBe(
      "It read the 3,445 commanders your answers allow and weighed the closest 36 in full.",
    );
    expect(screen.getByTestId("read-line").textContent).toBe("1 credit used · 8 of 10 left");
    expect(screen.queryByRole("button")).toBeNull();
    noReadIt();
  });

  it("says the colors held under an exact identity (7i)", () => {
    draw(done(268, 34), { p: { ...params, colors: ["b"], match: "exactly" } });
    expect(screen.getByTestId("read-lead").textContent).toContain("weighed the closest 34 in full.");
    expect(screen.getByTestId("read-lead").textContent).toMatch(/Your colors held: nothing outside Black was read\.$/);
  });

  it("says nothing of colors that only include (7g)", () => {
    draw(done(), { p: { ...params, colors: ["b"] } });
    expect(text()).not.toContain("Your colors held");
  });

  it("says the lines speak to the words alone with no decks (7k), and claims nothing when that is unknown", () => {
    draw(done(3467, 37), { hasDecks: false });
    expect(screen.getByTestId("read-lead").textContent).toMatch(/You have no decks yet, so the lines speak to what you wrote alone\.$/);
    cleanup();
    draw(done(), { hasDecks: null });
    expect(text()).not.toContain("no decks");
  });

  it("says a repeat used no credit (7m)", () => {
    draw(done(), { repeat: true });
    expect(screen.getByTestId("read-line").textContent).toBe("No credit used · you asked this already");
  });

  it("draws no count when the standing could not be read", () => {
    draw(done(), { over: null });
    expect(screen.queryByTestId("read-line")).toBeNull();
  });
});

describe("7j: nothing fits", () => {
  it("says nothing fits with no tag, links Change answers to widen, and says no credit was used", () => {
    draw({ kind: "nothing", result: { picks: [], pool: 112, weighed: 30 } });
    expect(text()).toContain("Nothing fits what you wrote");
    expect(screen.queryByTestId("read-tag")).toBeNull();
    expect(screen.getByTestId("read-lead").textContent).toBe(
      "It read all 112 commanders your answers allow, and none of them makes the deck you described. Your answers hold, so it didn’t look outside them.",
    );
    const link = screen.getByRole("link", { name: "Change answers" });
    expect(link.getAttribute("href")).toBe("/decks/new/choose?w=something+scary");
    expect(screen.getByTestId("read-widen").textContent).toBe("Change answers to let it look wider, for instance with more colors.");
    expect(screen.getByTestId("read-line").textContent).toBe("No credit used · 8 of 10 left");
    expect(screen.queryByRole("button")).toBeNull();
    noReadIt();
  });
});

describe("the standing line and the server's HTML", () => {
  it("leaves a standing line out of the server's HTML, which cannot know the reader's time zone", () => {
    const html = renderToString(
      <ReadScope initial="done">
        <ReadPanel readId={READ} served={done()} standing={standing({ nextAt: "2026-10-12T02:01:00Z" })} params={params}
          changeHref="/decks/new/choose" deps={deps() as never} />
      </ReadScope>,
    );
    expect(html).not.toContain("left");
    expect(html).toContain("Read what you wrote");
  });
});

describe("a repeat, and a visit's announcements", () => {
  it("says no credit was used for a repeat landing on a stored nothing-fits answer too", () => {
    draw({ kind: "nothing", result: { picks: [], pool: 308, weighed: 12 } }, { repeat: true });
    expect(screen.getByTestId("read-line").textContent).toBe("No credit used · you asked this already");
  });

  it("starts each visit silent, whatever an earlier visit announced", async () => {
    vi.useFakeTimers();
    draw({ kind: "pending", phase: null }, { d: deps({ state: vi.fn().mockResolvedValue({ kind: "failed" }) }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(screen.getByRole("status").textContent).not.toBe("");
    cleanup();
    draw(done());
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("7l, 7n: unread", () => {
  it("names the cause when another read was still running", () => {
    draw(null, { busy: true });
    expect(text()).toContain("Another read of yours was still running, so this one didn’t start.");
    expect(text()).not.toContain("Your words are kept for another try.");
  });

  it("says the words were not read, with the bare standing and no press (F10)", () => {
    draw(null, { over: { used: 10 } });
    expect(panel().dataset.phase).toBe("unread");
    expect(text()).toContain("What you wrote wasn’t read");
    expect(text()).toContain("These results use your answers alone. Your words are kept for another try.");
    expect(screen.getByTestId("read-line").textContent).toBe("0 of 10 left");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("read-tag")).toBeNull();
    expect(text()).not.toContain("Read it");
    expect(screen.getByTestId("results-dim").dataset.reading).toBeUndefined();
  });

  it("draws an id the server does not know as unread too", () => {
    draw({ kind: "none" });
    expect(panel().dataset.phase).toBe("unread");
  });

  it("says why when the app is paused or the owner's share is used (7n)", () => {
    draw(null, { over: { paused: "2026-11-01T00:00:00Z" } });
    expect(screen.getByTestId("read-line").textContent).toMatch(/^Paused until November 1/);
    expect(text()).toContain("What you wrote wasn’t read");
    expect(screen.queryByRole("button")).toBeNull();
    noReadIt();
    cleanup();
    draw(null, { over: { ownerShare: true } });
    expect(screen.getByTestId("read-line").textContent).toMatch(/testing share/);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
