"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";

import type { ApplySetActionResult } from "../../app/decks/tuning-v2-actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { BRACKET_NAMES } from "../../lib/copy/deck-analysis";
import { DECK_GROUPING_ARIA, DECK_GROUPING_KEY, DECK_GROUPING_LABELS, isDeckGrouping } from "../../lib/copy/deck-sort";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import type { DeckClaim } from "../../lib/decks/availability";
import { pullSourceChoices } from "../../lib/decks/draft-shape";
import type { CardTypeGroup } from "../../lib/decks/grouping";
import type { SourceDeckFigure } from "../../lib/decks/read";
import { formatCents } from "../../lib/decks/price";
import type { MixRole } from "../../lib/decks/mix";
import type { Bracket } from "../../lib/profile/types";
import type { LineItem, TuningLive, V2Ask } from "../../lib/tuning/state";
import type { ValidationReport } from "../../lib/tuning/validate";
import { askFor } from "../../lib/tuning/v2/count";
import { usualFor } from "../../lib/tuning/v2/intake";
import {
  bracketOutcome, cutAskOf, groupLines, groupsAt, isOpen, pickCap, shortFacts, shortOfAsk, tally,
  type BracketOutcome, type Grouping, type ShortFacts,
} from "../../lib/tuning/v2/results";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { useStoredView } from "../ui/use-stored-view";
import { MutationError } from "./mutation-error";
import { heldElsewhere, SuggestedChangesConfirm } from "./suggested-changes-confirm";
import { DriftLine, leadSentence, LINK, NOTICE_BOX, noticeStyle } from "./suggested-changes-intake";
import { SuggestedChangesPickLine } from "./suggested-changes-pick-line";
import { historyDay } from "./tuning-history";
import { DeckRefusalToast } from "./token-refusal-toast";

const sc = suggestedChangesV2Copy;

/** Suggested changes v2's apply, undo and pick (`tuning-v2-actions.ts`), injectable for tests. */
export type SuggestionSetActions = {
  /** `pulls`: the confirmation's staged pulls (Small items 4, item 2), passed only when there are any. */
  apply: (runId: string, addIds: string[], cutIds: string[], actionId: string, pulls?: { itemId: string; sourceDeckId: string }[]) => Promise<ApplySetActionResult>;
  undo: (applySet: string) => Promise<ApplySetActionResult>;
  pick: (itemId: string, picked: boolean) => Promise<{ ok: boolean }>;
  /** The brackets the deck would permit with these picks applied, for a set the lines' own flags cannot settle. */
  setBracket?: (runId: string, addIds: string[], cutIds: string[]) => Promise<{ permits: number[] } | null>;
  /** The source picker's "→ N cards" per `${deckId}:${oracleId}` (`loadSourceDeckFigures`), for the confirmation's Pull. */
  sourceFigures?: (pairs: { deckId: string; oracleId: string }[]) => Promise<[string, SourceDeckFigure][]>;
};

/** How long the picks rest before the bar asks the server for the set's bracket (a profile build per ask). */
const SET_BRACKET_DEBOUNCE_MS = 400;

/** What the grouping heads read off the deck page: its count per type group, and what it has of each shelf role. */
export type RunFigures = {
  typeCounts: Partial<Record<CardTypeGroup, number>>;
  roles: readonly { role: string; have: number; target: number }[];
};

/** How long a line that just landed carries its `new` mark (Wait B: "for a beat"). */
export const NEW_MARK_MS = 2500;
/** The wait's two notes (Wait C and D). */
export const SLOW_NOTE_MS = 45_000;
export const SLOWER_NOTE_MS = 120_000;

/**
 * One Suggested changes v2 run, being made or made (plan 2026-10-27, UI PR 6; README items 3 to 6). While `live` is set
 * it is the wait: the clock and its notes, each list filling in arrival order with a `new` mark for a beat, and Apply
 * held until both lists are in. Once made it is the results: one list per side (a phone switches halves), one Pick per
 * row capped at N a side, grouped from N = 4 under the deck page's own By type · By role, and the pinned bar with the
 * tally, the one Apply (through a confirmation) and the one Undo for the set. Picks are saved as they are made
 * (`pick`), so they survive leaving, a return and an Undo.
 */
