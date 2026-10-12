import { describe, expect, it } from "vitest";

import {
  afterKey, decodeCursor, encodeCursor, historyPress, mergePage, RUN_TOOL_OF, parseHistoryId, pastCutChips, pastVerdict, runOutcome,
  shapeCount, shapeRun, type HistoryRow, type RunRecord,
} from "./history";
import { REAPER_CUTOFF_MS } from "./limits";

const now = new Date("2026-10-11T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const items = (over: Partial<RunRecord["items"]> = {}): RunRecord["items"] => ({
  total: 0, adds: 0, cuts: 0, acceptedAdds: 0, acceptedCuts: 0, accepted: 0, dismissed: 0, ...over,
});
const run = (over: Partial<RunRecord> = {}): RunRecord => ({
  id: U(1), tool: "suggested_changes", status: "ok", errorClass: null, createdAt: ago(60_000), askedOver: null, items: items(), ...over,
});

describe("runOutcome", () => {
  it("maps each stored status", () => {
    expect(runOutcome("ok", ago(1000), now)).toBe("ok");
    expect(runOutcome("failed", ago(1000), now)).toBe("failed");
    expect(runOutcome("cancelled", ago(1000), now)).toBe("stopped");
    // An ungrounded run is stored failed but is a neutral refusal, as both panels draw it.
    expect(runOutcome("failed", ago(1000), now, "ungrounded")).toBe("refused");
    expect(runOutcome("failed", ago(1000), now, "timeout")).toBe("failed");
    expect(runOutcome("pending", ago(1000), now)).toBe("running");
  });

  it("reads a pending run past the reaper's cutoff as failed, never running", () => {
    expect(runOutcome("pending", ago(REAPER_CUTOFF_MS + 1000), now)).toBe("failed");
  });
});

describe("shapeRun", () => {
  it("summarises an ok Suggested changes run: returned in and out, then what was answered", () => {
    const r = shapeRun(run({ items: items({ total: 10, adds: 5, cuts: 5, acceptedAdds: 2, acceptedCuts: 2, accepted: 2, dismissed: 1 }) }), now);
    expect(r).toMatchObject({ id: `run:${U(1)}`, tool: "suggested", tier: "credit", outcome: "ok" });
    expect(r.summary).toEqual({ kind: "suggestedOk", in: 5, out: 5, added: 2, cut: 2, rejected: 1 });
  });

  it("summarises an ok Proposed cuts run as a deeper look, asked from its report", () => {
    const r = shapeRun(run({ tool: "proposed_cuts", askedOver: 6, items: items({ total: 5, cuts: 5, accepted: 2, dismissed: 1 }) }), now);
    expect(r).toMatchObject({ tool: "cuts", tier: "deeper", outcome: "ok" });
    expect(r.summary).toEqual({ kind: "cutsDeeperOk", named: 5, asked: 6, cut: 2, kept: 1 });
  });

  it("falls back to the named count when a cuts run stored no report", () => {
    const r = shapeRun(run({ tool: "proposed_cuts", items: items({ total: 3 }) }), now);
    expect(r.summary).toMatchObject({ named: 3, asked: 3 });
  });

  it("carries no facts for a run that did not finish", () => {
    expect(shapeRun(run({ status: "failed" }), now).summary).toEqual({ kind: "none" });
    expect(shapeRun(run({ status: "pending", createdAt: ago(5000) }), now).outcome).toBe("running");
  });
});

describe("shapeCount", () => {
  it("reads a free Proposed cuts count as a free ok row with its roles", () => {
    const r = shapeCount({ id: U(2), tool: "proposed_cuts", createdAt: ago(1000), summary: { over: 6, roles: [{ role: "ramp", label: "ramp", over: 4 }] } });
    expect(r).toMatchObject({ id: `count:${U(2)}`, tool: "cuts", tier: "free", outcome: "ok" });
    expect(r.summary).toEqual({ kind: "cutsFree", over: 6, roles: [{ label: "ramp", over: 4 }] });
  });

  it("does not trust a summary of the wrong shape", () => {
    expect(shapeCount({ id: U(2), tool: "proposed_cuts", createdAt: ago(1000), summary: { nope: 1 } }).summary).toEqual({ kind: "none" });
  });
});

