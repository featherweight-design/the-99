"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import {
  applySuggestion,
  cancelTuningRun,
  dismissSuggestion,
  readTuningEvidence,
  readTuningPanel,
  restoreSuggestion,
  runTuning,
  saveDeckLimits,
  undoSuggestion,
} from "../../app/decks/tuning-actions";
import { creditsCopy } from "../../lib/copy/credits";
import { numberWord } from "../../lib/copy/deck-analysis";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { axisCopy } from "../../lib/copy/game-log";
import type { EvidenceStep } from "../../lib/decks/tuning-read";
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

/**
 * Suggested changes (placement addendum v2): the last section of the Analysis tab, mounted only
 * over a reading. It reads its own state on mount, as the tab's first open reads a stored
 * analysis, and never spends a credit without a press.
 *
 * Its states, off `TuningState` and what the reader just pressed:
 *  - never run: with marked games (C1), with no games (D1, E3), with games and no marks (E5);
 *  - reading: the manifest ticking as each read lands, the fan shuffling, Stop (C2);
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
  evidence: (deckId: string, step: EvidenceStep) => Promise<number | null>;
  card: CardActions;
};

const SERVER: TuningDeps = {
  read: readTuningPanel,
  run: runTuning,
  cancel: cancelTuningRun,
  evidence: readTuningEvidence,
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

type Counts = Partial<Record<EvidenceStep, number | null>>;

const copy = deckTuningCopy.panel;
const manifest = deckTuningCopy.manifest;
/** How often a run begun elsewhere (another tab, a reload mid-run) is re-read until it settles. */
const WATCH_MS = 3000;
/** How long Stop looks for a run's pending row that its press may have beaten to the database. */
const STOP_TRIES = 5;
const STOP_WAIT_MS = 300;

