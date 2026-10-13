"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import {
  applySuggestion,
  dismissSuggestion,
  readTuningPanel,
  restoreSuggestion,
  runTuning,
  saveDeckLimits,
  undoSuggestion,
} from "../../app/decks/tuning-actions";
import { creditsCopy } from "../../lib/copy/credits";
import { numberWord } from "../../lib/copy/deck-analysis";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { countCharacters, deckTuningCopy } from "../../lib/copy/deck-tuning";
import { axisCopy } from "../../lib/copy/game-log";
import { formatCents } from "../../lib/decks/price";
import { isPriorResult, isPriorRun, okKeyOf, visitBaseline, type ToolBaseline } from "../../lib/decks/visit";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import type { Bracket } from "../../lib/profile/types";
import { gateReason } from "../../lib/tuning/gate";
import { isLine, type PairItem, type TuningState } from "../../lib/tuning/state";
import type { RefusalDetail } from "../../lib/tuning/validate";
import type { PrintedInSet } from "../../lib/sets/printed-in";
import { awaitRunSettled } from "./await-run";
import { AnalysisBanner } from "./analysis-banner";
import { FanShuffle } from "./fan-shuffle";
import { ManifestRows, type ManifestRow } from "./manifest-rows";
import { useReviewRun } from "./review-run";
import { useVerdictOverrides, VerdictOverridesProvider } from "./use-optimistic-verdict";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import { MutationError } from "./mutation-error";
import { SuggestionCard, type CardActions } from "./suggestion-card";
import { SuggestionLists } from "./suggestion-lists";
import { TuningLimitsBox } from "./tuning-limits-box";
import { TuningNotesField } from "./tuning-notes-field";
import { CreditsText } from "../ui/credits-text";

/**
 * Suggested changes (placement addendum v2): the last section of the Analysis tab, mounted only
 * over a reading. It reads its own state on mount, as the tab's first open reads a stored
 * analysis, and never spends a credit without a press.
 *
 * Its states, off `TuningState` and what the reader just pressed:
 *  - never run: with marked games (C1), with no games (D1, E3), with games and no marks (E5);
 *  - reading: the manifest ticking on a pure client-side stagger (H35, PR 3 — not on each read
 *    landing, which it did through PR 2), the fan shuffling (C2; its Stop was removed
 *    2026-10-12: the server finishes every run, so a read always runs to its end);
 *  - results, five or fewer (A1, A2, D2); part answered (C3); all answered (C4);
 *  - retired by a commit (C5): the set is cleared and the gate reopens;
 *  - nothing changed (state 5): drawn when a press finds the gate `unchanged`, with Suggest
 *    again anyway;
 *  - the five failures (6a-6e), and credits spent (C6, E4), which disables the primary and keeps
 *    the body; the spend cap's pause and the owner's share disable it the same way, with their
 *    own note.
 * The action row is one band across every state, so the panel does not jump as it changes.
 *
 * The server actions are injectable, so every state is testable without a request.
 */
export type TuningDeps = {
  /** `runId`: a past run History reopened (re-review), read in place of the newest. */
  read: (deckId: string, runId?: string | null) => Promise<TuningState | null>;
  run: (deckId: string, opts?: { anyway?: boolean; runId?: string; notes?: string }) => Promise<DeckMutationResult>;
  card: CardActions;
};

const SERVER: TuningDeps = {
  read: readTuningPanel,
  run: runTuning,
  card: { apply: applySuggestion, undo: undoSuggestion, reject: dismissSuggestion, restore: restoreSuggestion },
};

/** What the page already knows about the evidence, for the copy and the unchecked manifest. */
export type TuningFacts = {
  gameCount: number;
  noteCount: number;
  /** The strongest axis marked against the deck, and in how many games. Null with no marks. */
  fix: { key: string; hurt: number } | null;
  marked: number;
  cards: number;
  intent: string | null;
  /** "Kept for this deck" (H35, PR 2). Null/empty/false until the player sets them. */
  limits: { capCents: number | null; sets: readonly string[]; ownedOnly: boolean };
};

/** The checklist's own vocabulary (H35, PR 3) — a row the panel already knows how to draw,
 *  never a real per-step database read. `notes` here is the game log's notes row, unchanged
 *  since before this PR; `playerNotes` is the new Additional notes row, named differently so
 *  the two are never confused in a switch. */
export type ManifestStep = "games" | "notes" | "decklist" | "description" | "limits" | "playerNotes" | "collection";

const copy = deckTuningCopy.panel;
const manifest = deckTuningCopy.manifest;
const descriptionManifest = deckDescriptionCopy.manifest;
/** How often a run begun elsewhere (another tab, a reload mid-run) is re-read until it settles. */
const WATCH_MS = 3000;
/** The checklist's own pacing (H35, PR 3): presentational, never a real read landing. STATES
 *  §3 state 5 — "~350ms apart from 350ms". */
const STAGGER_MS = 350;
/** Past this, the writing row grows its own mono line (STATES §3 state 7). */
const LONG_WAIT_MS = 20_000;

type LimitField = "capDollars" | "sets" | "ownedOnly";

/** A limit field's value in one comparable form, as the page's facts spell it. */
function limitWire(key: LimitField, patch: { capDollars?: number | null; sets?: readonly string[]; ownedOnly?: boolean }): string {
  if (key === "sets") return (patch.sets ?? []).map((code) => code.toLowerCase()).join(",");
  return String(patch[key]);
}

