"use client";

// Suggested changes v2's intake (handoff `design_handoff_the99_suggested_changes_v2`, Intake board; plan 2026-10-27, UI
// PR 5): the lead and three numbered steps, every one in view, sent by the panel's one Suggest changes press. Step 1 is
// the count, 1 to 20; step 2 the request box (never pre-filled), the "What we noticed" chips wrapped under it at both
// widths and the Bracket card (beside the box on desktop, the box growing to its height; under the chips on a phone);
// step 3 the shipped Kept for this deck box, unchanged. Controlled: the panel holds every value, so its press reads what
// is on screen, and a drift off 99 keeps all of it.

import { useEffect, useState, type ReactNode } from "react";

import { localDay } from "../../lib/copy/credits";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { plainText } from "../../lib/decks/notes-body";
import { countCharacters } from "../../lib/text/count-characters";
import { askFor, MAX_COUNT, MIN_COUNT } from "../../lib/tuning/v2/count";
import { appendSentence, removeSentence, type BracketCard, type NoticedChip } from "../../lib/tuning/v2/intake";
import { CountStepper } from "../ui/count-stepper";
import { BracketMark } from "./bracket-mark";
import { HIGHLIGHT_MS, TuningNotesField, type HighlightTail } from "./tuning-notes-field";

const copy = suggestedChangesV2Copy.intake;
const REQUEST_MAX = deckDescriptionCopy.notes.maxLength;

/** Clamped into the count's range; a typed figure outside it lands on the nearer end. */
export function clampCount(n: number): number {
  return Number.isFinite(n) ? Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(n))) : MIN_COUNT;
}