export function SuggestedChangesRun({
  runId, ask, lines: readLines, live, startedAt, report, permits, newestPriceAsOf, figures, drift, finishedHere = false,
  readFrom, actions, onChanged, onAnnounce, onNewRun, readOnly = false, credits = null, past = null, deckId,
}: {
  runId: string;
  /** The run's deck, for the confirmation's Pull (Small items 4, item 2). */
  deckId?: string;
  ask: V2Ask | null;
  lines: readonly LineItem[];
  /** The run is still being made: the wait. */
  live: TuningLive | null;
  startedAt: Date | null;
  /** The finished run's own report: its short reasons, its charge, a failed cut call. */
  report: ValidationReport | null;
  permits: readonly Bracket[];
  newestPriceAsOf: Date | null;
  figures: RunFigures;
  /** The deck is off 99: Apply is held with the intake's drift line and its link. */
  drift: { at: number; over: number; onTopOff?: () => void; onProposedCuts?: () => void } | null;
  /** The run finished while this visit watched it: the wait's last word (Wait E) is said once. */
  finishedHere?: boolean;
  readFrom?: ReactNode;
  actions: SuggestionSetActions;
  /** Re-read the panel; resolves once it has. */
  onChanged: () => Promise<unknown>;
  onAnnounce: (text: string) => void;
  onNewRun: () => void;
  readOnly?: boolean;
  /** A run History reopened (History B and C): its day (`Oct 26`), and `stale` when a newer version is committed (then
   *  `readOnly` too). Its note leads, You asked sits beside the lead on desktop, and the lead says when it was applied.
   *  `moved`: how many cards the list has changed by since the run read it, for History C's note; null when that cannot
   *  be said, and the note reads uncounted. */
  past?: { date: string; stale: boolean; version?: number | null; moved?: number | null } | null;
  /** The reader's free credits now (`freeCount` of the allowance): a refunded short run says how many are left. */
  credits?: { left: number; total: number } | null;
}) {
  const n = ask?.requestedCount ?? 3;
  const waiting = live !== null;
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  // Each row's latest pick save, by count: a mutable map kept for the component's life (read only in `toggle`).
  const [pickRev] = useState(() => new Map<string, number>());
  const [pickError, setPickError] = useState<string | null>(null);
  const [setRead, setSetRead] = useState<{ key: string; permits: number[] } | null>(null);
  // What the set read was made against: the deck's reading and every line's state. An Apply, an Undo or a refreshed deck
  // changes it, and a read made before then never speaks for the picks after.
  const deckStamp = `${permits.join(",")}#${readLines.map((l) => `${l.id}:${l.verdict}:${l.applySet ?? ""}`).join(",")}`;
  const [half, setHalf] = useState<"add" | "cut">("add");
  const [stored, setGrouping] = useStoredView(DECK_GROUPING_KEY, isDeckGrouping);
  const grouping: Grouping = stored ?? "type";
  const [confirming, setConfirming] = useState(false);
  // The confirmation's staged pulls, by addition id (Small items 4, item 2): which deck each held copy leaves on Apply.
  // Held across closing the confirmation, and sent only for an addition still picked.
  const [staged, setStaged] = useState<ReadonlyMap<string, DeckClaim>>(() => new Map());
  const ownedFromOtherDecks = ask?.restrictions?.ownedOnly === true && ask.restrictions.otherDecks === true;
  // The picker's "→ N cards" for the held additions' sources, read once the confirmation opens (as Review changes reads
  // them with its page); absent until then, and on a failed read, when the picker draws no figure.
  const [pullFigures, setPullFigures] = useState<{ key: string; map: Map<string, SourceDeckFigure> } | null>(null);
  const [busy, setBusy] = useState<"apply" | "undo" | null>(null);
  // A key per refused Apply, so a second refusal arrives as a newer alert with its own eight seconds (small items 3, item 8).
  const [failed, setFailed] = useState<number | null>(null);
  // The toast's detail line: a refused pull's own reason (`pullInTx`'s words), else the shipped retry line.
  const [failedDetail, setFailedDetail] = useState<string>(sc.applyFailed.detail);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undone, setUndone] = useState<number | null>(null);
  const [lastSet, setLastSet] = useState<string | null>(null);
  // The wait's start, kept past the finish: the panel stops passing it once the run is made, and Wait E's clock stays.
  const [clockFrom, setClockFrom] = useState<Date | null>(startedAt);
  if (startedAt && startedAt.getTime() !== clockFrom?.getTime()) setClockFrom(startedAt);

  // What this visit's Apply and Undo wrote, held over the read until a read agrees: a follow-up read that fails must not
  // put the applied rows back as pending (Apply again, no Undo) or leave an undone set offering its spent Undo.
  // An Undo also gives its rows back their eligibility: the read after the Apply drew them as no longer applying.
  type Written = Pick<LineItem, "verdict" | "applySet"> & Partial<Pick<LineItem, "applies" | "inDeck" | "verdictAt">>;
  const [written, setWritten] = useState<ReadonlyMap<string, Written>>(() => new Map());
  const caught = [...written].filter(([id, w]) => {
    const l = readLines.find((x) => x.id === id);
    return !l || (l.verdict === w.verdict && (l.applySet ?? null) === w.applySet);
  });
  if (caught.length > 0) {
    const next = new Map(written);
    for (const [id] of caught) next.delete(id);
    setWritten(next);
  }
  const lines = written.size === 0 ? readLines : readLines.map((l) => (written.has(l.id) ? { ...l, ...written.get(l.id)! } : l));

  // Each line that lands after the first draw carries `new` for a beat (Wait B). Adjusted during render, so the mark is
  // on the very draw that shows the line.
  const ids = lines.map((l) => l.id);
  const [known, setKnown] = useState<ReadonlySet<string>>(() => new Set(ids));
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const arrivals = ids.filter((id) => !known.has(id));
  if (arrivals.length > 0) {
    setKnown(new Set([...known, ...arrivals]));
    setFresh(new Set([...fresh, ...arrivals]));
  }
  useEffect(() => {
    if (fresh.size === 0) return;
    const t = setTimeout(() => setFresh(new Set()), NEW_MARK_MS);
    return () => clearTimeout(t);
  }, [fresh]);

  // Only an open line counts as picked: a saved pick the deck has moved past (its cut locked since) is not sent, so the
  // tally, the confirmation and Apply hold to what the server can make (`planPicks`, then `planSwap`).
  const isPicked = (l: LineItem) => isOpen(l) && (overrides.get(l.id) ?? l.picked ?? false);
  const adds = lines.filter((l) => l.side === "add");
  const cuts = lines.filter((l) => l.side === "cut");
  const cap = pickCap(n, lines, !waiting);
  const pickedAdds = adds.filter(isPicked);
  // Every choosable source of every held addition coming in, while the confirmation is open: the picker's figures.
  const figureKey = confirming && ownedFromOtherDecks
    ? pickedAdds.filter((l) => heldElsewhere(l, true)).flatMap((l) => pullSourceChoices(l.availability ?? undefined)
      .filter((c) => !c.commander && !c.locked)
      .map((c) => `${c.id}:${l.cardOracleId}`)).join(",")
    : "";
  useEffect(() => {
    const read = actions.sourceFigures;
    if (!read || figureKey === "" || pullFigures?.key === figureKey) return;
    let live = true;
    const pairs = figureKey.split(",").map((k) => {
      const [deckId, oracleId] = k.split(":");
      return { deckId, oracleId };
    });
    read(pairs).then((entries) => { if (live) setPullFigures({ key: figureKey, map: new Map(entries) }); }, () => undefined);
    return () => { live = false; };
  }, [figureKey, actions.sourceFigures, pullFigures?.key]);
  const pickedCuts = cuts.filter(isPicked);
  const t = tally([...pickedAdds, ...pickedCuts]);
  // A set past one line a side: the bar's claim waits on the server's read of the whole set (follow-up b).
  const setKey = pickedAdds.length > 1 || pickedCuts.length > 1
    ? `${pickedAdds.map((l) => l.id).join(",")}|${pickedCuts.map((l) => l.id).join(",")}|${deckStamp}` : null;
  useEffect(() => {
    const read = actions.setBracket;
    // Not while the run streams: the waiting bar draws no outcome, and each arriving line would move the stamp.
    if (setKey === null || waiting || !read || setRead?.key === setKey) return;
    let live = true;
    const [a, c] = setKey.split("|").slice(0, 2).map((s) => (s === "" ? [] : s.split(",")));
    const timer = setTimeout(() => {
      read(runId, a, c).then((r) => { if (live && r) setSetRead({ key: setKey, permits: r.permits }); }, () => undefined);
    }, SET_BRACKET_DEBOUNCE_MS);
    return () => { live = false; clearTimeout(timer); };
  }, [setKey, waiting, runId, actions.setBracket, setRead?.key]);
  const outcome = bracketOutcome(
    permits, ask?.bracket ?? null, [...pickedAdds, ...pickedCuts], setRead && setRead.key === setKey ? setRead.permits : null,
  );

  // The applied sets, each its own Undo (spec §7a); the bar offers the one this visit applied, else the one found.
  const sets = new Map<string, LineItem[]>();
  for (const l of lines) {
    if (l.verdict === "accepted" && l.applySet) sets.set(l.applySet, [...(sets.get(l.applySet) ?? []), l]);
  }
  const undoTarget = lastSet && sets.has(lastSet) ? lastSet : sets.keys().next().value ?? null;
  const appliedSet = undoTarget ? sets.get(undoTarget)! : null;

  const short = waiting ? null : shortFacts(n, lines, report);
  const ofAsk = !waiting && finishedHere && short === null ? shortOfAsk(n, lines, report) : null;

  async function toggle(l: LineItem) {
    if (readOnly || l.verdict !== "pending") return;
    const was = isPicked(l);
    const side = l.side === "add" ? pickedAdds : pickedCuts;
    if (!was && (side.length >= cap || !l.applies)) return;
    setOverrides((m) => new Map(m).set(l.id, !was));
    setPickError(null);
    // Only a row's latest save may roll it back: Pick, unpick, Pick with the first save failing last must not undo the
    // newer choice the server holds (review round 2).
    const mine = (pickRev.get(l.id) ?? 0) + 1;
    pickRev.set(l.id, mine);
    const r = await actions.pick(l.id, !was).catch(() => ({ ok: false }));
    if (!r.ok && pickRev.get(l.id) === mine) {
      setOverrides((m) => new Map(m).set(l.id, was));
      setPickError(sc.run.pickRefused);
    }
  }

  async function apply() {
    if (busy) return;
    setBusy("apply");
    // The set id is the Undo's handle: the bar offers this visit's latest set, not the first one found.
    const setId = crypto.randomUUID();
    const pulls = pickedAdds.flatMap((l) => {
      const claim = staged.get(l.id);
      return claim && heldElsewhere(l, ownedFromOtherDecks) ? [{ itemId: l.id, sourceDeckId: claim.id }] : [];
    });
    const r = await actions
      .apply(runId, pickedAdds.map((l) => l.id), pickedCuts.map((l) => l.id), setId, ...(pulls.length > 0 ? [pulls] : []))
      .catch((): ApplySetActionResult => ({ ok: false, message: deckTuningCopy.lists.applyRefused }));
    setConfirming(false);
    if (!r.ok) {
      setBusy(null);
      const refusal = r.refusal;
      if (refusal?.kind === "pull") {
        // A refused pull names why (a commander, a lock, another deck's claim), and that pull is unstaged: kept, it would
        // refuse every retry. Apply again adds the card without pulling it; the player can stage another deck.
        setFailedDetail(refusal.message || sc.applyFailed.detail);
        setStaged((m) => {
          const next = new Map(m);
          next.delete(refusal.itemId);
          return next;
        });
      } else {
        setFailedDetail(sc.applyFailed.detail);
      }
      setFailed((n) => (n ?? 0) + 1);
      onAnnounce(sc.applyFailed.title);
      return;
    }
    // A set id applied then undone answers ok with no lines: nothing was written, so it is not a set to undo.
    if (r.itemIds.length > 0) {
      // Its answer time too, so a failed follow-up read still says the set was applied today, not on the run's day.
      const verdictAt = new Date().toISOString();
      setWritten((m) => new Map([...m, ...r.itemIds.map((id) => [id, { verdict: "accepted" as const, applySet: setId, verdictAt }] as const)]));
      setLastSet(setId);
      setUndone(null);
      setStaged(new Map());
      onAnnounce(sc.run.appliedLead(pickedAdds.length, lines.filter(isOpen).length - r.itemIds.length));
    }
    await onChanged();
    setBusy(null);
  }

  async function undo() {
    if (busy || !undoTarget) return;
    setBusy("undo");
    setUndoError(null);
    const r = await actions.undo(undoTarget)
      .catch((): ApplySetActionResult => ({ ok: false, message: deckTuningCopy.lists.undoRefused }));
    if (!r.ok) {
      setBusy(null);
      setUndoError(r.message);
      return;
    }
    if (r.itemIds.length > 0) {
      // The undone swap is makeable again: an addition's card is out of the deck (a basic stays as it was), a cut's is in.
      const undoneFacts = (id: string): Written => {
        const l = lines.find((x) => x.id === id);
        const inDeck = !l || l.side === "cut" || (l.inDeck && l.cardTypeLine.includes("Basic"));
        return { verdict: "pending", applySet: null, applies: true, inDeck };
      };
      setWritten((m) => new Map([...m, ...r.itemIds.map((id) => [id, undoneFacts(id)] as const)]));
      setUndone(r.itemIds.length);
      onAnnounce(sc.undone(r.itemIds.length));
    }
    await onChanged();
    setBusy(null);
  }

  const sideIn = (side: "add" | "cut") => !waiting || (side === "add" ? live.in.add : live.in.cut);
  // A side groups once it is all in, never while it is arriving (Wait B), and only from N = 4.
  const grouped = (side: "add" | "cut") => groupsAt(n) && sideIn(side);
  const showGroupSwitch = groupsAt(n) && (sideIn("add") || sideIn("cut"));
  const chip = (side: "add" | "cut") => {
    const k = (side === "add" ? pickedAdds : pickedCuts).length;
    const applied = appliedSet ? appliedSet.filter((l) => l.side === side).length : 0;
    return k === 0 && applied > 0 ? { text: sc.results.applied(applied), full: true } : { text: sc.results.chosen(k, cap), full: k > 0 && k >= cap };
  };
  // What a side had applied, any set: a stale run's chip says it in quiet ink (History C, `2 applied`).
  const appliedOn = (side: "add" | "cut") => lines.filter((l) => l.side === side && l.verdict === "accepted").length;

  const column = (side: "add" | "cut") => {
    const rows = side === "add" ? adds : cuts;
    const title = side === "add" ? sc.results.additions : sc.results.cuts;
    const c = chip(side);
    const started = side === "add" || !waiting || live.phase === "cuts" || rows.length > 0;
    const askedOf = side === "add" ? askFor(n) : cutAskOf(n, waiting ? live.cutAsk : report?.v2?.cutAsk);
    const line = (l: LineItem) => (
      <li key={l.id}>
        <SuggestedChangesPickLine
          item={l}
          permits={permits}
          newestPriceAsOf={newestPriceAsOf}
          picked={isPicked(l)}
          off={readOnly || !l.applies || (side === "add" ? pickedAdds : pickedCuts).length >= cap}
          onToggle={() => void toggle(l)}
          ownedFromOtherDecks={ownedFromOtherDecks}
          fresh={fresh.has(l.id)}
          aim={ask?.bracket ?? null}
          readOnly={readOnly}
        />
      </li>
    );
    return (
      <section
        key={side}
        aria-label={title}
        data-sc-side={side}
        className={`${half === side ? "flex" : "hidden"} min-w-0 flex-col gap-[10px] md:flex md:gap-[8px]`}
      >
        <div className="flex min-h-[32px] items-center gap-[10px]">
          <h3 className="m-0 flex items-baseline gap-[7px] text-[14px] font-semibold" style={{ color: "var(--fg)" }}>
            {title}
            <span className="font-mono text-[11px] font-normal" style={{ color: "var(--fg-faint)" }}>
              {sideIn(side) ? rows.length : sc.run.soFar(rows.length)}
            </span>
          </h3>
          {readOnly ? (appliedOn(side) > 0 ? (
            <span
              data-sc-chip={side}
              className="ml-auto inline-flex h-[26px] items-center whitespace-nowrap rounded-full px-[10px] font-mono text-[11px]"
              style={{ color: "var(--fg-muted)", border: "1px solid var(--border-strong)" }}
            >
              {sc.results.applied(appliedOn(side))}
            </span>
          ) : null) : (
            <span
              data-sc-chip={side}
              data-sc-chip-full={c.full || undefined}
              className="ml-auto inline-flex h-[26px] items-center whitespace-nowrap rounded-full px-[10px] font-mono text-[11px]"
              style={{
                color: c.full ? "var(--success)" : "var(--fg-muted)",
                border: `1px solid ${c.full ? "color-mix(in oklab, var(--success) 50%, transparent)" : "var(--border-strong)"}`,
              }}
            >
              <LeadCount text={c.text} color={c.full ? "var(--success)" : "var(--fg)"} />
            </span>
          )}
        </div>
        {!started ? null : grouped(side) ? (
          groupLines(rows, grouping, figures, isPicked).map((g, gi) => (
            <div key={g.key} data-sc-group={g.key} className={`flex flex-col gap-[8px] ${gi > 0 ? "mt-[4px]" : ""}`}>
              <h4
                className="m-0 flex flex-wrap items-baseline gap-x-[8px] px-[2px] pb-[2px] pt-[8px] font-mono text-[10.5px]"
                style={{ color: "var(--fg-faint)", borderTop: gi > 0 ? "1px solid var(--border)" : undefined }}
              >
                <span className="font-sans text-[12.5px] font-semibold" style={{ color: "var(--fg-body)" }}>
                  {grouping === "type" ? g.key : addPanelCopy.shelf.labels[g.key as MixRole | "other"]}
                </span>
                <span>
                  {g.lines.length}
                  {g.have !== null ? ` · ${grouping === "type" || g.target === null ? sc.results.typeHead(g.have) : sc.results.roleHead(g.have, g.target)}` : null}
                  {g.withPicks !== null ? <> · <span style={{ color: "var(--accent-text)" }}>{sc.results.withPicks(g.withPicks)}</span></> : null}
                </span>
              </h4>
              <ul className="m-0 flex list-none flex-col gap-[8px] p-0">{g.lines.map(line)}</ul>
            </div>
          ))
        ) : (
          <ul className="m-0 flex list-none flex-col gap-[8px] p-0">{rows.map(line)}</ul>
        )}
        {/* The end line stays through the wait, and on a run that finished short in front of the reader (Wait E). */}
        {waiting || ofAsk !== null ? (() => {
          const state = !started ? "wait" : sideIn(side) ? "in" : "more";
          return (
            <p
              data-sc-end={side}
              data-sc-end-state={state}
              className="m-0 flex min-h-[52px] flex-wrap items-center gap-[10px] rounded-[9px] px-[12px] py-[8px] text-[12.5px]"
              style={{
                border: state === "wait" ? "1px dotted var(--border-strong)" : state === "in" ? "1px solid var(--border)" : "1px dashed var(--border-strong)",
                color: state === "more" ? "var(--fg-muted)" : "var(--fg-faint)",
              }}
            >
              <span
                aria-hidden
                className="size-[8px] flex-none rounded-full"
                style={state === "more"
                  ? { background: "var(--accent)", boxShadow: "0 0 0 4px color-mix(in oklab, var(--accent) 22%, transparent)" }
                  : { background: state === "in" ? "var(--success)" : "var(--fg-locked)" }}
              />
              {state === "wait" ? sc.wait.cutsNext : state === "in"
                ? `${sc.wait.allIn(rows.length)}${grouped(side) && grouping === "type" ? sc.wait.groupedNow : ""}`
                : sc.wait.stillFinding}
              {state === "wait" ? null : (
                <span className="ml-auto font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
                  {state === "in" ? sc.wait.askedFor(askedOf) : sc.wait.soFarAsked(rows.length, askedOf)}
                </span>
              )}
            </p>
          );
        })() : null}
      </section>
    );
  };

  // A set fits the cap the server holds it to (`planPicks`): picks an Undo gave back can sit beside newer ones past it.
  const overCap = t.adds > cap || t.cuts > cap;
  // A failed cut call shows no cuts, so none can be applied, even one picked while the cuts were still arriving.
  const applyOn = !waiting && !readOnly && t.equal && t.adds > 0 && !overCap && short?.kind !== "noCuts" && drift === null && busy === null;
  const bracketText = (o: BracketOutcome | null) =>
    o === null ? null : o.kind === "reached"
      ? sc.bar.bracketReached(o.from, o.to, BRACKET_NAMES[o.to as Bracket])
      : sc.bar.bracketStays(o.kind === "stays" ? o.bracket : o.from, BRACKET_NAMES[(o.kind === "stays" ? o.bracket : o.from) as Bracket]);
  const appliedBar = appliedSet !== null && t.adds === 0 && t.cuts === 0 && !waiting;
  const shown = appliedBar ? tally(appliedSet!) : t;
  let meta: ReactNode;
  let sentence: string;
  let warn = false;
  if (waiting) {
    meta = sc.wait.stillFindingTally;
    sentence = sc.wait.applyWaits;
  } else if (appliedBar) {
    meta = sc.bar.applied;
    sentence = sc.bar.appliedLine;
  } else if (t.adds === 0 && t.cuts === 0) {
    meta = null;
    sentence = sc.bar.none(cap);
  } else if (overCap) {
    meta = null;
    sentence = sc.bar.none(cap);
    warn = true;
  } else if (!t.equal) {
    const more = Math.abs(t.adds - t.cuts);
    meta = sc.bar.wouldGo(t.total);
    sentence = sc.bar.unequal(t.adds, t.cuts, more, t.adds > t.cuts ? sc.barSide.cut(more) : sc.barSide.add(more));
    warn = true;
  } else {
    // A reached aim's figure is drawn in its bracket's ink (Results-20 A: "bracket 2 → **3 · Upgraded**, as asked").
    const reached = outcome?.kind === "reached" ? outcome : null;
    meta = reached ? (
      <>
        {`${sc.bar.stays} · `}
        <Emph text={bracketText(reached)!} part={`${reached.to} · ${BRACKET_NAMES[reached.to as Bracket]}`} color={`var(--bracket-${reached.to})`} />
      </>
    ) : [sc.bar.stays, bracketText(outcome)].filter(Boolean).join(" · ");
    if (outcome?.kind === "missed") {
      const name = BRACKET_NAMES[outcome.aim.target as Bracket];
      sentence = outcome.aim.choice === "up"
        ? sc.bar.bracketMissed(outcome.aim.target, name, outcome.from)
        : sc.barMissedDown(outcome.aim.target, name, outcome.from);
      warn = true;
    } else {
      sentence = sc.bar.equal;
    }
  }
  const h = sc.history;
  // "Applied … on DATE" (History B and C): the applied set's own day, its newest answered line; the run's day only when no
  // line says when it was answered.
  const appliedDay = (set: readonly LineItem[]) => {
    const at = set.map((l) => l.verdictAt).filter((v): v is string => !!v).sort().at(-1);
    return at ? historyDay(at) : past!.date;
  };
  const lead = waiting ? null : past?.stale
    // History C: the lists, then what was applied from them and when.
    ? (appliedOn("add") + appliedOn("cut") > 0
      ? `${h.staleLists(adds.length, cuts.length)}${h.staleApplied(h.pair(appliedOn("add"), appliedOn("cut")), appliedDay(lines.filter((l) => l.verdict === "accepted")))}`
      : h.staleListsOnly(adds.length, cuts.length))
    : appliedSet
      // History B says when the set went in, and that the rest can still be picked.
      ? (past
        ? [h.oldRunLead(appliedSet.length / 2, appliedDay(appliedSet)), h.oldRunRest(lines.filter(isOpen).length)].filter(Boolean).join(" ")
        : sc.run.appliedLead(appliedSet.length / 2, lines.filter(isOpen).length))
      : cap < n ? sc.run.shortLead(adds.length, cuts.length, cap) : sc.results.lead(adds.length, cuts.length, n);
  // History B on desktop names the version the rest stay pickable on (the phone keeps the shorter line).
  // Nothing left to pick: no clause at either width.
  const leadWide = !waiting && past && !past.stale && appliedSet && past.version != null && lines.some(isOpen)
    ? ` ${h.oldRunRestVersion(lines.filter(isOpen).length, past.version)}` : null;
  // History C's lead is bold up to its ` · ` (`5 to add and 5 to cut · 2 + 2 applied on Oct 19.`); every other at its first stop.
  const leadParts = lead === null ? null : past?.stale && lead.includes(" · ")
    ? [lead.slice(0, lead.indexOf(" · ")), lead.slice(lead.indexOf(" · "))] as const : leadSentence(lead, ". ");
  const confirmBracket = bracketText(outcome);

  return (
    <div data-sc-run={waiting ? "wait" : "results"} data-sc-past={past ? (past.stale ? "stale" : "live") : undefined}
      // History B and C: 16px between the note, You asked and the lead; B's note sits 10px under the heading.
      className={`flex flex-col ${past ? `${past.stale ? "mt-[12px]" : "mt-[10px]"} gap-[16px]` : "mt-[12px] gap-[14px]"}`}>
      {past ? (past.stale ? (
        // History C: the shipped past-run note, in History's own box.
        <p data-sc-past-note="" className="m-0 rounded-[10px] px-[14px] py-[11px] text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)", border: "1px solid var(--border-strong)", background: "var(--surface-sunken)" }}>
          {past.moved ? tuningHubCopy.history.pastNote(past.moved) : tuningHubCopy.history.pastNoteUncounted}
        </p>
      ) : (
        // History B: still live, each change checked against the deck as it is now.
        <p data-sc-past-note="" className="m-0 max-w-[760px] text-[13px] leading-[1.6]" style={{ color: "var(--fg-body)", textWrap: "pretty" }}>
          {tuningHubCopy.history.review.note.suggested(past.date)}
        </p>
      )) : null}
      {undone !== null ? <Undone text={sc.undone(undone)} /> : null}
      {past ? (
        // You asked beside the outcome on desktop, stacked on a phone (History B and C, `.sbs`).
        <div data-sc-side-by-side="" className="flex flex-col gap-[16px] md:grid md:grid-cols-2 md:items-start md:gap-[16px]">
          {ask ? <YouAsked ask={ask} /> : null}
          <div className="flex min-w-0 flex-col gap-[8px]">
            {leadParts ? (
              <p className="m-0 max-w-[760px] text-[13px] leading-[1.6]" style={{ color: "var(--fg-body)", textWrap: "pretty" }} data-sc-lead="">
                <b className="font-semibold" style={{ color: "var(--fg)" }}>{leadParts[0]}</b>
                {leadWide ? (
                  <>
                    <span data-sc-lead-narrow="" className="md:hidden">{leadParts[1]}</span>
                    <span data-sc-lead-wide="" className="hidden md:inline">{leadWide}</span>
                  </>
                ) : leadParts[1]}
              </p>
            ) : null}
            {readFrom}
          </div>
        </div>
      ) : ask ? <YouAsked ask={ask} /> : null}
      {/* Once in, the clock stays only for a run that came up short of the ask (Wait E); the Results boards draw none. */}
      {clockFrom && (waiting || ofAsk !== null) ? (
        <Clock startedAt={clockFrom} adds={adds.length} cuts={cuts.length} n={n} done={!waiting} />
      ) : null}
      {short ? <ShortHead facts={short} n={n} ask={ask} credits={credits} onNewRun={onNewRun} /> : null}
      {ofAsk ? (
        <Notice
          edge="var(--warning)"
          data="finished-short"
          text={sc.wait.finishedShort(
            adds.length, cuts.length, ofAsk.side === "add" ? sc.short.sideAdditions : sc.short.sideCuts, ofAsk.short, ofAsk.asked,
            sc.short.reasons[ofAsk.reason ?? "none"],
          )}
        />
      ) : null}
      {leadParts && !past ? (
        <p className="m-0 max-w-[760px] text-[13px] leading-[1.6]" style={{ color: "var(--fg-body)" }} data-sc-lead="">
          <b className="font-semibold" style={{ color: "var(--fg)" }}>{leadParts[0]}</b>
          {leadParts[1]}
        </p>
      ) : null}
      {past ? null : readFrom}
      {showGroupSwitch ? (
        <div className="flex items-center gap-[10px] md:justify-end">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{sc.results.group}</span>
          <SegmentedSwitch
            kind="radio"
            ariaLabel={DECK_GROUPING_ARIA}
            value={grouping}
            onChange={setGrouping}
            segments={[
              { value: "type", label: DECK_GROUPING_LABELS.type },
              { value: "role", label: DECK_GROUPING_LABELS.role },
            ]}
          />
        </div>
      ) : null}
      <div className="md:hidden">
        <SegmentedSwitch
          kind="tabs"
          fill
          ariaLabel={sc.run.halves}
          value={half}
          onChange={setHalf}
          segments={(["add", "cut"] as const).map((side) => {
            const rows = side === "add" ? adds : cuts;
            const k = (side === "add" ? pickedAdds : pickedCuts).length;
            const notYet = waiting && side === "cut" && live.phase === "additions" && rows.length === 0;
            const name = side === "add" ? sc.results.additions : sc.results.cuts;
            return {
              value: side,
              // While a half is still arriving it carries the wait's dot (Wait A to D: `.seg2 .sd`).
              label: waiting && !sideIn(side) ? (
                <span className="inline-flex items-center gap-[7px]">
                  <span
                    aria-hidden
                    data-sc-half-dot={side}
                    className="size-[7px] flex-none rounded-full"
                    style={{ background: "var(--accent)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent)" }}
                  />
                  {name}
                </span>
              ) : name,
              // A stale run counts its rows (History C); a side with nothing picked and a set applied says so (History B,
              // Results-3 D); otherwise `k of N`.
              count: (() => {
                const applied = appliedSet ? appliedSet.filter((l) => l.side === side).length : 0;
                const full = readOnly ? false : k === 0 ? applied > 0 : k >= cap;
                return (
                  <span className="font-mono text-[11px]" style={{ color: full ? "var(--success)" : "var(--fg-faint)" }}>
                    {notYet ? sc.run.next : readOnly ? rows.length : k === 0 && applied > 0 ? sc.results.applied(applied) : sc.run.ofN(k, cap)}
                  </span>
                );
              })(),
            };
          })}
        />
      </div>
      <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2 md:gap-[18px]">
        {column("add")}
        {short?.kind === "noCuts" ? (
          <p data-sc-no-cuts="" className={`${half === "cut" ? "block" : "hidden"} m-0 text-[12.5px] md:block`} style={{ color: "var(--fg-body)" }}>{sc.short.noCuts}</p>
        ) : column("cut")}
      </div>
      {pickError ? <MutationError message={pickError} /> : null}
      {drift && !readOnly ? <DriftLine at={drift.at} over={drift.over} onTopOff={drift.onTopOff} onProposedCuts={drift.onProposedCuts} /> : null}
      {readOnly ? null : (
        <div
          data-sc-bar=""
          data-sc-bar-done={appliedBar || undefined}
          className="sticky bottom-0 z-10 -mx-[16px] flex flex-col items-stretch gap-[8px] px-[16px] pb-[12px] pt-[10px] [border-top:1px_solid_var(--border-strong)] md:mx-0 md:flex-row md:flex-wrap md:items-center md:gap-[14px] md:rounded-[11px] md:py-[10px] md:pl-[16px] md:pr-[12px] md:[border:1px_solid_var(--border-strong)]"
          style={{
            background: "var(--elevated-hover)",
            boxShadow: "0 -10px 24px rgba(0,0,0,.35)",
            borderLeft: appliedBar ? "3px solid var(--success)" : undefined,
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <p className="m-0 flex flex-wrap items-baseline gap-x-[12px] font-mono text-[13px] font-semibold" style={{ color: "var(--fg)" }} data-sc-tally="">
              {/* Nothing picked: only the quiet count (Results-3 A), no green or red. */}
              {!waiting && !appliedBar && t.adds === 0 && t.cuts === 0 ? (
                <span data-sc-tally-quiet="" className="text-[12px] font-normal" style={{ color: "var(--fg-faint)" }}>{sc.run.nonePicked}</span>
              ) : (
                <>
                  <span style={{ color: "var(--success)" }}>{`+${shown.adds} in`}</span>
                  <span style={{ color: "var(--avail-over-fg)" }}>{`−${shown.cuts} out`}</span>
                  {meta ? <span className="text-[11px] font-normal" style={{ color: "var(--fg-faint)" }}>{meta}</span> : null}
                </>
              )}
            </p>
            <p className="m-0 text-[12px] leading-[1.5]" style={{ color: warn ? "var(--warning)" : "var(--fg-muted)" }} data-sc-bar-line="">
              {warn ? (
                <>
                  <b className="font-semibold" style={{ color: "var(--fg)" }}>{leadSentence(sentence, ". ")[0]}</b>
                  {leadSentence(sentence, ". ")[1]}
                </>
              ) : sentence}
            </p>
          </div>
          {appliedSet !== null && !waiting ? (
            <button
              type="button"
              onClick={() => void undo()}
              aria-disabled={busy !== null || undefined}
              className="h-[44px] w-full rounded-[8px] px-[14px] text-[13px] font-medium md:h-[36px] md:w-auto text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] hover:[border-color:var(--fg-muted)] transition-colors"
            >
              {busy === "undo" ? sc.undoing : sc.bar.undo(appliedSet.length)}
            </button>
          ) : null}
          {appliedBar ? null : (
            <button
              type="button"
              onClick={() => { if (applyOn) setConfirming(true); }}
              aria-disabled={!applyOn || undefined}
              data-sc-apply=""
              className={`h-[44px] w-full whitespace-nowrap rounded-[8px] px-[16px] text-[13px] font-semibold md:h-[36px] md:w-auto transition-colors ${applyOn
                ? "bg-[color:var(--accent)] text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)]"
                : "cursor-default bg-transparent text-[color:var(--fg-disabled)] [border:1px_solid_var(--border-strong)]"}`}
            >
              {applyOn ? sc.bar.apply(t.adds * 2) : sc.run.applyOff}
            </button>
          )}
        </div>
      )}
      {undoError ? <MutationError message={undoError} /> : null}
      {confirming ? (
        <SuggestedChangesConfirm
          adds={pickedAdds}
          cuts={pickedCuts}
          bracket={confirmBracket ? `${confirmBracket[0].toUpperCase()}${confirmBracket.slice(1)}.` : ""}
          busy={busy === "apply"}
          onApply={() => void apply()}
          onClose={() => setConfirming(false)}
          deckId={deckId}
          ownedFromOtherDecks={ownedFromOtherDecks}
          sourceFigures={pullFigures && pullFigures.key === figureKey ? pullFigures.map : undefined}
          staged={staged}
          onStage={(id, claim) => setStaged((m) => {
            const next = new Map(m);
            if (claim) next.set(id, claim);
            else next.delete(id);
            return next;
          })}
        />
      ) : null}
      {failed !== null ? <DeckRefusalToast key={failed} title={sc.applyFailed.title} detail={failedDetail} onDone={() => setFailed(null)} /> : null}
    </div>
  );
}