export function TuningPanel({
  deckId,
  permits,
  facts,
  onLogGame,
  printedInSets = [],
  deps = SERVER,
  deeperLooks = false,
  onSettled,
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
  // Reading: the counts that have landed, by step; null before a press.
  const [counts, setCounts] = useState<Counts | null>(null);
  const [unchangedShown, setUnchangedShown] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [announced, setAnnounced] = useState("");
  const [intent, setIntent] = useState(facts.intent);
  // The header's `edit` is the line's other door, and its save revalidates the page: a new line
  // from the page replaces the one held here, adjusted during render so the old one never paints.
  const [seenIntent, setSeenIntent] = useState(facts.intent);
  if (seenIntent !== facts.intent) {
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
  const [seenLimits, setSeenLimits] = useState(facts.limits);
  if (seenLimits !== facts.limits) {
    setSeenLimits(facts.limits);
    if (!dirtyLimitFields.has("capDollars")) setCapDollars(facts.limits.capCents === null ? null : facts.limits.capCents / 100);
    if (!dirtyLimitFields.has("sets")) setLimitSets(facts.limits.sets);
    if (!dirtyLimitFields.has("ownedOnly")) setOwnedOnly(facts.limits.ownedOnly);
  }
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Each press takes a token, so a run the reader stopped cannot land over what they did next.
  const token = useRef(0);
  // The id this panel gave the run its press started, until that press settles. Stop cancels this
  // run and no other: the pending row a read turns up may be another tab's.
  const ownRun = useRef<string | null>(null);
  // A SYNCHRONOUS re-entry guard over `press`'s whole body: `reading` (which the render uses to
  // disable the button) only goes true once `setCounts({})` runs below, so a second click during
  // the flush-and-gate-check preamble would otherwise start a SECOND `press`, racing `token` and
  // `ownRun` against the first (pre-open review round 3).
  const preparingRun = useRef(false);

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
            await reread();
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

  // A run already in flight when the panel opened: tick what can be read and watch it settle.
  const pendingElsewhere = state?.run?.status === "pending" && counts === null;
  useEffect(() => {
    if (!pendingElsewhere) return;
    const id = setInterval(() => void reread(), WATCH_MS);
    return () => clearInterval(id);
  }, [pendingElsewhere, reread]);

  if (state === null) return null;

  const steps = readSteps(facts, intent);
  const reading = counts !== null || state.run?.status === "pending";
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
    // preamble, since `reading`'s own disablement only starts once `setCounts({})` runs further
    // down (pre-open review round 3).
    if (preparingRun.current) return;
    preparingRun.current = true;
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
      const current = flushed.touched ? stateRef.current : state;
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
      await pressRun(anyway);
    } finally {
      preparingRun.current = false;
    }
  }

  async function pressRun(anyway: boolean) {
    const mine = ++token.current;
    const runId = crypto.randomUUID();
    ownRun.current = runId;
    setCounts({});
    setAnnounced(deckTuningCopy.announce.started);
    // Settled to a result whatever happens, so an unexpected throw is a refusal like any other.
    const running = deps.run(deckId, anyway ? { anyway: true, runId } : { runId }).catch(
      (): DeckMutationResult => ({ ok: false, message: deckTuningCopy.run.refused }),
    );
    // The manifest ticks on reads that genuinely land, one after another. A read that fails
    // stays unticked; the run is what decides the outcome.
    for (const step of steps) {
      const n = await deps.evidence(deckId, step).catch(() => null);
      if (token.current !== mine) return;
      if (n !== null) setCounts((c) => (c === null ? c : { ...c, [step]: n }));
    }
    const result = await running;
    if (token.current !== mine) return;
    ownRun.current = null;
    // Token-checked AFTER the read too: a Stop pressed while this read is in flight owns the panel
    // from then on, and this press must not draw or announce over it.
    const next = await deps.read(deckId).catch(() => null);
    if (token.current !== mine) return;
    if (next) {
      setState(next);
      stateRef.current = next;
    }
    setCounts(null);
    if (!result.ok) {
      setRefused(result.message);
      setAnnounced(result.message);
      return;
    }
    const failure = next?.run?.status === "failed" ? failureCopy(next.run.errorClass) : null;
    setAnnounced(failure ? failure.heading : deckTuningCopy.announce.ready(next?.items.length ?? 0));
    headingRef.current?.focus();
  }

  async function stop() {
    token.current += 1;
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
    setCounts(null);
    await reread();
    if (cancelled) setAnnounced(deckTuningCopy.announce.stopped);
  }

  async function settled(announce: string) {
    setAnnounced(announce);
    await reread();
  }

  // ── The body ──────────────────────────────────────────────────────────
  let body: ReactNode;
  let primary: { label: string; again: boolean } = { label: copy.suggest, again: false };
  let note: string | null = null;
  let neverRun = false;

  const failure = !reading && state.run?.status === "failed" ? failureCopy(state.run.errorClass) : null;
  // A failed or stopped re-run leaves the set it would have replaced on screen, still open.
  const hasSet = !reading && !state.retired && state.items.length > 0;
  const neverRunRows = manifestRows(facts, intent, null, steps);

  if (reading) {
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
        <ManifestRows rows={manifestRows(facts, intent, counts ?? {}, steps)} />
      </>
    );
  } else if (state.retired) {
    // A failed run after a commit still says it failed, over the retired lead.
    if (failure) primary = { label: deckTuningCopy.failure.retry, again: false };
    body = (
      <>
        {failure ? <Failure failure={failure} /> : null}
        <Lead>{copy.retiredLead(state.retired.from, state.retired.to)}</Lead>
        <ManifestRows rows={neverRunRows} onLogGame={onLogGame} />
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
        <ManifestRows rows={neverRunRows} onLogGame={onLogGame} />
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
              {manifest.progress(steps.filter((s) => counts?.[s] != null).length, steps.length)}
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

/** The reads a run discloses, in manifest order. Games and notes only when there are games. */
export function readSteps(facts: TuningFacts, intent: string | null): EvidenceStep[] {
  return [
    ...(facts.gameCount > 0 ? (["games", "notes"] as const) : []),
    "decklist",
    ...(intent !== null ? (["intent"] as const) : []),
    "collection",
  ];
}

/** The manifest's rows: with `counts` null, the page's own figures and nothing ticked. */
export function manifestRows(
  facts: TuningFacts,
  intent: string | null,
  counts: Counts | null,
  steps: readonly EvidenceStep[],
): ManifestRow[] {
  const rows: ManifestRow[] = facts.gameCount === 0 ? [{ kind: "noGames", key: "games" }] : [];
  for (const step of steps) {
    const landed = counts === null ? undefined : counts[step];
    const n = counts === null ? known(facts, intent, step) : landed ?? null;
    rows.push({
      kind: "read",
      key: step,
      label: labelOf(step, facts),
      count: n === null ? null : countOf(step, n, facts),
      done: counts !== null && landed != null,
    });
  }
  return rows;
}

function known(facts: TuningFacts, intent: string | null, step: EvidenceStep): number | null {
  switch (step) {
    case "games": return facts.gameCount;
    case "notes": return facts.noteCount;
    case "decklist": return facts.cards;
    case "intent": return intent === null ? 0 : 1;
    // Worded without a figure, so the unchecked row reads the same before and after its read.
    case "collection": return 0;
  }
}

function labelOf(step: EvidenceStep, facts: TuningFacts): string {
  switch (step) {
    case "games": return manifest.games;
    case "notes": return manifest.notes;
    case "decklist": return facts.fix === null ? manifest.listVsMix : manifest.list;
    case "intent": return manifest.intent;
    case "collection": return manifest.collection;
  }
}

function countOf(step: EvidenceStep, n: number, facts: TuningFacts): string {
  switch (step) {
    case "games": return facts.fix === null && facts.marked === 0 ? manifest.gamesUnmarked(n) : manifest.gamesCount(n);
    case "notes": return manifest.notesCount(n, facts.gameCount);
    case "decklist": return manifest.listCount(n);
    case "intent": return manifest.intentCount;
    case "collection": return manifest.collectionCount;
  }
}

function axisName(key: string): string {
  const label = axisCopy[key as keyof typeof axisCopy]?.label ?? key;
  return label.toLowerCase();
}

function cap(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
