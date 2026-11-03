import { envStops, KILLED, type OverrideRow, type RowValue, type SwitchSnapshot } from "../flags/resolve";
import { ALL_FEATURES, isSwitchName, switchKind, type OverrideName, type SwitchName } from "../flags/registry";

/**
 * An admin override write, checked before anything is read under a lock (admin plan 8c, "The write,
 * in order", step 1), pure. A refusal writes nothing and records no event.
 *
 * - `switch`: not a registry name, nor `ALL_FEATURES`.
 * - `scope`: not app, group or user.
 * - `plumbing`: a plumbing switch at any scope but app-wide.
 * - `killed`: a SET while the model-call switch's env var stops it (`envStops`). A clear is allowed: "Clear still works"
 *   (F5). A database kill is checked under the lock (`switch-writes.ts`), since only the locked rows can say.
 * - `target`: a group or account missing, or one given where the scope takes none.
 * - `account`: an account outside this environment's universe.
 * - `value`: a set whose value is not on or off, or `killed` on the app-wide row (the kill control, plan PR 3; the
 *   `flag_overrides_killed_scope_check` allows it nowhere else); for `ALL_FEATURES`, not on (Off is a clear). Also an
 *   `expected` that is not a row value.
 * - `note`: over 500 characters, refused and never cut, the Costs rule.
 *
 * `ALL_FEATURES` is account-scoped only: any other scope is `scope`.
 */
export type Op = "set" | "clear";
export type Scope = OverrideRow["scope"];
export type Refusal = "switch" | "scope" | "plumbing" | "killed" | "target" | "account" | "value" | "note";
export type WriteInput = {
  switchName?: unknown;
  scope?: unknown;
  groupId?: unknown;
  targetUserId?: unknown;
  value?: unknown;
  note?: unknown;
  /** The account count the admin confirmed in the dialog, or absent before one opens. */
  confirmed?: unknown;
  /**
   * The app-wide row's value as the admin's page drew it (`null`: no row), sent by the App-wide control alone. The
   * write refuses when the locked row reads otherwise, so a kill committed by SQL after the page was drawn is never
   * overwritten by a write that did not see it. Absent, the write refuses over any `killed` app row.
   */
  expected?: unknown;
};
export type Write = {
  op: Op;
  name: OverrideName;
  scope: Scope;
  groupId: string | null;
  userId: string | null;
  /** Null on a clear. `killed` on the app-wide row alone. */
  value: RowValue | null;
  /** The row's note on a set; on a clear, the event's alone. */
  note: string | null;
  confirmed: number | null;
  /** The app-wide value the admin saw (`null`: none), or undefined when the input carried none. App scope only. */
  expected?: RowValue | null;
};

export const NOTE_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPES: readonly Scope[] = ["app", "group", "user"];
const ROW_VALUES: readonly unknown[] = ["on", "off", KILLED];

export function validate(
  op: Op,
  input: WriteInput,
  env: Readonly<Record<SwitchName, string | null>>,
  universe: ReadonlySet<string>,
): { ok: true; write: Write } | { ok: false; error: Refusal } {
  const name = input.switchName;
  const all = name === ALL_FEATURES;
  if (typeof name !== "string" || !(all || isSwitchName(name))) return { ok: false, error: "switch" };
  const scope = input.scope as Scope;
  if (!SCOPES.includes(scope) || (all && scope !== "user")) return { ok: false, error: "scope" };
  if (!all && switchKind(name) === "plumbing" && scope !== "app") return { ok: false, error: "plumbing" };
  if (!all && op === "set" && envStops(name, env)) return { ok: false, error: "killed" };
  const groupId = typeof input.groupId === "string" ? input.groupId : null;
  const userId = typeof input.targetUserId === "string" ? input.targetUserId : null;
  const targetOk =
    scope === "app" ? input.groupId == null && input.targetUserId == null
    : scope === "group" ? groupId !== null && UUID.test(groupId) && input.targetUserId == null
    : userId !== null && userId !== "" && input.groupId == null;
  if (!targetOk) return { ok: false, error: "target" };
  if (scope === "user" && !universe.has(userId!)) return { ok: false, error: "account" };
  let value: RowValue | null = null;
  if (op === "set") {
    const ok = input.value === "on" || (!all && (input.value === "off" || (input.value === KILLED && scope === "app")));
    if (!ok) return { ok: false, error: "value" };
    value = input.value as RowValue;
  }
  if (input.expected !== undefined && (scope !== "app" || (input.expected !== null && !ROW_VALUES.includes(input.expected)))) return { ok: false, error: "value" };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > NOTE_MAX) return { ok: false, error: "note" };
  const confirmed = typeof input.confirmed === "number" && Number.isInteger(input.confirmed) ? input.confirmed : null;
  return {
    ok: true,
    write: {
      op,
      name,
      scope,
      groupId: scope === "group" ? groupId : null,
      userId: scope === "user" ? userId : null,
      value,
      note: note || null,
      confirmed,
      ...(input.expected !== undefined ? { expected: input.expected as RowValue | null } : {}),
    },
  };
}

const sameTarget = (o: OverrideRow, w: Write) => o.switchName === w.name && o.scope === w.scope && o.groupId === w.groupId && o.userId === w.userId;

/** The snapshot as it would read with `write` applied. */
export function applyWrite(snapshot: SwitchSnapshot, write: Write): SwitchSnapshot {
  const rest = snapshot.overrides.filter((o) => !sameTarget(o, write));
  if (write.op === "clear") return { ...snapshot, overrides: rest };
  return { ...snapshot, overrides: [...rest, { switchName: write.name, scope: write.scope, groupId: write.groupId, userId: write.userId, value: write.value! }] };
}

/** A write that changes nothing: a set to the same value and note, or a clear of no row. */
export function isNoop(current: { value: string; note: string | null } | null, write: Write): boolean {
  if (write.op === "clear") return current === null;
  return current !== null && current.value === write.value && (current.note ?? null) === write.note;
}
