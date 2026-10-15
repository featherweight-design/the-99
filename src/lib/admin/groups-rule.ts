import { adminCopy, switchCopy } from "../copy/admin";
import type { AccountSwitches } from "../switches/explain";
import { isSwitchName, SWITCHES, type SwitchName } from "../switches/registry";
import type { OverrideRow, OverrideValue, SwitchSnapshot } from "../switches/resolve";
import type { Account } from "./accounts";
import { accountName, accountNames } from "./names";
import { fmtWhen, type HistoryItem, type SwitchEvent } from "./switch-page-rule";

/**
 * The Groups pages (admin STATES G1 to G7; design table, Groups), pure: the save's validation and
 * membership diff, the events a save records, the list's cards, the editor's member rows, the
 * pending bar's sentences and the group's history. The writes are `group-writes.ts`; the reads are
 * `groups.ts`.
 */
const copy = adminCopy.groups;

export const GROUP_NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const DESCRIPTION_MAX = 500;
export const ALLOWANCE_MIN = 1;
export const ALLOWANCE_MAX = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isGroupId = (id: string) => UUID.test(id);

/** What the editor sends: the group's whole desired state, never a delta. */
export type GroupInput = {
  name?: unknown;
  description?: unknown;
  dailyAllowance?: unknown;
  members?: unknown;
  /** The account count the admin confirmed in the model confirm, or absent before one opens. */
  confirmed?: unknown;
};
export type GroupRefusal = "nameRule" | "description" | "allowance" | "members";
export type Desired = { name: string; description: string | null; dailyAllowance: number | null; members: string[]; confirmed: number | null };
export type SavedGroup = { id: string; name: string; description: string | null; dailyAllowance: number | null };

/** Checked before any lock is taken. A refusal writes nothing and records no event. */
export function validateGroup(input: GroupInput): { ok: true; desired: Desired } | { ok: false; error: GroupRefusal } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!GROUP_NAME.test(name)) return { ok: false, error: "nameRule" };
  if (input.description != null && typeof input.description !== "string") return { ok: false, error: "description" };
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (description.length > DESCRIPTION_MAX) return { ok: false, error: "description" };
  const a = input.dailyAllowance;
  if (a != null && !(typeof a === "number" && Number.isInteger(a) && a >= ALLOWANCE_MIN && a <= ALLOWANCE_MAX)) return { ok: false, error: "allowance" };
  const raw = input.members ?? [];
  if (!Array.isArray(raw) || raw.some((m) => typeof m !== "string" || m === "")) return { ok: false, error: "members" };
  const confirmed = typeof input.confirmed === "number" && Number.isInteger(input.confirmed) ? input.confirmed : null;
  return {
    ok: true,
    desired: { name, description: description || null, dailyAllowance: (a as number | null | undefined) ?? null, members: [...new Set(raw as string[])], confirmed },
  };
}

/** Who a save moves, against the memberships the DATABASE holds now. `from` is the group an add leaves. */
export type MemberDiff = { adds: { userId: string; from: string | null }[]; removes: string[] };

export function memberDiff(groupId: string, desired: readonly string[], groupOf: ReadonlyMap<string, string>): MemberDiff {
  const want = new Set(desired);
  const adds = desired.filter((id) => groupOf.get(id) !== groupId).map((userId) => ({ userId, from: groupOf.get(userId) ?? null }));
  const removes = [...groupOf].filter(([id, g]) => g === groupId && !want.has(id)).map(([id]) => id).sort();
  return { adds, removes };
}

/** The snapshot as it would read with the diff applied: one group per account, as the key holds it. */
export function withMembership(snapshot: SwitchSnapshot, groupId: string, diff: MemberDiff): SwitchSnapshot {
  const groupOf = new Map(snapshot.groupOf);
  for (const id of diff.removes) groupOf.delete(id);
  for (const { userId } of diff.adds) groupOf.set(userId, groupId);
  return { ...snapshot, groupOf };
}

