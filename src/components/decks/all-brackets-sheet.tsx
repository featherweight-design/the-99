"use client";

// The all-brackets reference sheet (Analysis tab addendum, R3; audited Green in #924). What each
// bracket allows in a deck, then how we read each rule with one quoted Wizards line under it.
//
// A REFERENCE, NOT A SECOND CLIMB (R2-A, confirmed by Hugh): the climb already shows where a deck
// sits, so nothing here marks the reader's bracket, and the sheet takes no verdict at all.
//
// THE FIGURES ARE THE RULES', never the climb's `Allowances`: every cell reads a limit constant in
// `rules.ts`, so the sheet cannot disagree with the verdict it explains (audit finding 6).

import type { ReactNode } from "react";

import {
  COMBO_POLICY,
  EXTRA_TURN_LIMIT_BRACKET_1,
  GAME_CHANGER_LIMIT,
  MASS_LAND_DENIAL_LIMIT,
} from "../../lib/bracket/rules";
import {
  BRACKET_RULES_SOURCE,
  BRACKETS_INTRO_SOURCE,
  BRACKETS_OCT25_SOURCE,
} from "../../lib/bracket/sources";
import type { Bracket } from "../../lib/bracket/types";
import { BRACKET_NAMES, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { formatDeckDate } from "../../lib/decks/format";
import { BracketMark } from "./bracket-mark";
import { FindingMark } from "./finding-mark";
import { ModalChrome } from "./receipt-modal";

const copy = deckAnalysisCopy.bracketsSheet;
const climbCopy = deckAnalysisCopy.climb;
const provenance = deckAnalysisCopy.provenance;

const BRACKETS: Bracket[] = [1, 2, 3, 4, 5];
type Rule = "gameChangers" | "massLandDenial" | "extraTurns" | "twoCardCombos";
const RULES: Rule[] = ["gameChangers", "massLandDenial", "extraTurns", "twoCardCombos"];

/** A bracket's allowance for a rule: a count, or null for no cap. Read off `rules.ts` alone. */
export function allowance(rule: Rule, bracket: Bracket): number | null {
  if (rule === "gameChangers") return bracket <= 3 ? GAME_CHANGER_LIMIT[bracket as 1 | 2 | 3] : null;
  if (rule === "massLandDenial") return bracket <= 3 ? MASS_LAND_DENIAL_LIMIT : null;
  // Counted at bracket 1 only: at 2 and 3 the rule is about chaining, which a list cannot show.
  if (rule === "extraTurns") return bracket === 1 ? EXTRA_TURN_LIMIT_BRACKET_1 : null;
  // Forbidden is none allowed; `earlyGameOnly` is a timing rule no list can check, so no cap.
  return bracket <= 3 && COMBO_POLICY[bracket as 1 | 2 | 3] === "forbidden" ? 0 : null;
}

/** One cell's figure. The only non-zero count, Upgraded's three game changers, reads in `--fg` / 600. */
function Figure({ n }: { n: number | null }) {
  if (n === null) {
    return (
      <span className="whitespace-nowrap border-b border-b-[color:var(--border-dashed)] border-dashed border-[color:var(--border-dashed)] font-mono text-[10px] text-[color:var(--fg-faint)] md:text-[10.5px]">
        {climbCopy.noCap}
      </span>
    );
  }
  return (
    <span
      data-testid="brackets-sheet-figure"
      className={`whitespace-nowrap font-mono text-[11.5px] md:text-[12px] ${
        n > 0 ? "font-semibold text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"
      }`}
    >
      {n}
    </span>
  );
}

/** Desktop: rules are rows and the five brackets columns, the way the posts lay them out. */
function WideTable() {
  return (
    <div role="table" aria-label="Cards allowed by bracket" data-testid="brackets-sheet-table-wide"
      className="hidden flex-none flex-col overflow-hidden rounded-[10px] border border-[color:var(--border)] md:flex">
      <div role="row" className="grid grid-cols-[168px_repeat(5,minmax(0,1fr))]">
        <span role="columnheader" className="self-end pb-[11px] pl-[12px] pr-[10px] pt-[10px] font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
          {copy.corner}
        </span>
        {BRACKETS.map((b) => (
          <span key={b} role="columnheader" className="flex flex-col items-start gap-[6px] px-[8px] py-[11px]">
            <BracketMark bracket={b} px={22} />
            <span className="whitespace-nowrap text-[12px] font-semibold leading-[1.2] text-[color:var(--fg-body)]">{BRACKET_NAMES[b]}</span>
          </span>
        ))}
      </div>
      {RULES.map((rule) => (
        <div key={rule} role="row" className="grid grid-cols-[168px_repeat(5,minmax(0,1fr))] border-t border-[color:var(--border)]">
          <span role="rowheader" className="flex items-center gap-[8px] py-[11px] pl-[12px] pr-[10px]">
            <FindingMark id={rule} />
            <span className="whitespace-nowrap text-[12.5px] font-semibold leading-[1.3] text-[color:var(--fg)]">{climbCopy.ruleNames[rule]}</span>
          </span>
          {BRACKETS.map((b) => (
            <span key={b} role="cell" className="flex items-center px-[8px] py-[11px]"><Figure n={allowance(rule, b)} /></span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Phone: TRANSPOSED. Five columns would be about 53px, narrower than "Exhibition". */
function NarrowTable() {
  return (
    <div role="table" aria-label="Cards allowed by bracket" data-testid="brackets-sheet-table-narrow"
      className="flex flex-none flex-col overflow-hidden rounded-[10px] border border-[color:var(--border)] md:hidden">
      <div role="row" className="grid grid-cols-[116px_repeat(4,minmax(0,1fr))]">
        <span role="columnheader" className="self-end py-[10px] pl-[11px] pr-[6px] font-mono text-[8.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
          {copy.corner}
        </span>
        {RULES.map((rule) => (
          <span key={rule} role="columnheader" className="flex flex-col items-start gap-[6px] px-[4px] py-[10px]">
            <FindingMark id={rule} />
            <span className="font-mono text-[8.5px] uppercase leading-[1.3] tracking-[0.04em] text-[color:var(--fg-body)]">{climbCopy.ruleNames[rule]}</span>
          </span>
        ))}
      </div>
      {BRACKETS.map((b) => (
        <div key={b} role="row" className="grid grid-cols-[116px_repeat(4,minmax(0,1fr))] border-t border-[color:var(--border)]">
          <span role="rowheader" className="flex items-center gap-[7px] py-[9px] pl-[11px] pr-[6px]">
            <BracketMark bracket={b} px={22} />
            <span className="whitespace-nowrap text-[11.5px] font-semibold text-[color:var(--fg-body)]">{BRACKET_NAMES[b]}</span>
          </span>
          {RULES.map((rule) => (
            <span key={rule} role="cell" className="flex items-center px-[4px] py-[9px]"><Figure n={allowance(rule, b)} /></span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Note({
  marks, name, chip = false, reading, quote,
}: {
  marks: ReactNode;
  name: string;
  chip?: boolean;
  reading: string | null;
  quote: { text: string; source: "intro" | "oct25" };
}) {
  return (
    <div data-testid="brackets-sheet-note" className="grid grid-cols-[40px_1fr] gap-[8px] border-t border-[color:var(--border)] py-[12px] first:border-t-0 md:grid-cols-[48px_1fr] md:gap-[10px]">
      <span className="flex gap-[4px] pt-px">{marks}</span>
      <div className="flex min-w-0 flex-col gap-[5px]">
        <span className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px]">
          <span className="text-[12.5px] font-semibold leading-[1.3] text-[color:var(--fg)]">{name}</span>
          {chip ? (
            // The findings' own `no limit` chip, drawn the same way (audit finding 4).
            <span className="whitespace-nowrap rounded-full border border-[color:var(--border-strong)] px-[6px] py-[2px] font-mono text-[8.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
              {deckAnalysisCopy.findings.noLimit}
            </span>
          ) : null}
        </span>
        {reading ? <p className="m-0 text-pretty text-[12px] leading-[1.55] text-[color:var(--fg-muted)]">{reading}</p> : null}
        <p data-testid="brackets-sheet-quote" className="m-0 text-pretty text-[11.5px] italic leading-[1.5] text-[color:var(--fg-body)] md:text-[12px]">
          {`“${quote.text}”`}
          <span className="ml-[8px] whitespace-nowrap font-mono text-[9px] not-italic tracking-[0.04em] text-[color:var(--fg-faint)] md:text-[9.5px]">
            {copy.quoteTag[quote.source]}
          </span>
        </p>
      </div>
    </div>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="inline-flex min-h-[44px] items-center font-mono text-[10.5px] text-[color:var(--accent)] md:min-h-0">
      <span className="border-b border-b-[color:var(--accent)] border-[color:var(--accent)]">{children}</span>
    </a>
  );
}

export function AllBracketsSheet({ onClose }: { onClose: () => void }) {
  return (
    <ModalChrome title={copy.title} closeLabel={copy.close} onClose={onClose} width={700}>
      <div data-testid="brackets-sheet" className="flex flex-col gap-[12px] px-[16px] pb-[24px] pt-[14px] md:gap-[14px] md:px-[18px] md:pb-[18px] md:pt-[16px]">
        <p className="m-0 flex-none text-pretty text-[12.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.lead}</p>
        <WideTable />
        <NarrowTable />
        <div className="flex flex-none flex-col">
          {RULES.map((rule) => (
            <Note key={rule} marks={<FindingMark id={rule} />} name={climbCopy.ruleNames[rule]}
              reading={copy.readings[rule]} quote={copy.quotes[rule]} />
          ))}
          <Note marks={<FindingMark id="tutors" />} name={copy.tutors.label} chip reading={copy.tutors.reading} quote={copy.quotes.tutors} />
          <Note marks={<><BracketMark bracket={4} px={20} /><BracketMark bracket={5} px={20} /></>}
            name={copy.high.name} reading={copy.high.reading} quote={copy.quotes.high} />
        </div>
        <div className="flex flex-none flex-col gap-[4px] border-t border-[color:var(--border)] pt-[12px]">
          <span className="text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{BRACKET_RULES_SOURCE.title}</span>
          <span className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
            <SourceLink href={BRACKET_RULES_SOURCE.url}>{provenance.source(BRACKET_RULES_SOURCE.name)}</SourceLink>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
              {provenance.rulesChecked(formatDeckDate(new Date(`${BRACKET_RULES_SOURCE.lastChecked}T12:00:00Z`)))}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-[14px]">
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.quotedFrom}</span>
            <SourceLink href={BRACKETS_INTRO_SOURCE.url}>{`${copy.sourceMonth.intro} ↗`}</SourceLink>
            <SourceLink href={BRACKETS_OCT25_SOURCE.url}>{`${copy.sourceMonth.oct25} ↗`}</SourceLink>
          </span>
        </div>
      </div>
    </ModalChrome>
  );
}
