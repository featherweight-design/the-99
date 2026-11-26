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

import type { SwitchName } from "../flags/registry";
import { numberWord } from "./number-words";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** A sentence ending on a name: a masked name already ends in its initial's period (`Colin R.`), so it takes no second. */
const endOn = (name: string) => (name.endsWith(".") ? name : `${name}.`);

/** When a switch write lands, as both confirms say it. */
const WHEN = "Each server picks it up after 30 seconds and one more request.";

/** Admin R3, D14: a masked name is all a search field can match, so every account search says so. */
const FIND_BY_NAME = "Find an account by name";

/**
 * The Feedback tab (flyer trial, board 11; the handoff's `feedbackAdminCopy`, verbatim). The strings after `notGiven`
 * are placeholders the handoff did not write: copy-review settles them.
 */
export const feedbackAdminCopy = {
  tab: "Feedback",
  sub: "What players told us: problem reports and check-ins, newest first.",
  pills: { all: "All", problems: "Problems", checkIns: "Check-ins" },
  kinds: { problem: "Problem", checkIn: "Check-in" },
  summary: (fresh: number, avg: string) => `${fresh} new · check-ins average ${avg} of 5`,
  fields: { what: "What happened", doing: "What I was doing", rating: "Working for you", uses: "Uses most", pod: "Tell the pod", more: "Anything else" },
  notGiven: "not given",
  /** The admin's preview of the check-in: it opens the form and records nothing. */
  previewCheckIn: "Show me the check-in",
  // Placeholders (not in the handoff's strings file):
  off: "Feedback is off here.",
  signedOut: "Signed out",
  empty: "No feedback yet.",
  noAnswer: "\u2014",
  ratingOf: "of 5",
  loadMore: "Load more",
  loadFailed: "Couldn’t load more. Try again.",
  filterLabel: "Filter feedback",
  listLabel: "Feedback",
  markReadLabel: "New. Mark as read",
  contextSource: { error: "from the error screen", about: "from About" },
  summaryNoAverage: (fresh: number) => `${fresh} new`,
  ago: {
    minutes: (minutes: number) => `${minutes}m ago`,
    hours: (hours: number) => `${hours}h ago`,
    yesterday: "yesterday",
    date: (month: number, day: number) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]} ${day}`,
  },
  errorDigest: (digest: string) => `error ${digest}`,
} as const;

export const adminCopy = {
  door: { label: "Admin" },
  eyebrow: "Admin",
  tabs: { costs: "Costs", flags: "Feature flags", groups: "Groups", accounts: "Accounts", models: "Models", invites: "Invites", payments: "Payments", feedback: feedbackAdminCopy.tab },
  tabsLabel: "Admin pages",

  payments: {
    sub: "What players paid, by UTC month, beside what the model features cost. Grant credits gives an account a gift that never expires.",
    tiles: { gross: "Paid", tax: "Tax", net: "Net", spend: "Model spend" },
    tileSub: {
      payments: (n: number) => plural(n, "payment", "payments"),
      unattributed: (paymentCount: number) => `${paymentCount} unattributed`,
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
    revoked: (paymentCount: number) => `${paymentCount} taken back`,
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
      range: (last: number, monthName: string, day: number | null, days: number) =>
        `${monthName} 1 to ${last} · UTC${day === null ? "" : ` · day ${day} of ${days}`}`,
      compare: (month: string, figure: string, runs: number) =>
        runs === 0 ? `${month}: no model calls.` : `${month}: ${figure} in ${plural(runs, "run", "runs")}.`,
    },
    tiles: { calls: "Model calls", player: "Player runs", system: "System", perAccount: "Per active account" },
    tileSub: {
      runs: (runs: number) => plural(runs, "run", "runs"),
      pace: (projectedSpend: string) => `on pace for ${projectedSpend}`,
      ofCeiling: (ceilingPercent: number, cap: string) => `${ceilingPercent}% of the ${cap} ceiling`,
      ofCeilingAtLeast: (ceilingPercent: number, cap: string) => `at least ${ceilingPercent}% of the ${cap} ceiling`,
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
      elsewhere: (spendText: string) => ` Elsewhere ${spendText}: the other environment and anything else on this workspace.`,
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
      ambiguous: (workspaceCount: number, name: string) => `${workspaceCount} Anthropic workspaces are named ${name}, so none is read.`,
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
      scale: (scaleText: string) => `${scaleText} scale`,
      soFar: "so far",
      onPace: "on this pace",
      today: (spendText: string) => `${spendText} today`,
      byEnd: (spendText: string, day: number, monthName: string) => `${spendText} by ${monthName} ${day}`,
      byDay: (tallestSpend: string) => `By day · tallest ${tallestSpend}`,
      label: (month: string, spendText: string, pace: string | null) =>
        `Player runs in ${month}: ${spendText}${pace === null ? "." : `, on pace for ${pace} by month end.`}`,
    },
    empty: (month: string) => `No model calls in ${month}.`,

    // The detail (admin PR 3), below the trend in the canvas's order.
    byModel: "By model",
    byModelMeta: "model calls and card labels",
    modelSub: {
      calls: (n: number, featureNames: string) => `${plural(n, "call", "calls")} · ${featureNames}`,
      batches: (n: number) => `card labels, Batch API · ${plural(n, "batch", "batches")}`,
      composite: "a composite run from before the parts table, not split",
    },
    split: "Player against system",
    splitLine: (systemPercentText: string, month: string) => `System is ${systemPercentText}% of ${month}.`,
    splitLineAtLeast: (systemPercentText: string, month: string) => `System is at least ${systemPercentText}% of ${month}, with some of its spend not in yet.`,
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
      precon_upgrade: "Upgrade this precon",
      guided_build: "Guided build",
      labels: "Card labels",
      prose: "Commander prose",
      precon_overview: "Precon Overviews",
    } as Record<string, string>,
    featureTitle: (name: string, step: string | null, free: boolean) => `${name}${free ? " rewrite, free" : ""}${step && step !== "call" ? `, ${step}` : ""}`,
    effortUnknown: "not recorded",
    callsRow: "Model calls",
    runsCell: (n: number) => plural(n, "run", "runs"),
    featureMeta: (model: string, effort: string, runs: number, perRun: string, p90Spend: string) =>
      `${model} · ${effort} · ${plural(runs, "run", "runs")} · ${perRun} a run, p90 ${p90Spend}`,
    byFeatureNote: "Effort is recorded per call from the parts table on. An earlier run reads not recorded rather than a guess.",
    refunds: "Refunds",
    refundsMeta: (refundedSpend: string, refundedPercent: number) => `${refundedSpend} · ${refundedPercent}% of model calls`,
    refundLine: "the player got the credit back, and the cost still counts",
    refundsBody: (n: number, line: string) => `${n === 1 ? "One run was" : `${n} runs were`} refunded: ${line}.`,
    refundFeature: (name: string, runs: number, refundedSpend: string) => `${name} ${plural(runs, "run", "runs")}, ${refundedSpend}.`,
    noRefunds: "No runs were refunded.",
    reserved: "Reserved against spent",
    reservedMeta: "the worst case a run is held at, against its mean",
    reservedOnly: (reservedSpend: string) => `${reservedSpend} reserved`,
    reservedShare: (reservedPercentText: string) => `${reservedPercentText}% of the reservation`,
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
    soFar: (spendText: string) => `${spendText} so far`,
    labelsPartial: "label runs still collecting or not priced",
    systemPartial: "some label spend is not in yet",
    ledgersUnreadable: (ledgerNames: string) => `Couldn’t read ${ledgerNames}, so the eval figures leave that out.`,
    labelsOnStaging: "Card labels run on staging; production receives copies and calls no model for them.",
    evals: "Eval ledgers",
    evalsMeta: "committed in the repo; they move only with a merge",
    ledgerHead: { ledger: "Ledger", requests: "Requests", settled: "Settled", limit: "Limit", window: "Window" },
    originalLedger: "Original campaign",
    pending: (pendingSpend: string) => `${pendingSpend} pending`,
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
    movesFrom: (groupName: string) => `moves from ${groupName}`,
    inGroup: (groupName: string) => `in ${groupName}`,
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
    paidLimitHelp: (defaultLimit: number) => `How many runs a member’s paid and welcome credits can fund in a rolling 24 hours. Empty means ${defaultLimit}.`,
    membersHead: "Members",
    selectedCount: (selectedCount: number, unsaved: number) => `${selectedCount} selected${unsaved ? `, ${unsaved} not saved` : ""}`,
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
      many: (changeCount: number) => `${changeCount} changes not saved`,
      fields: "Not saved",
      rename: (from: string, newName: string) => `Saving renames ${from} to ${newName}.`,
      create: (name: string) => `Saving creates ${name}.`,
      describe: "Saving changes the description.",
      credits: (dailyCredits: number | null) => (dailyCredits === null ? "Saving sets daily credits back to the default." : `Saving sets daily credits to ${dailyCredits}.`),
      paidLimit: (dailyPaidRuns: number | null) => (dailyPaidRuns === null ? "Saving sets daily paid runs back to the default." : `Saving sets daily paid runs to ${dailyPaidRuns}.`),
      move: (who: string, from: string, toGroup: string) => `${who} moves from ${from} to ${toGroup}`,
      add: (who: string, groupName: string) => `Saving adds ${who} to ${groupName}`,
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
      renamed: (who: string, from: string, newName: string) => `${who} renamed ${from} to ${newName}`,
      described: (who: string, description: string | null) => (description === null ? `${who} cleared the description` : `${who} set the description to “${description}”`),
      credits: (who: string, from: string, newCreditsText: string) => `${who} set daily credits: ${from} → ${newCreditsText}`,
      paidLimit: (who: string, from: string, newLimitText: string) => `${who} set daily paid runs: ${from} → ${newLimitText}`,
      creditsDefault: "default",
      added: (who: string, account: string) => `${who} added ${account}`,
      removed: (who: string, account: string) => `${who} removed ${account}`,
      overrideSet: (who: string, label: string, from: string, newValue: string) => `${who} set ${label}: ${from} → ${newValue}`,
      overrideCleared: (who: string, label: string, from: string) => `${who} cleared ${label} (was ${from})`,
    },
    confirmLead: (groupName: string) => `Saving changes who is in ${groupName}, and so which overrides apply to them.`,
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
      title: (groupName: string) => `Delete ${groupName}?`,
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
      /** The group's codes the flyer trial being off ended, already joined: the group goes blank on them. */
      codesEnded: (list: string, n: number) =>
        `${list}, ended with the flyer trial. ${n === 1 ? "It loses its group, so if the trial comes back on, people who join with it land in no group." : "They lose their group, so if the trial comes back on, people who join with them land in no group."}`,
      /** The overrides, already joined, each a flag's label and value (`Overview v2 on and Suggested changes v2 on`). */
      overridesGo: (list: string, n: number) => (n === 1 ? `${list} goes with it. It reaches nobody now.` : `${list} go with it. They reach nobody now.`),
      historyFact: "Kept in the admin log, under the group’s name.",
      keep: "Keep it",
      confirm: "Delete the group",
      raced: (groupName: string) => `${groupName} isn’t empty now. Nothing was deleted.`,
      failed: "Couldn’t delete the group. Nothing was deleted.",
      lost: "Lost touch with the server, so the group may be gone. Reload the page before pressing again.",
      toast: (groupName: string) => `Deleted ${groupName}.`,
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
    noMatch: (searchText: string) => `No account matches ${searchText}.`,
    clerkDown: "Names didn’t load from Clerk.",
    back: "‹ Accounts",
    cols: { account: "Account", group: "Group", credits: "Credits now" },
    noGroup: "No group",
    role: {
      owner: (credits: number, share: string) => `Owner. ${plural(credits, "credit", "credits")} a day, and a ${share} testing share each month.`,
      other: (credits: number) => `${plural(credits, "credit", "credits")} a day.`,
    },
    tiles: { credits: "Credits now", spent: (monthName: string) => `Spent in ${monthName}`, presses: "Runs", hub: "Tuning hub" },
    creditsLeft: (left: number, limit: number) => `${left} of ${limit} left`,
    /** A list row's credits, under the `Credits now` head (Admin R3 boards, A1). */
    creditsRow: (left: number, limit: number) => `${left} of ${limit}`,
    resetAt: (time: string) => `reset at ${time} UTC`,
    ownerShare: (sharePercent: number, share: string) => `${sharePercent}% of the ${share} testing share`,
    hub: { drawn: "Drawn", notDrawn: "Not drawn", tools: (toolCount: number) => `${toolCount} of its tools on` },
    switchGroups: { override: "Set by an override", rule: "Off by a rule", env: "From the environment" },
    // Owed to /copy-review.
    allFeatures: {
      title: "All features",
      body: "Every feature flag on for this account, those added later included. An Off set on one flag here still wins, and so does an env var set to off.",
    },
    envList: { on: (switchCount: number) => `On · ${switchCount}`, off: (switchCount: number) => `Off · ${switchCount}` },
    group: "Group",
    changeGroup: "Change group",
    pickGroup: "Move to",
    save: "Save",
    cancel: "Cancel",
    spendByFeature: "Spend by feature",
    spendMeta: (spendText: string) => `${spendText} so far`,
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
    pendingSet: (name: string, from: number, newInvites: number, waiting: number) =>
      `Saving sets ${name}’s invites from ${from} to ${newInvites}.` +
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
    byLink: "by friend link",
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
      accounts: (accountCount: number) => `${accountCount} ${accountCount === 1 ? "account" : "accounts"}`,
      invited: (accountCount: number) => `${accountCount} invited`,
      waiting: (accountCount: number) => `${accountCount} waiting`,
      noMatch: (searchText: string) => `No account matches “${searchText}”.`,
      /** A search carried down to the phone, where the field is not drawn, and its way back. (new, for /copy-review) */
      filtered: (searchText: string) => `Showing accounts matching “${searchText}”.`,
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
    groupPending: (raised: number, memberTotal: number, inviteTarget: number, who: string, held: number) =>
      raised === 0
        ? `Nobody holds fewer than ${inviteTarget}: topping up changes nothing.`
        : `Topping up raises ${raised} of ${memberTotal} members to ${inviteTarget} invites left: ${who}.` +
          (held === 0 ? "" : held === 1 ? ` 1 already holds ${inviteTarget}.` : ` ${held} already hold ${inviteTarget}.`),
    topUp: "Top up",
    /** History lines, on an account's page and a group's. (new, for /copy-review) */
    history: {
      set: (who: string, name: string, from: string, newInvitesText: string) => `${who} set ${name}’s invites: ${from} → ${newInvitesText}`,
      topUp: (who: string, group: string, inviteTargetText: string, raised: string) => `${who} topped up ${group} to ${inviteTargetText}: ${raised} raised`,
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
  flags: {
    title: "Feature flags",
    sub: "The app-wide value is each flag’s default. Account beats group beats app-wide; Killed beats them all. Each server picks up a change after 30 seconds and one more request.",
    search: "Search by name or variable",
    chips: { all: "All", overridden: "Overridden", offForAnyone: "Off for anyone", model: "Model features" },
    chipsLabel: "Show",
    heads: { features: "Features", plumbing: "Plumbing", plumbingNote: "app-wide only, not features a friend tries" },
    cols: { name: "Flag", app: "App-wide", overrides: "Overrides", resolved: "Resolved" },
    resolved: { on: "On", off: "Off", mixed: "Mixed", count: (enabledCount: number, total: number) => `${enabledCount} of ${total} on` },
    app: { notSet: "Not set", on: "On", off: "Off", killed: "Killed" },
    overrides: {
      none: "None",
      groups: (n: number) => plural(n, "group", "groups"),
      accounts: (n: number) => plural(n, "account", "accounts"),
      refused: "refused",
      ignored: "ignored",
    },
    overridesUnread: "Overrides didn’t load. Every flag shows its fallback.",
    // Small items 9, item 4: a killed app row. The model-call switch's env stop keeps its own words (`envKilled`).
    killed: "killed",
    envKilled: (value: string) => `env var is ${value}`,
    tagKilled: "killed",
    parentOff: (parent: string) => `${parent} is off`,
    tagModel: "model",
    tagNeeds: (parent: string) => `needs ${parent}`,
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
  flag: {
    back: "‹ Feature flags",
    ladderHead: "Who gets it",
    ladderMeta: "most specific wins",
    rungs: { killed: "Killed", account: "Account", all: "All features", group: "Group", app: "App-wide", fallback: "Fallback", needs: "Needs" },
    decides: (accountCount: number) => (accountCount ? `decides for ${accountCount}` : "decides for none"),
    decidesAll: (accountTotal: number) => `decides for all ${accountTotal}`,
    // Small items 9, item 4: the Killed rung's value, and the Fallback rung (the registry's compiled value, `switchFallbackOn`).
    killedApp: "the app-wide row",
    killedEnv: (name: string, value: string) => `${name}=${value}`,
    fallback: { on: "on", off: "off" },
    fallbackIdle: "only with no row",
    // The All features rung's value: how many accounts it decides for (`Flags-Kill` K3 to K7).
    allValue: (n: number) => plural(n, "account", "accounts"),
    // The Account rung's value, one part per value its rows hold (`Flags-Kill`: `2 accounts: On`).
    accountValue: (n: number, value: string) => `${plural(n, "account", "accounts")}: ${value}`,
    allows: (accountTotal: number) => `allows all ${accountTotal}`,
    refused: "refused",
    none: "None",
    needsValue: (parent: string, state: string) => `${parent}: ${state}`,
    result: {
      allOn: (accountTotal: number) => `On for all ${accountTotal} accounts`,
      allOff: (accountTotal: number) => `Off for all ${accountTotal} accounts`,
      some: (enabledCount: number, accountTotal: number, accountNames: string) => `On for ${enabledCount} of ${accountTotal}: ${accountNames}`,
    },
    appHead: "App-wide",
    appSetBy: (who: string, when: string) => `set by ${who}, ${when}`,
    appNotSet: "not set: the fallback decides",
    appNotSetNote: (fallback: string) => `Not set falls back to the flag’s compiled default (${fallback}). Killed turns it off for everyone.`,
    appKilledNote: "Killed is the kill switch: off for everyone, overrides refused.",
    appRefused: (value: string) => `Refused while the env var is ${value}.`,
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
    historyLatest: (changeCount: number) => `latest ${changeCount}`,
    historyFoot: "Times are UTC.",
    noHistory: "No overrides yet.",
    refusedMeta: "refused, killed",
    ignoredMeta: "ignored, plumbing is app-wide only",
    kill: {
      title: "Killed: off for everyone.",
      body: "Killed beats every account and group override and All features. Pick On, Off or Not set to lift it; the overrides below come back as they were.",
    },
    // The model-call switch's env stop: no app-wide value lifts it, so it keeps its own words.
    envKill: {
      title: (value: string) => `Off: the env var is ${value}.`,
      body: (name: string, value: string) => `${name}=${value} refuses every override. Redeploy to change it. Clear still works.`,
    },
    compound: {
      title: (parent: string) => `Off: needs ${parent}, which is off.`,
      body: "Overrides here can’t turn the parent on.",
      link: (parent: string) => `Open ${parent} ›`,
    },
    history: {
      set: (who: string, scope: string, from: string, newValue: string) => `${who} set ${scope}: ${from} → ${newValue}`,
      cleared: (who: string, scope: string, from: string) => `${who} cleared ${scope} (was ${from})`,
      notSet: "not set",
      you: "You",
      scope: { app: "app-wide", group: (name: string) => `group ${name}`, user: (name: string) => `account ${name}` },
    },
    // The writes (admin plan 8c; STATES F3, F5, F7 to F12), from the handoff's `switch` keys. The
    // pending row's prompt, the account and group lookups and a refusal's line are new here and owed
    // to /copy-review.
    appOpts: { notSet: "Not set", on: "On", off: "Off", killed: "Killed" },
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
    staleRefusal: "This flag changed since the page loaded. The page now shows what’s saved.",
    clerkDownRefusal: "Accounts didn’t load from Clerk, so who this turns a model feature on for can’t be counted. Nothing changed; try again once Clerk answers.",
    sources: {
      kill: "killed",
      account: "account override",
      all: "All features",
      group: (name: string) => `group ${name}`,
      app: "app-wide override",
      env: "fallback",
      parent: (parent: string) => `${parent} is off`,
    },
  },

  // The model confirm (admin STATES F3; design table, Confirm), from the handoff's `confirmModel`
  // keys. The handoff wrote one lead; one per write, the mean line, a cost line per capability and the
  // rolling-24-hours credits sentence are new here and owed to /copy-review (plan §Copy, items 6, 7).
  confirmModel: {
    title: (name: string, accountCount: number) => `Turn ${name} on for ${accountCount} more account${accountCount === 1 ? "" : "s"}?`,
    lead: {
      app: { set: "Turning app-wide on reaches every account without an override of its own.", clear: "Clearing app-wide off falls back to the flag’s compiled default (on)." },
      group: { set: (groupName: string) => `Turning ${groupName} on reaches its members without an account override.`, clear: (groupName: string) => `Clearing ${groupName} falls its members back to app-wide or the flag’s compiled default.` },
      user: { set: "Turning this account on lets it spend credits.", clear: "Clearing this account falls it back to its group, app-wide or the flag’s compiled default." },
    },
    spends: (featureNames: string) => `It turns on ${featureNames}, which spends money.`,
    facts: { who: "Who", cost: "Cost", about: "About line", when: "When" },
    about: (accountCount: number, name: string) => `The ${accountCount} account${accountCount === 1 ? " sees" : "s see"} ${name} in About’s line on Home on their next visit.`,
    noAbout: "No About line changes.",
    cost: (feature: string, reserve: string) => `${feature}: each run reserves up to ${reserve}.`,
    mean: (mean: string) => `Priced runs so far average ${mean}.`,
    noMean: "No run has been priced yet, so there is no mean to go on.",
    credits: (limits: string) => `Each run uses one of the account’s ${limits} credits in a rolling 24 hours.`,
    when: WHEN,
    note: "Note (optional)",
    confirm: (accountCount: number) => `Turn on for ${accountCount}`,
    cancel: "Cancel",
    capability: { synopsis: "Overview", tuning: "Suggested changes", proposed_cuts: "Proposed cuts", intake: "Help me choose", fits_read: "Find a deck read", suggested_changes_v2: "Suggested changes v2", precon_upgrade: "Upgrade this precon", guided_build: "Guided build" },
  },

  // The kill confirm (small items 9, item 4; `Flags-Kill` K4, K6): Killed picked on the App-wide segment. DRAFT. The
  // Who fact names everyone, then who is held on now: `whoAll`, then each part, joined as a list.
  killConfirm: {
    title: (flag: string) => `Kill ${flag} for everyone?`,
    lead: (flag: string) => `Killed turns ${flag} off for every account, and beats every override and All features. Nothing is deleted.`,
    facts: { who: "Who", overrides: "Overrides", when: "When" },
    whoAll: (accountTotal: number) => `All ${accountTotal} accounts`,
    whoGroup: (accountCount: number, group: string) => `the ${accountCount} held on by ${group}`,
    whoAccounts: (n: number) => `${numberWord(n)} account override${n === 1 ? "" : "s"}`,
    whoAllFeatures: "All features too",
    overrides: "Kept, and refused while killed. Lifting the kill brings them back.",
    when: WHEN,
    note: "Note (optional)",
    cancel: "Cancel",
    confirm: "Kill for everyone",
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
  used: (usedCount: number, capacity: number) => `${usedCount} of ${capacity}`,
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
  revokeBody: (code: string, joinedCount: number) =>
    `People can no longer join with ${code}. The ${joinedCount} who joined keep their accounts, their group and their invites. Printed flyers will say it no longer works.`,
  keep: "Keep it",
  revokeConfirm: "Revoke code",
  treeNode: (store: string) => `Flyer · ${store}`,
  noFriendLink: "no friend link to Hugh",
  launchList: (addressCount: number) => `Launch list · ${addressCount}`,
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
  /** Download CSV's failure lines (small items 9, CSV-Failed.dc.html F1 to F7). Copy-reviewed 2026-11-01. */
  csvFailed: "The server couldn’t build the download. Reload the page and try again.",
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
export const flagCopy: Readonly<Record<SwitchName, { label: string; description: string }>> = {
  FEEDBACK_ENABLED: { label: "Feedback", description: "Report a problem, the check-in on Home and the Feedback tab here." },
  FLYER_TRIAL_ENABLED: { label: "Flyer trial", description: "Gates the /join/<CODE> flyer sign-ups and the Flyer codes section on /admin/invites. Off retires every code." },
  FRIEND_LINKS_ENABLED: { label: "Friend links", description: "Gives every player a reusable friend link, QR and code that send friend requests. Off keeps single-use links." },
  ANNOUNCEMENTS_ENABLED: { label: "Announcements", description: "Wizards announcements on Home, in Settings and as pushes. No surface yet." },
  LIST_CACHE_ENABLED: { label: "List cache", description: "Home and /decks cached per reader." },
  MODEL_CALLS_ENABLED: { label: "Model calls", description: "Model calls the app starts: player runs and the Overview rewrite. Background jobs check it before each paid submit; a batch already submitted is still collected. Off refuses each new run before it charges; runs already going finish. On unless set off." },
  PAYMENTS_ENABLED: { label: "Buying credits", description: "Buy credit packs. Off stops new purchases; payments already made still settle." },
  PRECON_UPGRADE_ENABLED: { label: "Upgrade this precon", description: "Pick a strategy for a precon and get 12 to 18 swaps for 2 credits. Turns on the paid run, so it asks before a write." },
  PUBLIC_LANDING_ENABLED: { label: "Public landing page", description: "The signed-out home page: the made-up binder, the launch list and the catalog numbers. Off, a signed-out visitor sees the short sign-in page." },
  PUBLIC_PAGES_ENABLED: { label: "Public pages", description: "The signed-out card and commander pages at /card and /commander. Off, both answer 404." },
  SCAN_LAB_ENABLED: { label: "Card-scan lab", description: "A camera page at /lab/scan that tries the card scanner and records whether each guess was right. Not linked anywhere." },
  STORE_PREFERENCE_ENABLED: { label: "Store choice", description: "Lets a player price the app at TCGplayer or Card Kingdom instead of Mana Pool. Off, every price is Mana Pool's." },
  PUSH_ENABLED: { label: "Push notifications", description: "Phone and browser push for the news kinds, on top of Home. Sends nothing until the push keys are set." },
  SUGGESTED_CHANGES_V2_ENABLED: { label: "Suggested changes v2", description: "Pick how many changes, ask for something, and see each one as it arrives." },
  WELCOME_CREDITS_ENABLED: { label: "Welcome credits", description: "Gives a new sign-up 15 credits that expire after 30 days. Off stops new grants; a lot already given is still spent." },
};

/** The Email previews card on /admin/invites: one press sends every email template the app sends to the signed-in admin. */
export const emailPreviewAdminCopy = {
  title: "Email previews",
  meta: "Every email The 99 sends, to your own address. Subjects start with [Preview].",
  send: "Send to me",
  sending: "Sending…",
  // The flyer code is the same email as the sign-in code, so three emails stand for four templates. Clerk sends its own.
  names: { invite: "the invite", code: "the sign-up code (also the flyer code)", launch: "the launch email" },
  result: (sent: readonly string[], total: number) => `Sent ${sent.length} of ${total}${sent.length ? `: ${sent.join(", ")}` : ""}. Clerk's sign-in and reset emails come from Clerk and aren't included.`,
  failed: "The rest didn't go through.",
  capped: "Today's mail cap is reached, so the rest weren't sent.",
  limited: "Your address hit its hourly mail limit, so the rest weren't sent.",
  cooldown: (sec: number) => `Sent a moment ago. Try again in ${sec < 90 ? `${sec} seconds` : `${Math.ceil(sec / 60)} minutes`}.`,
  refused: {
    unconfigured: "Email isn't configured on this deployment.",
    "no-address": "Your account has no email address to send to.",
    failed: "That didn't go through. Try again.",
  },
} as const;

/**
 * The launch email's admin card on /admin/invites (launch email R2c G3; eng-drawn admin tooling, orchestrator ruling
 * 2026-11-20): a dry run first, then Send next N behind a confirm that names the count. Shown whatever the flyer switch says.
 */
export const launchEmailAdminCopy = {
  title: "Launch email",
  meta: "One email to everyone on the launch list, sent in batches.",
  check: "Dry run",
  checking: "Checking…",
  waiting: (addressCount: number) => (addressCount === 1 ? "1 address waiting." : `${addressCount} addresses waiting.`),
  none: "Every address has been sent.",
  countLabel: "How many to send",
  send: (batchSize: number) => `Send next ${batchSize}`,
  confirm: (addressCount: number) => (addressCount === 1 ? "Send the launch email to 1 address now? This can't be undone." : `Send the launch email to ${addressCount} addresses now? This can't be undone.`),
  confirmYes: (addressCount: number) => `Yes, send ${addressCount}`,
  cancel: "Cancel",
  sending: "Sending…",
  result: (sent: number, released: number, uncertain: number, skipped: number, waiting: number) =>
    `Sent ${sent}. ${skipped > 0 ? `${skipped} skipped, already signed up. ` : ""}${released > 0 ? `${released} put back to try again. ` : ""}${uncertain > 0 ? `${uncertain} unconfirmed, not retried. ` : ""}${waiting} still waiting.`,
  capped: "Today's mail cap is reached. Send the rest tomorrow.",
  lookup: "Couldn't check for existing accounts, so sending stopped. Try again later.",
  refused: {
    "no-launch-date": "Set the launch date first.",
    "before-launch": "The launch date hasn't come yet.",
    unconfigured: "Email isn't configured on this deployment.",
    "images-missing": "The email's images aren't on this deployment yet.",
    failed: "That didn't go through. Try again.",
  },
} as const;
