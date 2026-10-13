"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearSwitchOverride, setSwitchOverride } from "../../app/admin/switches/actions";
import type { ConfirmPreview, WriteResult } from "../../lib/admin/switch-writes";
import type { Op, Scope, WriteInput } from "../../lib/admin/switch-writes-rule";
import { adminCopy } from "../../lib/copy/admin";
import type { OverrideValue } from "../../lib/switches/resolve";
import { ModelConfirm, type ConfirmContext } from "./model-confirm";

// The switch page's writes (admin STATES F3, F5, F9 to F12; design table, Switch page): the App-wide
// segment, On and Off on each override row, and Clear. Each control runs its own write: the option
// pressed holds while it is in flight and the others are disabled, with no spinner (F10); a failure
// says so under the control with Try again (F11); a rise in model access opens the confirm (F3). A
// saved write refreshes the page, which reads the tables fresh.

const copy = adminCopy.switch;

export type Target = { switchName: string; scope: Scope; groupId?: string; targetUserId?: string };

type Pending = { op: Op; value: OverrideValue | null; note: string | null };

/** One control's write: its pending option, its failure, and its confirm. */
export function useOverrideWrite(target: Target, context: Omit<ConfirmContext, "op">) {
  const router = useRouter();
  const [inFlight, setInFlight] = useState<Pending | null>(null);
  const [failed, setFailed] = useState<{ again: Pending; refused: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ preview: ConfirmPreview; pending: Pending } | null>(null);

  async function run(p: Pending, confirmed?: number) {
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
      router.refresh();
    } else if (result.error === "confirm") {
      setConfirm({ preview: result.preview, pending: p });
    } else {
      setConfirm(null);
      setFailed({ again: p, refused: result.error !== "failed" });
    }
  }

  const dialog = confirm && (
    <ModelConfirm
      preview={confirm.preview}
      context={{ ...context, op: confirm.pending.op }}
      pending={inFlight !== null}
      onCancel={() => setConfirm(null)}
      onConfirm={(note) => run({ ...confirm.pending, note: note.trim() || confirm.pending.note }, confirm.preview.count)}
    />
  );
  const failure = failed && (
    <p role="alert" className="m-0 flex flex-wrap items-baseline gap-x-[10px] text-[12.5px] leading-[1.5] text-[color:var(--danger)]">
      <span>{failed.refused ? copy.refusal : copy.saveFailed}</span>
      {!failed.refused && (
        <button type="button" onClick={() => run(failed.again)} className="border-0 bg-transparent p-0 text-[12.5px] text-[color:var(--accent)]">
          {copy.tryAgain}
        </button>
      )}
    </p>
  );
  return { run, inFlight, dialog, failure };
}

/**
 * A segmented control (design table: seg), a `radiogroup`. While a write is in flight its option
 * shows pressed and every other option is disabled (F10).
 */
export function Seg<K extends string>({
  label,
  options,
  selected,
  pressed,
  disabled,
  fill,
  locked = [],
  onPick,
}: {
  label: string;
  options: readonly { key: K; text: string }[];
  selected: K | null;
  pressed: K | null;
  disabled: boolean;
  /** Options disabled on their own: under a kill, App-wide's On and Off, while Not set clears (F5). */
  locked?: readonly K[];
  /** Full width, options equal (the phone's App-wide segment). */
  fill?: boolean;
  onPick: (key: K) => void;
}) {
  const shown = pressed ?? selected;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`gap-[3px] rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[3px] ${fill ? "flex md:inline-flex md:self-start" : "inline-flex flex-none self-start md:self-center"}`}
    >
      {options.map((o) => {
        const on = o.key === shown;
        const off = disabled || locked.includes(o.key) || (pressed !== null && !on);
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={off}
            onClick={() => !on && onPick(o.key)}
            className={`inline-flex items-center justify-center rounded-[6px] border border-solid px-[14px] text-[13px] ${fill ? "h-[40px] flex-1 md:h-[32px] md:flex-none" : "h-[36px] px-[12px] md:h-[28px]"} ${
              on ? "border-[color:var(--border-dashed)] bg-[color:var(--elevated)] font-medium" : "border-[color:transparent] bg-transparent"
            } ${off ? "text-[color:var(--fg-disabled)]" : on ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
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
  const pressed: AppKey | null = w.inFlight ? (w.inFlight.op === "clear" ? "notSet" : w.inFlight.value!) : null;
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
        fill
        onPick={(k) => w.run(k === "notSet" ? { op: "clear", value: null, note: null } : { op: "set", value: k, note: null })}
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
}) {
  const w = useOverrideWrite(target, context);
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
        onClick={() => (pending ? onCleared?.() : w.run({ op: "clear", value: null, note: null }))}
        className="absolute right-[14px] top-[12px] min-h-[24px] border-0 bg-transparent p-0 text-[13px] text-[color:var(--accent)] disabled:text-[color:var(--fg-disabled)] md:static md:flex-none"
      >
        {pending ? copy.cancelAdd : copy.clear}
      </button>
      {w.dialog}
    </>
  );
}