function Notice({ edge, text, data }: { edge: "var(--warning)" | "var(--accent)"; text: string; data: string }) {
  const [head, rest] = leadSentence(text, ". ");
  return (
    <div data-sc-notice={data} className={`${NOTICE_BOX} !mt-0 px-[14px] py-[11px]`} style={noticeStyle(edge)}>
      <p className="m-0 text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
        <span className="font-semibold" style={{ color: "var(--fg)" }}>{head}</span>
        {rest}
      </p>
    </div>
  );
}

/** You asked (Results boards): the request quoted, or that there was none, over the count, the bracket and the limits. */
function YouAsked({ ask }: { ask: V2Ask }) {
  const r = sc.run;
  // The count is bold, and an aim (not a keep) is bold in its bracket's ink (Results-20 A).
  const parts: ReactNode[] = [<b key="n" className="font-medium" style={{ color: "var(--fg-muted)" }}>{r.askedCount(ask.requestedCount)}</b>];
  if (ask.bracket) {
    // What the run was asked, as it was stored: never the deck's bracket today, which may have moved since.
    const b = ask.bracket.target;
    const name = BRACKET_NAMES[b as Bracket];
    const low = ask.bracket.low;
    parts.push(ask.bracket.choice === "keep" ? (
      low !== undefined && low < b
        ? r.askedKeepRange(low, b, `${BRACKET_NAMES[low as Bracket]} or ${name}`)
        : r.askedKeep(b, name)
    ) : (
      <b key="aim" data-sc-asked-aim="" className="font-medium" style={{ color: `var(--bracket-${b})` }}>{sc.results.aimed(b, name)}</b>
    ));
  }
  if (ask.restrictions) {
    const { capCents, sets, ownedOnly, otherDecks } = ask.restrictions;
    parts.push(capCents === null ? r.askedNoCap : r.askedCap(formatCents(capCents)));
    parts.push(sets.length === 0 ? r.askedAnySet : r.askedSets(sets.map((s) => s.toUpperCase()).join(", ")));
    parts.push(!ownedOnly ? r.askedAnyCard : !otherDecks ? r.askedOwned : (
      <span key="owned">{r.askedOwned}, <b className="font-medium" style={{ color: "var(--fg-muted)" }}>{r.askedOtherDecks}</b></span>
    ));
  }
  return (
    <div data-sc-asked="" className="flex flex-col gap-[6px] rounded-[10px] px-[14px] py-[12px]" style={{ background: "var(--surface-rail)", border: "1px solid var(--border)" }}>
      <p className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{sc.results.youAsked}</p>
      {ask.request ? (
        <p className="m-0 text-[13.5px] leading-[1.55]" style={{ color: "var(--fg)" }}>{`“${ask.request}”`}</p>
      ) : (
        <p className="m-0 text-[13px] italic" style={{ color: "var(--fg-muted)" }}>{sc.results.noRequest}</p>
      )}
      <p className="m-0 font-mono text-[10.5px] leading-[1.6]" style={{ color: "var(--fg-faint)" }}>
        {parts.map((part, i) => <Fragment key={i}>{i > 0 ? " · " : null}{part}</Fragment>)}
      </p>
    </div>
  );
}

