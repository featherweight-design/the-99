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

import type { SwitchName } from "../switches/registry";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const adminCopy = {
  door: { label: "Admin" },
  eyebrow: "Admin",
  tabs: { costs: "Costs", switches: "Switches", groups: "Groups", accounts: "Accounts", models: "Models" },
  tabsLabel: "Admin pages",

  costs: {
    title: "Costs",
    sub: "What the model features cost, read from model_calls, card_label_batches and the committed eval ledgers. Read only, except the caps set here.",
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
      ofCeilingAtLeast: (pct: number, cap: string) => `at least ${pct}% of the ${cap} ceiling`,
      system: "labels, rewrites and prose",
      accounts: (n: number) => (n === 0 ? "no account pressed" : `${plural(n, "account", "accounts")} pressed`),
    },
    banner: {
      paused: (month: string) => `Presses are paused until ${month} 1.`,
      alarm: (pct: number) => `Player presses have reached ${pct}% of the plan.`,
      pace: (plan: string, date: string) => `On this pace, player presses pass the ${plan} plan around ${date}.`,
    },
    caps: "Against the caps",
    capsMeta: "set in code and read only, except the rows set here",
    capsReference: "The system ceiling and the Anthropic account cap are reference lines. Neither one blocks a call.",
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
      ceiling: "System rows in model_calls and card label batches. Evals are not counted.",
      noCeiling: "No ceiling is set.",
      startsIn: (month: string) => `Starts ${month}.`,
      account: "Mirrors Anthropic’s console.",
      elsewhere: (v: string, date: string, by: string | null) =>
        ` Hatched: elsewhere ${v}, as of ${date}${by === null ? "" : `, entered by ${by}`}.`,
      you: "you",
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

    // The detail (admin PR 3), below the trend in the canvas's order.
    byModel: "By model",
    byModelMeta: "model calls and card labels",
    modelSub: {
      calls: (n: number, features: string) => `${plural(n, "call", "calls")} · ${features}`,
      batches: (n: number) => `card labels, Batch API · ${plural(n, "batch", "batches")}`,
      composite: "a composite run from before the parts table, not split",
    },
    split: "Player against system",
    splitLine: (pct: string, month: string) => `System is ${pct}% of ${month}.`,
    splitLineAtLeast: (pct: string, month: string) => `System is at least ${pct}% of ${month}, with some of its spend not in yet.`,
    series: { player: "Player presses", labels: "Card labels", rewrites: "Free rewrites and prose" },
    evalsApart: {
      title: "Evals (all environments, from the repo)",
      sub: (n: number) =>
        `${plural(n, "ledger", "ledgers")}. Every deployment reads the same files, so none of this counts toward System or a cap here.`,
    },
    byFeature: "By feature and model",
    byFeatureMeta: "per run is the month’s mean of its priced runs",
    featureHead: { feature: "Feature", model: "Model", effort: "Effort", runs: "Runs", perRun: "Per run", p90: "p90", month: "Month" },
    featureNames: {
      tuning: "Suggested changes",
      synopsis: "Overview",
      intake: "Help me choose",
      proposed_cuts: "Proposed cuts",
      fits_read: "Find a deck read",
      labels: "Card labels",
      prose: "Commander prose",
    } as Record<string, string>,
    featureTitle: (name: string, step: string | null, free: boolean) => `${name}${free ? " rewrite, free" : ""}${step && step !== "call" ? `, ${step}` : ""}`,
    effortUnknown: "not recorded",
    callsRow: "Model calls",
    runsCell: (n: number) => plural(n, "run", "runs"),
    featureMeta: (model: string, effort: string, runs: number, perRun: string, p90: string) =>
      `${model} · ${effort} · ${plural(runs, "run", "runs")} · ${perRun} a run, p90 ${p90}`,
    byFeatureNote: "Effort is recorded per call from the parts table on. An earlier run reads not recorded rather than a guess.",
    refunds: "Refunds",
    refundsMeta: (v: string, pct: number) => `${v} · ${pct}% of model calls`,
    refundLine: "the player got the credit back, and the dollars stay billed",
    refundsBody: (n: number, line: string) => `${n === 1 ? "One run was" : `${n} runs were`} refunded: ${line}.`,
    refundFeature: (name: string, runs: number, v: string) => `${name} ${plural(runs, "run", "runs")}, ${v}.`,
    noRefunds: "No runs were refunded.",
    reserved: "Reserved against spent",
    reservedMeta: "the worst case a press is held at, against its mean",
    reservedOnly: (v: string) => `${v} reserved`,
    reservedShare: (pct: string) => `${pct}% of the reservation`,
    noPress: "no press yet",
    noCostYet: (runs: number) => `${plural(runs, "press", "presses")}, none priced yet`,
    perAccount: "Per account",
    perAccountMeta: (n: number) => `${plural(n, "account", "accounts")} pressed`,
    accountHead: { account: "Account", presses: "Presses", credits: "Credits used", spent: "Spent" },
    playersRow: "Players",
    accountMeta: (presses: number, credits: number) => `${plural(presses, "press", "presses")} · ${plural(credits, "credit", "credits")} used`,
    noPresses: (month: string) => `No presses in ${month}.`,
    labels: "Card label runs",
    labelsMeta: "card_label_batches and the manual collector, at Batch API rates",
    labelHead: { run: "Run", batches: "Batches", tokens: "Tokens in / out", cost: "Cost" },
    labelSource: { collector: "manual collector" },
    labelMeta: (batches: number | null, tokens: string | null) =>
      [batches === null ? "manual collector" : plural(batches, "batch", "batches"), tokens ? `${tokens} tokens` : null].filter(Boolean).join(" · "),
    noLabelRuns: (month: string) => `No label runs in ${month}.`,
    unpriced: "not priced",
    soFar: (v: string) => `${v} so far`,
    labelsPartial: "label runs still collecting or not priced",
    systemPartial: "some label spend is not in yet",
    ledgersUnreadable: (names: string) => `Could not read ${names}, so the eval figures leave it out.`,
    labelsOnStaging: "Card labels run on staging; production receives copies and calls no model for them.",
    evals: "Eval ledgers",
    evalsMeta: "committed in the repo; they move only with a merge",
    ledgerHead: { ledger: "Ledger", requests: "Requests", settled: "Settled", limit: "Limit", window: "Window" },
    originalLedger: "Original campaign",
    pending: (v: string) => `${v} pending`,
    nothingPending: "nothing pending",
    limit: (hard: string, askAt: string | null) => `${hard} hard${askAt ? ` · ask at ${askAt}` : ""}`,
    noLimit: "no limit in code",
    ledgerMeta: (requests: number, limit: string, window: string) => `${plural(requests, "request", "requests")} · ${limit} · ${window}`,
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

  // From the handoff's `accounts` keys: what the Switches list (and, in PR 9, Accounts) says when the
  // account list is the stored ids because Clerk could not be read (STATES A3).
  accounts: { clerkDown: "Names didn’t load from Clerk." },

  // The Switches list (admin STATES L1 to L6), from the handoff's `switches` keys. The Overrides
  // cell, the App-wide cell and the phone's meta line take the canvas's own shapes (`flagRow` in
  // `Admin R2.dc.html`).
  switches: {
    title: "Switches",
    sub: "Env var first, then overrides: account beats group beats app-wide. Changes land within 30 seconds.",
    search: "Search by name or variable",
    chips: { all: "All", overridden: "Overridden", offForAnyone: "Off for anyone", model: "Model features" },
    chipsLabel: "Show",
    heads: { features: "Features", plumbing: "Plumbing", plumbingNote: "app-wide only, not features a friend tries" },
    cols: { name: "Switch", env: "Env var", app: "App-wide", overrides: "Overrides", resolved: "Resolved" },
    resolved: { on: "On", off: "Off", mixed: "Mixed", count: (n: number, total: number) => `${n} of ${total} on` },
    app: { notSet: "Not set", on: "On", off: "Off" },
    envUnset: "unset",
    overrides: {
      none: "None",
      groups: (n: number) => plural(n, "group", "groups"),
      accounts: (n: number) => plural(n, "account", "accounts"),
      refused: "refused",
      ignored: "ignored",
    },
    overridesUnread: "Overrides didn’t load. Every row shows the env var alone.",
    killed: "env var is off",
    parentOff: (parent: string) => `${parent} is off`,
    tagModel: "model",
    tagNeeds: (parent: string) => `needs ${parent}`,
    metaEnv: (env: string) => `env ${env}`,
    metaApp: (app: string) => `app-wide ${app.toLowerCase()}`,
    metaNoOverrides: "no overrides",
    footnote: (total: number, env: string) => `Resolved counts the ${total} accounts on ${env}. Signed out gets the app-wide result.`,
    noneMatch: "None match.",
    showAll: "Show all",
  },

  // One switch's page (admin STATES F1 to F13), from the handoff's `switch` keys. The source labels,
  // the history scope and actor labels, the Needs rung's value and `allows all`, the plumbing row's
  // `ignored` meta and Check an account's prompt are new here and owed to /copy-review (plan
  // §"New, owed to /copy-review" items 4, 5 and 8).
  switch: {
    back: "‹ Switches",
    ladderHead: "Who gets it",
    ladderMeta: "most specific wins",
    rungs: { account: "Account", group: "Group", app: "App-wide", env: "Env var", needs: "Needs" },
    decides: (n: number) => (n ? `decides for ${n}` : "decides for none"),
    allows: (t: number) => `allows all ${t}`,
    refused: "refused",
    killSet: "off · refuses every override",
    none: "None",
    needsValue: (parent: string, state: string) => `${parent}: ${state}`,
    result: {
      allOn: (t: number) => `On for all ${t} accounts`,
      allOff: (t: number) => `Off for all ${t} accounts`,
      some: (n: number, t: number, names: string) => `On for ${n} of ${t}: ${names}`,
    },
    appHead: "App-wide",
    appSetBy: (who: string, when: string) => `set by ${who}, ${when}`,
    appNotSet: "not set: the env var decides",
    appNotSetNote: "Not set falls back to the env var.",
    appRefused: "Refused while the env var is off.",
    note: (note: string) => `Note: “${note}”`,
    noNote: "No note",
    groupsHead: "Groups",
    accountsHead: "Accounts",
    sectionNone: "none",
    members: (n: number) => plural(n, "member", "members"),
    noGroup: "No group override.",
    noAccount: "No account override.",
    check: "Check an account",
    checkPick: "Pick an account",
    historyHead: "History",
    historyCount: (n: number) => plural(n, "change", "changes"),
    historyLatest: (n: number) => `latest ${n}`,
    historyFoot: "UTC. Env var changes ship with a deploy and aren’t listed.",
    noHistory: "No overrides yet.",
    refusedMeta: "refused, env var is off",
    ignoredMeta: "ignored, plumbing is app-wide only",
    kill: {
      title: "Off: the env var is off.",
      body: (v: string) => `${v}=off refuses every override. Redeploy to change it. Clear still works.`,
    },
    compound: {
      title: (parent: string) => `Off: needs ${parent}, which is off.`,
      body: "The env var is true, but overrides here can’t turn the parent on.",
      link: (parent: string) => `Open ${parent} ›`,
    },
    history: {
      set: (who: string, scope: string, from: string, to: string) => `${who} set ${scope}: ${from} → ${to}`,
      cleared: (who: string, scope: string, from: string) => `${who} cleared ${scope} (was ${from})`,
      notSet: "not set",
      you: "You",
      scope: { app: "app-wide", group: (name: string) => `group ${name}`, user: (name: string) => `account ${name}` },
    },
    sources: {
      kill: "env var is off",
      account: "account override",
      group: (name: string) => `group ${name}`,
      app: "app-wide override",
      env: "from the env var",
      parent: (parent: string) => `${parent} is off`,
    },
  },
} as const;

