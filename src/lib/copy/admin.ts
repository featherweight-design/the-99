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
import { numberWord } from "./number-words";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** A sentence ending on a name: a masked name already ends in its initial's period (`Colin R.`), so it takes no second. */
const endOn = (name: string) => (name.endsWith(".") ? name : `${name}.`);

/** Admin R3, D14: a masked name is all a search field can match, so every account search says so. */
const FIND_BY_NAME = "Find an account by name";

export const adminCopy = {
  door: { label: "Admin" },
  eyebrow: "Admin",
  tabs: { costs: "Costs", switches: "Feature flags", groups: "Groups", accounts: "Accounts", models: "Models", invites: "Invites", payments: "Payments" },
  tabsLabel: "Admin pages",

  payments: {
    sub: "What players paid, by UTC month, beside what the model features cost. Grant credits gives an account a gift that never expires.",
    tiles: { gross: "Paid", tax: "Tax", net: "Net", spend: "Model spend" },
    tileSub: {
      payments: (n: number) => plural(n, "payment", "payments"),
      unattributed: (n: number) => `${n} unattributed`,
      refunded: (amount: string) => `${amount} refunded`,
      tax: "collected by Stripe Tax",
      net: "paid less tax and refunds",
      spend: "this environment, as Costs reads it",
    },
    noPayments: "No payments this month.",
    otherCurrency: (code: string) => `In ${code.toUpperCase()}`,
    grantsHead: "Credits granted",
    grantsMeta: (shown: number, total: number) => (shown < total ? `newest ${shown} of ${total}` : plural(total, "lot", "lots")),
    grantsCols: { account: "Account", source: "Source", units: "Credits", when: "When" },
    sources: { plan: "Plan", pack: "Pack", gift: "Gift" },
    revoked: (n: number) => `${n} taken back`,
    noGrants: "No credits granted this month.",
    giftsHead: "Gifts",
    giftLine: (who: string, whom: string, units: number) => `${who} gave ${whom} ${plural(units, "credit", "credits")}`,
    noGifts: "No gifts this month.",
    disputesHead: "Disputes",
    disputesMeta: "open ones, and any opened or closed this month",
    disputeStatus: { open: "Open", won: "Won", lost: "Lost" },
    // The payment's own total: a dispute's amount is not stored (K2), and can be less than the payment.
    disputeLine: (whom: string, amount: string) => `${whom} disputed a ${amount} payment`,
    disputeMeta: (status: string, units: number, opened: string, closed: string | null) =>
      `${status} · ${plural(units, "credit", "credits")} taken back · opened ${opened}${closed ? ` · closed ${closed}` : ""}`,
    purgedAccount: "A deleted account",
    noDisputes: "No disputes.",
    blockedHead: "Buying paused",
    blockedMeta: "a dispute paused these accounts' buying; credits they hold still spend",
    blockedLine: (whom: string, since: string) => `${whom} · since ${since}`,
    noBlocked: "No account has buying paused.",
    clear: {
      press: "Let them buy",
      pending: (whom: string, open: number) =>
        open > 0
          ? `Saving lets ${whom} buy again. ${plural(open, "dispute is", "disputes are")} still open: a new dispute, or one of these lost, pauses buying again.`
          : `Saving lets ${whom} buy again.`,
      confirm: "Let them buy",
      done: (whom: string) => `${whom} can buy again.`,
      already: (whom: string) => `${whom} could already buy.`,
      failed: "Couldn't clear the pause, so nothing changed. Try again.",
      lost: "Lost touch with the server, so it may have cleared. Reload before pressing again.",
    },
    form: {
      head: "Grant credits",
      account: "Account",
      accountHelp: "Masked as Accounts lists them.",
      find: FIND_BY_NAME,
      noMatch: "No account matches.",
      clerkDown: "Clerk could not be read, so accounts show by id.",
      units: "Credits",
      unitsHelp: (max: number) => `A whole number from 1 to ${max}. A gift never expires.`,
      note: "Why",
      noteHelp: "Required. Shown in Gifts below.",
      pending: (units: number, whom: string) => `Saving gives ${whom} ${plural(units, "credit", "credits")}, spent after plan credits and before packs.`,
      undo: "Undo",
      press: "Grant",
      done: (units: number, whom: string) => `Gave ${whom} ${plural(units, "credit", "credits")}.`,
      errors: {
        account: "Pick an account.",
        units: "Enter a whole number from 1 to 500.",
        note: "Say why, in 500 characters or fewer.",
        action: "That grant was already made for another account. Reload the page and try again.",
        unknown: "This environment's Clerk does not know that account.",
        deleted: "That account was deleted.",
        failed: "Couldn't grant the credits, so nothing changed. Try again.",
        lost: "Lost touch with the server, so it may have saved. Check Gifts before granting again.",
      },
    },
  },

  costs: {
    title: "Costs",
    sub: "What the model features cost, read from model_calls, card_label_batches and the committed eval ledgers. Read only, except the caps recorded here.",
    period: {
      previous: "Previous month",
      next: "Next month",
      range: (last: number, mon: string, day: number | null, days: number) =>
        `${mon} 1 to ${last} · UTC${day === null ? "" : ` · day ${day} of ${days}`}`,
      compare: (month: string, figure: string, runs: number) =>
        runs === 0 ? `${month}: no model calls.` : `${month}: ${figure} in ${plural(runs, "run", "runs")}.`,
    },
    tiles: { calls: "Model calls", player: "Player runs", system: "System", perAccount: "Per active account" },
    tileSub: {
      runs: (runs: number) => plural(runs, "run", "runs"),
      pace: (v: string) => `on pace for ${v}`,
      ofCeiling: (pct: number, cap: string) => `${pct}% of the ${cap} ceiling`,
      ofCeilingAtLeast: (pct: number, cap: string) => `at least ${pct}% of the ${cap} ceiling`,
      system: "labels, rewrites and prose",
      accounts: (n: number) => (n === 0 ? "no accounts with runs" : `${plural(n, "account", "accounts")} with runs`),
    },
    caps: "Against the caps",
    capsMeta: "set in code and read only, except the rows recorded here",
    capsReference: "The system ceiling and the Anthropic caps are reference lines. None of them blocks a call.",
    // `here` names a figure typed in on this page, not read from code; `anthropic`, one read from
    // Anthropic's cost report. Owed to /copy-review.
    capSource: { code: "in code", here: "recorded here", anthropic: "from Anthropic" },
    capRows: { owner: "Owner testing share", ceiling: "System ceiling", workspace: "The 99 workspace cap", org: "Anthropic org cap" },
    of: (figure: string, cap: string) => `${figure} of ${cap}`,
    notSet: (figure: string) => `${figure} · not set`,
    capSub: {
      owner: "MODEL_OWNER_MONTHLY_USD, or OWNER_SHARE_USD in spend-rule.ts when it is unset.",
      noOwner: "MODEL_OWNER_USER_ID is not set, so no account has a share.",
      ceiling: "System rows in model_calls and card label batches. Evals are not counted.",
      noCeiling: "No ceiling is set.",
      startsIn: (month: string) => `Starts ${month}.`,
      workspace: "Mirrors Anthropic’s console. This environment’s ledger, then elsewhere hatched.",
      elsewhere: (v: string) => ` Elsewhere ${v}: the other environment and anything else on this workspace.`,
      ledgerAhead:
        " This environment’s ledger reads more than the workspace bill, so elsewhere reads $0. Spend from before a key moved to this workspace stays billed where it ran.",
      org: (here: string, others: string) => `The 99 ${here}, other workspaces ${others} hatched, the default workspace included.`,
      // The org is read with the workspace, whose row already gives the reason (copy-reviewed: keep).
      orgUnread: "Read with the workspace above, so not read either.",
    },
    orgUnread: "not read",
    /** `time` is `14:05 UTC`, or `Oct 17, 14:05 UTC` when not today. */
    asOf: (time: string) => ` Read from Anthropic at ${time}, about five minutes behind.`,
    workspaceUnread: (figure: string) => `${figure} here · workspace not read`,
    // Why the workspace was not read, one per `CostUnread` kind. No upstream text ever reaches these.
    unread: {
      no_key: "ANTHROPIC_ADMIN_KEY is not set here, so the workspace is not read.",
      refused: "Anthropic refused the admin key.",
      rejected: "Anthropic refused the request for this month.",
      upstream: "Anthropic’s cost report did not answer. A load a minute from now tries again.",
      shape: "Anthropic’s cost report came back in a shape this page does not read.",
      no_workspace: (name: string) => `No Anthropic workspace is named ${name}.`,
      ambiguous: (n: number, name: string) => `${n} Anthropic workspaces are named ${name}, so none is read.`,
    },
    note: (text: string) => `Note: ${text}`,
    changeCap: "Change the cap",
    changeOrgCap: "Change the org cap",
    // The keys billed to The 99 (PR 2).
    keys: {
      title: "Keys on The 99",
      meta: "name and hint only",
      none: "No keys on this workspace.",
      unread: "The key list was not read.",
      status: { active: "active", archived: "archived", expired: "expired", inactive: "inactive" },
    },
    changeCeiling: "Change the ceiling",
    trendPlayer: "Player runs, month to date",
    trendNote: "Free rewrites are system spend and not in this line.",
    trend: {
      scale: (v: string) => `${v} scale`,
      soFar: "so far",
      onPace: "on this pace",
      today: (v: string) => `${v} today`,
      byEnd: (v: string, day: number, mon: string) => `${v} by ${mon} ${day}`,
      byDay: (v: string) => `By day · tallest ${v}`,
      label: (month: string, v: string, pace: string | null) =>
        `Player runs in ${month}: ${v}${pace === null ? "." : `, on pace for ${pace} by month end.`}`,
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
    series: { player: "Player runs", labels: "Card labels", rewrites: "Free rewrites and prose" },
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
      suggested_changes_v2: "Suggested changes v2",
      labels: "Card labels",
      prose: "Commander prose",
      precon_overview: "Precon Overviews",
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
    refundLine: "the player got the credit back, and the cost still counts",
    refundsBody: (n: number, line: string) => `${n === 1 ? "One run was" : `${n} runs were`} refunded: ${line}.`,
    refundFeature: (name: string, runs: number, v: string) => `${name} ${plural(runs, "run", "runs")}, ${v}.`,
    noRefunds: "No runs were refunded.",
    reserved: "Reserved against spent",
    reservedMeta: "the worst case a run is held at, against its mean",
    reservedOnly: (v: string) => `${v} reserved`,
    reservedShare: (pct: string) => `${pct}% of the reservation`,
    noPress: "no run yet",
    noCostYet: (runs: number) => `${plural(runs, "run", "runs")}, none priced yet`,
    perAccount: "Per account",
    perAccountMeta: (n: number) => `${plural(n, "account", "accounts")} with runs`,
    accountHead: { account: "Account", presses: "Runs", credits: "Credits used", spent: "Spent" },
    playersRow: "Players",
    accountMeta: (presses: number, credits: number) => `${plural(presses, "run", "runs")} · ${plural(credits, "credit", "credits")} used`,
    noPresses: (month: string) => `No runs in ${month}.`,
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
    ledgersUnreadable: (names: string) => `Couldn’t read ${names}, so the eval figures leave that out.`,
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
    starts: "Starts",
    note: "Note (optional)",
    save: "Save",
    cancel: "Cancel",
    badAmount: "Enter dollars, like 18.40.",
    badMonth: "Pick this month or a later one.",
    badNote: "Keep the note to 500 characters.",
    unknown: "The page lost touch with the server, so it may have saved. Check the figure above before saving again.",
    saveFailed: "Didn’t save. Nothing changed.",
  },

  // The Groups pages (admin STATES G1 to G7; design table, Groups), from the handoff's `groups` keys.
  // `pendingMove` is rebuilt without a pronoun as `pending.*`; the pending bar's title and its field
  // lines, Daily credits, the history lines, the empty and refusal lines and the confirm's lead are
  // new here and owed to /copy-review.
  groups: {
    title: "Groups",
    sub: "Named sets of accounts that share overrides. One group per account.",
    headMeta: (n: number, none: number) => `${plural(n, "account", "accounts")} · ${none} in no group`,
    count: (n: number) => plural(n, "group", "groups"),
    back: "‹ Groups",
    newTitle: "New group",
    movesFrom: (g: string) => `moves from ${g}`,
    inGroup: (g: string) => `in ${g}`,
    /** A member row for an account in no group (Admin R3 boards, C2). */
    inNoGroup: "no group",
    newGroup: "New group",
    edit: "Edit",
    create: "Create",
    save: "Save",
    undo: "Undo",
    members: (n: number) => plural(n, "member", "members"),
    noMembers: "No members.",
    name: "Name",
    nameHint: "lowercase, no spaces",
    description: "Description",
    descriptionHint: "only you read this",
    credits: "Daily credits",
    creditsHelp: "Members get this many credits in a rolling 24 hours. Empty means the default.",
    paidLimit: "Daily paid runs",
    paidLimitHelp: (n: number) => `How many runs a member’s paid and welcome credits can fund in a rolling 24 hours. Empty means ${n}.`,
    membersHead: "Members",
    selectedCount: (n: number, unsaved: number) => `${n} selected${unsaved ? `, ${unsaved} not saved` : ""}`,
    selected: "selected",
    unselected: "unselected",
    selectedUnsaved: "selected, not saved",
    find: FIND_BY_NAME,
    noMatch: "No account matches.",
    carries: "Overrides this group carries",
    carriesNone: "This group carries no overrides.",
    openSwitch: "Open the flag ›",
    none: "No groups yet.",
    historyHead: "History",
    historyFoot: "Times are UTC.",
    noHistory: "No changes yet.",
    thisGroup: "this group",
    pending: {
      one: (who: string, selected: boolean) => `${who} ${selected ? "selected" : "unselected"}, not saved`,
      many: (n: number) => `${n} changes not saved`,
      fields: "Not saved",
      rename: (from: string, to: string) => `Saving renames ${from} to ${to}.`,
      create: (name: string) => `Saving creates ${name}.`,
      describe: "Saving changes the description.",
      credits: (n: number | null) => (n === null ? "Saving sets daily credits back to the default." : `Saving sets daily credits to ${n}.`),
      paidLimit: (n: number | null) => (n === null ? "Saving sets daily paid runs back to the default." : `Saving sets daily paid runs to ${n}.`),
      move: (who: string, from: string, to: string) => `${who} moves from ${from} to ${to}`,
      add: (who: string, to: string) => `Saving adds ${who} to ${to}`,
      remove: (who: string, from: string) => `Saving removes ${who} from ${from}`,
      // `who` is empty after a move, whose sentence already names the account.
      gains: (who: string, gains: string, loses: string) =>
        `, and ${who ? `${who} ` : ""}${gains ? `gains ${gains}` : ""}${gains && loses ? " and " : ""}${loses ? `loses ${loses}` : ""}.`,
      nothing: (who: string) => `. Nothing changes for ${endOn(who)}`,
    },
    errors: {
      nameRule: "Use lowercase letters, digits, - or _, up to 40 characters, starting with a letter or digit.",
      name: "Another group has that name.",
      description: "Keep the description to 500 characters.",
      allowance: "Enter a whole number from 1 to 1000, or leave it empty.",
      members: "An account in the list isn’t on this environment. Reload the page and try again.",
      group: "This group no longer exists. Reload the page.",
      unknown: "Lost touch with the server, so it may have saved. Check the page before saving again.",
    },
    history: {
      created: (who: string, name: string) => `${who} created ${name}`,
      renamed: (who: string, from: string, to: string) => `${who} renamed ${from} to ${to}`,
      described: (who: string, to: string | null) => (to === null ? `${who} cleared the description` : `${who} set the description to “${to}”`),
      credits: (who: string, from: string, to: string) => `${who} set daily credits: ${from} → ${to}`,
      paidLimit: (who: string, from: string, to: string) => `${who} set daily paid runs: ${from} → ${to}`,
      creditsDefault: "default",
      added: (who: string, account: string) => `${who} added ${account}`,
      removed: (who: string, account: string) => `${who} removed ${account}`,
      overrideSet: (who: string, label: string, from: string, to: string) => `${who} set ${label}: ${from} → ${to}`,
      overrideCleared: (who: string, label: string, from: string) => `${who} cleared ${label} (was ${from})`,
    },
    confirmLead: (g: string) => `Saving changes who is in ${g}, and so which overrides apply to them.`,
    /** Delete a group (small items 9, item 7; `Groups-Delete` D1 to D8). Only an empty group can go. */
    delete: {
      action: "Delete this group",
      hint: "Only an empty group can go: no members, no live flyer codes.",
      refusedMembers: (n: number) =>
        `It still has ${plural(n, "member", "members")}. Unselect ${n === 1 ? "that member" : "them"} above and save, then delete it.`,
      // Only a live code blocks (READINESS, closed with the approval, 4): a revoked code loses its group instead.
      refusedCode: (code: string) => `It has the live flyer code ${code}. Revoke it on Invites first.`,
      refusedBoth: (n: number, code: string) =>
        `It still has ${plural(n, "member", "members")} and the live flyer code ${code}. Only an empty group can go: no members, no live flyer codes.`,
      codesLink: "Flyer codes ›",
      title: (g: string) => `Delete ${g}?`,
      lead: (n: number) =>
        `It’s empty, so deleting it changes nothing for any account. ${
          n === 0
            ? "It has no feature-flag settings"
            : n === 1
              ? "Its one feature-flag setting is removed with it"
              : `Its ${numberWord(n)} feature-flag settings are removed with it`
        }, and the name is free to use again.`,
      facts: { members: "Members", codes: "Flyer codes", overrides: "Overrides", history: "History" },
      none: "None.",
      /** The group's revoked codes, already joined (`MOXB7K and K2P9QX`): they stay on Invites with no group. */
      codesRevoked: (list: string, n: number) => `${list}, revoked. ${n === 1 ? "It stays" : "They stay"} on Invites with no group.`,
      /** The overrides, already joined, each a flag's label and value (`Overview v2 on and Suggested changes v2 on`). */
      overridesGo: (list: string, n: number) => (n === 1 ? `${list} goes with it. It reaches nobody now.` : `${list} go with it. They reach nobody now.`),
      historyFact: "Kept in the admin log, under the group’s name.",
      keep: "Keep it",
      confirm: "Delete the group",
      raced: (g: string) => `${g} isn’t empty now. Nothing was deleted.`,
      failed: "Couldn’t delete the group. Nothing was deleted.",
      lost: "Lost touch with the server, so the group may be gone. Reload the page before pressing again.",
      toast: (g: string) => `Deleted ${g}.`,
      toastDismiss: "Dismiss",
    },
  },

  // The Accounts pages (admin STATES A1 to A7, plan 9b), from the handoff's `accounts` keys. The
  // handoff's role lines spelled 10 and 5 credits and a $5 share; these take the account's own limit
  // and the share the allowance enforces. The column heads, the move's controls and errors, the tile
  // subs and the reset time's `UTC` are new here and owed to /copy-review. `clerkDown` is also what
  // the Switches list says when the account list is the stored ids (STATES A3).
  accounts: {
    title: "Accounts",
    sub: (n: number, env: string) => `${plural(n, "account", "accounts")} on ${env}. Names and emails are masked; Show reveals one account and logs it.`,
    search: FIND_BY_NAME,
    noMatch: (q: string) => `No account matches ${q}.`,
    clerkDown: "Names didn’t load from Clerk.",
    back: "‹ Accounts",
    cols: { account: "Account", group: "Group", credits: "Credits now" },
    noGroup: "No group",
    role: {
      owner: (credits: number, share: string) => `Owner. ${plural(credits, "credit", "credits")} a day, and a ${share} testing share each month.`,
      other: (credits: number) => `${plural(credits, "credit", "credits")} a day.`,
    },
    tiles: { credits: "Credits now", spent: (m: string) => `Spent in ${m}`, presses: "Runs", hub: "Tuning hub" },
    creditsLeft: (left: number, limit: number) => `${left} of ${limit} left`,
    /** A list row's credits, under the `Credits now` head (Admin R3 boards, A1). */
    creditsRow: (left: number, limit: number) => `${left} of ${limit}`,
    resetAt: (time: string) => `reset at ${time} UTC`,
    ownerShare: (pct: number, share: string) => `${pct}% of the ${share} testing share`,
    hub: { drawn: "Drawn", notDrawn: "Not drawn", tools: (n: number) => `${n} of its tools on` },
    switchGroups: { override: "Set by an override", rule: "Off by a rule", env: "From the environment" },
    // Owed to /copy-review.
    allFeatures: {
      title: "All features",
      body: "Every feature flag on for this account, those added later included. An Off set on one flag here still wins, and so does an env var set to off.",
    },
    envList: { on: (n: number) => `On · ${n}`, off: (n: number) => `Off · ${n}` },
    group: "Group",
    changeGroup: "Change group",
    pickGroup: "Move to",
    save: "Save",
    cancel: "Cancel",
    spendByFeature: "Spend by feature",
    spendMeta: (m: string) => `${m} so far`,
    featureCols: { feature: "Feature", presses: "Runs", spent: "Spent" },
    total: "Total",
    pressesCell: (n: number) => plural(n, "run", "runs"),
    errors: {
      account: "This account isn’t on this environment. Reload the page.",
    },
  },

  // Invites in the admin (plan `2026-10-16-invites.md` PR 6; handoff `invites · copy strings.ts`, `admin`): the
  // Accounts list's two columns (M1), an account's tile and section (M2) and a group's top-up (M3). The handoff's
  // strings, exact; keys it did not write are marked. Every key is owed to /copy-review with the admin's other new lines.
  invites: {
    /** M1's column heads. (new, for /copy-review) */
    colInvites: "Invites",
    colInvitedBy: "Invited by",
    /** An account no invite brought in: from before launch. (new, for /copy-review) */
    founder: "founder",
    /** A flyer sign-up: the store label Hugh gave the code, then the code. */
    flyer: (label: string, code: string) => `${label} · ${code}`,
    /** The phone row's meta pieces (Admin-Phone M1): `5 invites`, `by Hugh`. (new, for /copy-review) */
    phoneInvites: " invites",
    phoneBy: (name: string) => `by ${name}`,
    /** M2's fifth tile. (new, for /copy-review) */
    tile: "Invites",
    tileSub: (waiting: number, spent: number) => `${waiting} waiting · ${spent} spent`,
    /** M2's section. (new, for /copy-review) */
    section: "Invites",
    field: "Invites left",
    fieldHelp: (name: string) => `How many ${name} holds now. Only a new account spends one, and nothing but this field refills it.`,
    /** What Save will do; the waiting ones stay waiting on top of what is set. (new, for /copy-review) */
    pendingSet: (name: string, from: number, to: number, waiting: number) =>
      `Saving sets ${name}’s invites from ${from} to ${to}.` +
      (waiting === 0 ? "" : waiting === 1 ? " The one waiting stays waiting." : ` The ${waiting} waiting stay waiting.`),
    /** A draft that is not a whole number from 0 to 1,000 (`INVITES_MAX`). (new, for /copy-review) */
    invalid: "Enter a whole number from 0 to 1,000.",
    /** M2's lines: who invited this account, whom it invited, and each invite still waiting. (new, for /copy-review) */
    invitedBy: "Invited by",
    invited: "Invited",
    joined: (day: string) => `joined ${day}`,
    waiting: (how: string, email: string) => `Waiting · ${how} · ${email}`,
    /** The phone's waiting line, which drops how it was sent. (new, for /copy-review) */
    waitingPhone: "Waiting · ",
    byEmail: "by email",
    inPerson: "in person",
    sentReturns: (sent: string, returns: string) => `sent ${sent} · returns ${returns}`,
    revoke: "Revoke",
    open: "Open ›",
    /** An invite edge whose account was deleted. (new, for /copy-review) */
    deleted: "deleted account",
    /** M4, the Invites tab: the tree of who invited whom (handoff `admin.sub`, `treeRoot`, `nodeMeta`). */
    tree: {
      sub: "Who invited whom. Founders are the accounts from before launch; a waiting invite can be revoked here.",
      root: "Founders · accounts from before launch",
      /** The phone's root label. (new, for /copy-review) */
      rootPhone: "Founders",
      label: "Who invited whom",
      nodeMeta: (left: number, invited: number) => `${left} left · invited ${invited}`,
      joined: (day: string) => `joined ${day}`,
      owner: "owner",
      returns: (day: string) => `returns ${day}`,
      /** The phone's waiting leaf, its first line, and the name of a phone row's press. (new, for /copy-review) */
      waitingHow: (how: string) => `Waiting · ${how}`,
      openAccount: (name: string) => `Open ${name}`,
      /** The desktop toolbar's search and its three counts. (new, for /copy-review) */
      search: FIND_BY_NAME,
      accounts: (n: number) => `${n} ${n === 1 ? "account" : "accounts"}`,
      invited: (n: number) => `${n} invited`,
      waiting: (n: number) => `${n} waiting`,
      noMatch: (q: string) => `No account matches “${q}”.`,
      /** A search carried down to the phone, where the field is not drawn, and its way back. (new, for /copy-review) */
      filtered: (q: string) => `Showing accounts matching “${q}”.`,
      clear: "Clear search",
      /** The tree with no account at all (Clerk down and nothing stored). (new, for /copy-review) */
      empty: "No accounts yet.",
    },
    /** M3, a group's top-up. (new, for /copy-review) */
    groupSection: "Top up invites",
    groupField: "Top up each member to",
    groupHelp: "Raises every member holding fewer to this many. Nobody is lowered, and the group keeps no count: a member who joins later gets nothing until the next top-up.",
    /** The phone's shorter help line. (new, for /copy-review) */
    groupHelpPhone: "Raises every member holding fewer. Nobody is lowered.",
    /** What Top up will do: who rises, with what they hold now, and how many already hold that many. (new, for /copy-review) */
    groupPending: (raised: number, of: number, n: number, who: string, held: number) =>
      raised === 0
        ? `Nobody holds fewer than ${n}: topping up changes nothing.`
        : `Topping up raises ${raised} of ${of} members to ${n} invites left: ${who}.` +
          (held === 0 ? "" : held === 1 ? ` 1 already holds ${n}.` : ` ${held} already hold ${n}.`),
    topUp: "Top up",
    /** History lines, on an account's page and a group's. (new, for /copy-review) */
    history: {
      set: (who: string, name: string, from: string, to: string) => `${who} set ${name}’s invites: ${from} → ${to}`,
      topUp: (who: string, group: string, n: string, raised: string) => `${who} topped up ${group} to ${n}: ${raised} raised`,
      revoked: (who: string, name: string) => `${who} revoked a waiting invite of ${name}’s`,
      joined: (name: string, inviter: string) => `${name} joined on ${inviter}’s invite`,
      sent: (name: string) => `${name} sent an invitation: 1 waiting`,
    },
  },

  // The Models page (admin STATES M1, M2), from the handoff's `models` keys. The column heads, the
  // section head `Features and jobs` and its meta, and the footnote are the canvas's own (`models`
  // scene in `Admin R2.dc.html`).
  models: {
    title: "Models",
    sub: "Which feature or job calls which model, at which effort, and where the constant lives. A model change shows here first.",
    features: "Features and jobs",
    featuresMeta: (month: string, env: string) => `${month} so far, ${env}`,
    cols: { feature: "Feature or job", origin: "Origin", model: "Model", effort: "Effort", at: "Where it lives" },
    rows: {
      overview8: "Overview, contract 8",
      overview7: "Overview, contract 7",
      tuning: "Suggested changes",
      cuts: "Proposed cuts",
      shortlist: "Help me choose, shortlist",
      judgement: "Help me choose, judgement",
      fitsRead: "Find a deck read",
      labels: "Card labels",
      prose: "Commander prose",
      preconOverview: "Precon Overviews",
    },
    origin: { player: "player", system: "system" },
    batch: (model: string) => `${model}, Batch`,
    noEffort: "none set",
    partial: (figure: string) => `${figure} so far`,
    featuresFoot: "Overview’s free rewrite runs on the contract-8 model as system. Mana Balance makes no model call. Evals call whatever model they test and are under Costs, by ledger.",
    jobs: "Job flags",
    jobsMeta: "GitHub repository variables · read only",
    jobCols: { variable: "Variable", value: "Value", readAt: "Read at" },
    unset: "not set",
    jobsFoot: "Change these in the repository’s variables on GitHub. The admin only reads them.",
    noToken: "Values need a GitHub token; names and locations are from the repo.",
  },

  // The Switches list (admin STATES L1 to L6), from the handoff's `switches` keys. The Overrides
  // cell, the App-wide cell and the phone's meta line take the canvas's own shapes (`flagRow` in
  // `Admin R2.dc.html`).
  switches: {
    title: "Feature flags",
    sub: "Env var first, then overrides: account beats group beats app-wide. Changes land within 30 seconds.",
    search: "Search by name or variable",
    chips: { all: "All", overridden: "Overridden", offForAnyone: "Off for anyone", model: "Model features" },
    chipsLabel: "Show",
    heads: { features: "Features", plumbing: "Plumbing", plumbingNote: "app-wide only, not features a friend tries" },
    cols: { name: "Flag", env: "Env var", app: "App-wide", overrides: "Overrides", resolved: "Resolved" },
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
    back: "‹ Feature flags",
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
    // The writes (admin plan 8c; STATES F3, F5, F7 to F12), from the handoff's `switch` keys. The
    // pending row's prompt, the account and group lookups and a refusal's line are new here and owed
    // to /copy-review.
    appOpts: { notSet: "Not set", on: "On", off: "Off" },
    rowLabel: (title: string) => `Override for ${title}`,
    addGroup: "Add a group override",
    addAccount: "Add an account override",
    clear: "Clear",
    cancelAdd: "Cancel",
    noteField: "Note (optional)",
    pendingHint: "Press On or Off to save.",
    accountSearch: FIND_BY_NAME,
    accountNoMatch: "No account matches.",
    groupSearch: "Search groups",
    groupNoMatch: "No group matches.",
    groupsNone: "No groups yet.",
    already: "already set",
    saveFailed: "Didn’t save. Nothing changed.",
    tryAgain: "Try again",
    refusal: "The server refused that change. Reload the page and try again.",
    clerkDownRefusal: "Accounts didn’t load from Clerk, so who this turns a model feature on for can’t be counted. Nothing changed; try again once Clerk answers.",
    whatsNewInline: "Members see it in What’s new on their next visit.",
    sources: {
      kill: "env var is off",
      account: "account override",
      all: "All features",
      group: (name: string) => `group ${name}`,
      app: "app-wide override",
      env: "from the env var",
      parent: (parent: string) => `${parent} is off`,
    },
  },

  // The model confirm (admin STATES F3; design table, Confirm), from the handoff's `confirmModel`
  // keys. The handoff wrote one lead; one per write, the mean line, a cost line per capability and the
  // rolling-24-hours credits sentence are new here and owed to /copy-review (plan §Copy, items 6, 7).
  confirmModel: {
    title: (name: string, n: number) => `Turn ${name} on for ${n} more account${n === 1 ? "" : "s"}?`,
    lead: {
      app: { set: "Turning app-wide on reaches every account without an override of its own.", clear: "Clearing app-wide off falls back to the env var (true)." },
      group: { set: (g: string) => `Turning ${g} on reaches its members without an account override.`, clear: (g: string) => `Clearing ${g} falls its members back to app-wide or the env var.` },
      user: { set: "Turning this account on lets it spend credits.", clear: "Clearing this account falls it back to its group, app-wide or the env var." },
    },
    spends: (features: string) => `It turns on ${features}, which spends money.`,
    facts: { who: "Who", cost: "Cost", whatsNew: "What’s new", when: "When" },
    cost: (feature: string, reserve: string) => `${feature}: each run reserves up to ${reserve}.`,
    mean: (mean: string) => `Priced runs so far average ${mean}.`,
    noMean: "No run has been priced yet, so there is no mean to go on.",
    credits: (limits: string) => `Each run uses one of the account’s ${limits} credits in a rolling 24 hours.`,
    whatsNew: (n: number, name: string) => `The ${n} account${n === 1 ? "" : "s"} see ${name} in About’s line on Home on their next visit.`,
    noWhatsNew: "No What’s new entry changes.",
    when: "Within 30 seconds, on every server.",
    note: "Note (optional)",
    confirm: (n: number) => `Turn on for ${n}`,
    cancel: "Cancel",
    capability: { synopsis: "Overview", overview_v2: "Overview v2", tuning: "Suggested changes", proposed_cuts: "Proposed cuts", intake: "Help me choose", fits_read: "Find a deck read", suggested_changes_v2: "Suggested changes v2" },
  },
} as const;

/**
 * Admin R3, masking personal data (handoff `design_handoff_the99_admin/README-R3.md`). Names in these strings are
 * always the masked name (D1). Placeholder wording from the handoff, through /copy-review as each PR lands it.
 */
export const adminMaskCopy = {
  /** D1: an account Clerk holds no name or username for. */
  noName: (idTail: string) => `Account ·${idTail}`,
  findByName: FIND_BY_NAME,
  /** The Accounts list's one field: a name filters, a whole email looks up (D10 to D13). */
  accounts: {
    search: "Name, or a whole email",
    /** D10: an `@` typed, not yet submitted. */
    enterToLookUp: "Press Enter to look up this exact email.",
    hit: "One account holds this email.",
    miss: "No account holds this email.",
    /** D13, the toast. */
    lookUpFailed: "Couldn’t look up that email.",
  },
  /** Show and its reveal (D5 to D8, D13), from the handoff's `reveal` block. */
  reveal: {
    show: "Show",
    hide: "Hide",
    /** D6: under a revealed account. */
    shown: (time: string) => `Shown and logged · hides at ${time} UTC`,
    /** D13, the toast when a Show fails. */
    failed: (name: string) => `Couldn’t show ${endOn(name)} Nothing was shown.`,
    tryAgain: "Try again",
    /** D8: the account page's History line. */
    history: (who: string, name: string) => `${who} showed ${name}’s name and email`,
  },
} as const;

/**
 * The Flyer codes section on the Invites tab and the tree's flyer node (flyer trial R1b, boards Admin-Desktop and
 * Admin-Phone). Frozen to the handoff's `flyer-trial · copy strings.ts`; admin-only, so out of /copy-review's scope.
 * The form, the revoke dialog and the print bar are drawn by later PRs and wait here.
 */
export const flyerAdminCopy = {
  section: "Flyer codes",
  meta: (live: number, left: number, listed: number) => `${live} live · from your invites, ${left} left · ${listed} on the launch list`,
  /** The meta with no code made yet (No-Codes.dc.html): the live and launch-list counts have nothing to say. */
  metaNone: (left: number) => `none yet · from your invites, ${left} left`,
  /** The muted line in the empty section's card (READINESS item 3: one sentence, a colon). */
  empty: "No flyer codes yet: make one for a store, then print its flyer.",
  newCode: "New flyer code",
  cols: { store: "Store", code: "Code", signups: "Sign-ups", group: "Group", made: "Made" },
  used: (n: number, capacity: number) => `${n} of ${capacity}`,
  full: "full",
  print: "Print",
  revoke: "Revoke",
  close: "Close",
  revokedOn: (day: string) => `revoked ${day}`,
  store: "Store",
  storeHelp: "Printed on nothing. Only you read it.",
  group: "Group",
  groupNew: (name: string) => `New group: ${name}`,
  groupHelp: "Its sign-ups and the people they invite join it.",
  facts: ["50 sign-ups", "3 free runs a day", "15 welcome credits", "3 invites each", "ends at launch"],
  spends: "Each sign-up spends one of your invites.",
  make: "Make code",
  cancel: "Cancel",
  revokeTitle: (store: string) => `Revoke ${store}’s code?`,
  revokeBody: (code: string, n: number) =>
    `People can no longer join with ${code}. The ${n} who joined keep their accounts, their group and their invites. Printed flyers will say it no longer works.`,
  keep: "Keep it",
  revokeConfirm: "Revoke code",
  treeNode: (store: string) => `Flyer · ${store}`,
  noFriendLink: "no friend link to Hugh",
  launchList: (n: number) => `Launch list · ${n}`,
  launchListMeta: "emails left on used-up and ended flyers",
  /** The launch card's meta with no address on it (No-Codes.dc.html). */
  launchListNone: "no emails yet · a used-up or ended flyer asks for one",
  /** The revoke dialog's alert (Revoke-Failed.dc.html; READINESS' tightened lost-reply line). A refusal wrote nothing. */
  revokeRefused: "Couldn’t revoke the code, so nothing changed. Try again.",
  /** A lost reply may have saved, so it points at the list the dialog refreshes. */
  revokeLost: "Lost the connection, so the code may be revoked. Check the list before trying again.",
  /** The print page's bar for a revoked code (Print-Revoked.dc.html V1/V2): no Print, no Download QR. */
  printRevoked: (day: string) => `Revoked ${day}. This code no longer signs anyone up, so there’s nothing to print.`,
  csv: "Download CSV",
  /** Download CSV's failure lines (small items 9, CSV-Failed.dc.html F1 to F7). DRAFT, owed to /copy-review. */
  csvFailed: "The server refused the download. Reload the page and try again.",
  csvOff: "The flyer trial is off now, so there’s nothing to download. Reload to see the page as it is.",
  /** A lost reply saved nothing, so pressing again is safe. */
  csvLost: "Lost touch with the server, so nothing downloaded.",
  csvRetry: "Try again",
  /** The launch card's second row (Launch-Date.dc.html; draft help line from the handoff). */
  launchDate: "Launch date",
  launchDateHelp: "Optional. Leave it blank until the date is firm.",
  launchDateSave: "Save",
  launchDateSaved: "Saved",
  launchDateClear: "Clear",
  launchDateCleared: "Cleared",
  printBar: "Letter · black ink on coloured paper · the toolbar doesn’t print",
  downloadQr: "Download QR",
} as const;

/**
 * Each switch's name and one plain line (admin STATES L1; READINESS G9). The canvas drew 21 of them
 * (`n:` and `d:` in `Admin R2.dc.html`); the rest, and the canvas lines the code has since moved
 * past, are new here and owed to /copy-review. A parent's line names what needs it; a child's tag
 * already does.
 */
export const switchCopy: Readonly<Record<SwitchName, { label: string; description: string }>> = {
  ANALYSIS_TAB_ENABLED: { label: "Analysis tab", description: "The Analysis tab on a deck. Two flags need it." },
  FEEDBACK_ENABLED: { label: "Feedback", description: "Report a problem, the check-in on Home and the Feedback tab here." },
  FLYER_TRIAL_ENABLED: { label: "Flyer trial", description: "Gates the /join/<CODE> flyer sign-ups and the Flyer codes section on /admin/invites. Off retires every code." },
  ANNOUNCEMENTS_ENABLED: { label: "Announcements", description: "Wizards announcements on Home, in Settings and as pushes. No surface yet." },
  HELP_ME_CHOOSE_ENABLED: { label: "Help me choose", description: "Find a commander from a few words, and Look deeper." },
  LIST_CACHE_ENABLED: { label: "List cache", description: "Home and /decks cached per reader." },
  MODEL_CALLS_ENABLED: { label: "Model calls", description: "Model calls the app starts: player runs and the Overview rewrite. Background jobs check it before each paid submit; a batch already submitted is still collected. Off refuses each new run before it charges; runs already going finish. On unless set off." },
  NAV_STALL_LOG_ENABLED: { label: "Stuck-loader reports", description: "Logs a report when a loading screen stays up 8 seconds. Changes nothing on screen." },
  OVERVIEW_V2_ENABLED: { label: "Overview v2", description: "The Overview on contract 8, Sonnet 5.5." },
  PAYMENTS_ENABLED: { label: "Buying credits", description: "Buy credit packs. Off stops new purchases; payments already made still settle." },
  PROPOSED_CUTS_ENABLED: { label: "Proposed cuts", description: "Cuts proposed for a deck over 99." },
  PUBLIC_PAGES_ENABLED: { label: "Public pages", description: "The signed-out card and commander pages at /card and /commander. Off, both answer 404." },
  RATE_LIMIT_ENABLED: { label: "Request counting", description: "Counts each player’s requests and logs what a limit would refuse. Refuses nothing." },
  SCAN_LAB_ENABLED: { label: "Card-scan lab", description: "A camera page at /lab/scan that tries the card scanner and records whether each guess was right. Not linked anywhere." },
  PUSH_ENABLED: { label: "Push notifications", description: "Phone and browser push for the news kinds, on top of Home. Sends nothing until the push keys are set." },
  SUGGESTED_CHANGES_V2_ENABLED: { label: "Suggested changes v2", description: "Pick how many changes, ask for something, and see each one as it arrives. Needs Suggested changes." },
  SWAP_TOOLS_ENABLED: { label: "Swap tools", description: "Swaps, stand-ins and Find a deck for it. Also turns on Find a deck's one-credit read." },
  TUNING_ENABLED: { label: "Suggested changes", description: "Suggested changes for a deck." },
  WELCOME_CREDITS_ENABLED: { label: "Welcome credits", description: "Gives a new sign-up 15 credits that expire after 30 days. Off stops new grants; a lot already given is still spent." },
};
