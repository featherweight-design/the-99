import { adminCopy, switchCopy } from "../copy/admin";
import type { AccountSwitches, ExplainSource } from "../switches/explain";
import { KILL, type OverrideValue } from "../switches/resolve";
import { switchKind, switchParent, type SwitchName } from "../switches/registry";
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
  value: OverrideValue;
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
  accounts: readonly Account[];
  groups: readonly GroupInfo[];
  /** Newest first. One more than `historyLimit` means older events exist and the list is cut. */
  events: readonly SwitchEvent[];
  historyLimit: number;
  viewerId: string;
};

export type RungKey = "account" | "group" | "app" | "env" | "needs";
export type Rung = { key: RungKey; value: string; tone: "none" | "plain" | "mono" | "danger"; decides: string; deciding: boolean };
export type OverrideItem = { key: string; title: string; sub: string; value: OverrideValue; note: string | null; meta: string; refused: boolean };
export type HistoryItem = { when: string; what: string; note: string | null };
export type Explanation = { id: string; label: string; on: boolean; source: string; kill: boolean };
export type Banner = { kind: "kill"; title: string; body: string } | { kind: "compound"; title: string; body: string; link: string; parent: SwitchName };

export type SwitchPage = {
  name: SwitchName;
  row: SwitchRow;
  plumbing: boolean;
  rungs: Rung[];
  result: { state: ResolvedState; text: string };
  banner: Banner | null;
  app: { value: string; current: OverrideValue | null; set: boolean; meta: string; note: string; refused: boolean };
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
const valueText = (v: OverrideValue | null) => (v === "on" ? adminCopy.switches.app.on : v === "off" ? adminCopy.switches.app.off : adminCopy.switches.app.notSet);

/** `11 Oct · 14:02`, UTC (the history foot says so). */
export function fmtWhen(at: Date): string {
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).formatToParts(at);
  const part = (t: string) => day.find((p) => p.type === t)?.value ?? "";
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(at);
  return `${part("day")} ${part("month")} · ${time}`;
}

function sourceText(source: ExplainSource, groupName: (id: string) => string): string {
  switch (source.kind) {
    case "kill":
      return copy.sources.kill;
    case "account":
      return copy.sources.account;
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

const RUNG_OF: Record<ExplainSource["kind"], RungKey> = { account: "account", group: "group", app: "app", env: "env", kill: "env", parent: "needs" };

export function switchPage(input: SwitchPageInput): SwitchPage {
  const { name, env, overrides, verdicts, accounts, groups, viewerId } = input;
  const events = input.events.slice(0, input.historyLimit);
  const plumbing = switchKind(name) === "plumbing";
  const killed = env[name] === KILL;
  const parent = switchParent(name);
  const groupById = new Map(groups.map((g) => [g.id, g]));
  // A group deleted since an event names it reads as its id's first 8 characters.
  const groupName = (id: string) => groupById.get(id)?.name ?? id.slice(0, 8);
  const { userName, actor } = accountNames(accounts, viewerId);

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

  const appRow = overrides.find((o) => o.scope === "app") ?? null;
  const groupRows = overrides.filter((o) => o.scope === "group");
  const userRows = overrides.filter((o) => o.scope === "user");
  const list = (items: string[]) => (items.length ? items.join(" · ") : copy.none);
  const rungs: Rung[] = [];
  if (!plumbing) {
    rungs.push(
      rung("account", list(userRows.map((o) => `${userName(o.userId!)}: ${o.value}`)), userRows.length ? "plain" : "none", userRows.length > 0),
      rung("group", list(groupRows.map((o) => `${groupName(o.groupId!)}: ${o.value}`)), groupRows.length ? "plain" : "none", groupRows.length > 0),
    );
  }
  rungs.push(rung("app", valueText(appRow?.value ?? null), appRow ? "plain" : "none", appRow !== null));
  rungs.push(rung("env", killed ? copy.killSet : env[name] ?? adminCopy.switches.envUnset, killed ? "danger" : "mono", false));
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
  if (killed) banner = { kind: "kill", title: copy.kill.title, body: copy.kill.body(name) };
  else if (row.reason?.kind === "parent") {
    const p = row.reason.parent;
    banner = { kind: "compound", title: copy.compound.title(label(p)), body: copy.compound.body, link: copy.compound.link(label(p)), parent: p };
  }

  const meta = (o: OverrideDetail) =>
    [actor(o.updatedBy), fmtWhen(o.updatedAt), ...(killed ? [copy.refusedMeta] : plumbing ? [copy.ignoredMeta] : [])].join(" · ");
  const item = (o: OverrideDetail, key: string, title: string, sub: string): OverrideItem => ({ key, title, sub, value: o.value, note: o.note, meta: meta(o), refused: killed });
  const byTitle = (a: OverrideItem, b: OverrideItem) => a.title.localeCompare(b.title, "en-US");

  return {
    name,
    row,
    plumbing,
    rungs,
    result,
    banner,
    app: {
      value: valueText(appRow?.value ?? null),
      current: appRow?.value ?? null,
      set: appRow !== null,
      meta: appRow ? copy.appSetBy(actor(appRow.updatedBy), fmtWhen(appRow.updatedAt)) : copy.appNotSet,
      note: [appRow?.note ? copy.note(appRow.note) : "", killed ? copy.appRefused : plumbing ? "" : copy.appNotSetNote].filter(Boolean).join(" "),
      refused: killed && appRow !== null,
    },
    groups: groupRows
      .map((o) => item(o, o.groupId!, groupName(o.groupId!), copy.members(groupById.get(o.groupId!)?.members ?? 0)))
      .sort(byTitle),
    accounts: userRows.map((o) => item(o, o.userId!, userName(o.userId!), o.userId!)).sort(byTitle),
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
