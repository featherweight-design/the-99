import { describe, expect, it } from "vitest";
import {
  capUsd,
  costSummary,
  daysIn,
  monthParam,
  parseDollars,
  parseMonth,
  shiftMonth,
  startsAfter,
  usd,
  type CostRows,
  type DayRow, isSettingKey, SETTING_KEYS, settingsForMonth, type SettingRow, TREND_FLOOR_MICRO } from "./costs-rule";
import { usdToMicro } from "../model/spend-rule";

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-11T15:00:00Z"); // day 11 of 31

function rows(days: DayRow[], over: Partial<CostRows> = {}): CostRows {
  return { days, playerAccounts: 1, ownerMicro: 0, ownerShareMicro: 5_000_000, previous: { runs: 0, micro: 0 }, settings: {}, anthropic: { ok: false, kind: "no_key" }, ...over };
}
const p = (day: number, usdValue: number, runs = 1): DayRow => ({ day, origin: "player", runs, micro: usdToMicro(usdValue) });
const sys = (day: number, usdValue: number, runs = 1): DayRow => ({ day, origin: "system", runs, micro: usdToMicro(usdValue) });

describe("months", () => {
  it("parses ?month=, refusing junk and the future", () => {
    expect(parseMonth("2026-09", NOW)).toEqual({ year: 2026, month: 8 });
    expect(parseMonth(undefined, NOW)).toEqual(OCT);
    expect(parseMonth("2026-13", NOW)).toEqual(OCT);
    expect(parseMonth("2026-9", NOW)).toEqual(OCT);
    expect(parseMonth("2026-11", NOW)).toEqual(OCT);
  });

  it("steps across a year and prints the param", () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(monthParam({ year: 2026, month: 0 })).toBe("2026-01");
    expect(daysIn({ year: 2028, month: 1 })).toBe(29);
  });
});

describe("costSummary, the current month", () => {
  it("splits origins, keeps system out of the player series, and paces to month end", () => {
    const s = costSummary(rows([p(3, 0.188, 2), p(6, 0.452, 10), sys(11, 0.251, 3)]), OCT, NOW);
    expect(s.current).toBe(true);
    expect(s.elapsed).toBe(11);
    expect(s.player).toEqual({ runs: 12, micro: usdToMicro(0.64) });
    expect(s.system).toEqual({ runs: 3, micro: usdToMicro(0.251) });
    expect(s.calls.runs).toBe(15);
    expect(s.playerByDay).toHaveLength(11);
    expect(s.playerByDay[5]).toBe(usdToMicro(0.452));
    expect(s.playerCumulative.at(-1)).toBe(usdToMicro(0.64));
    expect(s.playerPaceMicro).toBe(Math.round((usdToMicro(0.64) / 11) * 31));
  });

  it("scales the trend to the pace, with no plan to hold it up (2026-10-17)", () => {
    // $4 over 11 days paces to $11.27 by the 31st: the top of the chart, not a $10 plan.
    const s = costSummary(rows([p(2, 4)]), OCT, NOW);
    expect(s.trendScaleMicro).toBe(s.playerPaceMicro);
    expect(s.trendScaleMicro).toBe(Math.round((usdToMicro(4) / 11) * 31));
  });

  it("draws an empty month as zeros and no banner (C3)", () => {
    const s = costSummary(rows([], { playerAccounts: 0 }), OCT, NOW);
    expect(s.calls).toEqual({ runs: 0, micro: 0 });
    expect(s.perAccountMicro).toBeNull();
    expect(s.trendScaleMicro).toBe(TREND_FLOOR_MICRO);
  });
});

describe("costSummary, a past month (C4)", () => {
  it("fills to the month's end with no pace", () => {
    const s = costSummary(rows([p(30, 9), p(1, 0.5)]), { year: 2026, month: 8 }, NOW);
    expect(s.current).toBe(false);
    expect(s.elapsed).toBe(30);
    expect(s.playerByDay).toHaveLength(30);
    expect(s.playerPaceMicro).toBeNull();
    expect(s.callsPaceMicro).toBeNull();
    expect(s.trendScaleMicro).toBe(usdToMicro(9.5));
  });
});

