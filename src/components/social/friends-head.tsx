"use client";
// The head of /friends (Social R1 R2 Friends F1, F5, F6): your face, the title, and the name friends see
// with its `Change`. It is the ONE place a player sets their name and their commander
// (R2 decision 20). The face opens the picker, and so does `Choose your commander` while none is set; the
// write and the toast are the page's, so the head draws and reports.
//
// The name field: Save or Return commits, Cancel or Escape puts the name back. A blur commits too, unless
// focus went to the field's own Cancel or Save, which would otherwise submit twice (the folder rename's
// trap). Safari never focuses a clicked button, so the blur would arrive with no relatedTarget and Cancel would
// save: both buttons keep focus in the field on mousedown, as `rename-form.tsx` does. Empty or unchanged reverts.
// At desktop the field sits in the title column under the h1; at phone it runs the page's width under the row. The cap is counted in code points (`capName`, E14), never `maxLength`.

import { useId, useRef, useState, type RefObject } from "react";
import { socialCopy } from "../../lib/copy/social";
import { capName, DISPLAY_NAME_MAX } from "../../lib/social/client-rules";
import type { ProfileCommander } from "../../lib/social/commander";
import { TextField } from "../ui/text-field";
import { Face } from "./face";

const p = socialCopy.page;
const c = socialCopy.commander;

export const ACCENT_BUTTON =
  "inline-flex h-[44px] cursor-pointer items-center justify-center rounded-[8px] border-0 bg-[color:var(--accent)] px-[20px] font-sans text-[14px] font-semibold text-[color:var(--bg)]";

