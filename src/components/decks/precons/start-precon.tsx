"use client";

// "Start a deck from this" and its confirm (design table: Component StartPreconDialog; STATES S1 to
// S1e). The button sits in the header at 900 and docks above the tab bar at 390. The confirm is a
// modal at 900 and a bottom sheet at 390: the commander, the name (prefilled, focused, selected),
// three facts, and any card the start keeps that is not legal in Commander. The deck starts committed (Hugh, 2026-10-14).

import { useAuth } from "@clerk/nextjs";
import { unstable_rethrow } from "next/navigation";
import { startTransition, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createDeckFromPrecon, startPreconOwned } from "../../../app/decks/precon-actions";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { preconAddedDate, preconsCopy } from "../../../lib/copy/precons";
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
  /** The dock's summary when it names something else (a linked deck, R3 K8); else the counts. */
  dockSummary?: string;
  /** Docked beside Start at 390, Start the wider (R3 K7's `Link a deck`). */
  dockBeside?: ReactNode;
  /** When the reader last added this precon to their collection (an unreverted entry), as ISO; null if never. */
  addedOn?: string | null;
  /** Collection editing is on: the dialog offers "I own this precon" (the action refuses without it). */
  canOwn?: boolean;
  /**
   * The edition the reader chose, by file: the precon's own (the default), or its Collector's Edition twin when the page's
   * edition switch chose it. The deck starts that edition's printings, and the add writes that edition's box, so
   * `addedOn` must be that edition's own, since each edition's box is its own entry.
   */
  addFileName?: string;
};

/**
 * The add's action id, kept for this tab across a reload: an add that THREW may have committed with its response lost,
 * and the id is what lets the retry find the committed entry instead of adding the box twice. Cleared once the outcome
 * is known. The key names the signed-in account, so an id can never cross accounts in a shared tab. Storage can be absent or blocked, so every touch is guarded and the id falls back to memory alone.
 */
const attemptKey = (account: string, fileName: string) => `the99:precon-add-attempt:${account}:${fileName}`;
function readAttempt(account: string | null | undefined, fileName: string): string | null {
  if (!account) return null;
  try { return window.sessionStorage.getItem(attemptKey(account, fileName)); } catch { return null; }
}
function writeAttempt(account: string | null | undefined, fileName: string, id: string | null) {
  if (!account) return;
  try {
    if (id === null) window.sessionStorage.removeItem(attemptKey(account, fileName));
    else window.sessionStorage.setItem(attemptKey(account, fileName), id);
  } catch { /* storage is a convenience here, never a requirement */ }
}

