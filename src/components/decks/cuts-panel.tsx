"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  cutProposed,
  keepProposedCut,
  readCutsPanel,
  restoreProposedCut,
  runProposedCuts,
  undoProposedCut,
} from "../../app/decks/cuts-actions";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { isPriorResult, isPriorRun, okKeyOf, visitBaseline, type ToolBaseline } from "../../lib/decks/visit";
import { cutsAsk, MAX_CUTS_PER_RUN } from "../../lib/tuning/cuts-ask";
import { cutChips, type Chip } from "../../lib/tuning/cuts-count";
import type { CutItem, CutsPanel } from "../../lib/tuning/cuts-state";
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { awaitRunSettled } from "./await-run";
import { MutationError } from "./mutation-error";
import { usePreviewRow } from "./hover-preview";
import { useReviewRun } from "./review-run";
import { CreditsText } from "../ui/credits-text";
import { useOptimisticVerdict, useVerdictOverrides, VerdictOverridesProvider } from "./use-optimistic-verdict";
import { FailMark } from "../ui/credit-button";
import { CutsBand, CutsFrame, CutsFreeCount, CutsOffer, cutsBlocked, cutsStanding } from "./cuts-free-count";
import { ArtLayer } from "../ui/art-layer";
import { ArrivalOrder } from "../ui/arrival-queue";

/**
 * Proposed cuts (Tuning hub R2, canvas C): the free pass COUNTS and names no card, and Look deeper
 * names the cuts. Mounted on the Analysis tab after Suggested changes, for a deck over 100. It needs
 * no reading: a reading is made of a whole deck and this tool is for one that is over, so the two
 * preconditions exclude each other. It reads its own state on mount and never spends a credit without a press.
 *
 * States, off `CutsPanel` and what the reader just pressed: the count (C1, C5 thin), running (C2),
 * six named (C3), part answered and short (C4), refused (C6, all locked C6c), failed (C7), back to
 * 99 (C8). A result is shown only while the deck still matches the fingerprint it was made
 * against; a cut pressed from it re-chains that fingerprint server-side, so cutting does not bring
 * the offer back and any other edit does (README open 9).
 *
 * The server actions are injectable, so every state is testable without a request.
 */
export type CutsDeps = {
  /** `runId`: a past run History reopened (re-review), read in place of the newest. */
  read: (deckId: string, runId?: string | null) => Promise<CutsPanel | null>;
  run: (deckId: string, opts?: { runId?: string }) => Promise<DeckMutationResult>;
  /** `review`: pressed on a reopened past run, so the server re-checks the card, not the run. */
  cut: (itemId: string, review?: boolean) => Promise<DeckMutationResult>;
  undo: (itemId: string, review?: boolean) => Promise<DeckMutationResult>;
  keep: (itemId: string) => Promise<DeckMutationResult>;
  restore: (itemId: string) => Promise<DeckMutationResult>;
};

const SERVER: CutsDeps = {
  read: readCutsPanel, run: runProposedCuts,
  cut: cutProposed, undo: undoProposedCut, keep: keepProposedCut, restore: restoreProposedCut,
};