/** The Undo's notice (Apply C): the fact edge on the plain surface, its first sentence bold. */
function Undone({ text }: { text: string }) {
  const [head, rest] = leadSentence(text, ". ");
  return (
    <p
      data-sc-notice="undone"
      className="m-0 rounded-[9px] px-[12px] py-[10px] text-[12.5px] leading-[1.5]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "3px solid var(--fact)", color: "var(--fg-body)" }}
    >
      <b className="font-semibold" style={{ color: "var(--fg)" }}>{head}</b>
      {rest}
    </p>
  );
}

/** `text` with its leading count bold (the side chip's `.cc b`: "**3** of 3 chosen"). */
function LeadCount({ text, color }: { text: string; color: string }) {
  const m = /^\d+/.exec(text);
  if (!m) return <>{text}</>;
  // One inline box: inside the chip's inline-flex, a bare text node after the figure would be its own flex item and lose
  // its leading space ("2applied").
  return (
    <span data-sc-lead-count="">
      <b className="font-semibold" style={{ color }}>{m[0]}</b>
      {text.slice(m[0].length)}
    </span>
  );
}

/** `text` with `part` bold in `color` (a bracket's figure in its own ink). */
function Emph({ text, part, color }: { text: string; part: string; color: string }) {
  const i = text.indexOf(part);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b data-sc-bracket-figure="" className="font-semibold" style={{ color }}>{part}</b>
      {text.slice(i + part.length)}
    </>
  );
}