export function StartPrecon(props: StartPreconProps) {
  const [open, setOpen] = useState(false);
  const { row, cards, dockSummary, dockBeside } = props;
  // Kept here, past the dialog: a start whose answer was lost may have committed, and a reopened dialog must press again
  // under the same id, so the retry lands on the deck it made rather than adding the box twice. Per edition: each
  // edition's box is its own entry.
  const addFile = props.addFileName ?? row.fileName;
  // A plain map held in state (never replaced): the dialog writes an attempt's id into its edition's slot.
  const [adds] = useState(() => new Map<string, { id: string | null }>());
  let slot = adds.get(addFile);
  if (!slot) { slot = { id: null }; adds.set(addFile, slot); }
  const add = { current: slot };
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
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{dockSummary ?? copy.dock(row.name, cards, row.owned, row.of)}</span>
        <div className="flex gap-[8px]">
          <PrimaryButton type="button" onClick={() => setOpen(true)} className="h-[48px] min-w-0 flex-[2] rounded-[10px] text-[14px]">
            {copy.button}
          </PrimaryButton>
          {dockBeside}
        </div>
      </div>
      {open && (
        <StartPreconDialog
          {...props}
          addFileName={addFile}
          addRef={add}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}

function StartPreconDialog({ row, cards, body, illegal, addedOn = null, canOwn = false, addFileName, addRef, onDismiss }: StartPreconProps & {
  addRef: React.RefObject<{ id: string | null }>;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(row.name.slice(0, DECK_NAME_MAX));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<"start" | "add" | "addUnsure" | false>(false);
  // "I own this precon": off unless the reader ticks it, and left off when they have added it before.
  const [own, setOwn] = useState(false);
  const { userId: account } = useAuth();
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

  function submit() {
    // A ref, not the state: two presses inside one render both read `pending` false, and each
    // would start a deck.
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFailed(false);
    // In a transition, as the picker's create is, so the router takes the redirect it rethrows.
    startTransition(async () => {
      // The chosen edition: its box is the one added, and its printings are the ones the deck is pinned to.
      const addFile = addFileName ?? row.fileName;
      if (own && canOwn) {
        // One action, one transaction: the box goes into the collection, the deck starts committed, and the copies are
        // reserved to it (Hugh, 2026-10-14). The id makes a retry land on the deck it made rather than adding twice.
        addRef.current.id ??= readAttempt(account, addFile) ?? crypto.randomUUID();
        writeAttempt(account, addFile, addRef.current.id);
        try {
          // Redirects to the new deck on success; a refusal is returned, and every refusal reads as nothing saved.
          await startPreconOwned(addFile, trimmed, addRef.current.id);
        } catch (err) {
          // The redirect arrives here as a throw: the outcome is known, so the stored attempt has done its job.
          try { unstable_rethrow(err); } catch (redirect) { writeAttempt(account, addFile, null); addRef.current.id = null; throw redirect; }
          // A thrown start is not a refusal: it may have committed with its response lost. The id is kept, so pressing
          // again lands on the committed deck rather than adding twice; the line does not claim a rollback.
          inFlight.current = false;
          setPending(false);
          setFailed("addUnsure");
          return;
        }
        writeAttempt(account, addFile, null);
        addRef.current.id = null;
        inFlight.current = false;
        setPending(false);
        setFailed("add");
        return;
      }
      try {
        // Redirects to the new deck on success; a refusal or an outage throws.
        await createDeckFromPrecon(addFile, trimmed);
      } catch (err) {
        // The redirect itself arrives here as a throw, before the router navigates: rethrown, or
        // every successful start would paint the failure for the frame the navigation takes.
        unstable_rethrow(err);
        inFlight.current = false;
        setPending(false);
        setFailed("start");
      }
    });
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

        <div className="flex items-center gap-[11px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[10px_12px]">
          <CommanderThumb imageUri={row.commanders[0]?.imageUriSmall ?? row.commanders[0]?.imageUri ?? null} colorIdentity={row.identity} size="list" />
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

          {canOwn && <div className="flex flex-col gap-[4px]">
            <label className="flex cursor-pointer items-start gap-[10px] text-[13px] leading-[1.45] text-[color:var(--fg-body)]">
              <input
                type="checkbox"
                checked={own}
                disabled={pending}
                onChange={(e) => { setOwn(e.target.checked); setFailed(false); }}
                className="mt-[2px] h-[18px] w-[18px] flex-none cursor-pointer accent-[color:var(--accent)]"
              />
              <span>{copy.owned.label}</span>
            </label>
            {addedOn && <p className="m-0 pl-[28px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.owned.addedOn(preconAddedDate(addedOn))}</p>}
          </div>}

          {already && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.already(already.deckName)}</p>}
          {illegal.length > 0 && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.illegal(illegal)}</p>}

          <div className="flex flex-col">
            {fact(copy.facts.cards, copy.facts.cardsValue(cards, row.unmapped))}
            {fact(copy.facts.own, copy.facts.ownValue(row.owned, row.of))}
            {fact(copy.facts.printings, copy.facts.printingsValue)}
          </div>

          {(failed || !valid) && (
            <p id={errorId} role="alert" className="m-0 font-mono text-[11px]" style={{ color: "var(--danger)" }}>
              {failed === "add" ? copy.owned.addFailed : failed === "addUnsure" ? copy.owned.addUnsure : failed ? copy.failed : copy.nameInvalid(DECK_NAME_MAX)}
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
