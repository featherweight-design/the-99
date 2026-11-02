import { adminCopy, switchCopy } from "../copy/admin";
import type { AccountSwitches, ExplainSource } from "../switches/explain";
import { envStops, KILLED, type OverrideValue, type RowValue } from "../switches/resolve";
import { ALL_FEATURES_RAISES, switchFallbackOn, switchKind, switchParent, type SwitchName } from "../switches/registry";
import type { Account } from "./accounts";
import { accountName, accountNames } from "./names";
import { switchRows, type ResolvedState, type SwitchRow } from "./switches-rule";

/**
 * One switch's page (admin STATES F1 to F13; design table, Switch page), pure. The ladder's rungs,
 * the result foot, the banners, the override rows, the history and every account's explanation for
 * Check an account, all from the request path's own `decide` through `explain.ts`, so the page
 * cannot disagree with what a reader is served. Read only (admin plan 8b): the writes are 8c's.
 */
const copy = adminCopy.switch;

/** One `flag_overrides` row of this switch, with the fields the snapshot does not carry. */
export type OverrideDetail = {
  scope: "app" | "group" | "user";
  groupId: string | null;
  userId: string | null;
  /** `killed` on the app-wide row alone. */
  value: RowValue;
  note: string | null;
  updatedBy: string;
  updatedAt: Date;
};
export type GroupInfo = { id: string; name: string; members: number };
export type SwitchEvent = {
  at: Date;
  actorId: string;
  kind: string;
  scope: string | null;
  groupId: string | null;
  userId: string | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
};

export type SwitchPageInput = {
  name: SwitchName;
  env: Readonly<Record<SwitchName, string | null>>;
  overrides: readonly OverrideDetail[];
  /** Every account's switches, from `explainForAccounts`, keyed as `accounts` is ordered. */
  verdicts: ReadonlyMap<string, AccountSwitches>;
  /**
   * The accounts holding an All features row. The verdicts name none of them under a kill (the kill decides), yet the
   * All features rung still says who it would decide for, refused (`Flags-Kill` K3).
   */
  allFeatures: readonly string[];
  accounts: readonly Account[];
  groups: readonly GroupInfo[];
  /** Newest first. One more than `historyLimit` means older events exist and the list is cut. */
  events: readonly SwitchEvent[];
  /** Deleted groups' names, from their `group_deleted` events, for History's lines that name them. */
  deletedGroups?: ReadonlyMap<string, string>;
  historyLimit: number;
  viewerId: string;
};

export type RungKey = "killed" | "account" | "all" | "group" | "app" | "fallback" | "needs";
export type Rung = { key: RungKey; value: string; tone: "none" | "plain" | "mono" | "danger"; decides: string; deciding: boolean };
/** A group or account row: never `killed` (`flag_overrides_killed_scope_check`). */
export type OverrideItem = { key: string; title: string; sub: string; value: OverrideValue; note: string | null; meta: string; refused: boolean };
/** `reveal`: a Show's log line (Admin R3, D8), marked with the accent diamond. */
export type HistoryItem = { when: string; what: string; note: string | null; reveal?: true };
export type Explanation = { id: string; label: string; on: boolean; source: string; kill: boolean };
export type Banner = { kind: "kill"; title: string; body: string } | { kind: "compound"; title: string; body: string; link: string; parent: SwitchName };

export type SwitchPage = {
  name: SwitchName;
  row: SwitchRow;
  plumbing: boolean;
  rungs: Rung[];
  result: { state: ResolvedState; text: string };
  banner: Banner | null;
  /** Killed for everyone (`isKilled`): a `killed` app row, or the model-call switch's env stop. Overrides are refused. */
  killed: boolean;
  /**
   * `stopped`: the env stop, which no app-wide value lifts, so the segment holds On, Off and Killed. `who`: the kill
   * confirm's Who fact, naming who is held on now.
   */
  app: { value: string; current: RowValue | null; set: boolean; meta: string; note: string; refused: boolean; stopped: boolean; who: string };
  groups: OverrideItem[];
  accounts: OverrideItem[];
  history: HistoryItem[];
  /** True when older events exist than the history lists. */
  historyCut: boolean;
  explanations: Explanation[];
  /** The account universe and the groups, for the add pickers (F7, F8). */
  people: { id: string; label: string; email: string | null }[];
  groupChoices: { id: string; name: string }[];
};

