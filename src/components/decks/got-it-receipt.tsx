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

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previewRevert, revertCollectionEntry } from "../../app/collection/history-actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { Finish } from "../../lib/collection/key";
import type { ShortDeck, UndoPlacement } from "../../lib/collection/write";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { addedCopyCopy } from "../../lib/copy/added-copy";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { liveDestination, liveTook, longSentence } from "../../lib/collection/copy-line";
import { CopyChooserDialog } from "./copy-chooser-dialog";
import type { ReceiptFacts } from "../../lib/decks/mark-bought";
import { ShortDeckWarning } from "../collection/short-deck-warning";
import { PendingReporter } from "../shell/pending-reporter";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

const c = gotItCopy.receipt;

/** What one press wrote, handed from the confirm to the receipt. */
export type GotItWritten<F = ReceiptFacts> = {
  entryId: string;
  /** Null on a retry that found the press already applied (the action reads no second snapshot). */
  facts: F | null;
  quantity: number;
  setCode: string;
  collectorNumber: string;
  finish: Finish;
};

/**
 * The receipt's sentence after the detail line: who took the copy, or what is still needed.
 *
 * With `went` (where an added copy goes, `ADDED_COPY_ENABLED`) it is never silent: a copy this deck
 * took says so (`self`), a loose copy this brew reads says so and names the other brews reading it
 * (`softSelf`), and a copy no deck needed is free (`nobody`). Without it, the shipped rule: nothing
 * once the deck needs no more.
 */
export function receiptBody(facts: ReceiptFacts | null, sourceDeckId?: string): string | null {
  if (!facts) return null;
  const took = facts.tookCopy;
  if (facts.stillNeeds > 0) {
    if (took.length === 1) return c.claimed(took[0].deckName, facts.stillNeeds);
    if (took.length > 1) return c.claimedMany(took.length, facts.stillNeeds);
    return c.partial(facts.stillNeeds);
  }
  const went = facts.went;
  if (!went) return null;
  if (went.held.some((h) => h.deckId === sourceDeckId)) return c.self;
  if (went.soft.some((b) => b.deckId === sourceDeckId)) {
    return c.softSelf(went.soft.filter((b) => b.deckId !== sourceDeckId).map((b) => b.deckName));
  }
  if (placedNowhere(facts)) return c.nobody;
  return null;
}

/**
 * The body after a Change, from the card the chooser's last write read back, in the purchase's own
 * forms: this deck holds the copy (`self`), this brew reads it loose (`softSelf`), no deck takes or
 * reads it (`nobody`), or the Add Cards sentence for where it went instead. A clear can leave the
 * copy anywhere seniority puts it, so the purchase-time body is never kept. `changePick` is the
 * pick the Change's own writes left standing: a sole pick is `as you picked` only when it is that
 * one, and `which you picked earlier` when it predates the purchase. A null read-back is terminal
 * (the copy is gone, in another tab): no body, since no shipped sentence says where a copy that is
 * no longer there went.
 */
export function bodyAfterChange(
  live: ContestedCard | null, cardName: string, sourceDeckId: string, changePick: string | null,
): string | null {
  if (live === null) return null;
  const { decks, brews } = liveTook(live);
  if (decks.some((d) => d.deckId === sourceDeckId)) return c.self;
  if (brews.some((b) => b.deckId === sourceDeckId)) return c.softSelf(brews.filter((b) => b.deckId !== sourceDeckId).map((b) => b.name));
  const d = liveDestination(live);
  if (!d) return c.nobody;
  const earlier = d.kind === "picked" && decks[0].deckId !== changePick;
  const said = earlier ? addedCopyCopy.line.goesToEarlier(cardName, d.deck) : longSentence(d, cardName);
  // Every receipt body is a sentence that ends in a period; the Add Cards line it borrows does not.
  return `${said}.`;
}

/** No deck took or read the copy: the one body with no Change (IG4). */
function placedNowhere(facts: ReceiptFacts): boolean {
  return !!facts.went && facts.went.held.length === 0 && facts.went.soft.length === 0;
}

/** Whether the receipt offers Change: a chooser to open, and a copy some deck took or read. */
export function receiptChangeable(facts: ReceiptFacts | null): boolean {
  return !!facts?.chooser && !placedNowhere(facts);
}

