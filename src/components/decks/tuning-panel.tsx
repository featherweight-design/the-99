"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import {
  applySuggestion,
  cancelTuningRun,
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
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import type { Bracket } from "../../lib/profile/types";
import { gateReason } from "../../lib/tuning/gate";
import type { TuningItem, TuningState } from "../../lib/tuning/state";
import type { PrintedInSet } from "../../lib/sets/printed-in";
import { FanShuffle } from "./fan-shuffle";
import { ManifestRows, type ManifestRow } from "./manifest-rows";
import { MutationError } from "./mutation-error";
import { SuggestionCard, type CardActions } from "./suggestion-card";
import { TuningLimitsBox } from "./tuning-limits-box";
import { TuningNotesField } from "./tuning-notes-field";

/**
 * Suggested changes (placement addendum v2): the last section of the Analysis tab, mounted only
 * over a reading. It reads its own state on mount, as the tab's first open reads a stored
 * analysis, and never spends a credit without a press.
 *
 * Its states, off `TuningState` and what the reader just pressed:
 *  - never run: with marked games (C1), with no games (D1, E3), with games and no marks (E5);
 *  - reading: the manifest ticking on a pure client-side stagger (H35, PR 3 — not on each read
 *    landing, which it did through PR 2), the fan shuffling, Stop (C2);
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
  read: (deckId: string) => Promise<TuningState | null>;
  run: (deckId: string, opts?: { anyway?: boolean; runId?: string }) => Promise<DeckMutationResult>;
  cancel: (deckId: string, runId: string) => Promise<DeckMutationResult>;
  card: CardActions;
};

const SERVER: TuningDeps = {
  read: readTuningPanel,
  run: runTuning,
  cancel: cancelTuningRun,
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
/** How long Stop looks for a run's pending row that its press may have beaten to the database. */
const STOP_TRIES = 5;
const STOP_WAIT_MS = 300;
/** The checklist's own pacing (H35, PR 3): presentational, never a real read landing. STATES
 *  §3 state 5 — "~350ms apart from 350ms". */
const STAGGER_MS = 350;
/** Past this, the writing row grows its own mono line (STATES §3 state 7). */
const LONG_WAIT_MS = 20_000;

