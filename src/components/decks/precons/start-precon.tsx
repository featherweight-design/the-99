"use client";

// "Start a deck from this" and its confirm (design table: Component StartPreconDialog; STATES S1 to
// S1e). The button sits in the header at 900 and docks above the tab bar at 390. The confirm is a
// modal at 900 and a bottom sheet at 390: the commander, the name (prefilled, focused, selected),
// three facts, and any card the start keeps that is not legal in Commander. Starting never commits.

import { useEffect, useId, useRef, useState } from "react";
import { createDeckFromPrecon } from "../../../app/decks/precon-actions";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { preconsCopy } from "../../../lib/copy/precons";
import { DECK_NAME_MAX, hasControlChars } from "../../../lib/decks/deck-name";
import type { PreconRow } from "../../../lib/precons/list";
import { PrimaryButton } from "../../ui/button";
import { CommanderThumb } from "../../ui/commander-thumb";
import { TextField } from "../../ui/text-field";

const copy = preconsCopy.start;

export type StartPreconProps = {
  row: PreconRow;
  /** Every card the precon lists, commanders included. */
  cards: number;
  /** Cards beside the commanders. */
  body: number;
  /** Names of cards the start keeps that are not legal in Commander. */
  illegal: string[];
};

export function StartPrecon(props: StartPreconProps) {
  const [open, setOpen] = useState(false);
  const { row, cards } = props;
  return (
    <>
      <PrimaryButton
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-[40px] flex-none rounded-[8px] px-[18px] text-[13px] md:inline-flex md:items-center"
      >
        {copy.button}
      </PrimaryButton>
      <div className="fixed inset-x-0 bottom-[var(--tabbar-h)] z-20 flex flex-col gap-[8px] border-x-0 border-b-0 border-t-[1px] border-solid border-t-[color:var(--border)] bg-[color:var(--bg)] p-[10px_16px_12px] md:hidden">
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.dock(row.name, cards, row.owned, row.of)}</span>
        <PrimaryButton type="button" onClick={() => setOpen(true)} className="h-[48px] w-full rounded-[10px] text-[14px]">
          {copy.button}
        </PrimaryButton>
      </div>
      {open && <StartPreconDialog {...props} onDismiss={() => setOpen(false)} />}
    </>
  );
}

function StartPreconDialog({ row, cards, body, illegal, onDismiss }: StartPreconProps & { onDismiss: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(row.name.slice(0, DECK_NAME_MAX));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const errorId = useId();
  const titleId = useId();

  // A dismissal mid-flight would leave a deck the reader thinks they cancelled.
  const dismiss = () => { if (!pending) onDismiss(); };
  useDialogA11y(dialog, dismiss, { initialFocusRef: input });
  useEffect(() => { input.current?.select(); }, []);

  const trimmed = name.trim();
  // The server action's own rule (`validateDeckName`), so a name it would refuse is never sent.
  const valid = trimmed.length > 0 && trimmed.length <= DECK_NAME_MAX && !hasControlChars(trimmed);
  const already = row.built.find((b) => b.sameCommanders);
  const pair = row.commanders.length === 2;
  const ident = row.identity.length > 0 ? row.identity.join("") : "C";

  async function submit() {
    if (!valid || pending) return;
    setPending(true);
    setFailed(false);
    try {
      // Redirects to the new deck on success; a refusal or an outage throws.
      await createDeckFromPrecon(row.fileName, trimmed);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  const fact = (k: string, v: string) => (
    <div className="flex items-baseline justify-between gap-[12px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] py-[9px]">
      <span className="text-[12.5px] text-[color:var(--fg-muted)]">{k}</span>
      <span className="text-right font-mono text-[11px] text-[color:var(--fg-body)]">{v}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:px-[16px]">
      <div aria-hidden="true" onClick={dismiss} className="absolute inset-0 bg-[rgba(16,13,10,0.74)]" />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 mx-auto flex w-full flex-col gap-[16px] rounded-[16px_16px_0_0] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px_18px_18px] md:max-w-[500px] md:rounded-[14px] md:p-[24px_24px_20px]"
      >
        <span aria-hidden className="mx-auto h-[4px] w-[36px] rounded-full bg-[color:var(--border-strong)] md:hidden" />
        <div className="flex items-start justify-between gap-[12px]">
          <h2 id={titleId} className="m-0 font-display text-[20px] font-normal text-[color:var(--fg)]">{copy.title(row.name)}</h2>
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            aria-label={copy.cancel}
            className="hidden h-[36px] w-[36px] flex-none cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-muted)] md:flex"
          >
            ✕
          </button>
        </div>
        <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{copy.lead(cards, row.unmapped)}</p>

        <div className="flex items-center gap-[11px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[10px_12px]">
          <CommanderThumb imageUri={row.commanders[0]?.imageUri ?? null} colorIdentity={row.identity} size="list" />
          <div className="flex min-w-0 flex-col gap-[2px]">
            <span className="font-display text-[15px] text-[color:var(--fg)]">{row.commanders.map((c) => c.name).join(" + ")}</span>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.beside(ident, body, pair)}</span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex flex-col gap-[14px]">
          <label className="flex flex-col gap-[6px]">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{copy.nameLabel}</span>
            <TextField
              ref={input}
              value={name}
              onChange={(e) => { setName(e.target.value); setFailed(false); }}
              maxLength={DECK_NAME_MAX}
              readOnly={pending}
              aria-invalid={!valid ? true : undefined}
              aria-describedby={!valid || failed ? errorId : undefined}
              className="w-full rounded-[8px] px-[11px] py-[9px] font-sans text-[16px] md:text-[14px]"
            />
          </label>

          {already && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.already(already.deckName)}</p>}
          {illegal.length > 0 && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.illegal(illegal)}</p>}

          <div className="flex flex-col">
            {fact(copy.facts.cards, copy.facts.cardsValue(cards, row.unmapped))}
            {fact(copy.facts.own, copy.facts.ownValue(row.owned, row.of))}
            {fact(copy.facts.printings, copy.facts.printingsValue)}
          </div>

          {(failed || !valid) && (
            <p id={errorId} role="alert" className="m-0 font-mono text-[11px]" style={{ color: "var(--danger)" }}>
              {failed ? copy.failed : copy.nameInvalid(DECK_NAME_MAX)}
            </p>
          )}

          <div className="flex gap-[8px] md:justify-end">
            <button
              type="button"
              onClick={dismiss}
              disabled={pending}
              className="h-[46px] flex-1 cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-sans text-[13px] text-[color:var(--fg-body)] md:h-[40px] md:flex-none"
            >
              {copy.cancel}
            </button>
            <PrimaryButton
              type="submit"
              disabled={!valid || pending}
              className="h-[46px] flex-1 rounded-[8px] px-[14px] text-[13px] md:h-[40px] md:flex-none"
            >
              {pending ? copy.pending : copy.submit}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