const label = (name: SwitchName) => switchCopy[name].label;
const valueText = (v: RowValue | null) =>
  v === KILLED ? adminCopy.switches.app.killed : v === "on" ? adminCopy.switches.app.on : v === "off" ? adminCopy.switches.app.off : adminCopy.switches.app.notSet;

/** `A, B and C`, the list the kill confirm's Who fact reads as. */
const andList = (parts: readonly string[]) => (parts.length < 3 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`);

/** `Oct 11 · 14:02`, month first (US order), UTC (the history foot says so). */
export function fmtWhen(at: Date): string {
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).formatToParts(at);
  const part = (t: string) => day.find((p) => p.type === t)?.value ?? "";
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(at);
  return `${part("month")} ${part("day")} · ${time}`;
}

/** Where a verdict comes from, as the switch page and the Accounts page print it. */
export function sourceText(source: ExplainSource, groupName: (id: string) => string): string {
  switch (source.kind) {
    case "kill":
      return copy.sources.kill;
    case "account":
      return copy.sources.account;
    case "all":
      return copy.sources.all;
    case "group":
      return copy.sources.group(groupName(source.groupId));
    case "app":
      return copy.sources.app;
    case "env":
      return copy.sources.env;
    case "parent":
      return copy.sources.parent(label(source.parent));
  }
}

const RUNG_OF: Record<ExplainSource["kind"], RungKey> = { account: "account", all: "all", group: "group", app: "app", env: "fallback", kill: "killed", parent: "needs" };

export function switchPage(input: SwitchPageInput): SwitchPage {
  const { name, env, overrides, verdicts, accounts, groups, viewerId } = input;
  const events = input.events.slice(0, input.historyLimit);
  const plumbing = switchKind(name) === "plumbing";
  // A kill (small items 9, item 4): the app-wide row at `killed`, or the model-call switch's env stop (`isKilled`).
  const stopped = envStops(name, env);
  const appRow = overrides.find((o) => o.scope === "app") ?? null;
  const rowKilled = appRow?.value === KILLED;
  const killed = stopped || rowKilled;
  const parent = switchParent(name);
  const groupById = new Map(groups.map((g) => [g.id, g]));
  // A group deleted since an event names it reads as the name its `group_deleted` event kept, else its id's first 8 characters.
  const groupName = (id: string) => groupById.get(id)?.name ?? input.deletedGroups?.get(id) ?? id.slice(0, 8);
  const { userName, actor } = accountNames(accounts, viewerId);
  const maskedEmail = new Map(accounts.map((a) => [a.id, a.email ?? ""]));

  const [row] = switchRows({
    env,
    overrides: overrides.map((o) => ({ switchName: name, scope: o.scope, groupId: o.groupId, userId: o.userId, value: o.value })),
    verdicts,
  }).filter((r) => r.name === name);
  const total = row.total;

  const decided = new Map<RungKey, number>();
  for (const v of verdicts.values()) {
    const key = RUNG_OF[v[name].source.kind];
    decided.set(key, (decided.get(key) ?? 0) + 1);
  }
  const rung = (key: RungKey, value: string, tone: Rung["tone"], hasRows: boolean, zero?: string): Rung => {
    const n = decided.get(key) ?? 0;
    // Under a kill, a rung that carries rows decides for nobody because it is refused (F5).
    const decides = n ? copy.decides(n) : killed && hasRows ? copy.refused : zero ?? copy.decides(0);
    return { key, value, tone, decides, deciding: n > 0 };
  };

  const groupRows = overrides.filter((o) => o.scope === "group");
  const userRows = overrides.filter((o) => o.scope === "user");
  // Who the All features rung decides for, a kill aside: a holder with no account row of this switch (which beats it).
  const own = new Set(userRows.map((o) => o.userId));
  const known = new Set(accounts.map((a) => a.id));
  const allHolders = ALL_FEATURES_RAISES.has(name) ? input.allFeatures.filter((id) => known.has(id) && !own.has(id)).length : 0;
  const list = (items: string[]) => (items.length ? items.join(" · ") : copy.none);
  const rungs: Rung[] = [];
  // The first rung, Killed, decides for everyone (K3, K7). A killed app row is this rung, so no App-wide rung follows it.
  if (killed) {
    const k = rung("killed", stopped ? copy.killedEnv(name, env[name] ?? "") : copy.killedApp, "danger", false);
    rungs.push(k.deciding ? { ...k, decides: copy.decidesAll(decided.get("killed") ?? 0) } : k);
  }
  if (!plumbing) {
    // The Account rung counts its rows by value, On first (`Flags-Kill`: `2 accounts: On`); the Accounts section names them.
    const byValue = (["on", "off"] as const).flatMap((v) => {
      const n = userRows.filter((o) => o.value === v).length;
      return n ? [copy.accountValue(n, valueText(v))] : [];
    });
    rungs.push(rung("account", list(byValue), userRows.length ? "plain" : "none", userRows.length > 0));
    // All features sits between Account and Group, as the resolver applies it (`Flags-Kill` K3 to K7). It is not a row
    // of this switch, so it carries no control; a switch All features does not raise draws no such rung.
    if (ALL_FEATURES_RAISES.has(name)) rungs.push(rung("all", allHolders ? copy.allValue(allHolders) : copy.none, allHolders ? "plain" : "none", allHolders > 0));
    rungs.push(
      // `Founders: On`, the value capitalized as the Account rung and the board draw it.
      rung("group", list(groupRows.map((o) => `${groupName(o.groupId!)}: ${valueText(o.value)}`)), groupRows.length ? "plain" : "none", groupRows.length > 0),
    );
  }
  // Under the env stop the Killed rung is the env's, so a killed app row keeps its own App-wide rung: drawn Killed, and
  // not refused (a kill is not an override the stop refuses), as the list draws it (`switches-rule.ts`, `appRefused`).
  if (!rowKilled || stopped) rungs.push(rung("app", valueText(appRow?.value ?? null), appRow ? "plain" : "none", appRow !== null && !rowKilled));
  const fallback = switchFallbackOn(name) ? copy.fallback.on : copy.fallback.off;
  rungs.push(rung("fallback", fallback, "plain", false, copy.fallbackIdle));
  if (parent) {
    const parentOn = [...verdicts.values()].filter((v) => v[parent].on).length;
    const state = parentOn === total && total > 0 ? copy.result.allOn(total) : parentOn === 0 ? copy.result.allOff(total) : adminCopy.switches.resolved.count(parentOn, total);
    rungs.push(rung("needs", copy.needsValue(label(parent), state.charAt(0).toLowerCase() + state.slice(1)), "plain", false, parentOn === total && total > 0 ? copy.allows(total) : undefined));
  }

  const onNames = accounts.filter((a) => verdicts.get(a.id)?.[name].on).map(accountName);
  const result = {
    state: row.state,
    text: row.state === "on" ? copy.result.allOn(total) : row.state === "off" ? copy.result.allOff(total) : copy.result.some(row.on, total, onNames.join(", ")),
  };

  let banner: Banner | null = null;
  // The env stop keeps its own words: no app-wide value lifts it, so the kill banner's "Pick On, Off or Not set" would mislead.
  if (stopped) banner = { kind: "kill", title: copy.envKill.title(env[name] ?? ""), body: copy.envKill.body(name, env[name] ?? "") };
  else if (rowKilled) banner = { kind: "kill", title: copy.kill.title, body: copy.kill.body };
  else if (row.reason?.kind === "parent") {
    const p = row.reason.parent;
    banner = { kind: "compound", title: copy.compound.title(label(p)), body: copy.compound.body, link: copy.compound.link(label(p)), parent: p };
  }

  // Under a kill the line reads `refused, killed` alone (K3, K7): who set the row and when is not what decides it now.
  const meta = (o: OverrideDetail) => (killed ? copy.refusedMeta : [actor(o.updatedBy), fmtWhen(o.updatedAt), ...(plumbing ? [copy.ignoredMeta] : [])].join(" · "));
  const item = (o: OverrideDetail, key: string, title: string, sub: string): OverrideItem => ({ key, title, sub, value: o.value as OverrideValue, note: o.note, meta: meta(o), refused: killed });

  // The kill confirm's Who fact (K4, K6): everyone, then who is held on now, by a group, an account row or All features,
  // counted in one pass over the verdicts.
  const heldByGroup = new Map<string, number>();
  let heldByAccount = 0;
  let heldByAll = 0;
  for (const v of verdicts.values()) {
    const { on, source } = v[name];
    if (!on) continue;
    if (source.kind === "group") heldByGroup.set(source.groupId, (heldByGroup.get(source.groupId) ?? 0) + 1);
    else if (source.kind === "account") heldByAccount++;
    else if (source.kind === "all") heldByAll++;
  }
  const kc = adminCopy.killConfirm;
  const who = `${andList([
    kc.whoAll(total),
    ...[...new Set(groupRows.map((o) => o.groupId!))]
      .map((id) => [groupName(id), heldByGroup.get(id) ?? 0] as const)
      .filter(([, n]) => n > 0)
      .sort(([a], [b]) => a.localeCompare(b, "en-US"))
      .map(([g, n]) => kc.whoGroup(n, g)),
    ...(heldByAccount ? [kc.whoAccounts(heldByAccount)] : []),
    ...(heldByAll ? [kc.whoAllFeatures] : []),
  ])}.`;
  const byTitle = (a: OverrideItem, b: OverrideItem) => a.title.localeCompare(b.title, "en-US");

  return {
    name,
    row,
    plumbing,
    rungs,
    result,
    banner,
    killed,
    app: {
      value: valueText(appRow?.value ?? null),
      current: appRow?.value ?? null,
      set: appRow !== null,
      meta: appRow ? copy.appSetBy(actor(appRow.updatedBy), fmtWhen(appRow.updatedAt)) : copy.appNotSet,
      note: [
        appRow?.note ? copy.note(appRow.note) : "",
        rowKilled ? copy.appKilledNote : stopped ? copy.appRefused(env[name] ?? "") : plumbing ? "" : copy.appNotSetNote(fallback),
      ].filter(Boolean).join(" "),
      // A killed row is not refused under the env stop, as the list has it (`appRefused`).
      refused: stopped && appRow !== null && !rowKilled,
      stopped,
      who,
    },
    groups: groupRows
      .map((o) => item(o, o.groupId!, groupName(o.groupId!), copy.members(groupById.get(o.groupId!)?.members ?? 0)))
      .sort(byTitle),
    // The second line is the masked email, never the Clerk id (Admin R3, D3).
    accounts: userRows.map((o) => item(o, o.userId!, userName(o.userId!), maskedEmail.get(o.userId!) ?? "")).sort(byTitle),
    history: events.map((e) => {
      const scope =
        e.scope === "group" ? copy.history.scope.group(e.groupId ? groupName(e.groupId) : "") : e.scope === "user" ? copy.history.scope.user(e.userId ? userName(e.userId) : "") : copy.history.scope.app;
      const from = e.oldValue ?? copy.history.notSet;
      const what = e.kind === "override_cleared" ? copy.history.cleared(actor(e.actorId), scope, from) : copy.history.set(actor(e.actorId), scope, from, e.newValue ?? copy.history.notSet);
      return { when: fmtWhen(e.at), what, note: e.note };
    }),
    historyCut: input.events.length > input.historyLimit,
    people: accounts.map((a) => ({ id: a.id, label: accountName(a), email: a.email })),
    groupChoices: [...groups].sort((a, b) => a.name.localeCompare(b.name, "en-US")).map((g) => ({ id: g.id, name: g.name })),
    explanations: accounts.flatMap((a) => {
      const v = verdicts.get(a.id)?.[name];
      return v ? [{ id: a.id, label: accountName(a), on: v.on, source: sourceText(v.source, groupName), kill: v.source.kind === "kill" }] : [];
    }),
  };
}
