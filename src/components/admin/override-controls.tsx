"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearSwitchOverride, setSwitchOverride } from "../../app/admin/switches/actions";
import type { ConfirmPreview, WriteResult } from "../../lib/admin/switch-writes";
import type { Op, Scope, WriteInput } from "../../lib/admin/switch-writes-rule";
import { adminCopy } from "../../lib/copy/admin";
import type { OverrideValue } from "../../lib/switches/resolve";
import { ALL_FEATURES } from "../../lib/switches/registry";
import { ModelConfirm, type ConfirmContext } from "./model-confirm";
import { onSegmentKeys } from "../ui/segment-keys";

// The switch page's writes (admin STATES F3, F5, F9 to F12; design table, Switch page): the App-wide
// segment, On and Off on each override row, and Clear. Each control runs its own write: the option
// pressed holds while it is in flight and the others are disabled, with no spinner (F10); a failure
// says so under the control with Try again (F11); a rise in model access opens the confirm (F3). A
// saved write refreshes the page, which reads the tables fresh, and the option stays pressed until
// that refresh has drawn: released any earlier, the control showed the value the page was drawn with
// for a beat, so On flipped back to Off and then to On again.

const copy = adminCopy.switch;

export type Target = { switchName: string; scope: Scope; groupId?: string; targetUserId?: string };

type Pending = { op: Op; value: OverrideValue | null; note: string | null };

/** One control's write: its pending option, its failure, and its confirm. */
export function useOverrideWrite(target: Target, context: Omit<ConfirmContext, "op">, onSaved?: (p: Pending) => void) {
  const router = useRouter();
  const [inFlight, setInFlight] = useState<Pending | null>(null);
  // The saved write, held while the refresh that redraws the page with it is still pending.
  const [settling, setSettling] = useState<Pending | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [failed, setFailed] = useState<{ again: Pending; refused: boolean; clerkDown?: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ preview: ConfirmPreview; pending: Pending } | null>(null);
  const confirmAfter = useRef<(() => void) | null>(null);

  /** `afterSave` runs once the write saves, before the refresh redraws the page. */
  async function run(p: Pending, confirmed?: number, afterSave?: () => void) {
    setFailed(null);
    setInFlight(p);
    const input: WriteInput = { ...target, ...(p.op === "set" ? { value: p.value } : {}), ...(p.note ? { note: p.note } : {}), ...(confirmed !== undefined ? { confirmed } : {}) };
    let result: WriteResult;
    try {
      result = p.op === "set" ? await setSwitchOverride(input) : await clearSwitchOverride(input);
    } catch {
      result = { ok: false, error: "failed" };
    }
    setInFlight(null);
    if (result.ok) {
      setConfirm(null);
      confirmAfter.current = null;
      afterSave?.();
      setSettling(p);
      // The caller's own updates (a pending row handing back to its picker) ride in the same transition,
      // so they commit with the redrawn page rather than ahead of it.
      startRefresh(() => {
        onSaved?.(p);
        router.refresh();
      });
    } else if (result.error === "confirm") {
      // A confirmed write saves later, from the dialog: keep what it should do then (and nothing
      // else's: a dialog for a set must never run a cancelled clear's callback).
      confirmAfter.current = afterSave ?? null;
      setConfirm({ preview: result.preview, pending: p });
    } else {
      setConfirm(null);
      setFailed({ again: p, refused: result.error !== "failed", clerkDown: result.error === "accounts" });
    }
  }

  const dialog = confirm && (
    <ModelConfirm
      preview={confirm.preview}
      context={{ ...context, op: confirm.pending.op }}
      pending={inFlight !== null}
      onCancel={() => {
        confirmAfter.current = null;
        setConfirm(null);
      }}
      onConfirm={(note) => run({ ...confirm.pending, note: note.trim() || confirm.pending.note }, confirm.preview.count, confirmAfter.current ?? undefined)}
    />
  );
  const failure = failed && (
    <p role="alert" className="m-0 flex flex-wrap items-baseline gap-x-[10px] text-[12.5px] leading-[1.5] text-[color:var(--danger)]">
      <span>{failed.clerkDown ? copy.clerkDownRefusal : failed.refused ? copy.refusal : copy.saveFailed}</span>
      {!failed.refused && (
        <button type="button" onClick={() => run(failed.again)} className="border-0 bg-transparent p-0 text-[12.5px] text-[color:var(--accent)]">
          {copy.tryAgain}
        </button>
      )}
    </p>
  );
  /** The write the open confirm is asking about (F3 rings its option). */
  const confirming = confirm?.pending ?? null;
  return { run, inFlight: inFlight ?? (refreshing ? settling : null), confirming, dialog, failure };
}