export function TuningPanel({
  deckId,
  permits,
  facts,
  onLogGame,
  printedInSets = [],
  deps = SERVER,
  deeperLooks = false,
  onSettled,
  onSaveDescription,
}: {
  deckId: string;
  permits: readonly Bracket[];
  facts: TuningFacts;
  onLogGame: () => void;
  /** Every set that printed a commander, newest first — "Kept for this deck"'s Set picker
   *  (H35, PR 2), the same list help-me-choose's intake form reads. */
  printedInSets?: readonly PrintedInSet[];
  deps?: TuningDeps;
  /** `HELP_ME_CHOOSE_ENABLED`: the credit lines name its deeper looks as sharing the credits. Off,
      they read exactly as before the looks existed. */
  deeperLooks?: boolean;
  /** The first read has answered or failed: the tab's opening holds its loader until it has, so
   *  Suggested changes and its credit line never arrive after the rest of the tab. */
  onSettled?: () => void;
  /** The absent description row's own "Describing in place" editor (STATES §3 state 2, H35
   *  PR 3 review fix): `AnalysisEmpty`'s empty-state field cannot be reached from here — the two
   *  are mutually exclusive mounts (this panel only exists once a reading has happened). The
   *  same save `builder-shell.tsx` already wires to `AnalysisPanel`'s empty-state field. */
  onSaveDescription?: (value: string) => Promise<DeckMutationResult>;
}) {
  const [state, setState] = useState<TuningState | null>(null);
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
  const [dirtyLimitFields, setDirtyLimitFields] = useState<ReadonlySet<"capDollars" | "sets" | "ownedOnly">>(
    () => new Set(),
  );
  // Reconciled every render, not gated behind "did `facts.limits` change reference" — a field
  // whose dirty marker was SKIPPED while its prop changed never got a second look once that
  // marker later cleared, since by then the prop reference was already stale-equal to what
  // this block had last seen (pre-open review round 4, a previously-missed finding): a value
  // another tab saved in between stayed invisible until some UNRELATED prop change happened to
  // re-trigger a reference comparison. Checking the actual VALUE every render, guarded by its
  // own `!==`, needs no reference tracking and settles the moment dirty clears.
  const wantedCapDollars = facts.limits.capCents === null ? null : facts.limits.capCents / 100;
  if (!dirtyLimitFields.has("capDollars") && capDollars !== wantedCapDollars) setCapDollars(wantedCapDollars);
  if (!dirtyLimitFields.has("sets") && limitSets !== facts.limits.sets) setLimitSets(facts.limits.sets);
  if (!dirtyLimitFields.has("ownedOnly") && ownedOnly !== facts.limits.ownedOnly) setOwnedOnly(facts.limits.ownedOnly);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Each press takes a token, so a run the reader stopped cannot land over what they did next.
  const token = useRef(0);
  // The id this panel gave the run its press started, until that press settles. Stop cancels this
  // run and no other: the pending row a read turns up may be another tab's.
  const ownRun = useRef<string | null>(null);
  // A SYNCHRONOUS re-entry guard over `press`'s whole body: `reading` (which the render uses to
  // disable the button) only goes true once `setTicked(new Set())` runs below, so a second click during
  // the flush-and-gate-check preamble would otherwise start a SECOND `press`, racing `token` and
  // `ownRun` against the first (pre-open review round 3). Holds the TOKEN the active press is
  // running under, or null — `stop()` clears it unconditionally, and a press's own `finally`
  // only clears it when it still names that exact press (round 4).
  const preparingRun = useRef<number | null>(null);

  // EVERY server call here can reject (a dropped connection, an unexpected database error), and a
  // rejection must never strand the panel: a failed re-read keeps what is on screen, and a failed
  // run or read leaves the reading state with the run's own refusal.
  const reread = useCallback(async () => {
    try {
      const next = await deps.read(deckId);
      setState(next);
      stateRef.current = next;
      return next;
    } catch {
      return null;
    }
  }, [deps, deckId]);

  // Debounced trailing-edge, PARTIAL and MERGED: typing the cap fires `saveLimits` on every
  // keystroke, so only the latest value within one pause reaches the server — and only the
  // FIELD that changed, never the other two, so one tab's cap edit can't carry another tab's
  // stale sets/owned-only back over whatever that tab has since saved (pre-open review round
  // 2). Two edits to DIFFERENT fields inside the same pause merge into one request; a save
  // already dispatched when a new edit lands is never raced — `limitsChain` serializes every
  // send, and the next one starts only once the last has settled.
  type LimitField = "capDollars" | "sets" | "ownedOnly";
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
              setDirtyLimitFields((prev) => {
                const next = new Set(prev);
                settled.forEach((key) => next.delete(key));
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
    deps.read(deckId).then(
      (next) => {
        if (!live) return;
        setState(next);
        stateRef.current = next;
        settledRef.current?.();
      },
      // A first read that fails draws nothing, as a deck with no reading does.
      () => {
        if (live) settledRef.current?.();
      },
    );
    return () => {
      live = false;
    };
  }, [deps, deckId]);

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
  const pendingRunId = state?.run?.status === "pending" ? state.run.id : null;
  const pendingRunCreatedAt = state?.run?.status === "pending" ? state.run.createdAt.getTime() : null;
  const watchedRunId = useRef<string | null>(null);
  useEffect(() => {
    if (pendingRunId === null || pendingRunCreatedAt === null) {
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
    // synchronous Stop landing in the SAME tick in a test with no fake timers (the 0ms timeout
    // fired after Stop's own `setTicked(null)`, reviving `ticked`).
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
  // The stagger and its long-wait timer are cleared on every unmount, same as a Stop would.
  useEffect(() => {
    return () => {
      if (staggerTimer.current !== null) clearInterval(staggerTimer.current);
      if (longWaitTimer.current !== null) clearTimeout(longWaitTimer.current);
    };
  }, []);

  if (state === null) return null;

  const reading = ticked !== null || state.run?.status === "pending";
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
    // inside `pressRun`), so `stop()` can release it explicitly without the `finally` of an
    // already-superseded press then clearing a NEWER press's guard (round 4): the `finally`
    // only clears it when the guard still names the token it set.
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
      if (!anyway && gateReason(current)?.kind === "unchanged") {
        setUnchangedShown(true);
        setAnnounced(deckTuningCopy.announce.unchanged);
        return;
      }
      setUnchangedShown(false);
      await pressRun(mine, anyway);
    } finally {
      if (preparingRun.current === mine) preparingRun.current = null;
    }
  }

  async function pressRun(mine: number, anyway: boolean) {
    if (token.current !== mine) return;
    const runId = crypto.randomUUID();
    ownRun.current = runId;
    setTicked(new Set());
    setWritingActive(false);
    setLongWait(false);
    setAnnounced(deckTuningCopy.announce.started);
    // Settled to a result whatever happens, so an unexpected throw is a refusal like any other.
    const running = deps.run(deckId, anyway ? { anyway: true, runId } : { runId }).catch(
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
    // Checked BEFORE touching the timer refs, not after (review fix): `staggerTimer`/
    // `longWaitTimer` are this component's shared refs, and `stop()` lets a new press start
    // while this press's own `deps.run` is still unresolved (pre-open review round 4, PR 2). If
    // that superseded run's promise settles late, it must not reach in and clear a NEWER press's
    // own live timers out from under it.
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
    // Token-checked AFTER the read too: a Stop pressed while this read is in flight owns the panel
    // from then on, and this press must not draw or announce over it.
    const next = await deps.read(deckId).catch(() => null);
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
    const failure = next?.run?.status === "failed" ? failureCopy(next.run.errorClass) : null;
    // `result.ok` alone does not mean a set of suggestions landed — `runTuning` answers ok after
    // persisting a run that itself failed (e.g. `upstream_busy`, `locked_only`, `ungrounded`),
    // review round 1. Round 2: `!failure` alone is not enough either — a closing read that
    // failed or returned a run in some OTHER non-`ok` status is also not a success, and must
    // not be read as one just because it also isn't the `failed` branch. Only an explicit `ok`
    // clears the note.
    if (next?.run?.status === "ok") setNotes("");
    setAnnounced(failure ? failure.heading : deckTuningCopy.announce.ready(next?.items.length ?? 0));
    headingRef.current?.focus();
  }

  async function stop() {
    token.current += 1;
    if (staggerTimer.current !== null) {
      clearInterval(staggerTimer.current);
      staggerTimer.current = null;
    }
    if (longWaitTimer.current !== null) {
      clearTimeout(longWaitTimer.current);
      longWaitTimer.current = null;
    }
    setWritingActive(false);
    setLongWait(false);
    // Release the guard so a NEW press can start right away — the request `pressRun` is still
    // awaiting (the model call, its closing read) can run up to the model timeout, and this
    // panel's own `press` should not stay unresponsive until it settles (pre-open review round
    // 4). Unconditional: a `press` whose `finally` later runs will find its own token already
    // superseded and leave this null alone.
    preparingRun.current = null;
    // The run this Stop is about: the one this panel's own press started, by the id it gave it,
    // or else the pending run already on screen, started elsewhere. Only that id is ever
    // cancelled, so a Stop never reaches a run another tab started.
    const own = ownRun.current;
    ownRun.current = null;
    const target = own ?? (state?.run?.status === "pending" ? state.run.id : null);
    let cancelled = false;
    for (let attempt = 0; target !== null && attempt < STOP_TRIES; attempt += 1) {
      await deps.cancel(deckId, target).catch(() => null);
      // `cancelTuningRun` answers ok whether or not its guarded update matched: a run that
      // settled before the cancel reached it was not stopped, and its credit may be spent. So the
      // answer is read back, and only a run that now reads cancelled was stopped.
      const after = await deps.read(deckId).catch(() => null);
      const seen = after?.run?.id === target ? after.run : null;
      cancelled = seen?.status === "cancelled";
      // A run that settled is past stopping. One not seen at all can still be on its way in only
      // when this panel started it (the press can land before its row exists); a watched run
      // that is gone from the read is over.
      if (cancelled || (seen !== null && seen.status !== "pending") || (seen === null && own === null)) break;
      if (attempt < STOP_TRIES - 1) await new Promise((r) => setTimeout(r, STOP_WAIT_MS));
    }
    setTicked(null);
    await reread();
    if (cancelled) setAnnounced(deckTuningCopy.announce.stopped);
  }

  async function settled(announce: string) {
    setAnnounced(announce);
    await reread();
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

  const failure = !reading && state.run?.status === "failed" ? failureCopy(state.run.errorClass) : null;
  // A failed or stopped re-run leaves the set it would have replaced on screen, still open.
  const hasSet = !reading && !state.retired && state.items.length > 0;
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
  } else if (state.retired) {
    // A failed run after a commit still says it failed, over the retired lead.
    if (failure) primary = { label: deckTuningCopy.failure.retry, again: false };
    body = (
      <>
        {failure ? <Failure failure={failure} /> : null}
        <Lead>{copy.retiredLead(state.retired.from, state.retired.to)}</Lead>
        {checklist}
      </>
    );
  } else if (hasSet) {
    const total = state.items.length;
    const applied = state.items.filter((i) => i.verdict === "accepted").length;
    const rejected = state.items.filter((i) => i.verdict === "dismissed").length;
    const answered = applied + rejected === total;
    const dropped = state.run?.status === "ok" ? state.run.droppedCount : 0;
    primary = { label: failure ? deckTuningCopy.failure.retry : copy.again, again: true };
    // The results lead is a desktop line, and the no-games set (D2) draws none at either width.
    const lead = failure || (state.gameCount === 0 && !answered) ? null : answered
      ? total === 1 ? copy.allDoneLeadOne(applied === 1) : copy.allDoneLead(numberWord(total), applied, rejected)
      : dropped > 0
        ? total === 1 ? copy.fewerLeadOne(cap(numberWord(dropped))) : copy.fewerLead(cap(numberWord(total)), cap(numberWord(dropped)))
        : total === 1 ? copy.resultsLeadOne : copy.resultsLead(cap(numberWord(total)));
    body = (
      <>
        {failure ? <Failure failure={failure} /> : null}
        {answered ? null : <ReadFrom state={state} facts={facts} />}
        {unchangedShown ? (
          <Unchanged state={state} intent={intent} fix={facts.fix} />
        ) : lead ? (
          <Lead desktopOnly={!answered} wide>{lead}</Lead>
        ) : null}
        <ul className={`mt-[14px] flex flex-col ${answered ? "gap-[6px]" : "gap-[12px] md:gap-[8px]"}`}>
          {state.items.map((item: TuningItem) => (
            <li key={item.id}>
              <SuggestionCard
                item={item}
                permits={permits}
                newestPriceAsOf={state.newestPriceAsOf}
                actions={deps.card}
                onSettled={settled}
              />
            </li>
          ))}
        </ul>
      </>
    );
    if (applied + rejected > 0 && !answered) note = copy.tally(applied, total, rejected);
  } else if (failure) {
    body = <Failure failure={failure} />;
    // No set is on screen, so the press replaces nothing: the first-run note.
    primary = { label: deckTuningCopy.failure.retry, again: false };
  } else {
    // Never run, or cleared by a Stop: the lead the evidence supports, and what will be read.
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
    ? creditsCopy.paused(paused.until, deeperLooks)
    : state.allowance.ownerShare
      ? creditsCopy.ownerShare(new Date())
      : spent
        // When a credit comes BACK is `reopensAt`: `nextAt` is only the first to leave, and with
        // more counted than the limit the reader still has none left at that time.
        ? creditsCopy.spent(state.allowance.limit, state.allowance.reopensAt ?? state.allowance.nextAt, deeperLooks)
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
          <TuningNotesField value={notes} onChange={setNotes} />
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
              <button
                type="button"
                onClick={() => void stop()}
                className="h-[44px] flex-1 rounded-[8px] text-[13px] font-medium md:h-auto md:flex-none md:px-[14px] md:py-[10px] text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)]"
              >
                {copy.stop}
              </button>
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
              onClick={() => (blocked ? undefined : void press(unchangedShown || failure !== null))}
              aria-disabled={blocked || undefined}
              className={`h-[44px] w-full rounded-[8px] text-[13.5px] font-semibold md:h-auto md:w-auto md:px-[20px] md:py-[11px] md:text-[14px] ${blocked ? "cursor-default text-[color:var(--fg-disabled)] [border:1px_solid_var(--border-strong)]" : "text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"}`}
            >
              {unchangedShown ? copy.unchangedCta : primary.label}
            </button>
            <span
              className={`text-center font-mono text-[9.5px] leading-[1.55] md:text-left md:text-[11px] md:leading-[1.5] ${blocked ? "md:max-w-[380px]" : ""}`}
              style={{ color: "var(--fg-faint)" }}
            >
              {noteLine}
            </span>
          </>
        )}
      </div>
      {refused ? <MutationError message={refused} /> : null}
      <p role="status" className="sr-only">{announced}</p>
    </section>
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
          className="h-[36px] rounded-[7px] px-[14px] text-[12.5px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)]"
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
  const parts =
    state.gameCount === 0
      ? [manifest.readCards(facts.cards), manifest.readMix, manifest.readCollection]
      : [
          manifest.readGames(state.gameCount),
          ...(facts.noteCount > 0 ? [manifest.readNotes(facts.noteCount)] : []),
          manifest.readCards(facts.cards),
          manifest.readMix,
          manifest.readCollection,
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
 *  Pre-open review (round 0): this PR does not yet SEND the limits or the typed note to the
 *  model — `TuningDeps.run` takes neither, and `pressRun` passes nothing beyond the run id. The
 *  limits/notes rows here disclose what the checklist will read, not what this run already has;
 *  the wiring (both rows genuinely true) is PR 4a (limits) and PR 4b (notes), named in the plan.
 *  `TuningNotesField`'s own comment says the same. Flagging this rather than hiding the rows: per
 *  PR 2's Settled precedent, shipping the disclosure ahead of the wiring is the deliberate split,
 *  not an oversight to quietly fix by holding the UI back. */
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
