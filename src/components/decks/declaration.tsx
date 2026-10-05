"use client";

import type { CSSProperties, ReactNode } from "react";

import type { DeclarationAsk } from "../../lib/bracket/declaration-ask";
import type { VersionComparison } from "../../lib/bracket/version-reading";
import type { Bracket } from "../../lib/bracket/types";
import { BRACKET_NAMES, bracketPhrase } from "../../lib/copy/deck-analysis";
import { declarationCopy } from "../../lib/copy/declaration";
import { BracketMark, bracketInk } from "./bracket-mark";

/**
 * What the verdict block needs to draw a declaration, and to take one.
 *
 * THE ANSWER IS HELD BY THE SHELL, not here. The card note on the Consider tile and the top-off
 * list read the same declaration, so a player who answers here and then opens Consider must see
 * the answer they just gave — which one owner guarantees and a copy in this component would not.
 */
export type DeclarationControl = {
  /** The deck's live answer: `decks.declared_bracket`. Null is UNANSWERED and nothing else. */
  declared: Bracket | null;
  /**
   * The committed version this deck state IS, or null on a draft or a brew.
   *
   * Drives the one conditional clause the answered sentence has: `for version n` names a
   * version only when the tab is showing one. A draft with edits is not version n, and saying
   * so is the error Round 3's R5 made in prose.
   */
  version: number | null;
  /**
   * The version before the one this deck IS, with what it recorded — or null on a draft, a
   * brew, or a first version. Only a committed, unedited deck has a reading to set beside it.
   */
  previous: { number: number; permits: readonly Bracket[] | null; declared: Bracket | null } | null;
  onDeclare: (bracket: Bracket) => void;
  /** The last write was refused, and the answer on screen was put back. */
  refused: boolean;
};

/**
 * The declaration's section of the verdict block: the ask, the answer, or the drift line.
 *
 * EVERY READING COMES FROM `declarationAsk`. This component draws the kind it is handed and never
 * compares `declared` against `permits` itself — the rule's own header says why a component
 * holding that comparison is a second copy of it.
 *
 * NO SKIP, NO SELECTED STATE, NO THIRD AFFORDANCE. Two chips are the whole control, and the
 * answer REPLACES the row rather than lighting a chip in it (§B).
 *
 * `null` for a single bracket that nothing was declared against: it is not a question, so there
 * is no line at all — not an empty box, not a hairline with nothing under it.
 */
export function DeclarationSection({
  ask,
  control,
  onChange,
  comparison,
}: {
  ask: DeclarationAsk;
  control: DeclarationControl;
  /** `change`: re-open the ask. The verdict block holds it, because the face changes with it. */
  onChange: () => void;
  /**
   * How this version reads beside the last one, when the deck IS a committed version with a
   * predecessor. Absent on a draft: a draft is one moving reading, and there is no second one to
   * compare it with.
   */
  comparison?: { reading: VersionComparison; previousNumber: number } | null;
}) {
  const answer = ask.kind === "answered" ? (
    <p className="text-[12.5px] leading-[1.6] text-[color:var(--fg-body)] md:text-[13px]">
      <DeclaredLine declared={ask.declared} version={control.version} />{" "}
      <button
        type="button"
        onClick={onChange}
        className="cursor-pointer border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)] font-mono text-[10.5px] text-[color:var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
      >
        {declarationCopy.declared.change}
      </button>
    </p>
  ) : null;
  const asking =
    ask.kind === "ask" || (ask.kind === "drifted" && ask.stillAsking) ? (
      <Ask permits={ask.permits} onChoose={control.onDeclare} refused={control.refused} />
    ) : null;

  // §E WINS. A commit refuses to copy a declaration its cards do not permit, so the version row
  // and the draft's drift line are both true after one — and say the same thing in two voices.
  // The row is the stronger statement (the old answer, the new reading), so the drift line is
  // suppressed and whatever the reading still owes follows inside the row's box.
  if (comparison?.reading.changed) {
    const owed = answer ?? asking;
    return (
      <Box>
        <VersionRow reading={comparison.reading} previousNumber={comparison.previousNumber} />
        {owed ? (
          <div className="mt-0.5 flex flex-col gap-[9px] border-t border-[color:var(--border)] pt-[11px]">
            {owed}
            {answer && control.refused ? <Refused /> : null}
          </div>
        ) : null}
      </Box>
    );
  }

  if (ask.kind === "none") return null;

  if (answer) {
    return (
      <Box>
        {answer}
        {/* A refused CHANGE lands here: the previous answer is back, and says why. */}
        {control.refused ? <Refused /> : null}
      </Box>
    );
  }

  if (ask.kind === "drifted") {
    return (
      <Box gap="gap-[10px]">
        {/*
          STATED, NOT DELETED. The superseded answer keeps its mark, faint, at the chip size on
          both widths — it is a record, not a control, and scaling it up at 390 would promote it.

          `dim`, NOT THE CANVAS'S 0.45. The verdict addendum's ruling 3 (#861) holds every bracket
          mark at 3:1 as the graphic it is, and `DIM_OPACITY` is the one faint strength measured
          to clear it; 0.45 is the figure that ruling retired.
        */}
        <div className="flex items-center gap-[9px]">
          <BracketMark bracket={ask.declared} px={22} dim />
          <p className="text-[12px] leading-[1.5] text-[color:var(--fg-faint)] md:text-[12.5px]">
            {declarationCopy.draftMovedOut.line(ask.declared)}
          </p>
        </div>
        {/* The question changed, so it is asked. On a single bracket there is nothing to ask. */}
        {asking}
      </Box>
    );
  }

  // `ask` — including an answered range whose `change` was pressed, which the block hands
  // over as the same range asked again.
  return <Box>{asking}</Box>;
}