describe("cursor", () => {
  it("round-trips, and refuses anything it did not write", () => {
    const key = { at: "2026-10-09T15:42:00.123Z", id: `run:${U(9)}` };
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
    expect(decodeCursor("garbage")).toBeNull();
    expect(decodeCursor(`1.run:${U(1)}'; drop table`)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
  });
});

const row = (id: string, at: string): HistoryRow => ({ id, at, tool: "suggested", tier: "credit", outcome: "ok", summary: { kind: "none" } });

describe("mergePage", () => {
  it("merges both sources newest first, cuts to the page and cursors on the last row", () => {
    const runs = [row(`run:${U(5)}`, "2026-10-09T10:00:00.000Z"), row(`run:${U(3)}`, "2026-10-07T10:00:00.000Z")];
    const counts = [row(`count:${U(4)}`, "2026-10-08T10:00:00.000Z"), row(`count:${U(2)}`, "2026-10-06T10:00:00.000Z")];
    const page = mergePage(runs, counts, null, 3);
    expect(page.rows.map((r) => r.id)).toEqual([`run:${U(5)}`, `count:${U(4)}`, `run:${U(3)}`]);
    expect(decodeCursor(page.nextCursor)).toEqual({ at: "2026-10-07T10:00:00.000Z", id: `run:${U(3)}` });
  });

  it("has no cursor when nothing remains past the page", () => {
    const page = mergePage([row(`run:${U(5)}`, "2026-10-09T10:00:00.000Z")], [], null, 20);
    expect(page.nextCursor).toBeNull();
  });

  it("breaks a tie on the instant by uuid across both tables, so no row is lost between pages", () => {
    const at = "2026-10-09T10:00:00.000Z";
    const all = [row(`run:${U(7)}`, at), row(`count:${U(8)}`, at), row(`run:${U(6)}`, at)];
    const first = mergePage(all.filter((r) => r.id.startsWith("run")), all.filter((r) => r.id.startsWith("count")), null, 2);
    expect(first.rows.map((r) => r.id)).toEqual([`count:${U(8)}`, `run:${U(7)}`]);
    const key = decodeCursor(first.nextCursor);
    const rest = all.filter((r) => afterKey(r, key));
    expect(rest.map((r) => r.id)).toEqual([`run:${U(6)}`]);
  });
});



describe("ids and verdicts", () => {
  it("parses the ids History writes, and nothing else", () => {
    expect(parseHistoryId(`run:${U(1)}`)).toEqual({ kind: "run", uuid: U(1) });
    expect(parseHistoryId(`count:${U(1)}`)).toEqual({ kind: "count", uuid: U(1) });
    expect(parseHistoryId(U(1))).toBeNull();
  });

  it("reads a verdict as the past run's tone", () => {
    expect(pastVerdict("accepted")).toBe("applied");
    expect(pastVerdict("dismissed")).toBe("rejected");
    expect(pastVerdict("pending")).toBe("open");
  });
});

describe("pastCutChips", () => {
  it("quotes each cite with the figures its run stored, and still shows the cites without them", () => {
    const cites = [{ kind: "inclusion", pct: 14 }] as unknown as Parameters<typeof pastCutChips>[0];
    expect(pastCutChips(cites, "r", { medianPct: 38, flagCounts: {}, declared: null })).toEqual(["EDHREC 14% · median 38%"]);
    expect(pastCutChips(cites, "r", null)).toEqual(["EDHREC 14%"]);
    expect(pastCutChips(null, "r", null)).toEqual([]);
  });
});

describe("historyPress: where a History row's press goes", () => {
  const RUN = "11111111-1111-4111-8111-111111111111";
  const row = (over: Partial<HistoryRow>): HistoryRow => ({
    id: `run:${RUN}`, tool: "cuts", tier: "deeper", outcome: "ok", at: "2026-10-12T16:31:55.438Z",
    summary: { kind: "cutsDeeperOk", named: 11, asked: 11, cut: 1, kept: 0 }, ...over,
  });

  it("re-opens a paid run that named something in its own tool, by its run id", () => {
    expect(historyPress(row({}))).toEqual({ kind: "review", runId: RUN });
    expect(historyPress(row({ tool: "suggested", tier: "credit", summary: { kind: "suggestedOk", in: 2, out: 0, added: 0, cut: 0, rejected: 0 } })))
      .toEqual({ kind: "review", runId: RUN });
  });

  it("opens a free count's tool on today's list: the count named no card", () => {
    expect(historyPress(row({ id: `count:${RUN}`, tier: "free", summary: { kind: "cutsFree", over: 10, roles: [] } }))).toEqual({ kind: "live", counted: true });
    expect(historyPress(row({ id: `count:${RUN}`, tool: "mana", tier: "free", summary: { kind: "manaFree", pips: 101, sources: 93 } }))).toEqual({ kind: "live", counted: true });
  });

  it("opens a run still in flight in its tool, which draws it running", () => {
    expect(historyPress(row({ outcome: "running", summary: { kind: "none" } }))).toEqual({ kind: "live", counted: false });
  });

  it("keeps the past-run view for a run with nothing to load", () => {
    for (const outcome of ["failed", "refused", "stopped"] as const) {
      expect(historyPress(row({ outcome, summary: { kind: "none" } }))).toEqual({ kind: "past" });
    }
    expect(historyPress(row({ summary: { kind: "cutsDeeperOk", named: 0, asked: 3, cut: 0, kept: 0 } }))).toEqual({ kind: "past" });
    expect(historyPress(row({ tool: "suggested", summary: { kind: "suggestedOk", in: 0, out: 0, added: 0, cut: 0, rejected: 0 } }))).toEqual({ kind: "past" });
  });

  it("keeps the past-run view for an id it did not write", () => {
    expect(historyPress(row({ id: "run:nope" }))).toEqual({ kind: "past" });
  });
});

describe("Improve my mana's help reads in History", () => {
  const ID = "88888888-8888-4888-8888-888888888888";
  const help = { color: "G", inIdentity: true, sourcesNow: 9, rebalance: [], trades: [{}, {}], staples: [] } as never;

  it("shapes a help read as a Mana row naming its color and its trades", () => {
    const row = shapeCount({ id: ID, tool: "mana_help", createdAt: new Date("2026-10-12T12:00:00Z"), summary: { color: "G", help } });
    expect([row.id, row.tool, row.tier, row.summary]).toEqual([`count:${ID}`, "mana", "free", { kind: "manaHelp", color: "G", trades: 2 }]);
  });

  it("reopens a help read in Mana Balance with its color", () => {
    expect(historyPress({ id: `count:${ID}`, outcome: "ok", summary: { kind: "manaHelp", color: "G", trades: 2 } })).toEqual({ kind: "manaHelp", countId: ID, color: "G" });
  });

  it("lists help reads under the Mana chip", () => {
    expect(RUN_TOOL_OF.mana.counts).toContain("mana_help");
  });
});