type Phase =
  | { k: "shown" }
  | { k: "checking" }
  | { k: "warning"; decks: ShortDeck[]; expected: Record<string, number>; fresh: ReadonlySet<string>; changed: boolean }
  | { k: "undoing" }
  | { k: "undone" }
  // `known`: the revert is known not to have landed. False when the answer was lost and the
  // entry could not be read back either, so the toast claims nothing about the copy.
  | { k: "failed"; known: boolean };

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
  /** The revert committed (or was already committed elsewhere): what the host counted for this entry no longer holds. */
  undone?: (entryId: string) => void;
};

export function GotItReceipt({
  deckId, oracleId, cardName, written, body: bodyOverride, placement = "deck", host, failed = false, onExpire,
  undoPlacement,
}: {
  /**
   * The decks the undo leaves out of its deck check (call B): the deck the copy was bought for, or
   * every deck a cart line listed. The write honours each only for an entry with that source.
   */
  deckId: string | string[];
  oracleId: string;
  /** The name the row prints. */
  cardName: string;
  written: GotItWritten<unknown>;
  /** The receipt's body when the caller writes its own (the cart's); else read from a deck's facts. */
  body?: string | null;
  /** Where the toast sits: a deck page's slot, or the cart's (bottom right; on the phone above the tab bar). */
  placement?: "deck" | "cart";
  host: GotItUndoHost;
  /** Drawn straight in the failed form: an undo that failed after its toast was replaced. */
  failed?: boolean;
  onExpire: () => void;
  /**
   * The pick the press itself made (the cart's chooser): Undo drops it with the copy, and puts
   * back `restore`, the reservation that pick moved off another deck.
   */
  undoPlacement?: UndoPlacement;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>(failed ? { k: "failed", known: true } : { k: "shown" });
  // Hover and focus hold apart: ending one (focus, when its control unmounts) leaves the other.
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const actionId = useRef<string | null>(null);
  // Where the undo is: a warning open (this toast owns it) or a request out (the host waits on it).
  const stage = useRef<"idle" | "warning" | "network">("idle");
  const mounted = useRef(true);
  const router = useRouter();
  // Change (where an added copy goes): the chooser open over the toast, and the card its last
  // write read back. `undefined` is before any write; null is a write that settled with no card to
  // read back (the copy went, in another tab), which is terminal, as on CopyLine. `last` is the
  // last card read back, which the open chooser keeps drawing to show its refusal.
  const [choosing, setChoosing] = useState(false);
  const [live, setLive] = useState<ContestedCard | null | undefined>(undefined);
  const [last, setLast] = useState<ContestedCard | undefined>(undefined);
  const onCard = useCallback((card: ContestedCard | null) => {
    setLive(card);
    if (card) setLast(card);
  }, []);
  // The pick the Change's own landed writes left standing, which Undo drops with the copy. Set by a
  // write that leaves a pick, cleared by one that clears it: there is one authored pick per card,
  // so a clear leaves none. Never inferred from the purchase-time card, which cannot tell a pick
  // the Change made from one it cleared and made again.
  const [changePick, setChangePick] = useState<string | null>(null);
  const onWrite = useCallback((deck: string, picked: boolean) => setChangePick(picked ? deck : null), []);
  const changeRef = useRef<HTMLButtonElement>(null);
  const busy = phase.k === "checking" || phase.k === "undoing";
  // The toast's clock holds while the chooser is open, as it does for an undo (design table: open).
  const inFlight = busy || phase.k === "warning" || choosing;
  const { restart } = useToastClock(ref, !hover && !focus && !inFlight, onExpire);

  // A warning closes with its toast; a request out is still the host's, and ends when it settles.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (stage.current === "warning") host.end(oracleId);
    };
  }, [host, oracleId]);

  const facts = written.facts as ReceiptFacts | null;
  const sourceDeckId = typeof deckId === "string" ? deckId : null;
  const purchased = receiptBody(facts, sourceDeckId ?? undefined);
  // Change belongs to a deck's receipt (the cart writes its own body), and only where a chooser came
  // back with the write and some deck took or read the copy.
  const chooser = bodyOverride === undefined && sourceDeckId && receiptChangeable(facts) ? facts!.chooser! : null;
  const body = bodyOverride !== undefined
    ? bodyOverride
    : live !== undefined && chooser && sourceDeckId ? bodyAfterChange(live, cardName, sourceDeckId, changePick) : purchased;
  // The pick Undo drops with the copy: the press's own (the cart's), else the one the Change's
  // writes left standing (it still stands after the copy went).
  const dropPick = undoPlacement ?? (changePick ? { oracleId, deckId: changePick } : undefined);
  // Sent only when there is one, so an undo with no pick asks exactly what it always asked.
  const picks = dropPick ? [dropPick] as const : [] as const;
  const closeChooser = useCallback(() => {
    setChoosing(false);
    restart();
    // Change goes with a copy that is gone, so focus falls to Undo then.
    requestAnimationFrame(() => (changeRef.current ?? undoRef.current)?.focus());
  }, [restart]);

  // The check asked for a warning, but the toast that would show it has gone: nothing was written.
  function abandon() {
    stage.current = "idle";
    host.end(oracleId);
  }

  // A settled undo's own line gets the whole 8s (C3: "goes after 8 seconds").
  function fail(known = true) {
    stage.current = "idle";
    host.end(oracleId);
    if (!mounted.current) return host.failedAway();
    restart();
    setPhase({ k: "failed", known });
  }

  // A thrown revert is not proof it failed: it commits before it invalidates, so a lost answer or
  // an invalidation error can follow a write that landed. The entry is read back first.
  async function reconcile() {
    try {
      const p = await previewRevert(written.entryId, deckId, ...picks);
      if ("alreadyReverted" in p) return done(true);
      fail();
    } catch {
      fail(false);
    }
  }

  async function revert(expected: Record<string, number>, confirmShort?: ShortDeck[], was?: ShortDeck[]) {
    stage.current = "network";
    setPhase({ k: "undoing" });
    actionId.current ??= crypto.randomUUID();
    try {
      const out = await revertCollectionEntry(written.entryId, actionId.current, expected, confirmShort, deckId, ...picks);
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
      await reconcile();
    }
  }

  async function check() {
    stage.current = "network";
    host.start(oracleId);
    setPhase({ k: "checking" });
    try {
      const p = await previewRevert(written.entryId, deckId, ...picks);
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
   * copies added since). On the deck page the held entry stays until the next read: the decklist
   * draws the slot only while the list omits the card, so it steps aside once a list billing the
   * card arrives. A host that implements `undone` (the cart) drops that purchase from its own
   * held figures at once.
   */
  function done(refresh: boolean) {
    if (refresh) router.refresh();
    stage.current = "idle";
    host.end(oracleId);
    host.undone?.(written.entryId);
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
      // Where focus lands once the undo's control is gone: the deck's Shopping filter, or on the cart
      // its checkout (the empty cart's way back when the undo emptied nothing back yet).
      (placement === "cart"
        ? document.querySelector<HTMLElement>("[data-cart-checkout]") ?? document.querySelector<HTMLElement>("[data-cart-empty-back]")
        : document.querySelector<HTMLElement>("[data-shopping-filter]"))?.focus();
      // The control that had focus unmounted without a blur: the focus hold ends here, and only it.
      setFocus(false);
    }
  }, [phase.k, placement]);

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
        placement={placement}
        onHold={hold}
        title={c.undoFailed}
        body={phase.known ? c.undoFailedBody : undefined}
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
        placement={placement}
        onHold={hold}
        title={c.undoneElsewhere(cardName, written.quantity)}
      />
    );
  }
  return (
    <>
    <ToastFrame
      frameRef={ref}
      placement={placement}
      onHold={hold}
      title={added}
      detail={detail}
      body={chooser && body && !busy ? (
        <>
          {body}
          <button
            ref={changeRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={choosing}
            aria-label={c.changeAria(cardName)}
            onClick={() => setChoosing(true)}
            // 32 tall, with the phone's 44 hit area reached through 6px of padding top and bottom,
            // taken back by an equal negative margin so the body line does not grow (design table).
            // Border-box: the 44 minimum INCLUDES that padding, so the phone's is 44 and md's 32.
            className="ml-[6px] -my-[6px] inline-flex min-h-[44px] md:min-h-[32px] cursor-pointer items-center border-0 bg-transparent px-0 py-[6px] text-[12.5px] font-semibold text-[color:var(--accent)] underline underline-offset-2 md:my-0 md:py-0"
          >
            {c.change}
          </button>
        </>
      ) : body}
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
    {choosing && chooser && sourceDeckId ? (
      <CopyChooserDialog
        // After a null read-back the open chooser keeps the last card it drew, to show its refusal;
        // it never falls back to the purchase-time card, whose options could only be refused.
        card={live === null ? (last ?? chooser) : (live ?? chooser)}
        cardName={cardName}
        thisDeckId={sourceDeckId}
        onCard={onCard}
        onWrite={onWrite}
        onClose={closeChooser}
      />
    ) : null}
    </>
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
