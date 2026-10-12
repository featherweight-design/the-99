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
  type DayRow, settingsForMonth, type SettingRow } from "./costs-rule";
import { BUDGET_USD, usdToMicro } from "../model/spend-rule";

const OCT = { year: 2026, month: 9 };
const NOW = new Date("2026-10-11T15:00:00Z"); // day 11 of 31

function rows(days: DayRow[], over: Partial<CostRows> = {}): CostRows {
  return { days, playerAccounts: 1, ownerMicro: 0, ownerShareMicro: 5_000_000, previous: { runs: 0, micro: 0 }, settings: {}, paused: false, ...over };
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
    expect(s.banner).toBeNull();
  });

  it("names the day the pace passes the plan", () => {
    // $4 over 11 days: $0.3636 a day passes $10 on day 28.
    const s = costSummary(rows([p(2, 4)]), OCT, NOW);
    expect(s.banner).toEqual({ kind: "pace", day: 28 });
  });

  it("puts the 80% alarm ahead of the pace (C5)", () => {
    const s = costSummary(rows([p(2, 8.1)]), OCT, NOW);
    expect(s.alarm).toBe(80);
    expect(s.banner).toEqual({ kind: "alarm" });
  });

  it("puts the pause ahead of everything (C6)", () => {
    const s = costSummary(rows([p(2, 8.1)], { paused: true }), OCT, NOW);
    expect(s.banner).toEqual({ kind: "paused" });
  });

  it("draws an empty month as zeros and no banner (C3)", () => {
    const s = costSummary(rows([], { playerAccounts: 0 }), OCT, NOW);
    expect(s.calls).toEqual({ runs: 0, micro: 0 });
    expect(s.perAccountMicro).toBeNull();
    expect(s.banner).toBeNull();
    expect(s.trendScaleMicro).toBe(Math.round(usdToMicro(BUDGET_USD) * 1.1));
  });
});

describe("costSummary, a past month (C4)", () => {
  it("fills to the month's end with no pace, banner or pause", () => {
    const s = costSummary(rows([p(30, 9), p(1, 0.5)], { paused: true }), { year: 2026, month: 8 }, NOW);
    expect(s.current).toBe(false);
    expect(s.elapsed).toBe(30);
    expect(s.playerByDay).toHaveLength(30);
    expect(s.playerPaceMicro).toBeNull();
    expect(s.callsPaceMicro).toBeNull();
    expect(s.alarm).toBe(80);
    expect(s.banner).toBeNull();
  });
});

describe("costSummary, the rest", () => {
  it("averages the player spend over the accounts that pressed", () => {
    expect(costSummary(rows([p(1, 3)], { playerAccounts: 3 }), OCT, NOW).perAccountMicro).toBe(usdToMicro(1));
  });

  it("counts elsewhere only in the month it was read", () => {
    const elsewhere = { micro: usdToMicro(18.4), asOf: "2026-10-09", note: null };
    expect(costSummary(rows([], { settings: { elsewhere_usd: elsewhere } }), OCT, NOW).elsewhere).toEqual(elsewhere);
    expect(costSummary(rows([], { settings: { elsewhere_usd: elsewhere } }), { year: 2026, month: 8 }, NOW).elsewhere).toBeNull();
  });

  it("never scales the trend below the plan plus 10%, and grows to fit the pace", () => {
    expect(costSummary(rows([p(1, 0.1)]), OCT, NOW).trendScaleMicro).toBe(usdToMicro(11));
    const busy = costSummary(rows([p(1, 9)]), OCT, NOW);
    expect(busy.trendScaleMicro).toBe(busy.playerPaceMicro);
  });
});

describe("formatting and input", () => {
  it("prints dollars as the admin draws them", () => {
    expect(usd(0)).toBe("$0");
    expect(usd(usdToMicro(0.884))).toBe("$0.884");
    expect(usd(usdToMicro(135.96))).toBe("$135.96");
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
    row("elsewhere_usd", "2026-10", 18.4),
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

  it("reads elsewhere in its own month only", () => {
    expect(settingsForMonth(rows, oct).elsewhere_usd?.micro).toBe(18_400_000);
    expect(settingsForMonth(rows, nov).elsewhere_usd).toBeUndefined();
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
  it("adds label batches and evals to model_calls' system rows, and takes the collector's labels out of rewrites", () => {
    const s = costSummary(rows([p(2, 1), sys(3, 0.75)], { outside: { batchMicro: 120_950_000, evalsMicro: 14_760_000, labelCallsMicro: 250_000 } }), OCT, NOW);
    expect(s.systemSplit).toEqual({ labels: 121_200_000, evals: 14_760_000, rewrites: 500_000, total: 136_460_000, incomplete: false });
    // The model_calls figures are untouched.
    expect(s.system.micro).toBe(750_000);
    expect(s.calls.micro).toBe(1_750_000);
  });

  it("carries partial label spend through to the split", () => {
    const s = costSummary(rows([sys(3, 0.5)], { outside: { batchMicro: 1_000_000, evalsMicro: 0, labelCallsMicro: 0, labelsIncomplete: true } }), OCT, NOW);
    expect(s.systemSplit.incomplete).toBe(true);
  });

  it("reads no outside spend as none", () => {
    expect(costSummary(rows([sys(3, 0.5)]), OCT, NOW).systemSplit).toEqual({ labels: 0, evals: 0, rewrites: 500_000, total: 500_000, incomplete: false });
  });
});
