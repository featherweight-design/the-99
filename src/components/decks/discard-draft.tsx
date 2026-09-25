"use client";

// Discard — the draft thrown away, and the one place in this feature that wears
// --danger.
//
// A draft is `deck_cards` differing from the newest version and is stored nowhere
// else, so discarding does not undo: it overwrites the only copy of the work with
// the version behind it. That is why this is the two-click inline confirm the
// bulk keep took (`clear-auto.tsx`) rather than a button — the product owns no
// confirm dialog, and every confirm in it answers in the place the question was
// asked.
//
// The question replaces the *body* of the surface that raised it — the banner's
// card on the deck page, the apply bar on the review page — rather than the
// control it was pressed on. That is why the confirm, the trigger and the flag
// between them are three exports instead of one component: the flag has to be
// held by whoever owns the body being replaced. It is not a panel and not an
// overlay; the surface around it is already the box the question is asked inside.

import { useEffect, useId, useRef, useState, useTransition, type Ref } from "react";
import { useRouter } from "next/navigation";

import { discardDeckDraft } from "../../app/decks/actions";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { changeCount, hasChanges, type DraftState } from "../../lib/decks/draft-shape";
import { formatDeckDate } from "../../lib/decks/format";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { PRIMARY } from "../ui/button";
import { draftAnnouncer } from "./draft-announcer";
import { MutationError } from "./mutation-error";
import { commanderBackClause } from "./change-commander-banner";
import { changeCommanderCopy } from "../../lib/copy/change-commander";

const copy = deckVersioningCopy.discard;

/**
 * The flag, the trigger's ref, and whether the offer stands at all.
 *
 * Held here rather than inside the confirm because the confirm replaces its
 * host's body: the host is the component that has to know. Both hosts ask the
 * same three questions of it, so they ask a hook rather than each keeping a copy
 * of the answers.
 *
 * A brew has no version to go back to and the server refuses the write for that
 * reason, so `offered` is the rendering half of that refusal: no control at all,
 * rather than one whose only outcome is a rejection.
 */