/** The wait's counts with each count bold (Wait `.so b`: "**4 to add** and **0 to cut** so far"). */
function Counts({ text, adds, cuts }: { text: string; adds: number; cuts: number }) {
  const parts = [`${adds} to add`, `${cuts} to cut`];
  const out: ReactNode[] = [];
  let rest = text;
  for (const part of parts) {
    const i = rest.indexOf(part);
    if (i < 0) continue;
    out.push(rest.slice(0, i), <b key={part} className="font-semibold" style={{ color: "var(--fg)" }}>{part}</b>);
    rest = rest.slice(i + part.length);
  }
  out.push(rest);
  return <>{out}</>;
}

/**
 * The wait's clock (Wait A to D): the time since the run began, what has arrived, the usual time, and two notes. Once
 * the run is made in front of the reader it stays as Wait E draws it: stopped at the run's time, `· done`, the usual
 * time, and no notes or leave line.
 */
function Clock({ startedAt, adds, cuts, n, done }: { startedAt: Date; adds: number; cuts: number; n: number; done: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [done]);
  const elapsed = Math.max(0, now - startedAt.getTime());
  const secs = Math.floor(elapsed / 1000);
  const note = done ? null : elapsed >= SLOWER_NOTE_MS ? sc.wait.slower : elapsed >= SLOW_NOTE_MS ? sc.wait.slow : null;
  const [noteHead, noteRest] = note ? leadSentence(note, ". ") : ["", ""];
  return (
    <div
      data-sc-clock={done ? "done" : ""}
      className="relative flex flex-col gap-[8px] overflow-hidden rounded-[12px] px-[16px] py-[12px]"
      style={{ background: "var(--surface-rail)", border: "1px solid var(--border)" }}
    >
      <p className="m-0 flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
        <span className="font-mono text-[24px] font-semibold" style={{ color: "var(--fg)" }} data-sc-elapsed="">
          {`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`}
        </span>
        <span className="text-[13px]" style={{ color: "var(--fg-body)" }} data-sc-clock-counts="">
          <Counts text={done ? sc.wait.done(adds, cuts) : sc.wait.soFar(adds, cuts)} adds={adds} cuts={cuts} />
        </span>
        <span className="font-mono text-[10.5px] max-md:basis-full" style={{ color: "var(--fg-faint)" }}>{usualFor(n)}</span>
      </p>
      {note ? (
        <p data-sc-wait-note={elapsed >= SLOWER_NOTE_MS ? "slower" : "slow"} className="m-0 rounded-[9px] px-[12px] py-[10px] text-[12.5px] leading-[1.55]"
          style={{ background: "var(--elevated-hover)", border: "1px solid var(--border-strong)", borderLeft: "3px solid var(--accent)", color: "var(--fg-body)" }}>
          <span className="font-semibold" style={{ color: "var(--fg)" }}>{noteHead}</span>
          {noteRest}
        </p>
      ) : null}
      {done ? null : <p className="m-0 text-[12px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>{sc.wait.leave}</p>}
      {/* The working line along the foot; a finished run drops it (Wait E: `.ws2.fin`). */}
      {done ? null : (
        <span
          aria-hidden
          data-sc-progress=""
          className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-[38%]"
          style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }}
        />
      )}
    </div>
  );
}