export type EventRow = {
  kind: "group_created" | "group_renamed" | "group_described" | "group_allowance_set" | "member_added" | "member_removed";
  groupId: string;
  userId: string | null;
  oldValue: string | null;
  newValue: string | null;
};

const allowanceText = (n: number | null) => (n === null ? null : String(n));

/**
 * The `admin_events` rows a save records, in the order they are written: the group's own fields
 * first, then each removal, then each add. A move is `member_removed` on the group it leaves, then
 * `member_added` here (STATES G7). A save that changes nothing records nothing. `saved` is null on
 * a create, which records `group_created` and then whatever the new group was given.
 */
export function groupEvents(groupId: string, saved: SavedGroup | null, desired: Desired, diff: MemberDiff): EventRow[] {
  const row = (kind: EventRow["kind"], oldValue: string | null, newValue: string | null, userId: string | null = null, g = groupId): EventRow => ({
    kind,
    groupId: g,
    userId,
    oldValue,
    newValue,
  });
  const out: EventRow[] = [];
  if (saved === null) out.push(row("group_created", null, desired.name));
  else if (saved.name !== desired.name) out.push(row("group_renamed", saved.name, desired.name));
  if ((saved?.description ?? null) !== desired.description) out.push(row("group_described", saved?.description ?? null, desired.description));
  if ((saved?.dailyAllowance ?? null) !== desired.dailyAllowance) {
    out.push(row("group_allowance_set", allowanceText(saved?.dailyAllowance ?? null), allowanceText(desired.dailyAllowance)));
  }
  for (const id of diff.removes) out.push(row("member_removed", null, null, id));
  for (const { userId, from } of diff.adds) {
    if (from) out.push(row("member_removed", null, null, userId, from));
    out.push(row("member_added", null, null, userId));
  }
  return out;
}

/** `A`, `A and B`, `A, B and C`. */
export function joinAnd(items: readonly string[]): string {
  return items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

// ---------- what an account gains or loses ----------

/** The switch labels an account turns on and off, against what it resolves to now. */
export type Effect = { gains: string[]; losses: string[] };

export function effectBetween(now: AccountSwitches, then: AccountSwitches): Effect {
  const gains: string[] = [];
  const losses: string[] = [];
  for (const { name } of SWITCHES) {
    if (now[name].on === then[name].on) continue;
    (then[name].on ? gains : losses).push(switchCopy[name].label);
  }
  const by = (a: string, b: string) => a.localeCompare(b, "en-US");
  return { gains: gains.sort(by), losses: losses.sort(by) };
}

/**
 * Each account's effect of being in this group, and of being in none, each against its state now
 * (STATES G2, G4). One account's membership never changes another's resolution, so each is the
 * snapshot with that account's membership alone replaced. A new group carries no overrides, so being
 * in it is being in none.
 */
export function memberEffects(
  snapshot: SwitchSnapshot,
  groupId: string | null,
  ids: readonly string[],
  explain: (snapshot: SwitchSnapshot, id: string) => AccountSwitches,
): Map<string, { toThis: Effect; toNone: Effect }> {
  const out = new Map<string, { toThis: Effect; toNone: Effect }>();
  for (const id of ids) {
    const now = explain(snapshot, id);
    const none = new Map(snapshot.groupOf);
    none.delete(id);
    const toNone = effectBetween(now, explain({ ...snapshot, groupOf: none }, id));
    let toThis = toNone;
    if (groupId) {
      const here = new Map(snapshot.groupOf);
      here.set(id, groupId);
      toThis = effectBetween(now, explain({ ...snapshot, groupOf: here }, id));
    }
    out.set(id, { toThis, toNone });
  }
  return out;
}

// ---------- the list (G1, G5) ----------

export type GroupCard = {
  id: string;
  name: string;
  description: string | null;
  count: string;
  members: string;
  overrides: { name: SwitchName; label: string; value: OverrideValue }[];
};
export type GroupsList = { cards: GroupCard[]; meta: string; count: string };

export function groupsList(input: {
  groups: readonly { id: string; name: string; description: string | null }[];
  snapshot: SwitchSnapshot;
  accounts: readonly Account[];
}): GroupsList {
  const { groups, snapshot, accounts } = input;
  const { userName } = accountNames(accounts, "");
  const by = (a: string, b: string) => a.localeCompare(b, "en-US");
  const order = new Map(accounts.map((a, i) => [a.id, i]));
  const cards = [...groups]
    .sort((a, b) => by(a.name, b.name))
    .map((g) => {
      const ids = [...snapshot.groupOf].filter(([, gid]) => gid === g.id).map(([id]) => id);
      // In the universe's order (owner first, then A to Z), and any id outside it after.
      ids.sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || by(a, b));
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        count: copy.members(ids.length),
        members: ids.length ? ids.map(userName).join(", ") : copy.noMembers,
        overrides: carried(snapshot.overrides, g.id),
      };
    });
  const none = accounts.filter((a) => !snapshot.groupOf.has(a.id)).length;
  return { cards, meta: copy.headMeta(accounts.length, none), count: copy.count(groups.length) };
}

