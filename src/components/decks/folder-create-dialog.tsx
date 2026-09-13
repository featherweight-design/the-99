"use client";

// Create (STATES §5). One field, two buttons, and exactly two reachable
// refusals: an empty name DISABLES `Create` and says nothing, and a duplicate is
// the unique index's answer said in words.
//
// Length is unreachable — the field carries `maxLength`. Control characters are
// STRIPPED on input rather than refused (errata E16): `maxLength` does not stop
// a paste, `validateFolderName` would refuse one, and drawing a third refusal
// for characters the reader cannot see is worse than removing them.
//
// No blur commit anywhere in here. That is the deck header's ruling, and in a
// panel form blur lands before the button's click and double-submits
// (`rename-form.tsx:21-23`).

import { useId, useRef, useState } from "react";
import { PrimaryButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { folderCopy } from "../../lib/copy/folders";
import { FOLDER_NAME_MAX } from "../../lib/decks/folder-name";

/** The characters `validateFolderName` refuses: C0, DEL and C1. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

export const stripControlChars = (value: string) => value.replace(CONTROL_CHARS, "");

export function FolderCreateDialog({
  onCreate,
  onDismiss,
}: {
  /** Resolves to a refusal to state, or null when the folder was made. */
  onCreate: (name: string) => Promise<"duplicate" | "invalid" | null>;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  // A dismissal mid-flight would unmount the dialog while the write it started
  // goes on to succeed — the reader cancels and gets a folder anyway. Every
  // path is guarded together, which is why the hook is handed this and not
  // `onDismiss` directly.
  const dismiss = () => {
    if (pending) return;
    onDismiss();
  };

  // `initialFocusRef`, never native `autoFocus`: the attribute focuses the input
  // before the hook's mount effect records what to return focus TO, so the hook
  // would capture this input as its own return target and, on close, focus an
  // element that no longer exists.
  useDialogA11y(dialog, dismiss, { initialFocusRef: input });

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const errorId = useId();
  const trimmed = value.trim();
  const canCreate = trimmed.length > 0 && !pending;

  async function submit() {
    if (!canCreate) return;
    setPending(true);
    try {
      const refusal = await onCreate(trimmed);
      // The typed value survives a refusal — R3's rule, and the same reason
      // applies here: a reader who typed a near-miss needs to see it. The two
      // refusals say different things: one names the folder that already has
      // the name, the other cannot.
      if (refusal === "duplicate") setError(folderCopy.create.duplicate(trimmed));
      else if (refusal) setError(folderCopy.create.refused);
      else onDismiss();
    } catch {
      // A thrown action — an outage, a timeout — must not leave the field
      // read-only with a dead button. The reader can try again.
      setError(folderCopy.create.refused);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center px-[16px]">
      <div
        aria-hidden="true"
        onClick={dismiss}
        className="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={folderCopy.create.heading}
        tabIndex={-1}
        className="relative z-10 mx-auto flex w-full max-w-[380px] flex-col gap-[12px] rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] p-[16px]"
      >
        <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
          {folderCopy.create.heading}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-[10px]"
        >
          <TextField
            ref={input}
            value={value}
            onChange={(e) => {
              setValue(stripControlChars(e.target.value));
              setError(null);
            }}
            maxLength={FOLDER_NAME_MAX}
            placeholder={folderCopy.create.placeholder}
            aria-label={folderCopy.create.fieldAria}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            readOnly={pending}
            className={`w-full rounded-[8px] px-[11px] py-[9px] font-sans text-[14px] ${
              error ? "border-[color:var(--danger)]" : ""
            }`}
          />

          {/* An alert, and named by the field: a refusal inserted into a plain
              paragraph is never read, and the reader whose focus is in the
              field is the one who needs it. */}
          {error && (
            <p
              id={errorId}
              role="alert"
              className="m-0 font-mono text-[11px]"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-[8px]">
            <button
              type="button"
              disabled={pending}
              onClick={dismiss}
              className="h-[36px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-sans text-[13px] text-[color:var(--fg-body)]"
            >
              {folderCopy.create.cancel}
            </button>
            <PrimaryButton
              type="submit"
              disabled={!canCreate}
              className="h-[36px] rounded-[8px] px-[14px] text-[13px]"
            >
              {folderCopy.create.submit}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