describe("costSummary, the rest", () => {
  it("averages the player spend over the accounts that pressed", () => {
    expect(costSummary(rows([p(1, 3)], { playerAccounts: 3 }), OCT, NOW).perAccountMicro).toBe(usdToMicro(1));
  });

  it("ignores a stored elsewhere figure: the workspace is Anthropic's own", () => {
    const elsewhere = { micro: usdToMicro(18.4), asOf: "2026-10-09", note: null };
    const s = costSummary(rows([p(1, 2)], { settings: { elsewhere_usd: elsewhere } as CostRows["settings"] }), OCT, NOW);
    expect(s.workspace).toEqual({ ledgerMicro: usdToMicro(2), read: { ok: false, kind: "no_key" } });
    expect(s).not.toHaveProperty("elsewhere");
  });

  it("scales the trend to the series and its pace, never to a plan", () => {
    const quiet = costSummary(rows([p(1, 0.1)]), OCT, NOW);
    expect(quiet.trendScaleMicro).toBe(quiet.playerPaceMicro);
    const busy = costSummary(rows([p(1, 9)]), OCT, NOW);
    expect(busy.trendScaleMicro).toBe(busy.playerPaceMicro);
  });
});

describe("formatting and input", () => {
  it("prints dollars as the admin draws them", () => {
    expect(usd(0)).toBe("$0");
    expect(usd(usdToMicro(0.884))).toBe("$0.884");
    expect(usd(usdToMicro(135.96))).toBe("$135.96");
    // A credit carries its sign before the dollar, its places chosen on its size.
    expect(usd(usdToMicro(-20))).toBe("−$20.00");
    expect(usd(usdToMicro(-0.5))).toBe("−$0.500");
    // The places are chosen after rounding: just under $2 rounds to $2 and prints as dollars.
    expect(usd(1_999_700)).toBe("$2.00");
    expect(usd(1_234_000)).toBe("$1.234");
    expect(usd(1_999_400)).toBe("$1.999");
    expect(capUsd(10)).toBe("$10");
    expect(capUsd(8.5)).toBe("$8.50");
  });

  it("reads a typed amount, and nothing that is not one", () => {
    expect(parseDollars("18.40")).toBe(18_400_000);
    expect(parseDollars("$100")).toBe(100_000_000);
    expect(parseDollars(" 0.5 ")).toBe(500_000);
    for (const bad of ["", "-5", "1.234", "abc", "1e3", "1,000"]) expect(parseDollars(bad)).toBeNull();
  });
});

describe("startsAfter", () => {
  const at = (asOf: string) => ({ micro: 15_000_000, asOf, note: null });
  it("names the month a setting starts in when that is after the viewed month", () => {
    expect(startsAfter(at("2026-11-01"), OCT)).toEqual({ year: 2026, month: 10 });
    expect(startsAfter(at("2027-01-01"), OCT)).toEqual({ year: 2027, month: 0 });
  });
  it("is null for a setting that applies in the viewed month, or none at all", () => {
    expect(startsAfter(at("2026-10-01"), OCT)).toBeNull();
    expect(startsAfter(at("2026-10-12"), OCT)).toBeNull();
    expect(startsAfter(at("2026-03-01"), OCT)).toBeNull();
    expect(startsAfter(undefined, OCT)).toBeNull();
  });
});

