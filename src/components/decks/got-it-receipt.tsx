"use client";
// I got it's receipt (handoff R1 §C, calls 5 and 6; plan PR 3): /collection's edit toast in the deck
// page's toast slot, saying what was added, to which printing and finish, with History and Undo.
// It is not on the row, so it survives the row leaving. It lasts the toast's 8s, held on hover,
// focus and an undo in flight (call C), or until the next write replaces it.
//
// Undo is a revert of the entry, decided here rather than in RevertConfirm: `Checking decks…` from
// the first frame, then §E with the `undo` verb when a committed deck other than this one would go
// short (call B: the source deck is passed as `ignoreDeckId`, on this undo only), then in flight,
// then done or failed. A failed undo withdraws Undo and points to History (the UndoRow rule).

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previewRevert, revertCollectionEntry } from "../../app/collection/history-actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { Finish } from "../../lib/collection/key";
import type { ShortDeck } from "../../lib/collection/write";
import { gotItCopy } from "../../lib/copy/i-got-it";
import type { ReceiptFacts } from "../../lib/decks/mark-bought";
import { ShortDeckWarning } from "../collection/short-deck-warning";
import { PendingReporter } from "../shell/pending-reporter";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

const c = gotItCopy.receipt;

/** What one press wrote, handed from the confirm to the receipt. */
export type GotItWritten = {
  entryId: string;
  /** Null on a retry that found the press already applied (the action reads no second snapshot). */
  facts: ReceiptFacts | null;
  quantity: number;
  setCode: string;
  collectorNumber: string;
  finish: Finish;
};

/** The receipt's sentence after the detail line: who took the copy, or what is still needed. */
export function receiptBody(facts: ReceiptFacts | null): string | null {
  if (!facts || facts.stillNeeds <= 0) return null;
  const took = facts.tookCopy;
  if (took.length === 1) return c.claimed(took[0].deckName, facts.stillNeeds);
  if (took.length > 1) return c.claimedMany(took.length, facts.stillNeeds);
  return c.partial(facts.stillNeeds);
}

type Phase =
  | { k: "shown" }
  | { k: "checking" }
  | { k: "warning"; decks: ShortDeck[]; expected: Record<string, number>; fresh: ReadonlySet<string>; changed: boolean }
  | { k: "undoing" }
  | { k: "undone" }
  | { k: "failed" };

/**
 * What the provider does for an undo. The undo is the PROVIDER's, not the toast's: a newer write
 * replaces the toast while a revert may still be in flight, and the tag stays disabled until that
 * revert settles, whichever toast is showing.
 */
export type GotItUndoHost = {
  /** The undo for this card started (from the first frame of the check): its tag is disabled. */
  start: (oracleId: string) => void;
  /** It settled, or was cancelled: the tag is live again. */
  end: (oracleId: string) => void;
  /** It failed after this toast was replaced: the provider brings this receipt back, failed. */
  failedAway: () => void;
};