/** The overrides one group carries, A to Z by the switch's label. */
export function carried(overrides: readonly OverrideRow[], groupId: string): GroupCard["overrides"] {
  return overrides
    .flatMap((o) => (o.scope === "group" && o.groupId === groupId && isSwitchName(o.switchName) ? [{ name: o.switchName, value: o.value }] : []))
    .map((o) => ({ name: o.name, label: switchCopy[o.name].label, value: o.value }))
    .sort((a, b) => a.label.localeCompare(b.label, "en-US"));
}

// ---------- the editor (G2, G3, G4) ----------

export type MemberRow = {
  id: string;
  name: string;
  email: string | null;
  /** The group the database holds it in now, or null. */
  saved: { id: string; name: string } | null;
  toThis: Effect;
  toNone: Effect;
};

/**
 * Every account the editor lists: the universe, then any member of this group the universe misses
 * (Clerk down), so a saved member can always be seen and removed.
 */
export function memberRows(input: {
  accounts: readonly Account[];
  snapshot: SwitchSnapshot;
  groupId: string | null;
  groupNames: ReadonlyMap<string, string>;
  effects: ReadonlyMap<string, { toThis: Effect; toNone: Effect }>;
}): MemberRow[] {
  const { accounts, snapshot, groupId, groupNames, effects } = input;
  const listed = new Set(accounts.map((a) => a.id));
  const extra = groupId
    ? [...snapshot.groupOf].filter(([id, g]) => g === groupId && !listed.has(id)).map(([id]) => ({ id, name: null, email: null }))
    : [];
  const empty: Effect = { gains: [], losses: [] };
  return [...accounts, ...extra].map((a) => {
    const g = snapshot.groupOf.get(a.id);
    const e = effects.get(a.id) ?? { toThis: empty, toNone: empty };
    return {
      id: a.id,
      name: accountName(a),
      email: a.email,
      saved: g ? { id: g, name: groupNames.get(g) ?? g.slice(0, 8) } : null,
      toThis: e.toThis,
      toNone: e.toNone,
    };
  });
}

/** One member row as drawn for the current selection. */
export function memberState(row: MemberRow, selected: boolean, groupId: string | null): { sub: string | null; state: string; unsaved: boolean } {
  const savedHere = groupId !== null && row.saved?.id === groupId;
  const sub = selected && !savedHere && row.saved ? copy.movesFrom(row.saved.name) : row.saved ? copy.inGroup(row.saved.name) : null;
  const state = !selected ? copy.unselected : savedHere ? copy.selected : copy.selectedUnsaved;
  return { sub, state, unsaved: selected !== savedHere };
}

export type Draft = { name: string; description: string; credits: string };

