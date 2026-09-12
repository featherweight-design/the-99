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

import { discardDeckDraft } from "../../app/decks/actions";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { changeCount, hasChanges, type DraftState } from "../../lib/decks/draft-shape";
import { formatDeckDate } from "../../lib/decks/format";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { PRIMARY } from "../ui/button";
import { draftAnnouncer } from "./draft-announcer";
import { MutationError } from "./mutation-error";

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
}: {
  onOpen: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button ref={triggerRef} type="button" onClick={onOpen} className={GHOST_CTA}>
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
   *  just been rewritten under it. The server revalidates the page itself. */
  onDiscarded?: () => void;
  /** Spacing the host needs around the box, never its own surface. */
  className?: string;
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
  const name = headings.find((h) => h.checkVisibility?.() ?? true) ?? headings[0];
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
}: DiscardConfirmProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Per instance rather than a module constant: two drafts drawn on one page
  // would otherwise share one id and leave `aria-describedby` pointing at
  // whichever consequence the document happened to hold first.
  const whyId = useId();
  const safeRef = useRef<HTMLButtonElement>(null);

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
  const sentence = copy.consequence(
    version.number,
    formatDeckDate(version.committedAt),
    versionCards,
    state.adds.length,
    state.removes.length,
  );
  const [head, tail] = sentence.split(stamp);

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
      </p>
      {/* One element ordered twice. At 390px the pair stacks with the safe answer
          on top, because the thumb reaches the bottom row first and the bottom row
          would otherwise be the unrecoverable one; on desktop the row reads from
          the act to the way out, as the design draws it. */}
      <div className="flex flex-col-reverse md:flex-row md:items-center md:flex-wrap gap-[8px] md:gap-[10px]">
        <button
          type="button"
          disabled={pending}
          aria-describedby={whyId}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              let result: DeckMutationResult;
              try {
                result = await discardDeckDraft(deckId);
              } catch {
                // A throw and a refusal read the same to the player and leave the
                // draft where it was, so one sentence covers them — the same call
                // the commit sheet makes about its own write.
                setError(copy.refused);
                return;
              }
              if (!result.ok) {
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
              // Before this box goes, while it is still in the document — see
              // `focusDeckName`.
              focusDeckName();
              onDiscarded?.();
            });
          }}
          className={DANGER_CTA}
        >
          {pending ? copy.pending : copy.confirm(n)}
        </button>
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

// Danger ink on the app's ghost border — the confirm the game log ships,
// unchanged.
const ANSWER =
  "flex md:inline-flex items-center justify-center min-h-[44px] md:min-h-0 px-[18px] py-[10px] " +
  "rounded-[8px] font-sans font-semibold text-[13.5px] cursor-pointer " +
  "disabled:cursor-not-allowed disabled:opacity-50";
const DANGER_CTA =
  `${ANSWER} text-[color:var(--danger)] bg-transparent [border:1px_solid_var(--border-strong)]`;
// The brass fill goes on the way out, taking `PRIMARY`'s bone-on-ink and its
// hover rather than restating either. A touch taller than its neighbour on the
// phone, where it is the row the thumb lands on.
const SAFE_CTA = `${ANSWER} min-h-[48px] md:min-h-0 text-[14px] md:text-[13.5px] border-0`;
