// The admin: copy. One reader (Hugh), so the wording is terse and names the code it reads.
//
// Taken from the handoff's `admin · copy strings.ts` (R2) for the keys the gate, the shell and the
// Costs core draw; the switch, group, account and model strings arrive with their pages. A copy
// pass was applied to every string here: no em dashes, US English, "env var" throughout, and
// never "instantly". Strings the handoff did not write (the month bar's range and comparison, tile
// subs, cap subs, the settings dialog) are new here and kept to the canvas's shapes.
//
// Figures are passed in already formatted (`usd`, `capUsd` in `lib/admin/costs-rule.ts`), so no
// dollar value or cap is spelled in this file: the caps come from `spend-rule.ts`.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const adminCopy = {
  door: { label: "Admin" },
  eyebrow: "Admin",
  tabs: { costs: "Costs", switches: "Switches", groups: "Groups", accounts: "Accounts", models: "Models" },
  tabsLabel: "Admin pages",

  costs: {
    title: "Costs",
    sub: "What the model features cost, read from model_calls. Read only, except the caps set here.",
    period: {
      previous: "Previous month",
      next: "Next month",
      range: (last: number, mon: string, day: number | null, days: number) =>
        `1 to ${last} ${mon} · UTC${day === null ? "" : ` · day ${day} of ${days}`}`,
      compare: (month: string, figure: string, runs: number) =>
        runs === 0 ? `${month}: no model calls.` : `${month}: ${figure} in ${plural(runs, "run", "runs")}.`,
    },
    tiles: { calls: "Model calls", player: "Player presses", system: "System", perAccount: "Per active account" },
    tileSub: {
      runs: (runs: number) => plural(runs, "run", "runs"),
      pace: (v: string) => `on pace for ${v}`,
      ofPlan: (pct: number, plan: string) => `${pct}% of the ${plan} plan`,
      ofCeiling: (pct: number, cap: string) => `${pct}% of the ${cap} ceiling`,
      system: "rewrites, labels and prose",
      accounts: (n: number) => (n === 0 ? "no account pressed" : `${plural(n, "account", "accounts")} pressed`),
    },
    banner: {
      paused: (month: string) => `Presses are paused until ${month} 1.`,
      alarm: (pct: number) => `Player presses have reached ${pct}% of the plan.`,
      pace: (plan: string, date: string) => `On this pace, player presses pass the ${plan} plan around ${date}.`,
    },
    caps: "Against the caps",
    capsMeta: "set in code and read only, except the rows set here",
    capSource: { code: "in code", here: "set here" },
    capRows: { plan: "Player presses, planned budget", owner: "Owner testing share", ceiling: "System ceiling", account: "Anthropic account cap" },
    of: (figure: string, cap: string) => `${figure} of ${cap}`,
    notSet: (figure: string) => `${figure} · not set`,
    ticks: {
      alarm: (cap: string, pct: number) => `${cap} · ${pct}%`,
      plan: (cap: string) => `${cap} plan`,
      hardStop: (cap: string) => `${cap} hard stop`,
    },
    capSub: {
      planLines: (lines: string) => `${lines}. `,
      plan: "BUDGET_USD, ALARM_PCTS and HARD_STOP_USD, in spend-rule.ts.",
      planPace: (v: string) => ` Hatched: the rest of the month on this pace, to ${v}.`,
      owner: "MODEL_OWNER_MONTHLY_USD, or OWNER_SHARE_USD in spend-rule.ts when it is unset.",
      noOwner: "MODEL_OWNER_USER_ID is not set, so no account has a share.",
      ceiling: "System rows in model_calls.",
      noCeiling: "No ceiling is set.",
      startsIn: (month: string) => `Starts ${month}.`,
      account: "Mirrors Anthropic’s console.",
      elsewhere: (v: string, date: string) => ` Hatched: elsewhere ${v}, as of ${date}.`,
      noElsewhere: " Elsewhere is not entered.",
    },
    note: (text: string) => `Note: ${text}`,
    enterElsewhere: "Enter elsewhere",
    updateElsewhere: "Update elsewhere",
    changeCap: "Change the cap",
    changeCeiling: "Change the ceiling",
    trendPlayer: "Player presses, month to date",
    trendPlayerMeta: (plan: string) => `against the ${plan} plan`,
    trendNote: "Free rewrites are system spend and not in this line.",
    trend: {
      scale: (v: string) => `${v} scale`,
      soFar: "so far",
      onPace: "on this pace",
      today: (v: string) => `${v} today`,
      byEnd: (v: string, day: number, mon: string) => `${v} by ${day} ${mon}`,
      byDay: (v: string) => `By day · tallest ${v}`,
      label: (month: string, v: string, pace: string | null) =>
        `Player presses in ${month}: ${v}${pace === null ? "." : `, on pace for ${pace} by month end.`}`,
    },
    empty: (month: string) => `No model calls in ${month}.`,
  },

  setting: {
    amount: "Amount ($)",
    asOf: "As of",
    starts: "Starts",
    note: "Note (optional)",
    save: "Save",
    cancel: "Cancel",
    badAmount: "Enter dollars, like 18.40.",
    badDate: "Enter the date it was read.",
    badMonth: "Pick this month or a later one.",
    badNote: "Keep the note to 500 characters.",
    unknown: "The page lost touch with the server, so it may have saved. Check the figure above before saving again.",
    saveFailed: "Didn’t save. Nothing changed.",
  },
} as const;