/**
 * `version 1 → this version`, and one sentence. NO CONTROL, NO DIRECTION, NO ALARM.
 *
 * The arrow is TIME and nothing else: never flipped, rotated or recoloured for a deck tuned
 * down, because a comparison of two readings has no direction to be wrong about.
 *
 * The marks are decoration for the sentence beside them, which says everything they say, so the
 * row is hidden from assistive technology and the sentence carries it.
 */
function VersionRow({
  reading,
  previousNumber,
}: {
  reading: VersionComparison;
  previousNumber: number;
}) {
  const copy = declarationCopy.versionChange;
  if (reading.was.kind !== "read") return null;
  const was = reading.was.reading;
  const now = reading.now;
  const phrase = bracketPhrase(now.permits);
  const flat = copy.line(
    { phrase, isRange: now.split },
    { version: previousNumber, phrase: bracketPhrase(was.permits), declared: was.declared },
  );
  // The CURRENT reading carries the weight; the now-sentence comes first, so its phrase is the
  // first occurrence.
  const at = flat.indexOf(phrase);
  return (
    <>
      <div aria-hidden="true" className="flex items-end gap-[10px]">
        <MarkColumn
          // The previous side draws what was DECLARED for it when anything was — that is the
          // record a later version reads against — and its reading otherwise.
          brackets={was.declared !== null ? [was.declared] : was.permits}
          label={copy.markLabelPrevious(previousNumber)}
        />
        <span className="pb-[13px] font-mono text-[13px] text-[color:var(--fg-faint)]">→</span>
        <MarkColumn brackets={now.permits} label={copy.markLabelCurrent} />
      </div>
      <p className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
        {flat.slice(0, at)}
        <b className="font-semibold text-[color:var(--fg)]">{phrase}</b>
        {flat.slice(at + phrase.length)}
      </p>
    </>
  );
}

function MarkColumn({ brackets, label }: { brackets: readonly Bracket[]; label: string }) {
  return (
    <span className="inline-flex flex-col items-center gap-[3px]">
      <span className="flex items-center gap-0.5">
        {brackets.map((b, i) => (
          // A range's upper member DIMMED, through the mark's own `dim` so it takes the one
          // opacity the theme contract holds at 3:1. The handoff drew 0.5 here, before the
          // verdict addendum's ruling 3 set the dimmed member's floor.
          <span key={b} className="flex">
            <BracketMark bracket={b} px={24} dim={i > 0} />
          </span>
        ))}
      </span>
      <span className="font-mono text-[8px] leading-none uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
        {label}
      </span>
    </span>
  );
}

/** The section's hairline box, shared by every declaration reading. */
function Box({ children, gap = "gap-[9px]" }: { children: ReactNode; gap?: string }) {
  return (
    <div
      className={`mt-3 flex flex-col ${gap} border-t border-[color:var(--border)] pt-[11px] md:mt-[13px] md:pt-3`}
    >
      {children}
    </div>
  );
}

/**
 * `Declared Optimized.` with the name at weight — split here rather than in the copy module,
 * which returns the flat sentence the copy guard reads. The name is the only run that changes.
 */
function DeclaredLine({ declared, version }: { declared: Bracket; version: number | null }) {
  const flat = declarationCopy.declared.line(declared, version);
  const name = BRACKET_NAMES[declared];
  const at = flat.indexOf(name);
  return (
    <>
      {flat.slice(0, at)}
      <b className="font-semibold text-[color:var(--fg)]">{name}</b>
      {flat.slice(at + name.length)}
    </>
  );
}

function Ask({
  permits,
  onChoose,
  refused,
}: {
  permits: readonly Bracket[];
  onChoose: (bracket: Bracket) => void;
  refused: boolean;
}) {
  return (
    <div className="flex flex-col gap-[9px]">
      <p className="text-[11.5px] leading-[1.5] text-[color:var(--fg-faint)]">
        {declarationCopy.ask.lead}
      </p>
      <div
        role="group"
        aria-label={declarationCopy.ask.groupAria}
        className="flex gap-2 md:flex-wrap md:items-center"
      >
        {permits.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChoose(b)}
            style={{ "--chip-ink": bracketInk(b) } as CSSProperties}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[color:color-mix(in_oklab,var(--chip-ink)_45%,var(--border))] bg-[color:var(--surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:h-[36px] md:flex-none md:justify-start md:rounded-[9px] md:pl-2 md:pr-[13px] md:hover:border-[color:var(--chip-ink)] md:hover:bg-[color:var(--elevated)]"
          >
            {/* 26px full on the phone, 22px chip on desktop: two forms, two files, so one per width. */}
            <span className="flex md:hidden"><BracketMark bracket={b} px={26} /></span>
            <span className="hidden md:flex"><BracketMark bracket={b} px={22} /></span>
            <span className="text-[13.5px] font-semibold text-[color:var(--fg)] md:text-[13px]">
              {BRACKET_NAMES[b]}
            </span>
          </button>
        ))}
      </div>
      {refused ? <Refused /> : null}
    </div>
  );
}

function Refused() {
  return (
    <p role="alert" className="text-[11.5px] leading-[1.5] text-[color:var(--fg-muted)]">
      {declarationCopy.refused}
    </p>
  );
}