/**
 * A segmented control (design table: seg), a `radiogroup`. While a write is in flight its option
 * shows pressed and every other option is disabled (F10). One tab stop, and the app's segment keys (arrows,
 * Home, End) move the FOCUS over the options that are not disabled; Enter or Space picks. Unlike the app's
 * segmented switch the choice does not follow focus here, because a pick saves an override at once and an
 * arrow must not write one. Its markup stays its own (segmented-switch plan, PR 2).
 */
export function Seg<K extends string>({
  label,
  options,
  selected,
  pressed,
  disabled,
  fill,
  locked = [],
  ringed = null,
  onPick,
}: {
  label: string;
  options: readonly { key: K; text: string }[];
  selected: K | null;
  pressed: K | null;
  disabled: boolean;
  /** Options disabled on their own: under a kill, App-wide's On and Off, while Not set clears (F5). */
  locked?: readonly K[];
  /** The option an open confirm is asking about, ringed in dashed accent (F3). */
  ringed?: K | null;
  /** Full width, options equal (the phone's App-wide segment). */
  fill?: boolean;
  onPick: (key: K) => void;
}) {
  const shown = pressed ?? selected;
  const base = useId();
  const idOf = (k: K) => `${base}-${k}`;
  const keys = options.map((o) => o.key);
  const isOff = (k: K) => disabled || locked.includes(k) || (pressed !== null && k !== shown);
  // The tab stop: the shown option while it can take focus, else the first that can.
  const stop = shown !== null && !isOff(shown) ? shown : keys.find((k) => !isOff(k)) ?? null;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(e) => onSegmentKeys(e, keys, idOf, () => {}, isOff)}
      className={`gap-[3px] rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[3px] ${fill ? "flex md:inline-flex md:self-start" : "inline-flex flex-none self-start md:self-center"}`}
    >
      {options.map((o) => {
        const on = o.key === shown;
        const off = isOff(o.key);
        return (
          <button
            key={o.key}
            type="button"
            id={idOf(o.key)}
            tabIndex={o.key === stop ? 0 : -1}
            role="radio"
            aria-checked={on}
            disabled={off}
            onClick={() => !on && onPick(o.key)}
            className={`inline-flex items-center justify-center rounded-[6px] border border-solid text-[13px] ${fill ? "h-[40px] flex-1 px-[14px] md:h-[32px] md:flex-none" : "h-[36px] px-[12px] md:h-[28px]"} ${
              on ? "border-[color:var(--border-dashed)] bg-[color:var(--elevated)] font-medium" : o.key === ringed ? "border-dashed border-[color:var(--accent)] bg-transparent" : "border-[color:transparent] bg-transparent"
            } ${off ? "text-[color:var(--fg-disabled)]" : on || o.key === ringed ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A cleared row leaves the page, and the button that cleared it with it, so focus goes to its
 * section's Add button rather than falling to the document.
 */
function focusAdd(scope: Scope) {
  document.querySelector<HTMLButtonElement>(`[data-add-override="${scope}"]`)?.focus();
}

const APP_OPTIONS = [
  { key: "notSet", text: copy.appOpts.notSet },
  { key: "on", text: copy.appOpts.on },
  { key: "off", text: copy.appOpts.off },
] as const;
type AppKey = (typeof APP_OPTIONS)[number]["key"];

/** The App-wide segment (F9). `Not set` clears; under a kill the segment is disabled (F5). */
export function AppWideControl({ name, label, value, killed }: { name: string; label: string; value: OverrideValue | null; killed: boolean }) {
  const w = useOverrideWrite({ switchName: name, scope: "app" }, { switchLabel: label, scope: "app", groupName: null });
  const keyOf = (p: { op: string; value: OverrideValue | null } | null): AppKey | null => (p ? (p.op === "clear" ? "notSet" : p.value!) : null);
  const pressed = keyOf(w.inFlight);
  return (
    <div className="flex flex-col gap-[8px]">
      <Seg
        label={copy.appHead}
        options={APP_OPTIONS}
        selected={value ?? "notSet"}
        pressed={pressed}
        // Under a kill a set must not be made, but a row already there can still be cleared.
        disabled={killed && value === null}
        locked={killed ? ["on", "off"] : []}
        ringed={keyOf(w.confirming)}
        fill
        onPick={(k) => w.run(k === "notSet" ? { op: "clear", value: null, note: null } : { op: "set", value: k, note: null })}
      />
      {w.failure}
      {w.dialog}
    </div>
  );
}

const ALL_OPTIONS = [
  { key: "notSet", text: copy.appOpts.notSet },
  { key: "on", text: copy.appOpts.on },
] as const;
type AllKey = (typeof ALL_OPTIONS)[number]["key"];

/**
 * An account's All features (`ALL_FEATURES`): the App-wide segment's own anatomy at account scope, with
 * no Off, since an Off row would mean nothing the absence does not. On sets the row, `Not set` clears it;
 * the write, its confirm on a rise in model access and its `admin_events` row are the override write's.
 */
export function AllFeaturesControl({ userId, label, value }: { userId: string; label: string; value: boolean }) {
  const w = useOverrideWrite({ switchName: ALL_FEATURES, scope: "user", targetUserId: userId }, { switchLabel: label, scope: "user", groupName: null });
  const keyOf = (p: { op: string } | null): AllKey | null => (p ? (p.op === "clear" ? "notSet" : "on") : null);
  return (
    <div className="flex flex-col gap-[8px]">
      <Seg
        label={label}
        options={ALL_OPTIONS}
        selected={value ? "on" : "notSet"}
        pressed={keyOf(w.inFlight)}
        disabled={false}
        ringed={keyOf(w.confirming)}
        onPick={(k) => w.run(k === "notSet" ? { op: "clear", value: null, note: null } : { op: "set", value: "on", note: null })}
      />
      {w.failure}
      {w.dialog}
    </div>
  );
}

/**
 * On and Off on an override row, with Clear (F9, F10, F11). Under a kill the segment is disabled and
 * Clear stays live (F5). `whatsNew` draws F12's line under a group row turned on.
 */
export function RowControls({
  target,
  title,
  value,
  note,
  killed,
  context,
  onCleared,
  initialNote,
  announces,
  onSaved,
}: {
  target: Target;
  title: string;
  /** Null for a pending row not yet written (F7, F8). */
  value: OverrideValue | null;
  note?: React.ReactNode;
  killed: boolean;
  context: Omit<ConfirmContext, "op">;
  /** A pending row's Cancel, in place of Clear. */
  onCleared?: () => void;
  initialNote?: string;
  /** F12: a group row turned on for a feature that is not a model one says members see it next visit. */
  announces?: boolean;
  /** Called once a write saves: a pending row hands back to its picker (F7, F8). */
  onSaved?: (value: OverrideValue | null) => void;
}) {
  const w = useOverrideWrite(target, context, (p) => onSaved?.(p.value));
  const [draft, setDraft] = useState(initialNote ?? "");
  const [savedOn, setSavedOn] = useState(false);
  const pending = value === null;
  const pressed = w.inFlight?.op === "set" ? w.inFlight.value : null;
  const pick = (v: OverrideValue) => {
    setSavedOn(target.scope === "group" && v === "on");
    w.run({ op: "set", value: v, note: pending ? draft.trim() || null : null });
  };
  return (
    <>
      <Seg
        label={copy.rowLabel(title)}
        options={[
          { key: "on", text: copy.appOpts.on },
          { key: "off", text: copy.appOpts.off },
        ]}
        selected={value}
        pressed={pressed}
        ringed={w.confirming?.op === "set" ? w.confirming.value : null}
        disabled={killed || (w.inFlight?.op === "clear")}
        onPick={pick}
      />
      <div className="flex min-w-0 flex-col gap-[4px] md:flex-[1.3]">
        {pending ? (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              autoComplete="off"
              aria-label={copy.noteField}
              placeholder={copy.noteField}
              className="h-[44px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[32px] md:text-[13px]"
            />
            <span className="text-[12px] text-[color:var(--fg-faint)]">{copy.pendingHint}</span>
          </>
        ) : (
          note
        )}
        {w.failure}
        {announces && savedOn && value === "on" && !w.inFlight && (
          <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{copy.whatsNewInline}</span>
        )}
      </div>
      <button
        type="button"
        disabled={w.inFlight !== null}
        onClick={() => (pending ? onCleared?.() : w.run({ op: "clear", value: null, note: null }, undefined, () => focusAdd(target.scope)))}
        className="absolute right-[14px] top-[12px] min-h-[24px] border-0 bg-transparent p-0 text-[13px] text-[color:var(--accent)] disabled:text-[color:var(--fg-disabled)] md:static md:flex-none"
      >
        {pending ? copy.cancelAdd : copy.clear}
      </button>
      {w.dialog}
    </>
  );
}