const copy = deckCutsCopy.panel;
const WATCH_MS = 3000;
/** The counting frame appears only after this, so a fast read never flashes it. */
const COUNTING_DELAY_MS = 400;

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function CutsPanelView({
  deckId,
  deps = SERVER,
  onSettled,
  revision,
  freshEachVisit = false,
  finishInPlace = false,
}: {
  deckId: string;
  deps?: CutsDeps;
  /** Inside the Tuning hub, where the tool is mounted only while it is open under the hub's tab
   *  row: at the line it always finishes in place (C8, STATES-tuning-hub "Back to 99: finishes in
   *  place in one line; must not vanish mid-view"), whatever retired the result that took it there.
   *  The first analysis writes the overview's Key cards into the result's fingerprint, so a result
   *  cut to 99 stops being current the moment the deck is analyzed; drawing nothing then left the
   *  hub's tab row over an empty panel (Hugh, 2026-10-14). Mounted on its own, a deck at the line
   *  still draws nothing, as before. */
  finishInPlace?: boolean;
  /** Hide a prior visit's result and open on the offer (`lib/decks/visit.ts`). Only where the
   *  prior is still reachable: inside the Tuning hub, beside History. Mounted on its own, the tool
   *  keeps showing its stored result, as it did before the hub. */
  freshEachVisit?: boolean;
  onSettled?: () => void;
  /** Changes whenever an input of the count changes elsewhere on the page (the list, the intent, the
   *  declared bracket), so the panel reads again rather than showing a result for a list that has gone. */
  revision?: string;
}) {
  const [panel, setPanel] = useState<CutsPanel | null>(null);
  // The rows' flips, so the lead and the counts read each answer the moment its row does.
  const overrides = useVerdictOverrides();
  // A past run History reopened here: its cuts are read in place of the newest run's.
  const review = useReviewRun("cuts");
  const reviewRunId = review?.runId ?? null;
  // Set by this panel's own Look deeper: from then on it reads its newest run, at once.
  const leftReview = useRef(false);
  // What was already stored when this visit to the deck began (`lib/decks/visit`, Hugh
  // 2026-10-11): a prior visit's cuts are not drawn and live only in History, and Look deeper
  // over them runs anew. Recorded by the first read that lands, in the same render as its panel,
  // so a prior result never paints once; a run finishing during the visit, or a remount within
  // it, still shows. The ref (the deck it was recorded for) keeps a later read from recording again.
  const [baseline, setBaseline] = useState<ToolBaseline | null>(null);
  const baselineDeck = useRef<string | null>(null);
  const [counting, setCounting] = useState(false);
  // The first read threw: the count failed, which is its own state and never a panel that vanishes
  // or a counting frame that never ends.
  const [loadFailed, setLoadFailed] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [refused, setRefused] = useState<string | null>(null);
  const [announced, setAnnounced] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Each press takes a token, so a superseded press's late answer is never drawn.
  const token = useRef(0);
  const settledRef = useRef(onSettled);
  useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

  // Reads can overlap (the mount's, a watch's, one after each verdict), and a slow one that was
  // ASKED first must not land over a newer answer: only the latest-asked read is drawn.
  const asked = useRef(0);
  // A read landing after the panel has gone (the reader left the deck mid-read) must not open a
  // visit for a deck the reader is no longer on.
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reread = useCallback(async () => {
    const mine = ++asked.current;
    try {
      const next = await deps.read(deckId, leftReview.current ? null : reviewRunId);
      // A reopened past run is not the deck's state on arrival: an ordinary read records the baseline.
      if (next && !next.review && freshEachVisit && mounted.current && baselineDeck.current !== deckId) {
        baselineDeck.current = deckId;
        setBaseline(visitBaseline(deckId, "cuts", {
          okKey: okKeyOf(next.lastOkAt),
          // A pending run is drawn as running, and what it settles to happened during this visit.
          runId: next.run && next.run.status !== "pending" ? next.run.id : null,
        }));
      }
      if (mine === asked.current) {
        setPanel(next);
        setLoadFailed(false);
      }
      return next;
    } catch {
      // A failed read leaves nothing trustworthy to draw: the old count or offer may describe a deck
      // the server has since changed, or hide a run that did finish. Draw the count-failed state.
      if (mine === asked.current) { setLoadFailed(true); setPanel(null); }
      return null;
    }
  }, [deps, deckId, freshEachVisit, reviewRunId]);

  // The first read; `onSettled` tells the tab its opening may finish.
  useEffect(() => {
    const t = setTimeout(() => setCounting(true), COUNTING_DELAY_MS);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading external state on mount, as the other panels do
    void reread().finally(() => { clearTimeout(t); settledRef.current?.(); });
    return () => clearTimeout(t);
  }, [reread]);

  // The page's own edits (a sibling panel's apply, the bracket control, the description) change what
  // the count and a stored result are measured against; read again when the revision moves.
  const seenRevision = useRef(revision);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    void reread();
  }, [revision, reread]);

  // A run begun elsewhere (another tab, a reload mid-run) is re-read until it settles.
  // A reopened past run is drawn over a newer run's pending or failed state, never under it.
  const pendingId = !panel?.review && panel?.run?.status === "pending" ? panel.run.id : null;
  useEffect(() => {
    if (pendingId === null) return;
    const id = setInterval(() => void reread(), WATCH_MS);
    return () => clearInterval(id);
  }, [pendingId, reread]);

  const running = pressing || pendingId !== null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (panel === null && loadFailed) {
    return (
      <section aria-labelledby="cuts-heading" className="mt-[18px] rounded-[11px] px-[14px] py-[16px] md:px-[20px] md:py-[18px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
        <h2 id="cuts-heading" className="flex items-center gap-[9px] font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>
          <FailMark label={copy.failed.tag} />{copy.failed.heading}
        </h2>
        <p className="mt-[6px] text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.failed.body}</p>
      </section>
    );
  }
  if (panel === null) {
    return counting ? (
      <section aria-label={copy.heading} aria-busy className="mt-[18px] rounded-[11px] px-[14px] py-[16px] md:px-[20px] md:py-[18px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
        <h2 className="font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>{copy.heading}</h2>
        <p className="mt-[8px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>{copy.counting}</p>
      </section>
    ) : null;
  }

  const { items, over, run } = panel;
  const answered = items.filter((i) => overrides.verdictOf(i) !== "pending").length;
  const cutCount = items.filter((i) => overrides.verdictOf(i) === "accepted").length;
  // A prior visit's result, and a prior visit's failed run, are hidden: the tool opens on its offer.
  const priorResult = isPriorResult(baseline, okKeyOf(panel.lastOkAt));
  const priorRun = isPriorRun(baseline, run?.id);
  // A reopened past run shows its cuts whatever the list has done since: each is re-checked.
  const reviewing = !!panel.review;
  const resultShown = reviewing ? items.length > 0 : panel.resultCurrent && items.length > 0 && !priorResult;
  // Back to 99: the cuts made from a result took the deck to the line, and it finishes in place.
  if (over === 0 && !finishInPlace && !(resultShown && (cutCount > 0 || reviewing))) return null;

  const failed = !running && !priorRun && !panel.review && run?.status === "failed";
  const refusedRun = failed && run.errorClass === "ungrounded";
  const blocked = cutsBlocked(panel);
  const standing = cutsStanding(panel);

  async function press() {
    if (running || blocked) return;
    const mine = ++token.current;
    if (review) { leftReview.current = true; review.leave?.(); }
    const runId = crypto.randomUUID();
    setPressing(true);
    setStartedAt(Date.now());
    setNow(Date.now());
    setRefused(null);
    setAnnounced(copy.announce.started);
    const request = deps.run(deckId, { runId }).catch(
      (): DeckMutationResult => ({ ok: false, message: deckCutsCopy.run.refused }),
    );
    const result = await request;
    // The action returns once the run is reserved; the server finishes it after the response. Read
    // until it settles (each read also redraws the panel's running state).
    // A panel left behind stops polling; the run is the server's and finishes regardless.
    const waited = result.ok ? await awaitRunSettled(reread, runId, { aborted: () => token.current !== mine || !mounted.current }) : null;
    if (token.current !== mine) return;
    const next = waited ?? await reread();
    if (token.current !== mine) return;
    setPressing(false);
    if (!result.ok) {
      setRefused(result.message);
      setAnnounced(result.message);
      return;
    }
    const ran = next?.run;
    setAnnounced(
      ran?.status === "ok" ? copy.announce.ready(next?.items.length ?? 0)
        : ran?.status === "failed" && ran.errorClass === "ungrounded" ? copy.announce.refused
          : copy.announce.failed,
    );
    headingRef.current?.focus();
  }

  /** Resolves true only when THIS re-read is the one drawn: a newer read asked meanwhile (another
   *  row answered) discards it, and a row must then keep its flip until that newer read lands. */
  async function verdictSettled(announce: string, refusal?: string): Promise<boolean> {
    setAnnounced(announce);
    // A refusal retires the result it was about, which unmounts the row that drew it: so the panel
    // keeps the reason itself, and the next press or answered verdict clears it.
    setRefused(refusal ?? null);
    // `reread` takes its ticket synchronously, so this is the one it will compare against.
    const ticket = asked.current + 1;
    const next = await reread();
    return next !== null && ticket === asked.current;
  }

  // The lead: the over figure in --fg (never --warning), then what the state says next.
  const lead = (() => {
    if (running) return copy.deeper.pendingLead(cutsAsk(over));
    if (resultShown && answered > 0) {
      return copy.leadPart(cutCount, items.filter((i) => overrides.verdictOf(i) === "dismissed").length, items.length, items.length - answered);
    }
    if (resultShown) return copy.leadNamed(items.length);
    if (failed || refusedRun) return copy.leadBare;
    return copy.lead;
  })();

  return (
    <VerdictOverridesProvider value={overrides.value}>
    <CutsFrame
      aria-labelledby="cuts-heading"
      aria-busy={running || undefined}
      className="mt-[18px] md:mt-6"
    >
      <CutsFreeCount
        panel={panel}
        lead={lead}
        cutCount={cutCount}
        headingRef={headingRef}
        onPress={() => void press()}
        band={running ? (
          <CutsBand accent>
            <div className="flex flex-col gap-[10px] md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[13.5px] font-semibold" style={{ color: "var(--fg)" }}>{copy.deeper.pending}</p>
                <p className="mt-[3px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
                  {`${copy.deeper.pendingRead} · ${clock(now - (startedAt ?? (run ? run.createdAt.getTime() : now)))}`}
                </p>
              </div>
            </div>
          </CutsBand>
        ) : failed && !refusedRun ? (
          <CutsBand>
            <h3 className="flex items-center gap-[9px] font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>
              <FailMark label={copy.deeper.failedTag} />{copy.deeper.failedHeading}
            </h3>
            <p className="mt-[6px] text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.deeper.failedBody}</p>
            <CutsOffer panel={panel} variant="retry" blocked={blocked} standing={`${standing} · ${copy.deeper.untouched}`} onPress={() => void press()} />
          </CutsBand>
        ) : refusedRun ? (
          <CutsBand>
            <p className="text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.deeper.refused}</p>
            <CutsOffer panel={panel} variant="offer" blocked={blocked} standing={`${standing} · ${copy.deeper.refusedFoot}`} onPress={() => void press()} />
          </CutsBand>
        ) : panel.allLocked ? (
          <CutsBand><p className="text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.allLocked(panel.commander)}</p></CutsBand>
        ) : !resultShown ? undefined : null}
        after={(
          <>
            {over !== 0 && refused ? <MutationError message={refused} /> : null}
            {resultShown && !running ? (
              <ResultBlock panel={panel} deps={deps} standing={standing} onSettled={verdictSettled} />
            ) : null}
          </>
        )}
        divider={resultShown && !running ? (answered > 0 ? copy.facts.dividerPart : copy.facts.dividerResult) : null}
      />
      <p role="status" className="sr-only">{announced}</p>
    </CutsFrame>
    </VerdictOverridesProvider>
  );
}