export function SuggestedChangesIntake({
  count,
  onCount,
  request,
  onRequest,
  chips,
  bracket,
  bracketIndex,
  onBracket,
  restrictions,
}: {
  count: number;
  onCount: (n: number) => void;
  /** The request's body (a tag as `[[id|Name]]`), as the box's own value. */
  request: string;
  onRequest: (next: string) => void;
  chips: readonly NoticedChip[];
  /** The Bracket card for the deck's reading; null draws none. */
  bracket: BracketCard | null;
  bracketIndex: number;
  onBracket: (index: number) => void;
  /** Step 3's body: the shipped Kept for this deck box, mounted by the panel that saves it. */
  restrictions: ReactNode;
}) {
  const [tail, setTail] = useState<HighlightTail | null>(null);
  // The chip just tapped wears the accent ring for the same beat its words stay highlighted in the box.
  const [hot, setHot] = useState<string | null>(null);
  useEffect(() => {
    if (hot === null) return;
    const off = setTimeout(() => setHot(null), HIGHLIGHT_MS);
    return () => clearTimeout(off);
  }, [hot, tail]);
  const tap = (chip: NoticedChip) => {
    // A ✓ chip toggles off: its own sentence leaves the box (Intake board C's two states, + and ✓).
    const removed = removeSentence(request, chip.sentence);
    if (removed) {
      onRequest(removed.next);
      setHot(null);
      return;
    }
    const room = REQUEST_MAX - countCharacters(plainText(request));
    const appended = appendSentence(request, chip.sentence, room);
    if (!appended) return;
    onRequest(appended.next);
    setTail((t) => ({ length: chip.sentence.length, nonce: (t?.nonce ?? 0) + 1 }));
    setHot(chip.id);
  };
  const line = copy.count.line(count, askFor(count));
  // The board sets the count's own sentence ("3 in, 3 out.") in the strong ink and the pool after it in the body's.
  const split = line.indexOf(". ");
  const atMax = count >= MAX_COUNT;
  const chosen = bracket ? bracket.options[Math.min(bracketIndex, bracket.options.length - 1)] : null;

  return (
    <div data-sc-intake="" className="flex flex-col gap-[16px] md:gap-[18px]">
      <p className="text-[12.5px] leading-[1.6] md:text-[13.5px]" style={{ color: "var(--fg-body)" }}>{copy.lead}</p>
      <ol className="flex flex-col gap-[18px] md:gap-[20px]">
        <Step n={1} title={copy.count.title} sub={copy.count.sub}>
          <div className="flex flex-col gap-[10px] md:flex-row md:items-center md:gap-[14px]">
            <span data-sc-stepper="" className="inline-flex w-fit">
              <CountStepper
                layout="row"
                size="cell"
                count={count}
                fewerLabel={copy.count.fewer}
                moreLabel={copy.count.more}
                countLabel={copy.count.countLabel}
                onStep={(d) => onCount(clampCount(count + d))}
                onType={(n) => onCount(clampCount(n))}
                fewerOff={count <= MIN_COUNT}
                moreOff={atMax}
              />
            </span>
            <p className="text-[12.5px] leading-[1.5] md:text-[13px]" style={{ color: "var(--fg-body)" }}>
              <span className="font-semibold" style={{ color: "var(--fg)" }}>{split > 0 ? line.slice(0, split + 1) : line}</span>
              {split > 0 ? line.slice(split + 1) : null}
              <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
                {" · "}{atMax ? copy.count.atMax : copy.count.range}
              </span>
            </p>
          </div>
        </Step>
        <Step n={2} title={copy.request.title}>
          <div className="flex flex-col gap-[14px] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,330px)] md:gap-x-[12px] md:gap-y-[14px] md:[grid-template-areas:'box_bracket'_'chips_chips']">
            <div className="md:[grid-area:box]">
              <TuningNotesField
                id="sc-request-field"
                value={request}
                onChange={onRequest}
                label={copy.request.title}
                placeholder={copy.request.placeholder}
                fill
                highlightTail={tail}
              />
            </div>
            {chips.length > 0 ? (
              <div data-sc-noticed="" className="flex flex-col gap-[8px] md:[grid-area:chips]">
                <h4 className="font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{copy.noticed.head}</h4>
                <p className="text-[12px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>{copy.noticed.help}</p>
                <ul className="flex flex-wrap gap-[6px]">
                  {chips.map((chip) => (
                    <li key={chip.id}>
                      <Chip chip={chip} inBox={request.includes(chip.sentence)} hot={hot === chip.id} onTap={() => tap(chip)} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {bracket && chosen ? (
              <div
                data-sc-bracket=""
                className="flex flex-col gap-[9px] rounded-[10px] p-[12px] md:[grid-area:bracket]"
                style={{ background: "var(--surface-rail)", border: "1px solid var(--border-strong)" }}
              >
                <p className="flex items-baseline gap-[8px]">
                  <span id="sc-bracket-head" className="text-[13px] font-semibold" style={{ color: "var(--fg)" }}>{copy.bracket.head}</span>
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{bracket.now}</span>
                </p>
                <div role="group" aria-labelledby="sc-bracket-head" className="grid grid-cols-2 gap-[6px]">
                  {bracket.options.map((o, i) => {
                    const on = o === chosen;
                    return (
                      <button
                        key={`${o.choice}:${o.target}`}
                        type="button"
                        aria-pressed={on}
                        data-sc-bracket-choice={`${o.choice}:${o.target}`}
                        onClick={() => onBracket(i)}
                        className={`flex min-h-[44px] items-center gap-[7px] rounded-[8px] border border-solid py-[4px] pr-[10px] pl-[6px] text-left text-[12.5px] leading-[1.3] ${
                          on
                            ? "border-[color:var(--accent)] bg-[color:var(--elevated)] font-semibold text-[color:var(--fg)]"
                            : "border-[color:var(--border)] bg-[color:var(--surface-sunken)] font-normal text-[color:var(--fg-muted)] hover:text-[color:var(--fg-body)]"
                        }`}
                      >
                        <BracketMark bracket={o.mark} px={20} />
                        <span>{o.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p data-sc-bracket-note="" className="text-[12px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>{chosen.note}</p>
              </div>
            ) : null}
          </div>
        </Step>
        <Step n={3} title={copy.restrictions.title} sub={copy.restrictions.sub}>
          {restrictions}
        </Step>
      </ol>
    </div>
  );
}

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-[10px]" data-sc-step={n}>
      <div className="flex flex-col gap-[2px] md:flex-row md:items-baseline md:gap-[9px]">
        <h3 className="flex items-baseline gap-[9px] text-[14px] font-semibold" style={{ color: "var(--fg)" }}>
          <span aria-hidden="true" className="font-mono text-[11px] font-semibold" style={{ color: "var(--accent-text)" }}>{n}</span>
          {title}
        </h3>
        {sub ? <span className="pl-[20px] font-mono text-[10.5px] md:pl-0" style={{ color: "var(--fg-faint)" }}>{sub}</span> : null}
      </div>
      {children}
    </li>
  );
}

/** A sentence-led line split at its first sentence, for a box that sets that sentence as its title (the drift line's
 *  "The deck is at 98 now.", the confirm's "Same request as your Oct 26 run"). Never restates the copy. */
export function leadSentence(text: string, at: ". " | ", "): [string, string] {
  const i = text.indexOf(at);
  return i < 0 ? [text, ""] : [text.slice(0, i + 1), text.slice(i + 1)];
}

/** The two v2 notice boxes' shared skin (the board's `.drift` and `.same`): the drift line's edge is the warning, the
 *  same-request confirm's the accent. */
export const NOTICE_BOX = "mt-[16px] flex flex-col rounded-[10px] md:mt-[18px]";
export const noticeStyle = (edge: "var(--warning)" | "var(--accent)") =>
  ({ background: "var(--elevated-hover)", border: "1px solid var(--border-strong)", borderLeft: `3px solid ${edge}` }) as const;
/** The board's `.lk`: an accent mono link with a quiet underline. */
export const LINK = "text-[color:var(--accent-text)] underline underline-offset-[4px] decoration-[color:var(--accent-shadow)]";

/**
 * The deck drifted off 99 with the intake open (Not-At-99 C): Send is off, and this says the count and links the tool
 * that fixes it. The request, count, chips and bracket choice are all kept; back at 99, Send comes back on.
 */
export function DriftLine({ at, over, onTopOff, onProposedCuts }: { at: number; over: number; onTopOff?: () => void; onProposedCuts?: () => void }) {
  const [title, rest] = leadSentence(copy.drift(at), ". ");
  const under = over < 0;
  const go = under ? onTopOff : onProposedCuts;
  return (
    <div data-sc-drift="" className={`${NOTICE_BOX} gap-[4px] px-[14px] py-[11px]`} style={noticeStyle("var(--warning)")}>
      <p className="text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
        <span className="block font-semibold" style={{ color: "var(--fg)" }}>{title}</span>
        {rest.trim()}
      </p>
      {go ? (
        <button type="button" onClick={go} className={`flex min-h-[44px] w-fit items-center font-mono text-[11px] md:min-h-0 ${LINK}`}>
          {under ? suggestedChangesV2Copy.tile.topOff : suggestedChangesV2Copy.tile.proposedCuts}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Same inputs on an unchanged list ask once before spending (Intake board D; spec §8): nothing was reserved by the press
 * that asked. `Run it again` presses with `confirmed`; `Open Oct 26’s run` reopens that run read-only as History does,
 * and is drawn only where History is (the Tuning hub).
 */
export function SameRequestConfirm({ at, onAgain, onOpen, againOff = false }: {
  at: string; onAgain: () => void; onOpen: (() => void) | null;
  /** The deck is off 99: a run would be refused, so `Run it again` is held off with Send (the drift line says why). */
  againOff?: boolean;
}) {
  const date = localDay(new Date(at));
  const same = copy.same;
  const [lead, rest] = leadSentence(same.body(date), ", ");
  const head = lead.replace(/,$/, "");
  return (
    <div data-sc-same="" role="group" aria-label={head} className={`${NOTICE_BOX} gap-[10px] px-[14px] py-[12px]`} style={noticeStyle("var(--accent)")}>
      <p className="text-[13px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
        <span className="font-semibold" style={{ color: "var(--fg)" }}>{head}</span>
        {`,${rest}`}
      </p>
      <div className="grid grid-cols-2 gap-[8px] md:flex">
        <button
          type="button"
          onClick={againOff ? undefined : onAgain}
          aria-disabled={againOff || undefined}
          className={`h-[44px] rounded-[8px] border border-solid px-[16px] text-[13px] font-semibold md:h-[40px] ${
            againOff
              ? "cursor-default border-[color:var(--border-strong)] text-[color:var(--fg-disabled)]"
              : "border-[color:var(--accent)] text-[color:var(--accent-text)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
          }`}
        >
          {same.again}
        </button>
        {onOpen ? (
          <button type="button" onClick={onOpen} className="h-[44px] rounded-[8px] border border-solid border-[color:var(--border-strong)] px-[16px] text-[13px] font-medium text-[color:var(--fg-body)] hover:text-[color:var(--fg)] md:h-[40px]">
            {same.open(date)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The intake's foot (Intake board A): under a hairline, what the run reads besides the player's words, in the spec's
 * order (the overview, the focus, the description, the games), and the way to the last run in History. A part the deck
 * lacks is left out; with none the sentence is not drawn, and the link only with a last run and a History to open.
 */
export function IntakeReads({ parts, lastRun, onHistory }: { parts: readonly string[]; lastRun: string | null; onHistory: (() => void) | null }) {
  const link = lastRun !== null && onHistory !== null;
  if (parts.length === 0 && !link) return null;
  return (
    <p
      data-sc-reads=""
      className="mt-[16px] pt-[12px] font-mono text-[10.5px] leading-[1.6] md:mt-[18px]"
      style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
    >
      {parts.length > 0 ? (
        <>
          {copy.reads}{" "}
          {parts.map((part, i) => (
            <span key={part}>
              {i > 0 ? " · " : null}
              <strong className="font-medium" style={{ color: "var(--fg-muted)" }}>{part}</strong>
            </span>
          ))}
          {copy.reads2}
        </>
      ) : null}
      {link ? (
        <>
          {parts.length > 0 ? " " : null}
          <button
            type="button"
            data-sc-last-run=""
            onClick={onHistory}
            className={`inline-flex min-h-[44px] items-center md:min-h-0 ${LINK}`}
          >
            {copy.lastRun(lastRun)}
          </button>
        </>
      ) : null}
    </p>
  );
}

/** A "What we noticed" chip: its kind, its words and figure, and + until its own sentence is in the box, then dashed
 *  with ✓ (Intake board C); a second tap takes the sentence back out. It tracks its own sentence and no other. */
function Chip({ chip, inBox, hot, onTap }: { chip: NoticedChip; inBox: boolean; hot: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={inBox}
      data-sc-chip={chip.id}
      onClick={onTap}
      data-hot={hot || undefined}
      className={`flex min-h-[44px] items-center gap-[8px] rounded-[9px] border border-[color:var(--border-strong)] px-[10px] py-[6px] text-left text-[12.5px] leading-[1.35] md:min-h-[40px] ${
        inBox ? "border-dashed bg-transparent text-[color:var(--fg-faint)]" : "border-solid bg-[color:var(--surface-sunken)] text-[color:var(--fg-body)]"
      } ${hot ? "shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_45%,transparent)]" : ""}`}
    >
      <span className="flex-none font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{copy.noticed.kinds[chip.kind]}</span>
      <span>
        {chip.text}
        {chip.meta ? <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{" · "}{chip.meta}</span> : null}
      </span>
      <span aria-hidden="true" className={`ml-auto flex-none pl-[4px] font-mono ${inBox ? "text-[12px]" : "text-[14px]"}`} style={{ color: inBox ? "var(--success)" : "var(--accent-text)" }}>{inBox ? "✓" : "+"}</span>
    </button>
  );
}