describe("settingsForMonth: a setting belongs to its month", () => {
  const row = (key: SettingRow["key"], month: string, dollars: number): SettingRow => ({
    key, month, micro: dollars * 1_000_000, asOf: `${month}-01`, note: null,
  });
  const oct = { year: 2026, month: 9 };
  const nov = { year: 2026, month: 10 };
  const rows = [
    row("account_cap_usd", "2026-10", 250),
    row("account_cap_usd", "2026-11", 100),
    row("system_ceiling_usd", "2026-11", 15),
    row("org_cap_usd", "2026-10", 250),
    // A retired key's row, as production holds one: never typed as a key, never read.
    row("elsewhere_usd" as SettingRow["key"], "2026-10", 18.4),
  ];

  it("keeps an earlier month's cap when a later month's is set (October $250, November $100)", () => {
    expect(settingsForMonth(rows, oct).account_cap_usd?.micro).toBe(250_000_000);
    expect(settingsForMonth(rows, nov).account_cap_usd?.micro).toBe(100_000_000);
  });

  it("carries a cap forward to the months after its own until a later row", () => {
    expect(settingsForMonth(rows, { year: 2027, month: 2 }).account_cap_usd?.micro).toBe(100_000_000);
    expect(settingsForMonth(rows, { year: 2026, month: 8 }).account_cap_usd).toBeUndefined();
  });

  it("gives a month with no ceiling yet the one set to start later, and the later month its own", () => {
    expect(settingsForMonth(rows, oct).system_ceiling_usd?.asOf).toBe("2026-11-01");
    expect(settingsForMonth(rows, nov).system_ceiling_usd?.micro).toBe(15_000_000);
  });

  it("keeps the ceiling in force when one is scheduled for a later month", () => {
    const both = [row("system_ceiling_usd", "2026-10", 20), row("system_ceiling_usd", "2026-12", 15)];
    expect(settingsForMonth(both, oct).system_ceiling_usd?.micro).toBe(20_000_000);
    expect(settingsForMonth(both, nov).system_ceiling_usd?.micro).toBe(20_000_000);
    expect(settingsForMonth(both, { year: 2026, month: 11 }).system_ceiling_usd?.micro).toBe(15_000_000);
  });

  it("holds the org cap from its month on, as the workspace cap is held", () => {
    expect(settingsForMonth(rows, oct).org_cap_usd?.micro).toBe(250_000_000);
    expect(settingsForMonth(rows, { year: 2027, month: 2 }).org_cap_usd?.micro).toBe(250_000_000);
    expect(settingsForMonth(rows, { year: 2026, month: 8 }).org_cap_usd).toBeUndefined();
  });

  it("never reads an elsewhere row, retired with the Anthropic workspace read", () => {
    expect(Object.keys(settingsForMonth(rows, oct)).sort()).toEqual(["account_cap_usd", "org_cap_usd", "system_ceiling_usd"]);
    expect(Object.keys(settingsForMonth(rows, nov))).not.toContain("elsewhere_usd");
  });

  it("names the keys a row may carry, and elsewhere_usd is not one", () => {
    expect([...SETTING_KEYS]).toEqual(["account_cap_usd", "system_ceiling_usd", "org_cap_usd"]);
    expect(isSettingKey("org_cap_usd")).toBe(true);
    expect(isSettingKey("elsewhere_usd")).toBe(false);
    expect(isSettingKey("toString")).toBe(false);
  });
});

describe("parseMonth and capUsd at their edges", () => {
  const now = new Date("2026-10-12T12:00:00Z");

  it("reads a year before 2000 as the current month, never as Date.UTC's 1900s", () => {
    expect(parseMonth("0001-01", now)).toEqual({ year: 2026, month: 9 });
    expect(parseMonth("1999-12", now)).toEqual({ year: 2026, month: 9 });
    expect(parseMonth("2026-09", now)).toEqual({ year: 2026, month: 8 });
  });

  it("prints a cap to the cent, and a sub-cent cap exactly", () => {
    expect(capUsd(10)).toBe("$10");
    expect(capUsd(2.5)).toBe("$2.50");
    expect(capUsd(12.34)).toBe("$12.34");
    expect(capUsd(0.001)).toBe("$0.001");
    expect(capUsd(1.2345)).toBe("$1.2345");
  });
});

