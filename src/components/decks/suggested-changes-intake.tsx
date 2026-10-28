"use client";

// Suggested changes v2's intake (handoff `design_handoff_the99_suggested_changes_v2`, Intake board; plan 2026-10-27, UI
// PR 5): the lead and three numbered steps, every one in view, sent by the panel's one Suggest changes press. Step 1 is
// the count, 1 to 20; step 2 the request box (never pre-filled), the "What we noticed" chips wrapped under it at both
// widths and the Bracket card (beside the box on desktop, the box growing to its height; under the chips on a phone);
// step 3 the shipped Kept for this deck box, unchanged. Controlled: the panel holds every value, so its press reads what
// is on screen, and a drift off 99 keeps all of it.

import { useState, type ReactNode } from "react";

import { localDay } from "../../lib/copy/credits";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { plainText } from "../../lib/decks/notes-body";
import { countCharacters } from "../../lib/text/count-characters";
import { askFor, MAX_COUNT, MIN_COUNT } from "../../lib/tuning/v2/count";
import { appendSentence, type BracketCard, type NoticedChip } from "../../lib/tuning/v2/intake";
import { CountStepper } from "../ui/count-stepper";
import { BracketMark } from "./bracket-mark";
import { TuningNotesField, type HighlightTail } from "./tuning-notes-field";

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
  const tap = (chip: NoticedChip) => {
    const room = REQUEST_MAX - countCharacters(plainText(request));
    const appended = appendSentence(request, chip.sentence, room);
    if (!appended) return;
    onRequest(appended.next);
    setTail((t) => ({ length: chip.sentence.length, nonce: (t?.nonce ?? 0) + 1 }));
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
                tagHelp={copy.request.tagHelp}
                framed
                fill
                highlightTail={tail}
              />
            </div>
            {chips.length > 0 ? (
              <div data-sc-noticed="" className="flex flex-col gap-[6px] md:[grid-area:chips]">
                <h4 className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{copy.noticed.head}</h4>
                <p className="text-[12px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>{copy.noticed.help}</p>
                <ul className="mt-[4px] flex flex-wrap gap-[8px]">
                  {chips.map((chip) => (
                    <li key={chip.id}>
                      <Chip chip={chip} inBox={request.includes(chip.sentence)} onTap={() => tap(chip)} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {bracket && chosen ? (
              <div
                data-sc-bracket=""
                className="flex flex-col gap-[10px] rounded-[10px] px-[12px] py-[12px] md:[grid-area:bracket]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
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
                        className={`flex min-h-[44px] items-center gap-[8px] rounded-[8px] border border-solid px-[9px] py-[6px] text-left text-[12px] leading-[1.3] md:min-h-[36px] ${
                          on
                            ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_8%,transparent)] font-semibold text-[color:var(--fg)]"
                            : "border-[color:var(--border)] bg-transparent font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg-body)]"
                        }`}
                      >
                        <BracketMark bracket={o.mark} px={22} />
                        <span>{o.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p data-sc-bracket-note="" className="text-[12px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>{chosen.note}</p>
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
      <div className="flex flex-col gap-[2px] md:flex-row md:items-baseline md:gap-[10px]">
        <h3 className="flex items-baseline gap-[8px] text-[13.5px] font-semibold md:text-[14px]" style={{ color: "var(--fg)" }}>
          <span aria-hidden="true" className="font-mono text-[11px]" style={{ color: "var(--accent-text)" }}>{n}</span>
          {title}
        </h3>
        {sub ? <span className="pl-[18px] font-mono text-[10.5px] md:pl-0" style={{ color: "var(--fg-faint)" }}>{sub}</span> : null}
      </div>
      {children}
    </li>
  );
}

/** A sentence-led line split at its first sentence, for a box that sets that sentence as its title (the drift line's
 *  "The deck is at 98 now.", the confirm's "Same request as your Oct 26 run"). Never restates the copy. */
function leadSentence(text: string, at: ". " | ", "): [string, string] {
  const i = text.indexOf(at);
  return i < 0 ? [text, ""] : [text.slice(0, i + 1), text.slice(i + 1)];
}

/** The warn-edged box both v2 boxes share (Intake board D, Not-At-99 C). */
const WARN_BOX = "mt-[16px] flex flex-col gap-[8px] rounded-[10px] px-[14px] py-[12px] md:mt-[18px]";
const warnBoxStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "3px solid var(--warning)" } as const;

/**
 * The deck drifted off 99 with the intake open (Not-At-99 C): Send is off, and this says the count and links the tool
 * that fixes it. The request, count, chips and bracket choice are all kept; back at 99, Send comes back on.
 */
export function DriftLine({ at, over, onTopOff, onProposedCuts }: { at: number; over: number; onTopOff?: () => void; onProposedCuts?: () => void }) {
  const [title, rest] = leadSentence(copy.drift(at), ". ");
  const under = over < 0;
  const go = under ? onTopOff : onProposedCuts;
  return (
    <div data-sc-drift="" className={WARN_BOX} style={warnBoxStyle}>
      <p className="text-[12.5px] leading-[1.55] md:text-[13px]" style={{ color: "var(--fg-body)" }}>
        <span className="block font-semibold" style={{ color: "var(--fg)" }}>{title}</span>
        {rest.trim()}
      </p>
      {go ? (
        <button type="button" onClick={go} className="flex min-h-[44px] w-fit items-center font-mono text-[11px] text-[color:var(--accent-text)] underline underline-offset-[3px] md:min-h-0">
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
export function SameRequestConfirm({ at, onAgain, onOpen }: { at: string; onAgain: () => void; onOpen: (() => void) | null }) {
  const date = localDay(new Date(at));
  const same = copy.same;
  const [lead, rest] = leadSentence(same.body(date), ", ");
  const head = lead.replace(/,$/, "");
  return (
    <div data-sc-same="" role="group" aria-label={head} className={WARN_BOX} style={warnBoxStyle}>
      <p className="text-[12.5px] leading-[1.55] md:text-[13px]" style={{ color: "var(--fg-body)" }}>
        <span className="font-semibold" style={{ color: "var(--fg)" }}>{head}</span>
        {`,${rest}`}
      </p>
      <div className="grid grid-cols-2 gap-[8px] md:flex md:gap-[10px]">
        <button type="button" onClick={onAgain} className="h-[44px] rounded-[8px] border border-solid border-[color:var(--accent)] px-[16px] text-[13px] font-semibold text-[color:var(--accent-text)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] md:h-[36px]">
          {same.again}
        </button>
        {onOpen ? (
          <button type="button" onClick={onOpen} className="h-[44px] rounded-[8px] border border-solid border-[color:var(--border-strong)] px-[16px] text-[13px] font-medium text-[color:var(--fg-body)] hover:text-[color:var(--fg)] md:h-[36px]">
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
      className="mt-[16px] pt-[12px] font-mono text-[9.5px] leading-[1.6] md:mt-[18px] md:text-[10.5px]"
      style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
    >
      {parts.length > 0 ? (
        <>
          {copy.reads}{" "}
          {parts.map((part, i) => (
            <span key={part}>
              {i > 0 ? " · " : null}
              <strong className="font-semibold" style={{ color: "var(--fg-body)" }}>{part}</strong>
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
            className="inline-flex min-h-[44px] items-center text-[color:var(--accent-text)] underline underline-offset-[3px] md:min-h-0"
          >
            {copy.lastRun(lastRun)}
          </button>
        </>
      ) : null}
    </p>
  );
}

/** A "What we noticed" chip: its kind, its words and figure, and + until its own sentence is in the box, then dashed
 *  with ✓ (Intake board C). It tracks its own sentence and no other. */
function Chip({ chip, inBox, onTap }: { chip: NoticedChip; inBox: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={inBox}
      data-sc-chip={chip.id}
      onClick={inBox ? undefined : onTap}
      className={`flex min-h-[44px] items-center gap-[8px] rounded-[8px] border px-[10px] py-[6px] text-left text-[12.5px] text-[color:var(--fg)] md:min-h-[34px] ${
        inBox ? "border-dashed border-[color:var(--border-dashed)] bg-transparent" : "border-solid border-[color:var(--border)] bg-[color:var(--surface)]"
      }`}
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: "var(--fg-faint)" }}>{copy.noticed.kinds[chip.kind]}</span>
      <span>
        {chip.text}
        {chip.meta ? <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{" · "}{chip.meta}</span> : null}
      </span>
      <span aria-hidden="true" className="font-mono text-[13px]" style={{ color: inBox ? "var(--success)" : "var(--accent-text)" }}>{inBox ? "✓" : "+"}</span>
    </button>
  );
}
