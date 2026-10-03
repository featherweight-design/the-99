"use client";
// Row three of the filter chassis: how many rows the filters left, and the
// chassis's ONLY live region.
//
// Lifted verbatim from `commanders/rack/result-line.tsx` per decision 13, with
// one change the move forces. The rack's version took a `Lane` and looked its
// copy up from `commandersCopy` / `discoverCopy`, which cannot serve `/decks` or
// `/collection` — neither is a lane. It takes the finished sentence instead, so
// the four routes keep their own wording and share the behaviour that actually
// matters here: one live region, and a 300ms announce debounce.
//
// Everything the rack's header comment explains still holds. A screen reader
// given four live regions reads a chorus after every keystroke, so this is the
// only one in the chassis and every other count — the sheet's dismiss button,
// the empty state — stays silent. The sentence is drawn immediately and
// ANNOUNCED late, which is why the visible line and the live region are two
// nodes: filtering is never delayed, only the message waits, so a reader typing
// four letters hears one count rather than four.

import { useEffect, useRef, useState } from "react";

const ANNOUNCE_DELAY_MS = 300;

export function ResultLine({
  line,
  announce,
  announceId,
  revision,
  silent,
  warn,
  hiddenSuffix,
}: {
  line: string;
  /**
   * A trailing substring of `line` to hide visually below 480px — the result
   * count's noun, which the pinned head's narrowest row 2 has no room for
   * beside a full `Sort:` trigger (collection surfaces addendum, Q2). The
   * visible `<p>` below is already `aria-hidden`, so hiding part of it changes
   * no accessible name; the live region a few lines down always speaks `line`
   * whole. Ignored when `line` does not end with it.
   */
  hiddenSuffix?: string;
  /**
   * Announced instead of `line` when the surface has something more specific to
   * say. `/collection`'s panels report which value changed — "EOE added. 3
   * sets, 120 of 400 cards shown." — which the line's bare count cannot.
   */
  announce?: string;
  /**
   * Identity of the announcement, when the surface can raise the same sentence
   * twice. Text alone cannot serve as identity — `FilterPanel` emits the same
   * option string for a repeated keystroke, and a caller holding it in state
   * re-publishes a value that has not changed — so an event that says the same
   * words as the last one would never be spoken. Bump this per action and the
   * same sentence speaks again.
   */
  announceId?: string | number;
  /**
   * A value the surface changes whenever the list changes, used to tell whether
   * a message held through a silence still describes what is on screen.
   *
   * The count alone cannot answer that: two filters can leave the same number
   * of rows, so a sentence composed for the first would be announced against
   * the second with nothing looking different. Pass the filter state, a
   * revision counter, or anything that moves when the list does. Omitted, the
   * count is used and this edge stays open.
   */
  revision?: string | number;
  /**
   * Stop announcing while another surface owns the region. The compact sheet is
   * `aria-modal` and carries its own, so with both live a filter change is
   * announced twice — once inside the modal and once from the page behind it,
   * which some assistive tech reads and some does not. The line still draws;
   * only the region goes quiet.
   */
  silent?: boolean;
  /**
   * Draw the line in `--warning` rather than `--fg-muted`. `/collection`'s
   * retired chip row turned its count amber at zero, which is the one state
   * where the number is telling the reader something went wrong rather than
   * reporting a total.
   */
  warn?: boolean;
}) {
  // The announcement and the event that produced it. Text alone is not enough:
  // setting the same string leaves React's DOM untouched, and a live region
  // whose content did not change is a region most screen readers do not read.
  // The `seq` rides on the node's `key`, so a repeated sentence is a NEW node
  // and the region is genuinely re-announced.
  const [announcement, setAnnouncement] = useState<{ text: string; seq: number }>({
    text: "",
    seq: 0,
  });
  // What was last announced. Null until the line first changes, which is what
  // keeps the chassis from reading its own count out on arrival.
  const announced = useRef<string | null>(null);
  // When the LATEST pending change arrived while silent, not when the silence
  // began. Those differ: a sheet open for a minute, then a filter toggled and
  // the sheet dismissed a moment later, has a long silence and a change the
  // sheet's own debounce never fired for. Keying the handover on the silence
  // would suppress a count nobody had said.
  const silentSince = useRef<number | null>(null);
  // The line a custom message was queued against while silent, or null.
  const queuedFor = useRef<string | number | null>(null);
  // The identity of the queued message, so a genuinely NEW one can be told from
  // the same one still sitting there while the list moves under it.
  const queuedId = useRef<string | number | undefined>(undefined);
  // The `announce` last seen, so a message is spoken once and never re-used.
  const lastAnnounce = useRef<string | number | undefined>(undefined);
  // The revision the current `announced` line was filed under. `revision` is
  // the caller's statement of what the RESULT is, and the line is only its
  // rendering — so a line that moves while the revision holds describes the
  // same list in different words, and is not something to announce.
  //
  // The case that needs it: a breakpoint-driven caller picks its short or long
  // sentence from a media query, and `useMinWidth` hydrates from its server
  // snapshot. On a wide first load the line therefore flips form once, just
  // after mount, with nothing having happened — and the region announced a
  // count the reader never asked for, past the initial-arrival silence.
  const announcedFor = useRef<string | number | undefined>(undefined);
  useEffect(() => {
    // Both halves matter. A custom message can arrive while the count holds —
    // a filter that narrows to the same number still changed something — so
    // watching `line` alone would never speak it. And `announce ?? line` is
    // wrong in the other direction: the caller's initial value is the empty
    // string, which is not null, so it would silence every ordinary
    // announcement rather than falling through to the line.
    // Identity is `announceId` when the caller supplies one, and the text
    // otherwise — so a surface that can repeat a sentence stays able to.
    const identity = announceId ?? announce;
    const fresh = announce !== undefined && announce !== "" && identity !== lastAnnounce.current;
    // A line that moved while the revision held is a re-rendering of the same
    // result, not a new one.
    const sameResult =
      revision !== undefined && announced.current !== null && announcedFor.current === revision;
    if (!fresh && (announced.current === null || announced.current === line || sameResult)) {
      announcedFor.current = revision;
      announced.current = line;
      // Silence may have been entered and left while this line sat unchanged.
      // Leaving the timestamp set lets a later, genuinely new count read as
      // long-silenced and be suppressed for a handover that never happened.
      if (!silent) silentSince.current = null;
      return;
    }
    // Silence is a handover, not a mute: while the sheet is open it owns the
    // region and announces the same count on the same 300ms debounce. Two
    // failures sit either side of that.
    //
    // Stamping before the silent return loses the announcement entirely when
    // the reader dismisses the sheet inside 300ms — the sheet's timer dies with
    // its unmount and the line already looks spoken. Never stamping speaks it
    // twice when they dismiss after 300ms, because the sheet said it and then
    // this does too.
    //
    // The two cases are separated by how long the silence lasted, which is the
    // one thing this component can measure: shorter than the debounce and the
    // sheet cannot have spoken, so this does.
    if (silent) {
      // Re-stamped on every change, so the handover measures the age of the
      // pending value rather than the age of the silence.
      silentSince.current = performance.now();
      // A custom message is held for delivery when silence ends — `lastAnnounce`
      // is deliberately not stamped, or the sentence would read as already said
      // and be replaced by the bare count.
      //
      // But it is only held while it still describes the list. If the line moves
      // again before the sheet closes, that sentence belongs to a state the
      // reader has left — "EOE added, 12 shown" after two more filters would
      // announce a count that is no longer true — so the queue is dropped and
      // the current count speaks instead.
      if (fresh && identity !== queuedId.current) {
        // A genuinely new message REPLACES the queued one rather than being
        // mistaken for it. Dropping it as stale stamped its identity as
        // delivered, so when silence ended nothing read fresh and the current
        // sentence was never spoken.
        queuedFor.current = revision ?? line;
        queuedId.current = identity;
      } else if (queuedFor.current !== null && queuedFor.current !== (revision ?? line)) {
        // The same message still sitting there while the list moved under it:
        // it describes a state the reader has left.
        lastAnnounce.current = identity;
        queuedFor.current = null;
        queuedId.current = undefined;
      }
      return;
    }
    // Silence can end in the same render that moves the list. Clearing the
    // queue before checking what it was composed against let `fresh` stay true
    // and delivered the held sentence against the newer list — the stale check
    // above, bypassed by timing. Compare first, then clear.
    // Stamping the ref is not enough here: `fresh` was computed above, so this
    // render would still deliver the held sentence. The message itself has to
    // be withdrawn for this pass.
    const heldWentStale =
      queuedFor.current !== null && queuedFor.current !== (revision ?? line);
    if (heldWentStale) lastAnnounce.current = identity;
    queuedFor.current = null;
    queuedId.current = undefined;
    const silentFor =
      silentSince.current === null ? null : performance.now() - silentSince.current;
    silentSince.current = null;
    // The handover only covers the count. A long silence means the sheet has
    // already said the number, so repeating it here would be the same figure
    // twice — but the sheet says the COUNT, never the surface's own sentence,
    // so a fresh custom message has still not been heard by anyone and must
    // come through. Suppressing it here lost it permanently.
    if (silentFor !== null && silentFor >= ANNOUNCE_DELAY_MS && !fresh) {
      announced.current = line;
      announcedFor.current = revision;
      return;
    }
    // `fresh` is the guard, not `announce ?? line`: the caller's initial value
    // is the empty string, which is not null, so the nullish fallback would
    // silence every ordinary announcement.
    // Stamped only for a message actually delivered. Recording the id on an
    // ordinary line announcement would let a caller holding a stable id have
    // its first real message read as stale and never spoken.
    if (fresh) lastAnnounce.current = identity;
    const message = fresh && !heldWentStale ? (announce as string) : line;
    // A custom message is delivered as given. It is composed by the surface for
    // a specific action, and this component adds no debounce of its own to it —
    // some callers send immediately (`FilterPanel`'s arrow-key and first-option
    // announcements, and the sort control) while only its search-match effect
    // waits 300ms. Waiting again here would put that one roughly 600ms behind
    // the keystroke and delay every other one for no reason. The line this
    // component composes itself is the only thing that waits.
    if (fresh && !heldWentStale) {
      announced.current = line;
      announcedFor.current = revision;
      setAnnouncement((a) => ({ text: message, seq: a.seq + 1 }));
      return;
    }
    // `announced` is stamped when the timer FIRES, not when it is scheduled.
    // Turning `silent` on mid-debounce cancels this timer through the cleanup;
    // stamping at schedule time left the line looking spoken, so when silence
    // ended the guard above took the early return and the count was never
    // announced at all.
    const t = setTimeout(() => {
      announced.current = line;
      announcedFor.current = revision;
      setAnnouncement((a) => ({ text: message, seq: a.seq + 1 }));
    }, ANNOUNCE_DELAY_MS);
    return () => clearTimeout(t);
  }, [line, announce, announceId, revision, silent]);

  return (
    <>
      <p
        aria-hidden
        className={`m-0 font-mono text-[11px] leading-[1.5] tabular-nums ${
          warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg-muted)]"
        }`}
      >
        {hiddenSuffix && line.endsWith(hiddenSuffix) ? (
          <>
            {line.slice(0, line.length - hiddenSuffix.length)}
            <span className="max-[479px]:hidden">{hiddenSuffix}</span>
          </>
        ) : (
          line
        )}
      </p>
      {/* Atomic, or a reader hears only the number that changed and loses the
          sentence that gave it a denominator. */}
      <span
        key={announcement.seq}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement.text}
      </span>
    </>
  );
}