describe("costSummary, the system split", () => {
  it("adds label batches to model_calls' system rows, and takes the collector's labels out of rewrites", () => {
    const s = costSummary(rows([p(2, 1), sys(3, 0.75)], { outside: { batchMicro: 120_950_000, evalsMicro: 14_760_000, labelCallsMicro: 250_000 } }), OCT, NOW);
    expect(s.systemSplit).toEqual({ labels: 121_200_000, rewrites: 500_000, total: 121_700_000, labelsPartial: false, incomplete: false });
    expect(s.evals).toEqual({ micro: 14_760_000, partial: false });
    // The model_calls figures are untouched.
    expect(s.system.micro).toBe(750_000);
    expect(s.calls.micro).toBe(1_750_000);
  });

  it("carries partial label spend through to the split", () => {
    const s = costSummary(rows([sys(3, 0.5)], { outside: { batchMicro: 1_000_000, evalsMicro: 0, labelCallsMicro: 0, labelsIncomplete: true } }), OCT, NOW);
    expect(s.systemSplit.incomplete).toBe(true);
  });

  it("marks the evals partial when a ledger could not be read, and leaves System whole", () => {
    const s = costSummary(rows([sys(3, 0.5)], { outside: { batchMicro: 0, evalsMicro: 0, labelCallsMicro: 0, evalsUnreadable: true } }), OCT, NOW);
    expect(s.evals).toEqual({ micro: 0, partial: true });
    expect(s.systemSplit).toMatchObject({ labelsPartial: false, incomplete: false });
  });

  // The ledgers are repo files every deployment reads, so one laptop's evals once read as
  // production's System at 144% of its ceiling. Eval spend must never re-enter System.
  it("keeps eval spend out of the System total, however large", () => {
    const without = costSummary(rows([sys(3, 0.5)]), OCT, NOW);
    const withEvals = costSummary(rows([sys(3, 0.5)], { outside: { batchMicro: 0, evalsMicro: 21_480_000, labelCallsMicro: 0 } }), OCT, NOW);
    expect(withEvals.systemSplit).toEqual(without.systemSplit);
    expect(withEvals.systemSplit.total).toBe(500_000);
    expect(withEvals.evals.micro).toBe(21_480_000);
  });

  it("reads no outside spend as none", () => {
    const s = costSummary(rows([sys(3, 0.5)]), OCT, NOW);
    expect(s.systemSplit).toEqual({ labels: 0, rewrites: 500_000, total: 500_000, labelsPartial: false, incomplete: false });
    expect(s.evals).toEqual({ micro: 0, partial: false });
  });
});

describe("costSummary, the Anthropic workspace", () => {
  const KEYS = { ok: true as const, rows: [{ name: "Production app", hint: "sk-ant...igAA", status: "active" as const, statusWord: "active" as const }] };
  const read = (workspaceMicro: number) => ({
    anthropic: { ok: true as const, asOf: "2026-10-11T14:55:00.000Z", workspaceMicro, otherMicro: usdToMicro(40), orgMicro: workspaceMicro + usdToMicro(40), keys: KEYS },
  });

  it("is the bill against this environment's ledger, elsewhere the difference", () => {
    // Ledger: player $1 + system $0.75 + label batches $0.25 = $2. Evals are never in it.
    const s = costSummary(rows([p(2, 1), sys(3, 0.75)], { ...read(usdToMicro(150)), outside: { batchMicro: 250_000, evalsMicro: 9_000_000, labelCallsMicro: 0 } }), OCT, NOW);
    expect(s.workspace).toEqual({
      ledgerMicro: usdToMicro(2),
      read: {
        ok: true,
        asOf: "2026-10-11T14:55:00.000Z",
        totalMicro: usdToMicro(150),
        elsewhereMicro: usdToMicro(148),
        ledgerAhead: false,
        otherMicro: usdToMicro(40),
        orgMicro: usdToMicro(190),
        keys: KEYS,
      },
    });
  });

  it("hands a failed key list through beside the figures it leaves standing", () => {
    const s = costSummary(rows([p(2, 1)], { anthropic: { ...read(usdToMicro(150)).anthropic, keys: { ok: false, kind: "refused" } } }), OCT, NOW);
    expect(s.workspace.read).toMatchObject({ ok: true, totalMicro: usdToMicro(150), orgMicro: usdToMicro(190), keys: { ok: false, kind: "refused" } });
  });

  it("floors elsewhere at $0, and names a ledger past the bill only beyond the tolerance", () => {
    const within = costSummary(rows([p(2, 1.04)], read(usdToMicro(1))), OCT, NOW);
    expect(within.workspace.read).toMatchObject({ elsewhereMicro: 0, ledgerAhead: false });
    const past = costSummary(rows([p(2, 1.06)], read(usdToMicro(1))), OCT, NOW);
    expect(past.workspace.read).toMatchObject({ elsewhereMicro: 0, ledgerAhead: true });
  });

  it("carries an unread kind, and the count of an ambiguous match", () => {
    const s = costSummary(rows([p(2, 1)], { anthropic: { ok: false, kind: "ambiguous_workspace", count: 2 } }), OCT, NOW);
    expect(s.workspace).toEqual({ ledgerMicro: usdToMicro(1), read: { ok: false, kind: "ambiguous_workspace", count: 2 } });
    const t = costSummary(rows([p(2, 1)], { anthropic: { ok: false, kind: "refused" } }), OCT, NOW);
    expect(t.workspace.read).toEqual({ ok: false, kind: "refused" });
  });
});