export function TuningPanel({
  deckId,
  permits,
  facts,
  onLogGame,
  printedInSets = [],
  deps = SERVER,
  onSettled,
  onSaveDescription,
  freshEachVisit = false,
}: {
  deckId: string;
  permits: readonly Bracket[];
  facts: TuningFacts;
  onLogGame: () => void;
  /** Every set that printed a commander, newest first — "Kept for this deck"'s Set picker
   *  (H35, PR 2), the same list help-me-choose's intake form reads. */
  printedInSets?: readonly PrintedInSet[];
  deps?: TuningDeps;
  /** The first read has answered or failed: the tab's opening holds its loader until it has, so
   *  Suggested changes and its credit line never arrive after the rest of the tab. */
  onSettled?: () => void;
  /** The absent description row's own "Describing in place" editor (STATES §3 state 2, H35
   *  PR 3 review fix): `AnalysisEmpty`'s empty-state field cannot be reached from here — the two
   *  are mutually exclusive mounts (this panel only exists once a reading has happened). The
   *  same save `builder-shell.tsx` already wires to `AnalysisPanel`'s empty-state field. */
  onSaveDescription?: (value: string) => Promise<DeckMutationResult>;
  /** Hide a prior visit's set and open on the offer (`lib/decks/visit.ts`). Only inside the Tuning
   *  hub, where History keeps the prior reachable; on its own the tool shows its stored set. */
  freshEachVisit?: boolean;
}) {
  const [state, setState] = useState<TuningState | null>(null);
  // The rows' flips, so the tally and the answered layout read each answer the moment its row does.
  const overrides = useVerdictOverrides();
  // A past run History reopened here: its lines are read in place of the newest run's, each still
  // re-checked by Apply. This panel's own Suggest changes leaves it, at once (`leftReview`).
  const review = useReviewRun("suggested");
  const reviewRunId = review?.runId ?? null;
  const leftReview = useRef(false);
  // The reopened run's read failed: said here, under the hub's note, rather than an empty panel.
  const [reviewFailed, setReviewFailed] = useState(false);
  // What was already stored when this visit to the deck began (`lib/decks/visit`, Hugh
  // 2026-10-11): a set from a prior visit is not drawn, and lives only in History. Recorded by the
  // first read, so a run that finishes during the visit, or a remount within it, still shows.
  const [baseline, setBaseline] = useState<ToolBaseline | null>(null);
  // Mirrors `state`, written SYNCHRONOUSLY alongside every `setState` below, for code that must
  // read the LATEST value after an `await` inside an event handler, where the handler's own
  // `state` closure is frozen at the render that created it (`press`'s gate check, pre-open
  // review round 2). Not a `useEffect` mirror — an effect runs only after React commits a
  // render, and nothing here needs to wait for that.
  const stateRef = useRef<TuningState | null>(null);
  // Read through a ref, so a new callback from the shell never re-runs the first read.
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  }, [onSettled]);
  // Reading: the steps the stagger has ticked so far; null before a press (H35, PR 3 — a pure
  // client-side timer, never a real read landing).
  const [ticked, setTicked] = useState<ReadonlySet<ManifestStep> | null>(null);
  // Every read row has ticked and the model call has not yet settled (the writing row, active).
  const [writingActive, setWritingActive] = useState(false);
  // Past LONG_WAIT_MS with the model still out.
  const [longWait, setLongWait] = useState(false);
  const staggerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const longWaitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // "Additional notes" (H35, PR 3): one note per press, never saved — held here and nowhere else.
  const [notes, setNotes] = useState("");
  // Kept in step with `notes` synchronously, never by an effect (review round 3): `press` awaits
  // the limits flush and a possible re-read before it reads this, and the field stays editable
  // the whole time, so a plain closure over `notes` would send whatever was typed when the press
  // STARTED rather than what is on screen when it finishes.
  const notesRef = useRef(notes);
  function changeNotes(next: string) {
    notesRef.current = next;
    setNotes(next);
  }
  // The absent description row's own "Describing in place" editor (STATES §3 state 2).
  const [describing, setDescribing] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [descSaving, setDescSaving] = useState(false);
  const [descRefused, setDescRefused] = useState<string | null>(null);
  const [unchangedShown, setUnchangedShown] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [announced, setAnnounced] = useState("");
  const [intent, setIntent] = useState(facts.intent);
  // The header's `edit` is the line's other door, and its save revalidates the page: a new line
  // from the page replaces the one held here, adjusted during render so the old one never paints.
  const [seenIntent, setSeenIntent] = useState(facts.intent);
  // "Describing in place"'s own save sets `intent` optimistically, ahead of the revalidated
  // `facts.intent` prop this panel does not control the timing of. Held here so the sync below
  // does not immediately revert that optimistic value back to the stale prop on the very next
  // render (review fix's own corollary) — cleared once the prop actually catches up, which
  // re-arms the sync for a LATER external change (the header pencil, say).
  const [savedIntent, setSavedIntent] = useState<string | null>(null);
  if (savedIntent !== null && facts.intent === savedIntent) setSavedIntent(null);
  if (savedIntent === null && seenIntent !== facts.intent) {
    setSeenIntent(facts.intent);
    setIntent(facts.intent);
  }
  const [capDollars, setCapDollars] = useState(facts.limits.capCents === null ? null : facts.limits.capCents / 100);
  const [limitSets, setLimitSets] = useState(facts.limits.sets);
  const [ownedOnly, setOwnedOnly] = useState(facts.limits.ownedOnly);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  // "Kept for this deck" (H35, PR 2). Which fields carry an edit this panel has not yet seen
  // ACKNOWLEDGED by the server — not "does the current value differ from the last-seen prop",
  // which a deliberate REVERT defeats: flip owned-only on, let its save start, flip it back
  // before the response lands, and the revert's value happens to equal the old prop again, so
  // an equality check would wrongly call it unedited and let the first save's echo overwrite it
  // (pre-open review round 2). A field is dirty from the moment it is typed/picked until a send
  // that included it settles with no NEWER edit queued behind it.
  // State, not a ref: this is read during render (the sync-while-unedited check just below),
  // and a ref may not be read there.
  const [dirtyLimitFields, setDirtyLimitFields] = useState<ReadonlySet<LimitField>>(() => new Set());
  // Acknowledged saves waiting on the page's facts: the value sent, and the prop's value then.
  const [heldLimits, setHeldLimits] = useState<Partial<Record<LimitField, { sent: string; from: string }>>>({});
  const propLimitRef = useRef<Record<LimitField, string> | null>(null);
  // Reconciled every render, not gated behind "did `facts.limits` change reference" — a field
  // whose dirty marker was SKIPPED while its prop changed never got a second look once that
  // marker later cleared, since by then the prop reference was already stale-equal to what
  // this block had last seen (pre-open review round 4, a previously-missed finding): a value
  // another tab saved in between stayed invisible until some UNRELATED prop change happened to
  // re-trigger a reference comparison. Checking the actual VALUE every render, guarded by its
  // own `!==`, needs no reference tracking and settles the moment dirty clears.
  const wantedCapDollars = facts.limits.capCents === null ? null : facts.limits.capCents / 100;
  // A field whose save the server acknowledged stays the reader's until the PAGE's facts move
  // (Hugh, 2026-10-12: "Cards to add" flipped back for a moment). The ack and this panel's own
  // re-read land before the revalidated `facts` prop does, so clearing the marker on the ack let
  // the stale prop redraw the old choice until the new one arrived. Released when the prop reads
  // the value saved, or moves to anything else (a later change from elsewhere wins).
  const propLimit: Record<LimitField, string> = {
    capDollars: String(wantedCapDollars),
    sets: facts.limits.sets.map((code) => code.toLowerCase()).join(","),
    ownedOnly: String(facts.limits.ownedOnly),
  };
  const caughtUp = (Object.keys(heldLimits) as LimitField[]).filter(
    (key) => propLimit[key] === heldLimits[key]!.sent || propLimit[key] !== heldLimits[key]!.from,
  );
  // What a send reads as "the page's value when it left": refreshed after every commit.
  useLayoutEffect(() => { propLimitRef.current = propLimit; });
  if (caughtUp.length > 0) {
    setHeldLimits((prev) => {
      const next = { ...prev };
      caughtUp.forEach((key) => delete next[key]);
      return next;
    });
    setDirtyLimitFields((prev) => {
      const next = new Set(prev);
      caughtUp.forEach((key) => next.delete(key));
      return next;
    });
  }
  if (!dirtyLimitFields.has("capDollars") && capDollars !== wantedCapDollars) setCapDollars(wantedCapDollars);
  if (!dirtyLimitFields.has("sets") && limitSets !== facts.limits.sets) setLimitSets(facts.limits.sets);
  if (!dirtyLimitFields.has("ownedOnly") && ownedOnly !== facts.limits.ownedOnly) setOwnedOnly(facts.limits.ownedOnly);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Each press takes a token, so a superseded press cannot land over what the reader did next.
  const token = useRef(0);
  // Leaving the panel ends this visit's press: its poll and its draws check the token, and a bump
  // here supersedes them, so nothing is read or drawn for a panel no longer on screen. The run
  // itself is the server's and finishes regardless.
  useEffect(() => () => { token.current += 1; }, []);
  // The id this panel gave the run its press started, until that press settles. The watch for a
  // pending run leaves this one's stagger to `pressRun`: the pending row a read turns up may be
  // another tab's.
  const ownRun = useRef<string | null>(null);
  // A SYNCHRONOUS re-entry guard over `press`'s whole body: `reading` (which the render uses to
  // disable the button) only goes true once `setTicked(new Set())` runs below, so a second click during
  // the flush-and-gate-check preamble would otherwise start a SECOND `press`, racing `token` and
  // `ownRun` against the first (pre-open review round 3). Holds the TOKEN the active press is
  // running under, or null; a press's own `finally` only clears it when it still names that
  // exact press (round 4).
  const preparingRun = useRef<number | null>(null);

  // EVERY server call here can reject (a dropped connection, an unexpected database error), and a
  // rejection must never strand the panel: a failed re-read keeps what is on screen, and a failed
  // run or read leaves the reading state with the run's own refusal.
  // Only the newest read is drawn: two rows answered together each ask for one, and the older read
  // can land last holding a snapshot from before the newer answer committed. A superseded read
  // answers null, as a failed one does: every caller reads non-null as "this read landed".
  const asked = useRef(0);
  const reread = useCallback(async () => {
    const mine = ++asked.current;
    try {
      const next = await deps.read(deckId, leftReview.current ? null : reviewRunId);
      if (mine !== asked.current) return null;
      setState(next);
      stateRef.current = next;
      return next;
    } catch {
      return null;
    }
  }, [deps, deckId, reviewRunId]);

  // Debounced trailing-edge, PARTIAL and MERGED: typing the cap fires `saveLimits` on every
  // keystroke, so only the latest value within one pause reaches the server — and only the
  // FIELD that changed, never the other two, so one tab's cap edit can't carry another tab's
  // stale sets/owned-only back over whatever that tab has since saved (pre-open review round
  // 2). Two edits to DIFFERENT fields inside the same pause merge into one request; a save
  // already dispatched when a new edit lands is never raced — `limitsChain` serializes every
  // send, and the next one starts only once the last has settled.
  type LimitsPatch = { capDollars?: number | null; sets?: readonly string[]; ownedOnly?: boolean };
  const saveLimitsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLimits = useRef<LimitsPatch | null>(null);
  const limitsChain = useRef<Promise<unknown>>(Promise.resolve());
  const limitsInFlight = useRef(0);
  // Which field is in trouble right now — a send that answered `{ ok: false }` or threw, not
  // yet cleared by a LATER successful send covering that same field (pre-open review round 3).
  // Checking only the last chain link's own boolean missed an EARLIER failure a later,
  // different-field send's success had nothing to do with.
  const failedLimitFields = useRef<Set<LimitField>>(new Set());
  // The edit count per field, bumped on every local change and SNAPSHOTTED into the patch a
  // send carries. A send clears a field's dirty marker only when the ack's snapshot still
  // equals the CURRENT count — i.e. no further edit has queued behind it anywhere in the chain
  // (pre-open review round 3). Checking "is this key still in `pendingLimits`" only caught an
  // edit queued in the SAME unsent patch; a newer edit that had already moved into its OWN,
  // separately-chained send was invisible to that check.
  const limitFieldRevision = useRef<Record<LimitField, number>>({ capDollars: 0, sets: 0, ownedOnly: 0 });
  // True when the re-read a successful save just tried to force did NOT land (an exception, or
  // a resolved-null read) — `stateRef` then still holds the PRE-SAVE fingerprint, which a gate
  // check must not trust (pre-open review round 4, previously missed): the save genuinely
  // happened, but the "unchanged" verdict it was meant to retire is still sitting in `stateRef`.
  const limitsStaleRead = useRef(false);
  const sendLimits = useCallback(
    (patch: LimitsPatch, revisionAtSend: Partial<Record<LimitField, number>>): Promise<boolean> => {
      const keys = Object.keys(patch) as LimitField[];
      // The page's value for each field when this send left: the hold ends once it moves.
      const fromAtSend: Partial<Record<LimitField, string>> = {};
      keys.forEach((key) => { fromAtSend[key] = propLimitRef.current?.[key]; });
      limitsInFlight.current += 1;
      const sent = limitsChain.current
        .then(async (): Promise<boolean> => {
          try {
            const result = await saveDeckLimits(deckId, patch);
            if (!result.ok) {
              setLimitsError(result.message);
              keys.forEach((key) => failedLimitFields.current.add(key));
              return false;
            }
            setLimitsError(null);
            // The fingerprint changed server-side, so a prior "unchanged" reading of this exact
            // gate no longer applies — re-read so the manifest and the gate reopen without
            // waiting for an unrelated navigation to revalidate the page (round 1).
            limitsStaleRead.current = (await reread()) === null;
            setUnchangedShown(false);
            keys.forEach((key) => failedLimitFields.current.delete(key));
            const settled = keys.filter((key) => limitFieldRevision.current[key] === revisionAtSend[key]);
            if (settled.length > 0) {
              // Not cleared here: held until the page's facts catch up (see `heldLimits`).
              setHeldLimits((prev) => {
                const next = { ...prev };
                settled.forEach((key) => { next[key] = { sent: limitWire(key, patch), from: fromAtSend[key] ?? "" }; });
                return next;
              });
            }
            return true;
          } catch {
            setLimitsError(deckDescriptionCopy.limits.refused);
            keys.forEach((key) => failedLimitFields.current.add(key));
            return false;
          }
        })
        .finally(() => {
          limitsInFlight.current -= 1;
        });
      limitsChain.current = sent;
      return sent;
    },
    [deckId, reread],
  );
  const scheduleSend = useCallback((toSend: LimitsPatch) => {
    const keys = Object.keys(toSend) as LimitField[];
    const revisionAtSend: Partial<Record<LimitField, number>> = {};
    keys.forEach((key) => {
      revisionAtSend[key] = limitFieldRevision.current[key];
    });
    return sendLimits(toSend, revisionAtSend);
  }, [sendLimits]);
  const saveLimits = useCallback(
    (patch: LimitsPatch) => {
      const keys = Object.keys(patch) as LimitField[];
      keys.forEach((key) => {
        limitFieldRevision.current[key] += 1;
      });
      setDirtyLimitFields((prev) => new Set([...prev, ...keys]));
      // A new edit supersedes any acknowledged value still waiting on the page.
      setHeldLimits((prev) => {
        if (!keys.some((key) => key in prev)) return prev;
        const next = { ...prev };
        keys.forEach((key) => delete next[key]);
        return next;
      });
      pendingLimits.current = { ...pendingLimits.current, ...patch };
      if (saveLimitsTimer.current !== null) clearTimeout(saveLimitsTimer.current);
      saveLimitsTimer.current = setTimeout(() => {
        saveLimitsTimer.current = null;
        const toSend = pendingLimits.current;
        pendingLimits.current = null;
        if (toSend !== null) void scheduleSend(toSend);
      }, 500);
    },
    [scheduleSend],
  );
  // The cap draft went invalid (non-empty, out of bounds) — cancel only ITS contribution to a
  // still-pending patch, leaving a sibling field's queued edit (sets, owned-only) untouched
  // (pre-open review round 2): without this, a valid cap edit typed moments earlier stays
  // queued and lands under an amount the field no longer shows.
  const cancelPendingCap = useCallback(() => {
    if (pendingLimits.current && "capDollars" in pendingLimits.current) {
      const { capDollars: _capDollars, ...rest } = pendingLimits.current;
      pendingLimits.current = Object.keys(rest).length > 0 ? rest : null;
    }
    // No send will ever carry this field now, so nothing will ever clear its dirty marker the
    // usual way — clear it here instead, so the reconciliation above redraws the field from the
    // AUTHORITATIVE server value on the very next render rather than leaving the cancelled
    // draft sitting indefinitely, looking saved (pre-open review round 4, previously missed).
    setDirtyLimitFields((prev) => {
      if (!prev.has("capDollars")) return prev;
      const next = new Set(prev);
      next.delete("capDollars");
      return next;
    });
  }, []);
  // Flushes any debounced-but-unsent edit now, and waits for it AND any send already in flight
  // to settle — `press` needs both before it can trust `stateRef` (pre-open review round 2).
  // `touched` is false only when there was truly nothing pending or in flight, which is what
  // lets `press` skip the extra read on the common path where no limit was ever edited.
  // `ok` reports every field currently in `failedLimitFields`, not just the LAST chain link's
  // own result — a successful sets-only send must not erase an earlier failed cap send's
  // refusal (pre-open review round 3).
  const flushLimitsNow = useCallback(async (): Promise<{ ok: boolean; touched: boolean }> => {
    if (saveLimitsTimer.current !== null) {
      clearTimeout(saveLimitsTimer.current);
      saveLimitsTimer.current = null;
    }
    const toSend = pendingLimits.current;
    pendingLimits.current = null;
    if (toSend !== null) {
      await scheduleSend(toSend);
      return { ok: failedLimitFields.current.size === 0, touched: true };
    }
    if (limitsInFlight.current === 0) return { ok: failedLimitFields.current.size === 0, touched: false };
    await limitsChain.current.catch(() => undefined);
    return { ok: failedLimitFields.current.size === 0, touched: true };
  }, [scheduleSend]);
  useEffect(() => {
    return () => {
      if (saveLimitsTimer.current !== null) clearTimeout(saveLimitsTimer.current);
      const pending = pendingLimits.current;
      pendingLimits.current = null;
      // A tab switch within the debounce's pause unmounts this panel — flush rather than drop
      // the player's last edit (pre-open review round 1).
      if (pending !== null) void scheduleSend(pending);
    };
  }, [scheduleSend]);

  useEffect(() => {
    let live = true;
    deps.read(deckId, leftReview.current ? null : reviewRunId).then(
      (next) => {
        if (!live) return;
        // A reopened past run is not the deck's state on arrival: an ordinary read records the baseline.
        if (next && freshEachVisit && !next.review) {
          setBaseline(visitBaseline(deckId, "suggested", {
            okKey: okKeyOf(next.lastOkAt),
            // A pending run is drawn as running whatever the baseline says, and what it settles
            // to happened during this visit, so only a SETTLED run can be a prior visit's.
            runId: next.run && next.run.status !== "pending" ? next.run.id : null,
          }));
        }
        setState(next);
        stateRef.current = next;
        settledRef.current?.();
      },
      // A first read that fails draws nothing, as a deck with no reading does; a reopened run's
      // read says it did not load, as History's own view did.
      () => {
        if (!live) return;
        if (reviewRunId !== null && !leftReview.current) setReviewFailed(true);
        settledRef.current?.();
      },
    );
    return () => {
      live = false;
    };
  }, [deps, deckId, freshEachVisit, reviewRunId]);

  // Computed here, ahead of the `state === null` early return below, since the following effect
  // (every hook must run unconditionally) needs them as a dependency.
  const previewSteps = readSteps(facts, intent);
  const runStepsList = runSteps(facts, intent);

  // A run already in flight when the panel opened (another tab, a reload mid-run): reconstruct
  // the stagger from the run's own `createdAt` — review round 2 (previously missed): without
  // this, `ticked` stays null for the WHOLE run (the stagger only ever starts inside `pressRun`),
  // so every row sits at 0/N and the writing row never activates until the run finally settles.
  // Keyed on the run's own id, not on `ticked`, so setting `ticked` here does not immediately
  // retrigger (and tear down) this same effect.
  // Not while a reopened past run is shown: a newer run in flight is not this view's to draw.
  const watching = state?.run?.status === "pending" && !state.review ? state.run : null;
  const pendingRunId = watching ? watching.id : null;
  const pendingRunCreatedAt = watching ? watching.createdAt.getTime() : null;
  const watchedRunId = useRef<string | null>(null);
  useEffect(() => {
    if (pendingRunId === null || pendingRunCreatedAt === null) {
      // A WATCHED run (begun elsewhere, or before this mount) just settled: its reconstructed
      // stagger ends here, or `ticked` would hold the panel in its reading state over the result
      // it is waiting for. This panel's own press settles its own stagger in `pressRun`.
      if (watchedRunId.current !== null && ownRun.current === null) {
        setTicked(null);
        setWritingActive(false);
        setLongWait(false);
      }
      watchedRunId.current = null;
      return;
    }
    if (watchedRunId.current === pendingRunId) return;
    watchedRunId.current = pendingRunId;
    const elapsed = Date.now() - pendingRunCreatedAt;
    const already = Math.min(Math.max(0, Math.floor(elapsed / STAGGER_MS)), runStepsList.length);
    // This effect is reconstructing state from an external system — a run already under way,
    // read off its own `createdAt` — the case `use-card-search.ts` already disables this same
    // rule for, rather than deferring the call through a 0ms timer: that deferral raced a
    // synchronous `setTicked(null)` landing in the SAME tick in a test with no fake timers,
    // reviving `ticked`.
    setTicked(new Set(runStepsList.slice(0, already)));
    let localStagger: ReturnType<typeof setInterval> | null = null;
    if (already >= runStepsList.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWritingActive(true);
    } else {
      let i = already;
      localStagger = setInterval(() => {
        const step = runStepsList[i];
        i += 1;
        setTicked((prev) => new Set(prev ?? []).add(step));
        if (i >= runStepsList.length) {
          if (localStagger !== null) clearInterval(localStagger);
          localStagger = null;
          staggerTimer.current = null;
          setWritingActive(true);
        }
      }, STAGGER_MS);
      staggerTimer.current = localStagger;
    }
    let localLongWait: ReturnType<typeof setTimeout> | null = null;
    if (elapsed >= LONG_WAIT_MS) {
      setLongWait(true);
    } else {
      localLongWait = setTimeout(() => setLongWait(true), LONG_WAIT_MS - elapsed);
      longWaitTimer.current = localLongWait;
    }
    const watchId = setInterval(() => void reread(), WATCH_MS);
    return () => {
      clearInterval(watchId);
      if (localStagger !== null) clearInterval(localStagger);
      if (localLongWait !== null) clearTimeout(localLongWait);
      staggerTimer.current = null;
      longWaitTimer.current = null;
    };
    // `runStepsList` is deliberately NOT a dependency below — it is a fresh array every render
    // (like `facts` itself), and listing it would tear this effect's interval down on every
    // unrelated re-render. `pendingRunId`/`pendingRunCreatedAt` (stable primitives) are what
    // this effect actually needs to re-run on; it reads the step list from whichever render's
    // closure is current when that happens, same as the rest of this component reads
    // `facts`/`intent`.
  }, [pendingRunId, pendingRunCreatedAt, reread]); // eslint-disable-line react-hooks/exhaustive-deps
  // The stagger and its long-wait timer are cleared on every unmount.
  useEffect(() => {
    return () => {
      if (staggerTimer.current !== null) clearInterval(staggerTimer.current);
      if (longWaitTimer.current !== null) clearTimeout(longWaitTimer.current);
    };
  }, []);

  if (state === null) {
    return reviewFailed ? (
      <section aria-labelledby="tuning-heading" className="rounded-[11px] px-[14px] py-[16px] md:rounded-[12px] md:px-[20px] md:py-[18px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
        <h2 id="tuning-heading" tabIndex={-1} className="font-display text-[17px] font-semibold outline-none md:text-[19px]" style={{ color: "var(--fg)" }}>{copy.heading}</h2>
        <p className="mt-[8px] text-[13px]" style={{ color: "var(--fg-body)" }}>{tuningHubCopy.history.pastFailed}</p>
      </section>
    ) : null;
  }

  // A prior visit's set, and a prior visit's failed run, are hidden: the panel opens on its offer.
  // A press made over a hidden set runs anew (Hugh, 2026-10-11: "I don't want to see prior
  // suggestions, I just want a new one"), so it passes the `unchanged` gate as `anyway` does.
  // A reopened past run is never hidden as a prior visit's, nor retired by a commit since.
  const reviewing = !!state.review;
  const priorResult = !reviewing && isPriorResult(baseline, okKeyOf(state.lastOkAt));
  // A reopened run is what the reader asked for: a newer run's pending or failed state is not drawn
  // over it (as a prior visit's is not), until the reader presses for a new run here.
  const priorRun = reviewing || isPriorRun(baseline, state.run?.id);

  const reading = ticked !== null || (!reviewing && state.run?.status === "pending");
  // Spent is read off the allowance itself, never off `gateReason`: that answers "unchanged" first,
  // and a player with no credits left on an unchanged deck must still see the press disabled.
  const spent = state.allowance.used >= state.allowance.limit;
  const left = Math.max(0, state.allowance.limit - state.allowance.used);
  // The spend cap's two states disable the press exactly as a spent allowance does, and only the
  // note under it changes. Paused wins (it is the whole app), then the owner's share, then spent.
  const paused = state.allowance.paused;
  // Every card but the commander locked (Locked, never cut): nothing to cut, so the press is
  // disabled and the server refuses it before a credit is reserved (the gate's `allLocked`).
  const allLocked = !reading && state.allLocked ? state.allLocked : null;
  const blocked = spent || !!paused || state.allowance.ownerShare === true || allLocked !== null;

  async function press(anyway = false) {
    if (!state) return;
    // Held for the whole press, released on every exit by the `finally` below — not just the
    // preamble, since `reading`'s own disablement only starts once `setTicked(new Set())` runs further
    // down (pre-open review round 3). Stamped with THIS press's own token (bumped here, not
    // inside `pressRun`): the `finally` only clears it when the guard still names the token it set.
    if (preparingRun.current !== null) return;
    const mine = ++token.current;
    preparingRun.current = mine;
    try {
      setRefused(null);
      // A limit edited moments ago still has a pending or in-flight save — flush and wait for it
      // first, or this press can capture the OLD fingerprint and run stale the instant the save
      // lands (pre-open review round 2). LOOPED: an edit made DURING that wait (the controls stay
      // interactive until `reading` goes true) would otherwise sit outside the one snapshot this
      // flushed, and the run would start without it (round 3). `touched` false on the loop's
      // first pass is the common case (nothing to do with limits pending) and costs nothing
      // beyond the one check.
      let flushed = await flushLimitsNow();
      while (flushed.ok && flushed.touched && pendingLimits.current !== null) {
        flushed = await flushLimitsNow();
      }
      if (!flushed.ok) {
        setRefused(deckDescriptionCopy.limits.refused);
        return;
      }
      let current = flushed.touched ? stateRef.current : state;
      // The save's own re-read failed — `current` is the PRE-SAVE fingerprint, not the one this
      // press must judge "unchanged" against. Checked on the FLAG alone, not `flushed.touched`:
      // a press made after that save (and its failed re-read) had already settled sees
      // `touched: false` here, since nothing was pending or in flight by the time THIS press
      // ran, but the flag itself survives across presses until a read actually lands (round 5).
      if (limitsStaleRead.current) {
        current = await reread();
        limitsStaleRead.current = current === null;
      }
      if (current === null) {
        setRefused(deckTuningCopy.run.refused);
        return;
      }
      // Snapshotted HERE, after every await above, never read from the outer closure further
      // down (review round 3): the field stays editable through the whole wait, so the ref's
      // value at this instant is what the player actually sees when the press is about to run.
      const typedNotes = notesRef.current;
      // "Additional notes" (H35, PR 4b, review round 2): notes are new input the model has never
      // seen, so a deck otherwise unchanged still has something new to read — the same bypass
      // `anyway` gives, never the OTHER gate reasons (in_flight, allLocked, allowance).
      if (!anyway && typedNotes.trim() === "" && gateReason(current)?.kind === "unchanged") {
        setUnchangedShown(true);
        setAnnounced(deckTuningCopy.announce.unchanged);
        return;
      }
      setUnchangedShown(false);
      await pressRun(mine, anyway, typedNotes);
    } finally {
      if (preparingRun.current === mine) preparingRun.current = null;
    }
  }

  // `notes` is `press`'s own post-await snapshot, passed explicitly (review round 3) rather than
  // read from the outer closure, which could still hold what the field showed before a limits
  // flush or re-read, not what it shows now.
  async function pressRun(mine: number, anyway: boolean, notes: string) {
    if (token.current !== mine) return;
    // Leaving a reopened past run only once a new run really starts: a preflight that refuses leaves
    // the reader on the run, its note and its way back intact.
    if (review && !leftReview.current) { leftReview.current = true; review.leave?.(); }
    const runId = crypto.randomUUID();
    ownRun.current = runId;
    setTicked(new Set());
    setWritingActive(false);
    setLongWait(false);
    setAnnounced(deckTuningCopy.announce.started);
    // Settled to a result whatever happens, so an unexpected throw is a refusal like any other.
    const running = deps.run(deckId, { ...(anyway ? { anyway: true } : {}), runId, notes }).catch(
      (): DeckMutationResult => ({ ok: false, message: deckTuningCopy.run.refused }),
    );
    // The checklist ticks on a pure client-side stagger (H35, PR 3), never on a real read
    // landing — it shows the page's own already-known figures. A result that lands before the
    // stagger finishes ticks the remaining rows at once, below, rather than waiting it out.
    if (runStepsList.length === 0) {
      setTicked(new Set());
      setWritingActive(true);
    } else {
      let i = 0;
      staggerTimer.current = setInterval(() => {
        if (token.current !== mine) {
          if (staggerTimer.current !== null) clearInterval(staggerTimer.current);
          staggerTimer.current = null;
          return;
        }
        // Snapshotted now, not read inside the `setTicked` updater: React may defer running that
        // updater past this tick's own synchronous end, by which point a later tick has already
        // moved `i` on — the updater would then add whatever step `i` points to AT THAT TIME,
        // not the one this tick meant.
        // Snapshotted now, not read inside the `setTicked` updater: React may defer running that
        // updater past this tick's own synchronous end, by which point a later tick has already
        // moved `i` on — the updater would then add whatever step `i` points to AT THAT TIME,
        // not the one this tick meant.
        const step = runStepsList[i];
        i += 1;
        setTicked((prev) => {
          const next = new Set(prev ?? []);
          next.add(step);
          return next;
        });
        if (i >= runStepsList.length) {
          if (staggerTimer.current !== null) clearInterval(staggerTimer.current);
          staggerTimer.current = null;
          setWritingActive(true);
        }
      }, STAGGER_MS);
    }
    longWaitTimer.current = setTimeout(() => {
      if (token.current === mine) setLongWait(true);
    }, LONG_WAIT_MS);
    const result = await running;
    // The action returns once the run is reserved; the server finishes it after the response. Read
    // until it settles, so the checklist keeps going and the result is drawn when it lands.
    const waited = result.ok
      ? await awaitRunSettled(() => deps.read(deckId, leftReview.current ? null : reviewRunId), runId, { aborted: () => token.current !== mine })
      : null;
    // Checked BEFORE touching the timer refs, not after (review fix): `staggerTimer`/
    // `longWaitTimer` are this component's shared refs, and a superseded press (the panel left)
    // must not reach in and clear timers that are no longer its own.
    if (token.current !== mine) return;
    if (staggerTimer.current !== null) {
      clearInterval(staggerTimer.current);
      staggerTimer.current = null;
    }
    if (longWaitTimer.current !== null) {
      clearTimeout(longWaitTimer.current);
      longWaitTimer.current = null;
    }
    // The result landed — tick every row at once, covering both the common case (the stagger
    // already finished) and an early result that beat it (STATES §3: "ticks the rest at once").
    setTicked(new Set(runStepsList));
    setWritingActive(false);
    ownRun.current = null;
    // Token-checked AFTER the read too: a panel left while this read is in flight must not be
    // drawn or announced over.
    const next = waited ?? await deps.read(deckId, leftReview.current ? null : reviewRunId).catch(() => null);
    if (token.current !== mine) return;
    if (next) {
      setState(next);
      stateRef.current = next;
    }
    setTicked(null);
    setLongWait(false);
    if (!result.ok) {
      setRefused(result.message);
      setAnnounced(result.message);
      return;
    }
    // The run itself landed (`result.ok`), but the closing read that would show it failed or
    // came back empty. Without this, the panel fell through below with `next` null, computed no
    // failure (there was nothing to read it off), and announced "ready" with 0 items while
    // `state` stayed whatever it was BEFORE this press — the empty form, on a deck's first run.
    // A reader who waited through "taking longer than expected" then saw the press silently
    // undone. Surfaced as a refusal instead: the same message a stale tab's replayed request
    // gets (`deckTuningCopy.run.refused`), since both are "we cannot show you this read".
    if (!next) {
      setRefused(deckTuningCopy.run.refused);
      setAnnounced(deckTuningCopy.run.refused);
      return;
    }
    const failure = next.run?.status === "failed" ? failureCopy(next.run.errorClass) : null;
    // `result.ok` alone does not mean a set of suggestions landed — `runTuning` answers ok after
    // persisting a run that itself failed (e.g. `upstream_busy`, `locked_only`, `ungrounded`),
    // review round 1. Round 2: `!failure` alone is not enough either — a closing read that
    // failed or returned a run in some OTHER non-`ok` status is also not a success, and must
    // not be read as one just because it also isn't the `failed` branch. Only an explicit `ok`
    // clears the note.
    if (next.run?.status === "ok") changeNotes("");
    const nextLines = next.items.filter(isLine);
    setAnnounced(failure ? failure.heading
      : nextLines.length > 0
        ? deckTuningCopy.announce.readyLists(nextLines.filter((l) => l.side === "add").length, nextLines.filter((l) => l.side === "cut").length)
        : deckTuningCopy.announce.ready(next.items.length));
    headingRef.current?.focus();
  }

  /** After a row's answer: announce it and read again. False when the re-read failed or a newer
   *  read superseded it, so the row keeps drawing its answer rather than falling back to a verdict
   *  the drawn state never moved; a newer read that lands moves the row's server verdict itself. */
  async function settled(announce: string): Promise<boolean> {
    setAnnounced(announce);
    return (await reread()) !== null;
  }

  // The absent description row's own "Describing in place" editor (STATES §3 state 2, review
  // fix): `AnalysisEmpty`'s empty-state field is a different, mutually exclusive mount — this
  // panel only exists once a reading has happened — so the row opens its own small editor
  // instead of trying to reach that field.
  function describeDeck() {
    setDescDraft(intent ?? "");
    setDescRefused(null);
    setDescribing(true);
  }
  function cancelDescribing() {
    setDescribing(false);
    setDescRefused(null);
  }
  async function saveDescribing() {
    if (!onSaveDescription) return;
    setDescSaving(true);
    try {
      // Normalized the same way `saveIntent` stores it (trimmed, blank mapped to null) — review
      // round 2: comparing the RAW draft against the server's normalized `facts.intent` meant a
      // value with surrounding whitespace, or an explicit clear, never matched, leaving
      // `savedIntent` set indefinitely and blocking a LATER external edit from syncing in.
      const normalized = normalizeIntent(descDraft);
      const result = await onSaveDescription(descDraft).catch(
        (): DeckMutationResult => ({ ok: false, message: deckDescriptionCopy.description.refused }),
      );
      if (!result.ok) {
        setDescRefused(result.message);
        return;
      }
      setIntent(normalized);
      setSavedIntent(normalized);
      setDescribing(false);
      setAnnounced(deckDescriptionCopy.announce.descriptionSaved);
    } finally {
      setDescSaving(false);
    }
  }

  // ── The body ──────────────────────────────────────────────────────────
  let body: ReactNode;
  let primary: { label: string; again: boolean } = { label: copy.suggest, again: false };
  let note: string | null = null;
  let neverRun = false;

  const failure = !reading && !priorRun && state.run?.status === "failed" ? failureCopy(state.run.errorClass) : null;
  // "Refusal" (STATES §3 state 9): AnalysisBanner's own frame, one sentence, no button, above
  // the set — never the generic Failure chrome. Only `ungrounded` carries a `refusal` the
  // validator can name; `locked_only` keeps its own established copy (F10, Hugh 2026-09-25).
  const refusal = !reading && !priorRun && state.run?.status === "failed" && state.run.errorClass === "ungrounded"
    ? refusalBody(state.run.validationReport?.refusal ?? { reason: "nothingLeft" })
    : null;
  // A failed or stopped re-run (an old `cancelled` row, from before Stop was removed) leaves the
  // set it would have replaced on screen, still open.
  const hasSet = !reading && (reviewing || !state.retired) && !priorResult && state.items.length > 0;
  const neverRunRows = manifestRows(facts, intent, null, previewSteps);
  // "Describing in place" (STATES §3 state 2) replaces the checklist with its own editor; Cancel
  // and a successful Save both return to the ordinary checklist.
  const checklist = describing ? (
    <DescribingInPlace
      value={descDraft}
      onChange={setDescDraft}
      onSave={() => void saveDescribing()}
      onCancel={cancelDescribing}
      saving={descSaving}
      refused={descRefused}
    />
  ) : (
    <ManifestRows rows={neverRunRows} onLogGame={onLogGame} onDescribe={describeDeck} />
  );

  if (reading) {
    const runRows: ManifestRow[] = [
      ...manifestRows(facts, intent, ticked ?? new Set(), runStepsList),
      { kind: "writing", label: descriptionManifest.writing, active: writingActive },
    ];
    body = (
      <>
        <div className="mt-[14px] flex flex-col items-center gap-[10px] text-center md:mt-[12px] md:flex-row md:items-center md:gap-[20px] md:text-left">
          <span className="md:hidden"><FanShuffle size="phone" /></span>
          <span className="hidden md:inline-flex"><FanShuffle size="desktop" /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-[10px] md:gap-[6px]">
            <span className="font-display text-[15px] font-semibold md:text-[16px]" style={{ color: "var(--fg)" }}>
              {copy.loadingHeading}
            </span>
            <span className="text-[12.5px] leading-[1.55] md:text-[13.5px] md:leading-[1.6]" style={{ color: "var(--fg-body)" }}>
              {copy.loadingLead}
            </span>
          </span>
        </div>
        <ManifestRows rows={runRows} writingLong={longWait ? descriptionManifest.writingLong : null} />
      </>
    );
  } else if (state.retired && !priorResult && !reviewing) {
    // A failed run after a commit still says it failed, over the retired lead.
    if (failure) primary = { label: deckTuningCopy.failure.retry, again: false };
    body = (
      <>
        {failure ? (refusal ? <AnalysisBanner variant="note" sentence={refusal} /> : <Failure failure={failure} />) : null}
        <Lead>{copy.retiredLead(state.retired.from, state.retired.to)}</Lead>
        {checklist}
      </>
    );
  } else if (hasSet) {
    const total = state.items.length;
    const applied = state.items.filter((i) => overrides.verdictOf(i) === "accepted").length;
    const rejected = state.items.filter((i) => overrides.verdictOf(i) === "dismissed").length;
    const answered = applied + rejected === total;
    const lines = state.items.filter(isLine);
    const pairs = state.items.filter((i) => !isLine(i));
    const lists = lines.length > 0;
    // A reopened run's own report, never the newest run's (the `fresh` captions below read it).
    const dropped = reviewing ? 0 : state.run?.status === "ok" ? state.run.droppedCount : 0;
    primary = { label: failure ? deckTuningCopy.failure.retry : copy.again, again: true };
    // The results lead is a desktop line, and the no-games set (D2) draws none at either width.
    const lead = failure || (state.gameCount === 0 && !answered) ? null : lists ? (answered
      ? deckTuningCopy.lists.allDoneLead(applied, rejected)
      : dropped > 0 ? deckTuningCopy.lists.fewerLead(cap(numberWord(dropped))) : deckTuningCopy.lists.resultsLead)
      : answered
      ? total === 1 ? copy.allDoneLeadOne(applied === 1) : copy.allDoneLead(numberWord(total), applied, rejected)
      : dropped > 0
        ? total === 1 ? copy.fewerLeadOne(cap(numberWord(dropped))) : copy.fewerLead(cap(numberWord(total)), cap(numberWord(dropped)))
        : total === 1 ? copy.resultsLeadOne : copy.resultsLead(cap(numberWord(total)));
    // "tooMany" (H35, PR 4a): the model handed back more survivors than the five shown, named
    // before the player wonders where the rest went. `fresh` only — an already-answered run has
    // moved past the question this caption answers.
    const report = reviewing ? null : state.run?.validationReport;
    const tooMany = !failure && !answered && report && report.survivedCount > report.keptCount
      ? deckDescriptionCopy.refusal.tooMany
      : null;
    // "Owned only" with nothing owned that fits: the additions are cards to buy. Named before the
    // lists for the same reason `tooMany` is, and `fresh` only.
    const ownedNone = !failure && !answered && report?.ownedNone ? deckDescriptionCopy.refusal.ownedNone : null;
    // Too few held up for the answer to cost a credit: said before the lists, `fresh` only, in the same frame.
    const refunded = !failure && !answered && report?.refunded ? deckDescriptionCopy.refusal.refunded(numberWord(report.keptCount)) : null;
    body = (
      <>
        {failure ? (refusal ? <AnalysisBanner variant="note" sentence={refusal} /> : <Failure failure={failure} />) : null}
        {answered ? null : <ReadFrom state={state} facts={facts} />}
        {ownedNone ? <AnalysisBanner variant="note" sentence={ownedNone} /> : null}
        {refunded ? <AnalysisBanner variant="note" sentence={refunded} /> : null}
        {tooMany ? <AnalysisBanner variant="note" sentence={tooMany} /> : null}
        {unchangedShown ? (
          <Unchanged state={state} intent={intent} fix={facts.fix} />
        ) : lead ? (
          <Lead desktopOnly={!answered} wide>{lead}</Lead>
        ) : null}
        {pairs.length > 0 ? (
          <ul className={`mt-[14px] flex flex-col ${answered ? "gap-[6px]" : "gap-[12px] md:gap-[8px]"}`}>
            {pairs.map((item) => (
              <li key={item.id}>
                <SuggestionCard
                  item={item as PairItem}
                  permits={permits}
                  newestPriceAsOf={state.newestPriceAsOf}
                  actions={deps.card}
                  onSettled={settled}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {lists ? (
          <SuggestionLists
            lines={lines}
            deckSize={facts.cards}
            permits={permits}
            newestPriceAsOf={state.newestPriceAsOf}
            actions={deps.card}
            onSettled={settled}
          />
        ) : null}
      </>
    );
    if (applied + rejected > 0 && !answered) note = lists ? deckTuningCopy.lists.tallyOf(applied, total, rejected) : copy.tally(applied, total, rejected);
  } else if (failure) {
    body = refusal ? <AnalysisBanner variant="note" sentence={refusal} /> : <Failure failure={failure} />;
    // No set is on screen, so the press replaces nothing: the first-run note.
    primary = { label: deckTuningCopy.failure.retry, again: false };
  } else {
    // Never run, or a run with nothing to show (an old `cancelled` row): the lead the evidence supports, and what will be read.
    neverRun = true;
    body = (
      <>
        <Lead>
          {allLocked !== null
            ? lockedCardsCopy.tuning.allLocked(allLocked)
            : facts.gameCount === 0
            ? copy.noGamesLead
            : facts.fix === null
              ? copy.unmarkedLead(cap(numberWord(facts.gameCount)))
              : copy.readyLead(cap(numberWord(facts.gameCount)), axisName(facts.fix.key), facts.fix.hurt, facts.gameCount)}
        </Lead>
        {checklist}
      </>
    );
  }
  // A failure's own note rides in the action row beside Try again, ahead of the credit line.
  if (failure?.note) note = note ? `${failure.note} · ${note}` : failure.note;

  const credit = paused
    ? creditsCopy.paused(paused.until)
    : state.allowance.ownerShare
      ? creditsCopy.ownerShare(new Date())
      : spent
        // When a credit comes BACK is `reopensAt`: `nextAt` is only the first to leave, and with
        // more counted than the limit the reader still has none left at that time.
        ? creditsCopy.spent(state.allowance.limit, state.allowance.reopensAt ?? state.allowance.nextAt)
        : primary.again
          ? creditsCopy.again(left, state.allowance.limit, state.allowance.nextAt)
          : creditsCopy.first(left, state.allowance.limit, state.allowance.nextAt);
  // With every card locked, the CREDIT line gives way to the one fact that matters: nothing is spent.
  // The state's own note (a set's tally, a failure's note) stays. Outside the never-run lead, where
  // the sentence is the lead, it joins the note so every state says why the press is disabled.
  const lockedNote = allLocked === null
    ? null
    : neverRun
      ? lockedCardsCopy.tuning.allLockedNote
      : `${lockedCardsCopy.tuning.allLocked(allLocked)} ${lockedCardsCopy.tuning.allLockedNote}`;
  const tail = lockedNote ?? credit;
  const noteLine = note ? `${note} · ${tail}` : tail;

  return (
    <VerdictOverridesProvider value={overrides.value}>
    <section
      aria-labelledby="tuning-heading"
      aria-busy={reading || undefined}
      className="rounded-[11px] px-[14px] py-[16px] md:rounded-[12px] md:px-[20px] md:py-[18px]"
      style={{
        background: "var(--surface-sunken)",
        border: `1px solid ${reading ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <h2
        id="tuning-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[17px] font-semibold outline-none md:text-[19px]"
        style={{ color: "var(--fg)" }}
      >
        {copy.heading}
      </h2>
      {body}
      {/* The in-panel ask is gone (H35): the description's one door before a first reading is
          now the empty-state field, above the press, with the pencil as its second door. */}

      {/* "Kept for this deck" (H35, PR 2): drawn above the action row whenever a reading is not
          in flight (STATES §3 states 1/3/8). No run-wiring yet — a press still reads whatever
          the fingerprint already covers (PR 4a wires the limits into the prompt itself); this
          box only persists what the player sets. */}
      {reading ? null : (
        <div className="mt-[16px] md:mt-[18px]">
          <TuningLimitsBox
            sets={printedInSets}
            capDollars={capDollars}
            onCapChange={(next) => {
              setCapDollars(next);
              saveLimits({ capDollars: next });
            }}
            onCapDraftInvalid={cancelPendingCap}
            selectedSets={limitSets}
            onSetsChange={(next) => {
              setLimitSets(next);
              saveLimits({ sets: next });
            }}
            ownedOnly={ownedOnly}
            onOwnedOnlyChange={(next) => {
              setOwnedOnly(next);
              saveLimits({ ownedOnly: next });
            }}
          />
          {limitsError ? <MutationError message={limitsError} /> : null}
        </div>
      )}

      {/* "Additional notes" (H35, PR 3): one note per press, never saved — placed below the
          limits box, above the action row (STATES §3 states 1/3). Hidden while reading, same as
          the limits box, since its text becomes a checklist row instead. */}
      {reading ? null : (
        <div className="mt-[16px] md:mt-[18px]">
          <TuningNotesField value={notes} onChange={changeNotes} />
        </div>
      )}

      {/* THE ACTION ROW: one band in every state, the one primary first. */}
      <div
        className={`mt-[16px] flex flex-col gap-[9px] pt-[15px] md:mt-[18px] md:min-h-[56px] md:flex-row md:flex-wrap md:items-center md:pt-[16px] ${reading ? "md:gap-[12px]" : "md:gap-[16px]"}`}
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {reading ? (
          <>
            <div className="flex gap-[8px] md:gap-[12px]">
              <span
                aria-disabled="true"
                className="flex h-[44px] flex-[2] items-center justify-center rounded-[8px] text-[13.5px] font-semibold md:h-auto md:flex-none md:px-[20px] md:py-[11px] md:text-[14px]"
                style={{ color: "var(--fg-muted)", border: "1px solid var(--border-strong)" }}
              >
                {copy.reading}
              </span>
            </div>
            <span className="-mt-[1px] text-center font-mono text-[9.5px] md:mt-0 md:text-left md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {writingActive
                ? descriptionManifest.progressWriting(runStepsList.length, runStepsList.length)
                : manifest.progress(ticked?.size ?? 0, runStepsList.length)}
            </span>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => (blocked ? undefined : void press(unchangedShown || failure !== null || priorResult || reviewing))}
              aria-disabled={blocked || undefined}
              className={`h-[44px] w-full rounded-[8px] text-[13.5px] font-semibold md:h-auto md:w-auto md:px-[20px] md:py-[11px] md:text-[14px] ${blocked ? "cursor-default text-[color:var(--fg-disabled)] [border:1px_solid_var(--border-strong)]" : "text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] transition-colors"}`}
            >
              {unchangedShown ? copy.unchangedCta : primary.label}
            </button>
            <span
              className={`text-center font-mono text-[9.5px] leading-[1.55] md:text-left md:text-[11px] md:leading-[1.5] ${blocked ? "md:max-w-[380px]" : ""}`}
              style={{ color: "var(--fg-faint)" }}
            >
              <CreditsText text={noteLine} />
            </span>
          </>
        )}
      </div>
      {refused ? <MutationError message={refused} /> : null}
      <p role="status" className="sr-only">{announced}</p>
    </section>
    </VerdictOverridesProvider>
  );
}

// ── The pieces ──────────────────────────────────────────────────────────

/** "Describing in place" (STATES §3 state 2): the absent description row's own editor, with
 *  explicit Save/Cancel rather than the empty-state field's blur-to-save. */
function DescribingInPlace({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  refused,
}: {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  refused: string | null;
}) {
  const descCopy = deckDescriptionCopy.description;
  const n = countCharacters(value);
  const over = n > descCopy.maxLength;
  const warn = n >= descCopy.warnAt;
  return (
    <div className="mt-[14px] flex flex-col gap-[6px]">
      <label htmlFor="tuning-describing-field" className="block font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
        {descCopy.label}
      </label>
      <textarea
        id="tuning-describing-field"
        autoFocus
        value={value}
        onChange={(e) => {
          if (countCharacters(e.target.value) <= descCopy.maxLength) onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          // Escape cancels an IME composition candidate first, same as the deck header's own
          // description editor (`use-deck-header-edit.ts`) — without this guard, Escape during
          // Japanese/Chinese/Korean input discards the whole draft instead.
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Escape") onCancel();
        }}
        readOnly={saving}
        rows={2}
        placeholder={descCopy.placeholder}
        aria-label={descCopy.fieldAria}
        className="w-full resize-none rounded-[8px] font-sans text-[16px] leading-[1.5] md:text-[13.5px]"
        style={{ background: "var(--surface)", border: "1px solid var(--accent)", padding: "10px 12px", color: "var(--fg)" }}
      />
      <p className="m-0 flex items-baseline justify-between gap-[10px] text-[12px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        <span>{descCopy.help}</span>
        <span className="flex-none text-right font-mono" style={{ width: "9ch", color: over ? "var(--danger)" : warn ? "var(--warning)" : "var(--fg-faint)" }}>
          {descCopy.counter(n, descCopy.maxLength)}
        </span>
      </p>
      {refused ? <MutationError message={refused} /> : null}
      <div className="flex gap-[8px]">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || over}
          className="h-[36px] rounded-[7px] px-[14px] text-[12.5px] font-semibold text-[color:var(--accent)] [border:1px_solid_var(--accent)] disabled:cursor-default disabled:opacity-50"
        >
          {descCopy.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-[36px] rounded-[7px] px-[14px] text-[12.5px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] transition-colors"
        >
          {descCopy.cancel}
        </button>
      </div>
    </div>
  );
}

function Lead({ children, desktopOnly = false, wide = false }: { children: ReactNode; desktopOnly?: boolean; wide?: boolean }) {
  // Capped at 680px over a set of cards (A1); a lead over a manifest runs the panel's width.
  return (
    <p
      className={`${desktopOnly ? "hidden md:block" : ""} ${wide ? "md:max-w-[680px]" : ""} mt-[10px] text-[12.5px] leading-[1.6] md:mt-[11px] md:text-[13.5px] md:leading-[1.65]`}
      style={{ color: "var(--fg-body)" }}
    >
      {children}
    </p>
  );
}

function ReadFrom({ state, facts }: { state: TuningState; facts: TuningFacts }) {
  // "your limits" (H35, PR 4a): only when a limit is actually set, since an unset limit reads
  // nothing and filters nothing (`descriptionManifest.readLimits`, "Kept for this deck"). And
  // only over a FRESH result (review round 4): `facts.limits` is the LIVE deck setting, and a
  // stale result on screen was generated before the player's latest limits edit — the tuning
  // fingerprint already includes limits (`src/lib/tuning/fingerprint.ts`), so `state.stale` is
  // exactly the signal that the live setting still describes the shown run.
  const { capCents, sets, ownedOnly } = facts.limits;
  const limitsRead = !state.stale && (capCents !== null || sets.length > 0 || ownedOnly) ? [descriptionManifest.readLimits] : [];
  // "your description" (H35, PR 4b): the same staleness rule as limits — `facts.intent` is the
  // LIVE deck value, and a stale result was generated before the player's latest edit to it.
  const descriptionRead = !state.stale && facts.intent !== null ? [descriptionManifest.readDescription] : [];
  // "your notes" (H35, PR 4b): the Additional notes field is never saved, so only the run's own
  // record (`validationReport.hadNotes`) can say whether it carried text — there is no LIVE
  // value to compare against. Read off `itemsValidationReport`, the report belonging to the
  // SAME run `items` came from, never `state.run`'s own: those differ after a failed retry
  // (review round 1), and `state.run`'s report would then describe an attempt that produced
  // none of what is shown.
  const notesRead = state.itemsValidationReport?.hadNotes ? [descriptionManifest.readNotes] : [];
  const parts =
    state.gameCount === 0
      ? [manifest.readCards(facts.cards), manifest.readMix, manifest.readCollection, ...descriptionRead, ...limitsRead, ...notesRead]
      : [
          manifest.readGames(state.gameCount),
          ...(facts.noteCount > 0 ? [manifest.readNotes(facts.noteCount)] : []),
          manifest.readCards(facts.cards),
          manifest.readMix,
          manifest.readCollection,
          ...descriptionRead,
          ...limitsRead,
          ...notesRead,
        ];
  return (
    <p className="mt-[8px] font-mono text-[9.5px] leading-[1.5] md:mt-[9px] md:text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
      {manifest.readFrom(parts)}
      {state.gameCount === 0 ? (
        <>
          {" · "}
          <span style={{ color: "var(--fg-body)" }}>{manifest.readNoGames}</span>
        </>
      ) : null}
    </p>
  );
}

function Unchanged({ state, intent, fix }: { state: TuningState; intent: string | null; fix: TuningFacts["fix"] }) {
  const when = state.lastOkAt ? state.lastOkAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  const rows: [string, string][] = [
    [copy.unchangedReasonGamesKey, copy.unchangedReasonGames(state.gameCount, when)],
    ...(fix ? [[copy.unchangedReasonAxisKey, copy.unchangedReasonAxis(axisName(fix.key), fix.hurt, state.gameCount)] as [string, string]] : []),
    [copy.unchangedReasonIntentKey, intent === null ? copy.unchangedReasonIntentEmpty : copy.unchangedReasonIntent],
  ];
  return (
    <div data-testid="tuning-unchanged" className="md:max-w-[640px]">
      <p className="mt-[10px] text-[12.5px] leading-[1.6] md:mt-[12px] md:text-[13.5px] md:leading-[1.65]" style={{ color: "var(--fg-body)" }}>
        {copy.unchanged(when)}
      </p>
      <ul className="mt-[12px] flex flex-col gap-[6px] md:mt-[14px]">
        {rows.map(([key, value]) => (
          <li
            key={key}
            className="flex min-h-[34px] items-baseline gap-[11px] rounded-[8px] px-[12px] py-[8px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span className="w-[98px] flex-none font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>
              {key}
            </span>
            <span className="min-w-0 flex-auto font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-[12px] text-[13px] leading-[1.6]" style={{ color: "var(--fg-faint)" }}>{copy.unchangedTail}</p>
    </div>
  );
}

type FailureCopy = { tag: string; heading: string; body: string; kept: string; note: string };

/** "Kept for this deck" (H35, PR 4a): the sentence that names what actually caused an empty
 *  result — drawn in AnalysisBanner's own "note" frame (STATES §3 state 9: one sentence, no
 *  button, above the set), never `Failure`'s generic chrome (review round 3). `locked`/
 *  `lockedMany` do reach here: a run whose drops are a MIX of a locked cut and some other rule
 *  (e.g. the new `overCap`/`offSet` filters) is not all-`neverCut`, so `runTuning` classifies it
 *  `ungrounded`, not `locked_only` (pre-open review, round 0) — `locked_only`'s own established
 *  copy (F10, Hugh 2026-09-25) covers only the all-locked case and keeps its own `Failure` box. */
function refusalBody(refusal: RefusalDetail): string {
  const r = deckDescriptionCopy.refusal;
  switch (refusal.reason) {
    case "commander": return r.commander(refusal.name);
    case "locked": return r.locked(refusal.name);
    case "lockedMany": return r.lockedMany(refusal.count);
    case "overCap": return r.overCap(refusal.name, formatCents(refusal.capCents));
    case "nothingLeft": return r.nothingLeft;
  }
}

function failureCopy(errorClass: string | null): FailureCopy {
  const f = deckTuningCopy.failure;
  switch (errorClass) {
    case "upstream_busy": return f.unavailable;
    case "timeout": return f.timeout;
    case "malformed": return f.malformed;
    case "ungrounded": return f.ungrounded;
    // F10: every suggestion cut a card the player locked. `ungrounded`'s frame, with the body and
    // the note naming the actual cause (Hugh, 2026-09-25: "log another game" does not fit it).
    case "locked_only": return { ...f.ungrounded, body: lockedCardsCopy.tuning.lockedOnlyBody, note: lockedCardsCopy.tuning.lockedOnlyNote };
    default: return f.interrupted;
  }
}

function Failure({ failure }: { failure: FailureCopy }) {
  // Its own box (state 6, OC:807): the one --danger on the surface is the tag, never the border.
  return (
    <div
      data-testid="tuning-failure"
      className="mt-[12px] rounded-[12px] px-[18px] py-[16px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-wrap items-baseline gap-[10px]">
        <span
          className="rounded-full px-[9px] py-[3px] font-mono text-[9.5px] uppercase tracking-[0.14em]"
          style={{ color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 12%, transparent)" }}
        >
          {failure.tag}
        </span>
        <span className="font-display text-[17px] font-semibold" style={{ color: "var(--fg)" }}>{failure.heading}</span>
      </div>
      <p className="mt-[11px] max-w-[660px] text-[13.5px] leading-[1.6]" style={{ color: "var(--fg-body)" }}>{failure.body}</p>
      <p className="mt-[9px] font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{failure.kept}</p>
    </div>
  );
}

// ── Pure helpers ────────────────────────────────────────────────────────

/** The checklist's preview rows (never run), in manifest order. Games and notes only when there
 *  are games. `description` is always included, present or absent (H35, PR 3 — it used to drop
 *  out entirely with no description; the row now shows itself either way). `_intent` stays a
 *  parameter only for parity with `runSteps` and every call site's `readSteps(facts, intent)` —
 *  the row list itself no longer branches on it; `manifestRows`'s `known`/`countOf` still do. */
export function readSteps(facts: TuningFacts, _intent: string | null): ManifestStep[] {
  return [
    ...(facts.gameCount > 0 ? (["games", "notes"] as const) : []),
    "decklist",
    "description",
    "collection",
  ];
}

/** The checklist's rows while a run is reading — `readSteps` plus "Kept for this deck" and
 *  Additional notes, which become rows only once a run starts (STATES §3 state 4: "Limits and
 *  notes become rows"). `intent` kept as a parameter for symmetry with `readSteps`, unused here
 *  since limits/notes carry no presence check of their own.
 *
 *  Both rows are now genuinely true: `TuningDeps.run`/`pressRun` sends the typed note alongside
 *  the limits (H35, PR 4a for limits, PR 4b for notes). The disclosure shipped ahead of the
 *  wiring (PR 2's Settled precedent), and this comment used to flag that gap; it is closed. */
export function runSteps(facts: TuningFacts, intent: string | null): ManifestStep[] {
  const preview = readSteps(facts, intent);
  const i = preview.indexOf("description");
  return [...preview.slice(0, i + 1), "limits", "playerNotes", ...preview.slice(i + 1)];
}

/** The manifest's rows. `ticked` null is the never-run preview (the page's own figures, nothing
 *  ticked); a set is a run reading — every row's `count` is null while reading (no run row
 *  carries secondary text except Your games' `none logged`, drawn separately as `noGames`), and
 *  `done` is membership in `ticked`. */
export function manifestRows(
  facts: TuningFacts,
  intent: string | null,
  ticked: ReadonlySet<ManifestStep> | null,
  steps: readonly ManifestStep[],
): ManifestRow[] {
  const rows: ManifestRow[] = facts.gameCount === 0 ? [{ kind: "noGames", key: "games" }] : [];
  for (const step of steps) {
    if (ticked !== null) {
      rows.push({ kind: "read", key: step, label: labelOf(step, facts), count: null, done: ticked.has(step) });
      continue;
    }
    // The preview only — the absent description gets the games row's own dashed treatment
    // (review fix), not a plain read row with a link tacked on the end.
    if (step === "description" && intent === null) {
      rows.push({
        kind: "absent",
        key: "description",
        label: descriptionManifest.description,
        caption: deckDescriptionCopy.description.rowNone,
        actionLabel: deckDescriptionCopy.description.rowOpen,
      });
      continue;
    }
    const n = known(facts, intent, step);
    rows.push({
      kind: "read",
      key: step,
      label: labelOf(step, facts),
      count: n === null ? null : countOf(step, n, facts),
      done: false,
    });
  }
  return rows;
}

function known(facts: TuningFacts, intent: string | null, step: ManifestStep): number | null {
  switch (step) {
    case "games": return facts.gameCount;
    case "notes": return facts.noteCount;
    case "decklist": return facts.cards;
    case "description": return intent === null ? 0 : 1;
    // Worded without a figure, so the unchecked row reads the same before and after its read.
    case "collection": return 0;
    // Only ever drawn while reading, where `ticked !== null` short-circuits before this runs.
    case "limits": case "playerNotes": return null;
  }
}

function labelOf(step: ManifestStep, facts: TuningFacts): string {
  switch (step) {
    case "games": return manifest.games;
    case "notes": return manifest.notes;
    case "decklist": return facts.fix === null ? manifest.listVsMix : manifest.list;
    case "description": return descriptionManifest.description;
    case "limits": return descriptionManifest.limits;
    case "playerNotes": return descriptionManifest.notes;
    case "collection": return manifest.collection;
  }
}

function countOf(step: ManifestStep, n: number, facts: TuningFacts): string {
  switch (step) {
    case "games": return facts.fix === null && facts.marked === 0 ? manifest.gamesUnmarked(n) : manifest.gamesCount(n);
    case "notes": return manifest.notesCount(n, facts.gameCount);
    case "decklist": return manifest.listCount(n);
    // `n` is never 0 here — the absent case is handled by `manifestRows`'s own "absent" row,
    // above, before `countOf` is ever reached for this step.
    case "description": return descriptionManifest.descriptionCount;
    case "collection": return manifest.collectionCount;
    // Only ever drawn while reading, where `countOf` is never called for them.
    case "limits": case "playerNotes": return "";
  }
}

function axisName(key: string): string {
  const label = axisCopy[key as keyof typeof axisCopy]?.label ?? key;
  return label.toLowerCase();
}

function cap(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** The same normalization `saveIntent` applies server-side (trimmed, blank mapped to null) —
 *  so an optimistic local value can be compared against the revalidated `facts.intent` for
 *  equality, rather than never matching over whitespace or an explicit clear (review round 2). */
function normalizeIntent(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