export function useDiscardConfirm(state: DraftState) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The trigger unmounts while the question is up, so focus is carried by hand at
  // both ends or a keyboard reader is dropped at the top of the document. Only a
  // cancel restores it: after a discard the trigger does not come back at all.
  const returningFocus = useRef(false);

  // A commit made elsewhere on this page can settle the draft while the question
  // is up. The question goes with the draft, but the flag would outlive it and
  // raise the question again unasked the next time an edit starts one. Adjusted
  // during render rather than in an effect so the stale question never paints.
  const changed = hasChanges(state);
  const [seenChanged, setSeenChanged] = useState(changed);
  if (changed !== seenChanged) {
    setSeenChanged(changed);
    if (!changed) setConfirming(false);
  }

  useEffect(() => {
    if (!confirming && returningFocus.current) {
      returningFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  return {
    /** Whether the question is up — and so whether the host draws its own body. */
    confirming,
    /** Whether there is a version behind the draft for a discard to land on. */
    offered: state.version !== null,
    triggerRef,
    open: () => setConfirming(true),
    cancel: () => {
      returningFocus.current = true;
      setConfirming(false);
    },
  };
}

/** The host's own ghost control, which raises the question. */
export function DiscardTrigger({
  onOpen,
  triggerRef,
  disabled = false,
}: {
  onOpen: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
  /** Shut while another write to the same draft is in flight. The review page
   *  passes this during a restore: the two serialize on the deck lock, and a
   *  discard that wins the race throws away a card the reader has just put
   *  back. */
  disabled?: boolean;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={`${GHOST_CTA} disabled:opacity-50 disabled:cursor-default`}
    >
      {deckVersioningCopy.pending.discardCta}
    </button>
  );
}

export interface DiscardConfirmProps {
  deckId: string;
  state: DraftState;
  /**
   * How many cards the version this discard lands on holds.
   *
   * A prop rather than a figure read off `state`, because `DraftState` carries
   * the draft's changes and not the version's size — and naming what you land on
   * is half of what this confirm exists to say. The offer is withheld entirely
   * where the figure is unknown rather than asking the question without it.
   */
  versionCards: number;
  onCancel: () => void;
  /** For a caller holding its own optimistic list: the rows it is drawing have
   *  just been rewritten under it. The server revalidates the page itself.
   *
   *  A host that supplies one owns where the reader ends up, because a host that
   *  navigates takes this whole surface — and anything focused inside or beside
   *  it — with it. Only a host staying put gets the deck-name handoff below. */
  onDiscarded?: () => void;
  /** Spacing the host needs around the box, never its own surface. */
  className?: string;
  /** Shut while another write to the same draft is in flight. The question can
   *  be open before that write starts — the trigger's own guard cannot reach it,
   *  because the trigger is unmounted while the question is up — and a discard
   *  that wins the race throws away a card the reader has just put back. */
  disabled?: boolean;
  /** Reports this question's own write, for the same reason the commit sheet does:
   *  a discard started FIRST would otherwise race a restore started second, and
   *  the two serialize on the deck lock. `unknown` is never followed by `settled`
   *  — a throw can be a discard that landed and lost its reply. */
  onWriteState?: (state: "writing" | "settled" | "unknown") => void;
}

/**
 * The deck's own name, where focus lands once the draft is gone.
 *
 * Everything this component draws — both answers, the surface holding them — is
 * removed by the revalidation that follows a discard, and a reader standing on a
 * removed button is dropped at the top of the document. The name is the one thing
 * certain to still be there.
 *
 * Reached through the DOM because it belongs to the spine, well above this
 * component, and both widths render one: the hidden heading cannot take focus, so
 * the visible one is picked where the browser can say which that is.
 */
function focusDeckName(): void {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1"));
  // Both widths render a name and one of them is `display: none`, so a browser
  // without `checkVisibility` is asked the question layout can answer instead:
  // a hidden ancestor leaves an element with no offset parent. Defaulting to
  // `true` there would pick whichever heading comes first in the document and
  // drop the reader on an invisible target.
  const name = headings.find((h) => (
    typeof h.checkVisibility === "function" ? h.checkVisibility() : h.offsetParent !== null
  )) ?? headings[0];
  if (!name) return;
  // The name is deliberately not a control — renaming is the pencil beside it —
  // so it is lent focusability for this one move rather than given a permanent
  // tab stop nobody asked for.
  if (!name.hasAttribute("tabindex")) name.setAttribute("tabindex", "-1");
  name.focus({ preventScroll: true });
}

export function DiscardConfirm({
  deckId,
  state,
  versionCards,
  onCancel,
  onDiscarded,
  className = "",
  disabled = false,
  onWriteState,
}: DiscardConfirmProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // Per instance rather than a module constant: two drafts drawn on one page
  // would otherwise share one id and leave `aria-describedby` pointing at
  // whichever consequence the document happened to hold first.
  const whyId = useId();
  const safeRef = useRef<HTMLButtonElement>(null);
  // `disabled={pending}` only lands once the transition has re-rendered, and
  // transition updates are low-priority — two clicks in the same tick both reach
  // the handler and fire the discard twice. A ref settles it synchronously, as
  // `useDeckMutation` does. It matters more here than on an add: the second
  // request carries the same expected version, so a commit landing between the
  // two is the one case where the guard passes for a discard nobody asked for.
  const inFlightRef = useRef(false);
  // An unknown outcome, held in state because the ANSWER is what enforces it: a
  // second destructive write must not start against a draft that may already be
  // gone, and a latch the button does not reflect is a control that eats presses.
  // `PendingBanner` passes no `disabled` and no `onWriteState`, so on that surface
  // this is the whole guard. The handler needs no clause of its own — a disabled
  // button fires nothing.
  const [unresolved, setUnresolved] = useState(false);

  // The question took the host's body with it, so the focus the trigger held is
  // gone from the document. It goes to the way out, never to the destructive
  // answer.
  //
  // The announcer region is put in the document in the same pass, because it has
  // to be there before any text reaches it rather than on the click that fills it.
  useEffect(() => {
    safeRef.current?.focus();
    draftAnnouncer();
  }, []);

  // The re-read landing: a new `state` was built by the server after whatever did
  // or did not happen, and it is the only thing that can settle an outcome nobody
  // here learned. Adjusted during RENDER, as `useDiscardConfirm` does with the same
  // prop: an effect would paint the withheld answer once over a draft that has
  // already settled it.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (unresolved) setUnresolved(false);
  }

  // The caller withholds the offer on a brew; this is the type narrowing for the
  // same fact.
  if (state.version === null) return null;
  const version = state.version;

  const n = changeCount(state);

  // The version clause is drawn in the reading ink at 600 while the rest of the
  // sentence stays body copy — what you land on is the fact the decision turns
  // on. Split on the clause this component already holds the parts of, rather
  // than on the sentence's words: a re-worded consequence finds no match and
  // renders whole, which is a lost emphasis and never a mangled sentence.
  const stamp = `v${version.number} as committed on ${formatDeckDate(version.committedAt)}`;
  // A commander-only draft moved no card, so the card clause has nothing to name (change commander).
  const sentence = state.commander && state.adds.length === 0 && state.removes.length === 0
    ? changeCommanderCopy.discard.commanderOnly(version.number, formatDeckDate(version.committedAt), versionCards)
    : copy.consequence(
      version.number,
      formatDeckDate(version.committedAt),
      versionCards,
      state.adds.length,
      state.removes.length,
    );
  const [head, tail] = sentence.split(stamp);
  // Change commander: a discard also puts the committed commander back, and says so.
  const commanderBack = commanderBackClause(state);

  return (
    <div className={`${CONFIRM_BOX} ${className}`} style={CONFIRM_BORDER}>
      <span className={QUESTION}>{copy.question(n)}</span>
      {/* The consequence, and not the question, is what both answers point at: the
          question repeats the destructive button's own label word for word, and a
          reader would hear it twice for nothing. */}
      <p id={whyId} className={CONSEQUENCE}>
        {tail === undefined ? (
          sentence
        ) : (
          <>
            {head}
            <b className={STAMP}>{stamp}</b>
            {tail}
          </>
        )}
        {commanderBack ? ` ${commanderBack}` : null}
      </p>
      {/* One element ordered twice: the safe answer on top at 390px, and on
          desktop a row reading from the act to the way out, as the design draws
          it. The way out is written first in the DOM rather than reversed into
          place on the phone, so the stack a reader tabs through runs the same way
          the stack they see does — and the first tab stop in a destructive
          confirm is the escape from it at both widths. Desktop reverses the row
          instead, and packs from the far end because `row-reverse` moves
          main-start to the right. */}
      <div className="flex flex-col md:flex-row-reverse md:justify-end md:items-center md:flex-wrap gap-[8px] md:gap-[10px]">
        <button
          ref={safeRef}
          type="button"
          disabled={pending}
          aria-describedby={whyId}
          onClick={onCancel}
          className={`${SAFE_CTA} ${PRIMARY}`}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          // The destructive half only. The way out stays live: a reader who
          // cannot discard right now should still be able to stop asking.
          disabled={pending || disabled || unresolved}
          aria-describedby={whyId}
          onClick={() => {
            if (inFlightRef.current) return;
            inFlightRef.current = true;
            // Same tick as the click, beside the ref that already guards this
            // component against its own second press.
            onWriteState?.("writing");
            setError(null);
            startTransition(async () => {
              let result: DeckMutationResult;
              // `finally`, not a `.catch`: a synchronous throw would escape a
              // promise-level catch and leave the latch stuck, killing the
              // control for the rest of the page's life.
              try {
                // The version the sentence above named, sent along so the
                // server can refuse rather than land the discard on a version
                // this confirmation never described.
                result = await discardDeckDraft(deckId, version.id);
              } catch {
                // NOT `refused`. A refusal is the server declining before it
                // wrote; a throw can also be the reply to a restore that already
                // committed being lost on the way back. Saying "nothing has
                // changed" over a deck that is already back on its version is the
                // one wrong thing this control can say, so the message admits the
                // outcome is unknown and the router re-reads to settle it — which
                // also closes this question, because `useDiscardConfirm` drops it
                // the moment the refreshed state has no changes left.
                //
                // `unresolved` is what holds the answer shut afterwards, and it
                // matters most for `PendingBanner`: that caller passes no
                // `onWriteState`, so nothing else there stands between the reader
                // and a second destructive write against a draft that may already
                // be gone.
                onWriteState?.("unknown");
                setUnresolved(true);
                setError(copy.unresolved);
                router.refresh();
                return;
              } finally {
                // The same-tick window only. What holds the answer shut through an
                // UNKNOWN outcome is `unresolved`, which the button is disabled by
                // as well: a latch the control does not reflect is a button that
                // eats presses with nothing on screen to explain it.
                inFlightRef.current = false;
              }
              if (!result.ok) {
                // A refusal IS settled: the server declined before it wrote, so
                // nothing is in doubt and the host's controls open again.
                onWriteState?.("settled");
                // The server's own message is dropped deliberately. Every way this
                // write can fail leaves the draft intact, and that — not which
                // guard turned it down — is what the player needs told.
                setError(copy.refused);
                return;
              }
              // Spoken into the region that outlives this control, and it names
              // the version rather than only the loss: the deck the player is
              // looking at is now a different list from the one they were editing.
              draftAnnouncer().textContent = copy.announced(n, version.number);
              if (onDiscarded) {
                // The host navigates, and focusing this page's name first would
                // put the reader on an element the navigation then removes —
                // which is the drop this handoff exists to prevent. Where the
                // reader lands is that host's to say.
                onDiscarded();
                return;
              }
              // Before this box goes, while it is still in the document — see
              // `focusDeckName`.
              focusDeckName();
            });
          }}
          className={DANGER_CTA}
        >
          {pending ? copy.pending : copy.confirm(n)}
        </button>
      </div>
      {/* Under the answers, with the question still up: a refused discard changed
          nothing, so the draft is still there to be discarded or kept. */}
      {error && <MutationError message={error} />}
    </div>
  );
}

// The host's ghost control, third of the banner's three. Fixed width on the
// phone, where it shares a 44px row with whichever control sits beside it.
const GHOST_CTA =
  "flex md:inline-flex flex-none w-[92px] md:w-auto items-center justify-center " +
  "min-h-[44px] md:min-h-0 px-[16px] py-[10px] rounded-[8px] font-sans font-medium text-[13.5px] " +
  "text-[color:var(--fg-muted)] bg-transparent [border:1px_solid_var(--border-strong)] cursor-pointer";

// The box the question is asked in: the same plate the banner wears at rest, with
// the one danger mark in the whole feature swapped in for its brass rule. A rule
// and never a fill — a red plate would make the destructive answer the
// recommended one, which is the opposite of what a confirm is for.
const CONFIRM_BOX =
  "flex flex-col rounded-[10px] bg-[color:var(--surface-rail)] " +
  "px-[14px] py-[13px] md:px-[17px] md:py-[15px]";
// Inline for the same reason the banner's card border is: the left rule is a
// different width from the other three, and Tailwind resolves `border` against
// `[border-left:…]` by stylesheet order rather than by specificity.
const CONFIRM_BORDER = {
  border: "1px solid var(--border-strong)",
  borderLeft: "3px solid var(--danger)",
};

const QUESTION =
  "font-mono uppercase text-[9.5px] md:text-[10px] tracking-[0.14em] md:tracking-[0.16em] " +
  "text-[color:var(--danger)] mb-[9px]";

const CONSEQUENCE =
  "m-0 mb-[13px] md:mb-[14px] md:max-w-[520px] text-[12.5px] md:text-[13px] " +
  "leading-[1.55] text-[color:var(--fg-body)]";
const STAMP = "font-semibold text-[color:var(--fg)]";

// The geometry both answers share — the game log's confirm row, unchanged.
const ANSWER =
  "flex md:inline-flex items-center justify-center min-h-[44px] md:min-h-0 px-[18px] py-[10px] " +
  "rounded-[8px] font-sans font-semibold text-[13.5px] cursor-pointer " +
  "disabled:cursor-not-allowed disabled:opacity-50";
// A danger-tinted border rather than the neutral one: the design draws a dim red
// here, and a mix of the token is what carries that across all six themes, where
// the drawn value would be the dark theme's own painted on five others.
// `color-mix` of `--danger` is the app's shipped way of dimming it — see
// `confirm-modal`.
const DANGER_CTA =
  `${ANSWER} text-[color:var(--danger)] bg-transparent ` +
  "[border:1px_solid_color-mix(in_oklab,var(--danger)_34%,transparent)]";
// The brass fill goes on the way out, taking `PRIMARY`'s bone-on-ink and its
// hover rather than restating either. A touch taller than its neighbour on the
// phone, where it is the row the thumb lands on.
const SAFE_CTA = `${ANSWER} min-h-[48px] md:min-h-0 text-[14px] md:text-[13.5px] border-0`;
