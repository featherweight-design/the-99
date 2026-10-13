import { KILL, type OverrideRow, type OverrideValue, type SwitchSnapshot } from "../switches/resolve";
import { isSwitchName, switchKind, type SwitchName } from "../switches/registry";

/**
 * An admin override write, checked before anything is read under a lock (admin plan 8c, "The write,
 * in order", step 1), pure. A refusal writes nothing and records no event.
 *
 * - `switch`: not a registry name.
 * - `scope`: not app, group or user.
 * - `plumbing`: a plumbing switch at any scope but app-wide.
 * - `killed`: a SET while the env var is `off`. A clear is allowed: "Clear still works" (F5).
 * - `target`: a group or account missing, or one given where the scope takes none.
 * - `account`: an account outside this environment's universe.
 * - `value`: a set whose value is not on or off.
 * - `note`: over 500 characters, refused and never cut, the Costs rule.
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
};
export type Write = {
  op: Op;
  name: SwitchName;
  scope: Scope;
  groupId: string | null;
  userId: string | null;
  /** Null on a clear. */
  value: OverrideValue | null;
  /** The row's note on a set; on a clear, the event's alone. */
  note: string | null;
  confirmed: number | null;
};

export const NOTE_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPES: readonly Scope[] = ["app", "group", "user"];

export function validate(
  op: Op,
  input: WriteInput,
  env: Readonly<Record<SwitchName, string | null>>,
  universe: ReadonlySet<string>,
): { ok: true; write: Write } | { ok: false; error: Refusal } {
  const name = input.switchName;
  if (typeof name !== "string" || !isSwitchName(name)) return { ok: false, error: "switch" };
  const scope = input.scope as Scope;
  if (!SCOPES.includes(scope)) return { ok: false, error: "scope" };
  if (switchKind(name) === "plumbing" && scope !== "app") return { ok: false, error: "plumbing" };
  if (op === "set" && env[name] === KILL) return { ok: false, error: "killed" };
  const groupId = typeof input.groupId === "string" ? input.groupId : null;
  const userId = typeof input.targetUserId === "string" ? input.targetUserId : null;
  const targetOk =
    scope === "app" ? input.groupId == null && input.targetUserId == null
    : scope === "group" ? groupId !== null && UUID.test(groupId) && input.targetUserId == null
    : userId !== null && userId !== "" && input.groupId == null;
  if (!targetOk) return { ok: false, error: "target" };
  if (scope === "user" && !universe.has(userId!)) return { ok: false, error: "account" };
  let value: OverrideValue | null = null;
  if (op === "set") {
    if (input.value !== "on" && input.value !== "off") return { ok: false, error: "value" };
    value = input.value;
  }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > NOTE_MAX) return { ok: false, error: "note" };
  const confirmed = typeof input.confirmed === "number" && Number.isInteger(input.confirmed) ? input.confirmed : null;
  return {
    ok: true,
    write: { op, name, scope, groupId: scope === "group" ? groupId : null, userId: scope === "user" ? userId : null, value, note: note || null, confirmed },
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