export function FriendsHead({
  name,
  commander,
  onRename,
  onOpenPicker,
  faceRef,
  picking = false,
}: {
  name: string;
  commander: ProfileCommander | null;
  /** A cleaned, changed name. The page saves it and draws it, or toasts and puts the old one back. */
  onRename: (next: string) => void;
  onOpenPicker: () => void;
  /** The face press, which is always drawn: where focus goes back to when the picker closes (its opener may be gone). */
  faceRef?: RefObject<HTMLButtonElement | null>;
  /** The picker is open: the face carries the focus ring behind it (R2 F3). */
  picking?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const form = useRef<HTMLFormElement>(null);
  const change = useRef<HTMLButtonElement>(null);
  // Set once the field has been answered, so a blur fired as it leaves (Escape, then removal) is not a second answer.
  const settled = useRef(false);
  const id = useId();

  function open() {
    setDraft(name);
    settled.current = false;
    setEditing(true);
  }
  function done(commit: boolean) {
    if (settled.current) return;
    settled.current = true;
    const next = draft.normalize("NFC").replace(/\s+/gu, " ").trim();
    setEditing(false);
    if (commit && next !== "" && next !== name) onRename(next);
    // The field leaves; focus goes back to the Change that opened it, a frame on (once it is drawn again), but only
    // when its leaving dropped focus to the page. A blur that moved focus somewhere (the face, which opens the picker,
    // or anything else pressed while editing) keeps it there.
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if (at === null || at === document.body) change.current?.focus();
    });
  }

  const faceButton = (
    <button
      ref={faceRef}
      type="button"
      onClick={onOpenPicker}
      aria-label={commander ? c.changeAria(commander.name) : c.choose}
      data-picking={picking ? "" : undefined}
      className={`relative row-start-1 flex h-[56px] w-[56px] flex-none cursor-pointer items-center justify-center self-center rounded-[13px] border-0 bg-transparent p-0 md:row-span-2 md:self-start md:h-[64px] md:w-[64px] md:rounded-[14px] ${picking ? "outline-2 outline-offset-[3px] outline-[color:var(--accent)] [outline-style:solid]" : ""}`}
    >
      {commander ? (
        <>
          <Face name={name} commander={commander} size={64} />
          <span aria-hidden className="absolute -bottom-[6px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[color:var(--elevated)] text-[11px] text-[color:var(--fg)] [border:1px_solid_var(--border-dashed)]">
            {"✎"}
          </span>
        </>
      ) : (
        <span aria-hidden className="flex h-[56px] w-[56px] items-center justify-center rounded-[13px] text-[20px] font-light text-[color:var(--fg-muted)] [border:1.5px_dashed_var(--border-dashed)] md:h-[64px] md:w-[64px] md:rounded-[14px] md:text-[22px]">
          +
        </span>
      )}
    </button>
  );

  const choose = (
    <button type="button" onClick={onOpenPicker} className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[4px] md:min-h-[32px] font-sans text-[13.5px] font-medium text-[color:var(--accent)]">
      {c.choose}
    </button>
  );

  const line = p.nameLine(name);
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  return (
    <header className="flex flex-col gap-[16px] md:flex-row md:items-start md:justify-between md:gap-[24px]">
      <div className="flex min-w-0 flex-col">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[14px] md:gap-x-[16px]">
          {faceButton}
          <div className="col-start-2 row-start-1 flex min-w-0 flex-col">
            <h1 className="m-0 font-display text-[22px] font-bold leading-[1.15] text-[color:var(--fg)] md:text-[28px]">{p.title}</h1>
            {editing ? null : (
              <p className="m-0 mt-[2px] flex flex-wrap items-center gap-x-[6px] text-[13.5px] text-[color:var(--fg-muted)] md:text-[14px]">
                <span>
                  {line.before}
                  <b className="font-semibold text-[color:var(--fg)] [overflow-wrap:anywhere]">{line.name}</b>
                </span>
                <span aria-hidden>·</span>
                <button
                  ref={change}
                  type="button"
                  onClick={open}
                  className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--accent)] md:min-h-[32px]"
                >
                  {line.action}
                </button>
                {commander ? null : (
                  <span className="hidden items-center gap-x-[6px] md:inline-flex">
                    <span aria-hidden>·</span>
                    {choose}
                  </span>
                )}
              </p>
            )}
          </div>
          {editing ? (
            <form
              ref={form}
              className="col-span-2 row-start-2 mt-[10px] flex w-full flex-col gap-[8px] md:col-span-1 md:col-start-2 md:mt-[8px] md:w-[420px] md:max-w-full"
              onSubmit={(e) => {
                e.preventDefault();
                done(true);
              }}
            >
              <label htmlFor={`${id}-name`} className="text-[13px] font-semibold text-[color:var(--fg)]">{p.nameField.label}</label>
              <TextField
                id={`${id}-name`}
                autoFocus
                value={draft}
                aria-describedby={`${id}-hint`}
                onChange={(e) => setDraft(capName(e.target.value, DISPLAY_NAME_MAX))}
                onKeyDown={(e) => {
                  // Escape mid-composition cancels the IME's candidate, never the draft.
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Escape") {
                    e.preventDefault();
                    done(false);
                  }
                }}
                onBlur={(e) => {
                  if (!form.current?.contains(e.relatedTarget as Node | null)) done(true);
                }}
                className="h-[44px] px-[12px] text-[16px] md:h-[40px] md:text-[14px]"
              />
              <p id={`${id}-hint`} className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">{p.nameField.hint}</p>
              <div className="flex gap-[8px] max-md:[&>button]:h-[44px] max-md:[&>button]:flex-1 max-md:[&>button]:text-[14px]">
                <button
                  type="button"
                  onClick={() => done(false)}
                  // Safari focuses no clicked button, so the field's blur would save the draft first.
                  onMouseDown={keepFocus}
                  className="h-[32px] cursor-pointer rounded-[6px] bg-transparent px-[14px] font-sans text-[12.5px] text-[color:var(--fg-body)] [border:1px_solid_var(--border)]"
                >
                  {p.nameField.cancel}
                </button>
                <button
                  type="submit"
                  onMouseDown={keepFocus}
                  className="h-[32px] cursor-pointer rounded-[6px] border-0 bg-[color:var(--accent)] px-[14px] font-sans text-[12.5px] font-semibold text-[color:var(--bg)]"
                >
                  {p.nameField.save}
                </button>
              </div>
            </form>
          ) : null}
        </div>
        {commander || editing ? null : <div className="mt-[4px] md:hidden">{choose}</div>}
      </div>
    </header>
  );
}