/** The credits field as the server will read it: empty is null, a non-number NaN. */
export function parseCredits(text: string): number | null {
  const t = text.trim();
  return t === "" ? null : /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

/**
 * The pending bar (STATES G2, G4): null when nothing differs from what is saved, else a title and
 * one sentence per change, naming what each moved account gains or loses, with no pronoun.
 */
export function pendingSummary(input: {
  saved: SavedGroup | null;
  draft: Draft;
  rows: readonly MemberRow[];
  selected: ReadonlySet<string>;
}): { title: string; body: string; count: number } | null {
  const { saved, draft, rows, selected } = input;
  const groupId = saved?.id ?? null;
  const name = draft.name.trim();
  // A rename in the same save names the destination by the name it will carry.
  const target = name || saved?.name || copy.thisGroup;
  const lines: string[] = [];
  let fields = 0;
  if (saved && name !== saved.name) {
    fields++;
    lines.push(copy.pending.rename(saved.name, name || "?"));
  }
  // A new group's name is a change of its own: with only a name typed, Create still needs the bar (G3).
  if (!saved && name) {
    fields++;
    lines.push(copy.pending.create(name));
  }
  if ((draft.description.trim() || null) !== (saved?.description ?? null)) {
    fields++;
    lines.push(copy.pending.describe);
  }
  const credits = parseCredits(draft.credits);
  if (!Object.is(credits, saved?.dailyAllowance ?? null)) {
    fields++;
    if (!Number.isNaN(credits)) lines.push(copy.pending.credits(credits));
  }
  const changed: { row: MemberRow; selected: boolean }[] = [];
  for (const row of rows) {
    const sel = selected.has(row.id);
    if (!memberState(row, sel, groupId).unsaved) continue;
    changed.push({ row, selected: sel });
    const effect = sel ? row.toThis : row.toNone;
    const move = sel && row.saved !== null;
    const head = !sel ? copy.pending.remove(row.name, target) : move ? copy.pending.move(row.name, row.saved!.name, target) : copy.pending.add(row.name, target);
    const tail =
      effect.gains.length || effect.losses.length
        ? copy.pending.gains(move ? "" : row.name, joinAnd(effect.gains), joinAnd(effect.losses))
        : copy.pending.nothing(row.name);
    lines.push(head + tail);
  }
  const count = fields + changed.length;
  if (count === 0) return null;
  const title =
    count === 1 && changed.length === 1 ? copy.pending.one(changed[0].row.name, changed[0].selected) : count === 1 ? copy.pending.fields : copy.pending.many(count);
  return { title, body: lines.join(" "), count };
}

// ---------- history ----------

export type GroupEvent = SwitchEvent & { switchName: string | null };

/** The group's history, newest first: its own changes, its members coming and going, its overrides. */
export function groupHistory(events: readonly GroupEvent[], accounts: readonly Account[], viewerId: string): HistoryItem[] {
  const { userName, actor } = accountNames(accounts, viewerId);
  const h = copy.history;
  const off = adminCopy.switch.history.notSet;
  const credits = (v: string | null) => v ?? h.creditsDefault;
  return events.flatMap((e) => {
    const who = actor(e.actorId);
    const label = e.switchName && isSwitchName(e.switchName) ? switchCopy[e.switchName].label : e.switchName ?? "";
    let what: string;
    switch (e.kind) {
      case "group_created":
        what = h.created(who, e.newValue ?? "");
        break;
      case "group_renamed":
        what = h.renamed(who, e.oldValue ?? "", e.newValue ?? "");
        break;
      case "group_described":
        what = h.described(who, e.newValue);
        break;
      case "group_allowance_set":
        what = h.credits(who, credits(e.oldValue), credits(e.newValue));
        break;
      case "member_added":
        what = h.added(who, userName(e.userId ?? ""));
        break;
      case "member_removed":
        what = h.removed(who, userName(e.userId ?? ""));
        break;
      case "override_set":
        what = h.overrideSet(who, label, e.oldValue ?? off, e.newValue ?? off);
        break;
      case "override_cleared":
        what = h.overrideCleared(who, label, e.oldValue ?? off);
        break;
      default:
        return [];
    }
    return [{ when: fmtWhen(e.at), what, note: e.note }];
  });
}