function ResultBlock({ panel, deps, standing, onSettled }: {
  panel: CutsPanel; deps: CutsDeps; standing: string; onSettled: (announce: string, refusal?: string) => Promise<boolean>;
}) {
  const { items, asked } = panel;
  const d = copy.deeper;
  // A run that hit the per-run cap leaves the rest of the overage for the next one.
  const more = asked >= MAX_CUTS_PER_RUN ? Math.max(0, panel.over - items.filter((i) => i.verdict !== "accepted").length) : 0;
  const slots = Array.from({ length: Math.max(0, asked - items.length) }, (_, i) => items.length + i + 1);
  const hasRead = panel.itemsReport !== null;
  return (
    <div className="mt-[14px] rounded-[10px] px-[12px] py-[14px] md:px-[14px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[10px]">
        <h3 className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>{d.resultHead(items.length)}</h3>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{d.resultRead}</span>
      </div>
      <ul className="mt-[10px] flex flex-col gap-[8px]">
        <ArrivalOrder>{items.map((item) => (
          <li key={item.id}><CutRow item={item} panel={panel} deps={deps} items={items} onSettled={onSettled} /></li>
        ))}</ArrivalOrder>
        {slots.map((n) => (
          <li key={`short-${n}`} data-testid="short-slot"
            className="flex flex-col gap-[3px] rounded-[9px] px-[12px] py-[10px] md:flex-row md:items-baseline md:justify-between"
            style={{ border: "1px dashed var(--border-dashed)" }}>
            <span className="text-[12.5px]" style={{ color: "var(--fg-muted)" }}>{`– ${d.shortRow(n)}`}</span>
            <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{d.shortWhy}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p data-testid="cuts-more" className="mt-[10px] text-[12.5px]" style={{ color: "var(--fg-muted)" }}>{d.resultMore(more)}</p>
      )}
      <p className="mt-[12px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        <CreditsText text={`${d.resultFoot(items.length, hasRead ? asked : items.length)} · ${standing}`} />
      </p>
    </div>
  );
}

function CutRow({ item, panel, deps, items, onSettled }: {
  item: CutItem; panel: CutsPanel; deps: CutsDeps; items: CutItem[]; onSettled: (announce: string, refusal?: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const { open } = useCardDetail();
  const intent = useCardIntent(item.cutOracleId);
  // Hover and press on the same card, answered or not (Hugh, 2026-10-12): every row that names a card has both. The hover
  // is on the thumbnail and the name ONLY, never the row: the reason below them is prose, and a preview over the row
  // covers the text being read (Hugh, 2026-10-12).
  const previewHandlers = usePreviewRow(item.cutImageUri);
  const openCard = (event: React.MouseEvent<HTMLElement>) =>
    open(item.cutOracleId, items.map((i) => ({ oracleId: i.cutOracleId, name: i.cutName, imageUri: i.cutImageUri })), undefined, { opener: event.currentTarget });

  // The row flips the moment it is pressed; a refusal rolls it back (`useOptimisticVerdict`).
  const optimistic = useOptimisticVerdict(item.verdict, item.id);
  const verdict = optimistic.verdict;
  const TARGET = { cut: "accepted", keep: "dismissed", undo: "pending", restore: "pending" } as const;

  async function answer(kind: "cut" | "undo" | "keep" | "restore") {
    setBusy(kind);
    const reviewing = !!panel.review;
    const result = (await optimistic.press(
      TARGET[kind],
      () => (kind === "cut" || kind === "undo" ? deps[kind](item.id, reviewing) : deps[kind](item.id)),
      copy.refusals.generic,
    )) ?? { ok: false as const, message: copy.refusals.generic };
    // Busy until the follow-up read has replaced this row: a second press in that gap would repeat
    // the verdict and overwrite the answer with a refusal.
    if (!result.ok) {
      // A refusal means the list is not the one this row was named for: read again.
      await onSettled("", result.message);
      setBusy(null);
      return;
    }
    const landed = await onSettled(
      kind === "cut" ? copy.announce.cut(item.cutName)
        : kind === "undo" ? copy.announce.undone(item.cutName)
          : kind === "keep" ? copy.announce.kept : copy.announce.restored,
    );
    // The re-read has landed: the row is now the server's. A read another row's answer superseded
    // was discarded, so the flip holds until the newer read moves this row's server verdict.
    if (landed) optimistic.release();
    setBusy(null);
  }

  if (verdict !== "pending") {
    const done = verdict === "accepted";
    return (
      <div>
        <div
          data-testid={done ? "answered-cut" : "answered-kept"}
          className="flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] py-[9px]"
          style={{ background: done ? "var(--surface)" : "var(--surface-sunken)", border: `1px solid ${done ? "var(--success)" : "var(--border)"}` }}
        >
          {done ? (
            <span aria-hidden className="flex size-[15px] items-center justify-center rounded-[4px] text-[9px]" style={{ border: "1px solid var(--success)", color: "var(--success)" }}>{"✓"}</span>
          ) : null}
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: done ? "var(--success)" : "var(--fg-locked)" }}>
            {done ? copy.cutDone : copy.kept}
          </span>
          <button type="button" onClick={openCard} {...previewHandlers} {...intent} aria-label={item.cutName}
            className={`min-w-0 text-left text-[13px] [border-bottom:1px_dotted_var(--border-strong)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid] ${done ? "line-through [text-decoration-color:var(--fg-locked)] text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}>
            {item.cutName}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void answer(done ? "undo" : "restore")}
            className="ml-auto min-h-[32px] rounded-[7px] px-[11px] py-[6px] text-[12px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] transition-colors">
            {done ? copy.undo : copy.showAgain}
          </button>
        </div>
      </div>
    );
  }

  // A reopened past run's cut the deck has moved past: drawn, never offered (re-review).
  if (panel.review && (item.inDeck === false || item.locked === true)) {
    return (
      <div
        data-testid="answered-broken"
        className="flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] py-[9px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
      >
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>
          {deckTuningCopy.lists.noLongerApplies}
        </span>
        <span className="min-w-0 text-[13px]" style={{ color: "var(--fg-faint)" }}>
          {item.inDeck === false ? deckTuningCopy.lists.cutGone(item.cutName) : lockedCardsCopy.tuning.cutLocked(item.cutName)}
        </span>
      </div>
    );
  }

  const chips: Chip[] = cutChips(item.evidence, item.reason, panel.chips);
  return (
    <article aria-label={item.cutName} className="flex flex-col gap-[9px] rounded-[9px] px-[12px] py-[11px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-[9px] md:flex-row md:items-center md:justify-between md:gap-[12px]">
        <span className="flex min-w-0 items-center gap-[10px]">
          <span className="w-[86px] flex-none rounded-full px-[8px] py-[2px] text-center font-mono text-[9px] uppercase tracking-[0.1em]"
            style={{ color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>{copy.suggestion}</span>
          <span aria-hidden {...previewHandlers} className="relative h-[31px] w-[22px] flex-none overflow-hidden rounded-[3px] [border:1px_solid_var(--border-strong)]">
            {item.cutImageUri ? <ArtLayer src={item.cutImageUri} /> : null}
          </span>
          <button type="button" onClick={openCard} {...previewHandlers} {...intent} aria-label={item.cutName}
            className="min-w-0 text-left text-[13px] font-semibold text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid]">
            {item.cutName}
          </button>
        </span>
        <span className="flex gap-[8px] md:flex-none md:gap-[7px]">
          <button type="button" disabled={busy !== null} onClick={() => void answer("cut")}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-semibold text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] md:h-auto md:flex-none md:rounded-[7px] md:px-[13px] md:py-[6px] md:text-[12.5px] transition-colors">
            {copy.cut}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void answer("keep")}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] md:h-auto md:flex-none md:rounded-[7px] md:px-[12px] md:py-[6px] md:text-[12.5px] transition-colors">
            {copy.keep}
          </button>
        </span>
      </div>
      <p className="text-[12.5px] leading-[1.5] md:pl-[96px]" style={{ color: "var(--fg-body)" }}>{item.reason}</p>
      <ul className="flex flex-wrap gap-[6px] md:pl-[96px] md:gap-[5px]">
        {chips.map((c) => (
          <li key={c.key} className="flex items-baseline gap-[5px] rounded-[5px] px-[7px] py-[3px] font-mono text-[9.5px]"
            style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
            <span className="uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{c.kind}</span>
            <span style={{ color: "var(--fg-muted)" }}>{c.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