export function GotItReceipt({
  deckId, oracleId, cardName, written, host, failed = false, onExpire,
}: {
  deckId: string;
  oracleId: string;
  /** The name the row prints. */
  cardName: string;
  written: GotItWritten;
  host: GotItUndoHost;
  /** Drawn straight in the failed form: an undo that failed after its toast was replaced. */
  failed?: boolean;
  onExpire: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>({ k: failed ? "failed" : "shown" });
  // Hover and focus hold apart: ending one (focus, when its control unmounts) leaves the other.
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const actionId = useRef<string | null>(null);
  // Where the undo is: a warning open (this toast owns it) or a request out (the host waits on it).
  const stage = useRef<"idle" | "warning" | "network">("idle");
  const mounted = useRef(true);
  const router = useRouter();
  const busy = phase.k === "checking" || phase.k === "undoing";
  const inFlight = busy || phase.k === "warning";
  const { restart } = useToastClock(ref, !hover && !focus && !inFlight, onExpire);

  // A warning closes with its toast; a request out is still the host's, and ends when it settles.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (stage.current === "warning") host.end(oracleId);
    };
  }, [host, oracleId]);

  const body = receiptBody(written.facts);

  // The check asked for a warning, but the toast that would show it has gone: nothing was written.
  function abandon() {
    stage.current = "idle";
    host.end(oracleId);
  }

  // A settled undo's own line gets the whole 8s (C3: "goes after 8 seconds").
  function fail() {
    stage.current = "idle";
    host.end(oracleId);
    if (!mounted.current) return host.failedAway();
    restart();
    setPhase({ k: "failed" });
  }

  async function revert(expected: Record<string, number>, confirmShort?: ShortDeck[], was?: ShortDeck[]) {
    stage.current = "network";
    setPhase({ k: "undoing" });
    actionId.current ??= crypto.randomUUID();
    try {
      const out = await revertCollectionEntry(written.entryId, actionId.current, expected, confirmShort, deckId);
      if ("reverted" in out) return done(false);
      if ("alreadyReverted" in out) return done(true);
      if ("wouldShort" in out) {
        const before = new Set((was ?? []).map((d) => d.deckId));
        // Asked again, but the toast that would ask has gone: nothing was written, so it ends.
        if (!mounted.current) return abandon();
        warn({
          k: "warning", decks: out.wouldShort, expected, changed: true,
          fresh: new Set(out.wouldShort.map((d) => d.deckId).filter((id) => !before.has(id))),
        });
        return;
      }
      // Stale: the collection moved since the check. Check again, under a new decision.
      if ("stale" in out) {
        actionId.current = null;
        return void check();
      }
      fail();
    } catch {
      fail();
    }
  }

  async function check() {
    stage.current = "network";
    host.start(oracleId);
    setPhase({ k: "checking" });
    try {
      const p = await previewRevert(written.entryId, deckId);
      if ("alreadyReverted" in p) return done(true);
      if (!("rows" in p)) return fail();
      if (p.decks.length > 0) {
        if (!mounted.current) return abandon();
        warn({ k: "warning", decks: p.decks, expected: p.expected, fresh: new Set(), changed: false });
        return;
      }
      await revert(p.expected);
    } catch {
      fail();
    }
  }

  /**
   * The revert committed. `reverted` invalidated the deck page in the action; `alreadyReverted`
   * wrote nothing, so nothing did, and the list is re-read here (C7). The toast says only what the
   * revert did, which is true whatever the list then shows (the deck may still be covered by
   * copies added since). The held entry stays until the next read: the decklist draws the slot
   * only while the list omits the card, so it steps aside once a list billing the card arrives.
   */
  function done(refresh: boolean) {
    if (refresh) router.refresh();
    stage.current = "idle";
    host.end(oracleId);
    restart();
    setPhase({ k: "undone" });
  }

  // Entering the warning unmounts the toast's frame with no pointerleave: its hover hold goes too.
  function warn(next: Extract<Phase, { k: "warning" }>) {
    stage.current = "warning";
    setHover(false);
    setPhase(next);
  }

  // The button that had focus goes when the undo settles: focus moves to the Shopping filter
  // rather than to the body (and rather than onto the toast, where it would hold it for good).
  useEffect(() => {
    if (phase.k !== "undone" && phase.k !== "failed") return;
    if (ref.current?.contains(document.activeElement) || document.activeElement === document.body) {
      document.querySelector<HTMLElement>("[data-shopping-filter]")?.focus();
      // The control that had focus unmounted without a blur: the focus hold ends here, and only it.
      setFocus(false);
    }
  }, [phase.k]);

  const hold = (kind: "hover" | "focus", on: boolean) => (kind === "hover" ? setHover : setFocus)(on);

  if (phase.k === "warning") {
    return (
      <UndoWarning
        phase={phase}
        onCancel={() => {
          stage.current = "idle";
          host.end(oracleId);
          setPhase({ k: "shown" });
          requestAnimationFrame(() => undoRef.current?.focus());
        }}
        onConfirm={() => void revert(phase.expected, phase.decks, phase.decks)}
      />
    );
  }

  const added = c.added(cardName, written.quantity);
  const detail = c.detail(`${written.setCode.toUpperCase()} #${written.collectorNumber}`, written.finish);
  // History opens on this entry, expanded (C1).
  const history = `/collection/history?entry=${written.entryId}`;
  const btn = "inline-flex h-[44px] items-center whitespace-nowrap border-0 bg-transparent px-[10px] text-[13.5px]";

  if (phase.k === "failed") {
    return (
      <ToastFrame
        frameRef={ref}
        role="alert"
        placement="deck"
        onHold={hold}
        title={c.undoFailed}
        body={c.undoFailedBody}
        actions={
          <Link href={history} className={`${btn} text-[color:var(--accent)]`}>
            {c.openHistory}
            <PendingReporter href={history} />
          </Link>
        }
      />
    );
  }
  if (phase.k === "undone") {
    return (
      <ToastFrame
        frameRef={ref}
        placement="deck"
        onHold={hold}
        title={c.undoneElsewhere(cardName)}
      />
    );
  }
  return (
    <ToastFrame
      frameRef={ref}
      placement="deck"
      onHold={hold}
      title={added}
      detail={detail}
      body={body}
      actions={
        <>
          {/* History steps aside while the undo is checked or written (C3). */}
          {busy ? null : (
            <Link href={history} className={`${btn} text-[color:var(--accent)]`}>
              {c.history}
              <PendingReporter href={history} />
            </Link>
          )}
          <button
            ref={undoRef}
            type="button"
            aria-label={busy ? undefined : c.undoAria(cardName)}
            // Not the native attribute: the button keeps focus while it reads Checking or Undoing.
            aria-disabled={busy || undefined}
            aria-busy={busy || undefined}
            onClick={() => { if (!busy) void check(); }}
            className={`${btn} font-semibold ${busy ? "cursor-default text-[color:var(--fg-muted)] opacity-80" : "cursor-pointer text-[color:var(--accent)]"}`}
          >
            {phase.k === "checking" ? c.checking : phase.k === "undoing" ? c.undoing : c.undo}
          </button>
        </>
      }
    />
  );
}

/** §E with the `undo` verb: a dialog on desktop, the bottom sheet on the phone, Cancel focused. */
function UndoWarning({
  phase, onCancel, onConfirm,
}: {
  phase: Extract<Phase, { k: "warning" }>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, onCancel);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] md:items-center md:bg-[color-mix(in_oklab,var(--bg)_74%,transparent)]"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-[22px_22px_0_0] p-[12px_22px_26px] outline-none [border-top:1px_solid_var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,.5)] md:w-[560px] md:rounded-2xl md:p-[28px_32px] md:[border:1px_solid_var(--border-strong)] md:shadow-[0_40px_100px_rgba(0,0,0,.7)]"
        style={{ background: "var(--surface-rail)" }}
      >
        <div aria-hidden className="mx-auto mb-[16px] h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)] md:hidden" />
        <ShortDeckWarning
          titleId={titleId}
          source="undo"
          decks={phase.decks}
          pending={false}
          notice={phase.changed}
          freshDeckIds={phase.fresh}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}