/**
 * Each switch's name and one plain line (admin STATES L1; READINESS G9). The canvas drew 21 of them
 * (`n:` and `d:` in `Admin R2.dc.html`); the rest, and the canvas lines the code has since moved
 * past, are new here and owed to /copy-review. A parent's line names what needs it; a child's tag
 * already does.
 */
export const switchCopy: Readonly<Record<SwitchName, { label: string; description: string }>> = {
  ABOUT_SHEET_ENABLED: { label: "About sheet", description: "The What’s new sheet. While off, a redirect to About instead." },
  ADDED_COPY_ENABLED: { label: "Added copy", description: "An added copy says where it went, with Change to move it." },
  ALL_DECKS_CART_ENABLED: { label: "Shopping for all decks", description: "One shopping list across every deck, at /decks/shopping." },
  ANALYSIS_TAB_ENABLED: { label: "Analysis tab", description: "The Analysis tab on a deck. Three switches need it." },
  CHANGE_COMMANDER_ENABLED: { label: "Change commander", description: "Change a deck’s commander and keep the 99." },
  COLLECTION_EDIT_ENABLED: { label: "Collection edit", description: "Change card counts in the collection. Added copy and Mark bought need it." },
  DECK_BENCHMARKS_ENABLED: { label: "Deck benchmarks", description: "A deck measured against similar decks." },
  DECK_NOTES_ENABLED: { label: "Deck notes", description: "Notes on a deck, in Your deck." },
  DECK_PRINTINGS_ENABLED: { label: "Deck printings", description: "Choose the printing of each card in a deck." },
  DECK_STATS_ENABLED: { label: "Deck stats", description: "The Stats view on a deck." },
  DECK_TOKENS_ENABLED: { label: "Deck tokens", description: "The tokens a deck makes, on the deck and in Shopping." },
  FIND_A_DECK_READ_ENABLED: { label: "Find a deck read", description: "A one-credit read inside Find a deck for it." },
  HELP_ME_CHOOSE_ENABLED: { label: "Help me choose", description: "Find a commander from a few words, and Look deeper." },
  HOW_IT_WORKS_ENABLED: { label: "How it works", description: "The How it works page in About." },
  LABEL_ROLE_COUNTS_ENABLED: { label: "Label role counts", description: "Role counts from card labels instead of the classifier, in decks and recommendations." },
  LABEL_SURFACES_ENABLED: { label: "Label surfaces", description: "Card labels drawn on cards and lists." },
  LINEUP_ENABLED: { label: "Lineup", description: "The Stats view on /decks, across every deck." },
  LIST_CACHE_ENABLED: { label: "List cache", description: "Home and /decks cached per reader." },
  MANA_BALANCE_ENABLED: { label: "Mana Balance", description: "Mana Balance in the Tuning hub. Makes no model call." },
  NEVER_CUT_ENABLED: { label: "Never cut", description: "Mark cards a suggestion may not cut." },
  NOTICES_ENABLED: { label: "Notices", description: "Notices on a deck." },
  OVERVIEW_V2_ENABLED: { label: "Overview v2", description: "The Overview on contract 8, Sonnet 5.5." },
  PRECONS_ENABLED: { label: "Precons", description: "Browse Commander precons and start a deck from one." },
  PROPOSED_CUTS_ENABLED: { label: "Proposed cuts", description: "Cuts proposed for a deck over 99." },
  RATE_LIMIT_ENABLED: { label: "Request counting", description: "Counts each player’s requests and logs what a limit would refuse. Refuses nothing." },
  SHOPPING_MARK_BOUGHT_ENABLED: { label: "Mark bought", description: "Mark a shopping line bought and add it to the collection." },
  SOCIAL_FRIENDS_ENABLED: { label: "Friends", description: "Friends, invites and pods. Opponents needs it." },
  SOCIAL_GAMES_ENABLED: { label: "Opponents", description: "Opponents in the game log." },
  SOCIAL_WISHLIST_ENABLED: { label: "Wishlist", description: "Cards wanted outside any deck." },
  STAND_IN_LABELS_ENABLED: { label: "Stand-in labels", description: "Stand-in labels where a card has none yet." },
  SWAP_TOOLS_ENABLED: { label: "Swap tools", description: "Swaps, stand-ins and Find a deck for it. Find a deck read needs it." },
  TUNING_ENABLED: { label: "Suggested changes", description: "Suggested changes for a deck." },
};