/** A run under N (Short-Run A and B), or with no cuts (plan P4): how many, what bound it, and the credit. */
function ShortHead({ facts, n, ask, credits, onNewRun }: {
  facts: ShortFacts; n: number; ask: V2Ask | null; credits: { left: number; total: number } | null; onNewRun: () => void;
}) {
  const s = sc.short;
  if (facts.kind === "noCuts") {
    return <Notice edge="var(--warning)" data="no-cuts" text={s.noCuts} />;
  }
  const word = facts.side === "add" ? s.additions : s.cuts;
  let head: string;
  let body: string;
  let credit: string;
  let link: string | null = null;
  if (facts.kind === "refunded") {
    head = s.refundHead(facts.found, word);
    body = s.refundBody(n);
    credit = credits ? s.refundCreditLeft(credits.left, credits.total) : s.refundCredit;
  } else {
    const capCents = ask?.restrictions?.capCents ?? null;
    if (facts.reason === "overCap" && capCents !== null) {
      head = `${sc.results.shortCap(facts.found, formatCents(capCents))}.`;
      body = s.capBody(n, facts.dropped, formatCents(capCents), facts.found);
      credit = s.capCredit;
      link = s.capLink;
    } else {
      head = facts.reason === "offSet" ? s.setHead(facts.found, word)
        : facts.reason === "notOwned" ? s.ownedHead(facts.found, word)
          : s.aimHead(facts.found, word);
      body = facts.exhausted ? s.ownedExhaustedBody(n, facts.found) : s.bodyBound(n, facts.found);
      credit = s.boundCredit;
      link = s.boundLink;
    }
  }
  return (
    <div data-sc-short={facts.kind} className={`${NOTICE_BOX} !mt-0 gap-[6px] px-[14px] py-[12px]`} style={noticeStyle("var(--warning)")}>
      <p className="m-0 text-[13.5px] font-semibold" style={{ color: "var(--fg)" }}>{head}</p>
      <p className="m-0 text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>{body}</p>
      <p className="m-0 flex flex-wrap items-center gap-x-[12px] font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
        {credit}
        {link ? (
          <button type="button" onClick={onNewRun} className={`flex min-h-[44px] items-center md:min-h-0 ${LINK}`}>{link}</button>
        ) : null}
      </p>
    </div>
  );
}
