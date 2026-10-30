"use client";

import { useState, type ReactNode } from "react";

import {
  populationLine,
  populationSubject,
  verdictHead,
  verdictSubLine,
  type RuledOutReason,
} from "../../lib/bracket/verdict-head";
import type { Bracket, BracketVerdict } from "../../lib/bracket/types";
import type { DeckProfile } from "../../lib/profile/types";
import { deckAnalysisCopy, BRACKET_NAMES, nameList, ruleNounFor } from "../../lib/copy/deck-analysis";
import { formatShortDeckDate } from "../../lib/decks/format";
import { declarationAsk } from "../../lib/bracket/declaration-ask";
import { versionComparison } from "../../lib/bracket/version-reading";
import { declarationCopy } from "../../lib/copy/declaration";
import { BracketMark, DIM_OPACITY, bracketInk } from "./bracket-mark";
import { DeclarationSection, type DeclarationControl } from "./declaration";

/**
 * The verdict block — the bracket, its mark, one sentence saying why, and what other players say.
 *
 * THE CHROME ROUNDS 3 AND 4 SIT INSIDE. This is the box every later surface on the Analysis tab
 * renders into, which is why it ships before the declaration, the drift row and the push line.
 *
 * NO VIOLATION STATE, and that is a ruling rather than an omission. Round 0 reserved a fourth
 * card for a deck past all three limited brackets; it is discarded. A deck at 4 or 5 gets exactly
 * the type, the ink and the mark a `1 or 2` deck gets: nothing dashed, nothing red, no `over`
 * tag. The block prints a bracket and a reason, and the cards live in the findings.
 *
 * EVERY READING COMES FROM A PURE RULE. `verdictHead` decides the face, the split chip and the
 * ringed `?`'s ink; `verdictSubLine` decides which sentence is under it; `populationLine` decides
 * present against absent. Nothing here re-derives one — the alternative is a second copy of a
 * rule in a component, which is how `probe:build-from` spent three rounds drifting from
 * `loadAvailability`.
 */

/** The ship sizes from `ASSETS.md`: the full mark at 26 below 768px and 36 above it. */
const MARK_PX = 26;
const MARK_PX_MD = 36;

export function VerdictBlock({
  verdict,
  profile,
  declaration,
  lean,
  analyzedAt,
  fresh = true,
  versionNumber = null,
}: {
  verdict: BracketVerdict;
  /** When the reading on screen was made, as an ISO instant: the head's `analyzed {when}`. */
  analyzedAt: string;
  /** The reading describes the deck's list and no edit has landed since. False is 2i / 2d. */
  fresh?: boolean;
  /** The version the reading is pinned to, for `analyzed with version n`. */
  versionNumber?: number | null;
  profile: Pick<DeckProfile, "cards" | "commanderOracleIds" | "brackets">;
  /**
   * The player's own answer and the control to give one. Absent draws the block as Round 2
   * drew it — no ask, no answer — which is what a surface with no deck to write to gets.
   */
  declaration?: DeclarationControl;
  /**
   * The lean line, drawn between the sub-line and the population foot. A slot because it opens a
   * modal and names cards, which needs the deck page's art and its card provider — neither of
   * which this block has any other reason to know about.
   */
  lean?: ReactNode;
}) {
  // THE DECLARATION'S READING, from its rule. It is handed the verdict's own range, never a
  // range this component works out, and everything below that turns on it reads `ask`.
  //
  // `change` RETURNS THE WHOLE READING TO THE ASK — the range's face, its split pill and its
  // description — not only the section. So it is held here, where the face is drawn, and the
  // section is handed the reading it should draw. Local and never persisted: pressing it and
  // leaving changes nothing.
  const [changing, setChanging] = useState(false);
  const read = declaration ? declarationAsk(verdict.permits, declaration.declared) : null;
  const asked =
    read?.kind === "answered" && changing ? { kind: "ask" as const, permits: read.permits } : read;
  // A STALE RANGE WITHHOLDS ITS CHIPS until the re-read (handoff §4.2, audit finding 12): an
  // answer given now would be about cards the reading never saw. An answer already given STAYS,
  // and its `change` does nothing until then, rather than opening an ask that is withheld.
  const ask = fresh ? asked : read?.kind === "answered" ? read : null;
  const answered = ask?.kind === "answered" ? ask.declared : null;
  const head = verdictHead(verdict.permits, answered);
  const subLine = verdictSubLine(verdict);
  const copy = deckAnalysisCopy.verdict;
  const marks = head.split ? verdict.permits : [head.chip];
  return (
    <section
      aria-label={copy.heading}
      className="flex min-w-0 flex-col rounded-[11px] border border-[color:var(--border)] bg-[color:var(--surface)] px-[15px] py-[15px] md:rounded-xl md:px-[20px] md:py-[18px]"
    >
      {/*
        THE HEAD (Analysis tab handoff §2, row 2): the marks beside the name in the display face,
        and when it was analyzed under it. No label, no pill, no control and no provenance
        sentence. A range draws both marks, the upper at 0.65 with a `/` between them in the lower
        rank's ink; an answered range draws the answer alone.
      */}
      <div className="flex items-center gap-[11px] md:gap-[13px]">
        <span className="flex flex-none items-center gap-[6px]" data-testid="verdict-marks">
          {marks.map((b, i) => (
            <span key={b} className="flex items-center gap-[6px]">
              {i > 0 ? (
                <span aria-hidden="true" className="font-mono text-[12px] opacity-70" style={{ color: bracketInk(marks[0]) }}>
                  /
                </span>
              ) : null}
              <span style={{ opacity: i > 0 ? DIM_OPACITY : undefined }}>
                <BracketMark bracket={b} px={MARK_PX} mdPx={MARK_PX_MD} />
              </span>
            </span>
          ))}
        </span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span
            data-testid="verdict-name"
            className="font-display text-[19px] font-bold leading-[1.15] md:text-[21px]"
            style={{ color: bracketInk(head.chip) }}
          >
            {head.face}
          </span>
          <span className="font-mono text-[10px] text-[color:var(--fg-faint)]" data-testid="verdict-analyzed">
            {analyzedLine(new Date(analyzedAt), new Date(), fresh, versionNumber)}
          </span>
        </span>
      </div>
      {answered === null ? (
        <SubLine reading={subLine} />
      ) : (
        // THE RANGE MOVES HERE rather than disappearing. The face now names the answer, so the
        // two brackets the cards permit are said once, in the description line.
        <p className="mt-[10px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] [text-wrap:pretty] md:mt-[11px] md:text-[13px] md:leading-[1.6]">
          {declarationCopy.declared.permitsBelow(verdict.permits)}
        </p>
      )}
      {lean}
      {ask && declaration ? (
        <DeclarationSection
          ask={ask}
          control={{
            ...declaration,
            onDeclare: (bracket) => {
              setChanging(false);
              declaration.onDeclare(bracket);
            },
          }}
          onChange={() => { if (fresh) setChanging(true); }}
          comparison={
            // The version row is withheld on a stale reading, as the fixtures draw it (:314).
            declaration.previous && fresh
              ? {
                  reading: versionComparison(
                    { permits: verdict.permits, declared: declaration.declared },
                    declaration.previous,
                  ),
                  previousNumber: declaration.previous.number,
                }
              : null
          }
        />
      ) : null}
      <Population verdict={verdict} profile={profile} />
    </section>
  );
}

function SubLine({ reading }: { reading: ReturnType<typeof verdictSubLine> }) {
  const copy = deckAnalysisCopy.verdict;
  if (reading.kind === "none") return null;
  if (reading.kind === "intent") {
    const low = reading.low;
    return (
      // NO RINGED `?`. Round 3 retired it: the question a range poses is asked by the
      // declaration's own chips below, and one ask per surface is the rule.
      <p className="mt-[12px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] [text-wrap:pretty] md:mt-[14px] md:text-[13px] md:leading-[1.6]">
        {/*
          THE SHORT FORM BELOW 768px, and only the `[4,5]` line has one. `display:none` is not
          announced, so exactly one of the two reaches a screen reader — this is a narrower
          sentence at a narrower width rather than two mounts of the same block.
        */}
        {low === 1 ? (
          copy.intentLow
        ) : (
          <>
            <span className="md:hidden">{copy.intentHighShort}</span>
            <span className="hidden md:inline">{copy.intentHigh}</span>
          </>
        )}
      </p>
    );
  }
  return (
    <p className="mt-[12px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] [text-wrap:pretty] md:mt-[14px] md:text-[13px] md:leading-[1.6]">
      {reading.kind === "assembled"
        ? `${copy.ruledOutAssembled(BRACKET_NAMES[reading.below])}. ${copy.nothingFurther}`
        : `${ruledOutClause(reading.below, reading.reasons)} ${copy.nothingFurther}`}
    </p>
  );
}

/**
 * `Two game changers, and Core allows none at all.`
 *
 * EVERY RULE THAT RULED IT OUT, not the first one. A deck can pass two limits at the bracket
 * below — `[3]` is reached with game changers AND a combo both violating at bracket 2 — and
 * naming one would let a reader cut those cards and find the answer unmoved.
 *
 * THE ALLOWANCE IS ALWAYS `none at all` TODAY, and the `only N` reading is unreachable from this
 * component rather than merely rare. `verdictSubLine` only ever reports the bracket BELOW the
 * deck's own, so `below` is 1, 2 or 3; every rule caps at zero at 1 and 2, and `below === 3`
 * needs `permits` to be `[4]`, which `permitsFor` returns only when `violatesB3` is FALSE — so
 * `slotDeck` recorded no bracket-3 violation at all and the reading is `assembled` rather than
 * `ruledOut`. The branch stays because `limit` is a real field on `Violation` and the day
 * `GAME_CHANGER_LIMIT` changes it becomes reachable; `deck-analysis.test.ts` covers both
 * readings of the copy directly, and the test below pins the invariant rather than a figure
 * nothing can produce.
 *
 * The LOWEST limit among the reasons is what a reader has to satisfy, which is why it is a
 * `Math.min` rather than the first reason's.
 */
function ruledOutClause(below: Bracket, reasons: RuledOutReason[]): string {
  const copy = deckAnalysisCopy.verdict;
  const facts = reasons.map((r) => {
    const [one, many] = ruleNounFor(r.rule, below);
    return copy.ruledOutFact(r.have, r.have === 1 ? one : many);
  });
  const limit = Math.min(...reasons.map((r) => r.limit));
  return `${sentenceCase(nameList(facts))}, ${copy.ruledOutAllowance(BRACKET_NAMES[below], limit)}.`;
}

/**
 * `two game changers` -> `Two game changers`.
 *
 * The nouns are lower case in the copy module because the same strings are read mid-sentence by
 * the findings and the climb; only this one starts a sentence.
 */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Population({
  verdict,
  profile,
}: {
  verdict: BracketVerdict;
  profile: Pick<DeckProfile, "cards" | "commanderOracleIds" | "brackets">;
}) {
  const copy = deckAnalysisCopy.population;
  const population = profile.brackets.population;
  // THE SUBJECT IS THE DECK'S, NOT THE POPULATION'S. An absent population still names the
  // commander it has no counts for — `EDHREC has no declared brackets for Myrel` — so reading
  // `of` off a row that does not exist would silence the line this block exists to draw in the
  // more common of the two states. A missing row is a commander row by default because that is
  // the rung `populationFrom` falls back to.
  const subject = populationSubject(
    population?.of ?? "commander",
    profile.commanderOracleIds,
    profile.cards,
  );
  // A commander the profile cannot name has no sentence either way: the present form would read
  // "Of the 9,730 undefined decks" and the absent form "EDHREC has no declared brackets for
  // undefined". Drawing nothing is the only honest third answer.
  if (subject === null) return null;
  const line = populationLine(population, verdict.permits[0]);
  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-[color:var(--border)] pt-[10px] md:mt-[14px] md:gap-[5px] md:pt-[11px]">
      {/*
        BELOW A HAIRLINE, so it can never look like a reason. What other players declared is never
        an input to the verdict: feeding it in makes the reading a popularity contest.
      */}
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--fg-disabled)]">
        {copy.label}
      </span>
      <p className="text-[11.5px] leading-[1.55] text-[color:var(--fg-faint)] md:text-[12px] md:leading-[1.6]">
        {line.kind === "absent"
          ? copy.absent(subject)
          : copy
              .lineParts(line.declaredTotal, subject, line.said, line.name)
              .map((part, i): ReactNode =>
                part.strong ? (
                  <b key={i} className="font-semibold text-[color:var(--fg-body)]">
                    {part.text}
                  </b>
                ) : (
                  part.text
                ),
              )}
      </p>
    </div>
  );
}

/**
 * The date line in its three forms (handoff copy `analyzed.*`): stale, pinned, or asked. A reading
 * pinned to version 0 is of the precon's own list (only a precon start commits a v0, `start.ts`), so
 * it says so, stale or not (small items 5). That is usually the start's carried reading, but an Analyze
 * press on the unchanged list also pins to v0 and reads the same: it IS of the precon's list (d9's ruling 2,
 * 2026-10-28).
 */
export function analyzedLine(at: Date, now: Date, fresh: boolean, versionNumber: number | null): string {
  const copy = deckAnalysisCopy.panel;
  if (versionNumber === 0) return fresh ? copy.analyzedPrecon(formatShortDeckDate(at)) : copy.analyzedPreconStale(formatShortDeckDate(at));
  if (!fresh) return copy.analyzedStale(formatShortDeckDate(at));
  if (versionNumber !== null) return copy.analyzedCommitted(versionNumber, formatShortDeckDate(at));
  return copy.analyzed(analyzedWhen(at, now));
}

/**
 * `2 minutes ago` under an hour, then the deck page's own short date, `Sep 18` (en-US and UTC, as
 * every deck date here is: readiness finding 14). Drawn once per render; a reading left open for an
 * hour keeps the minutes it was drawn with, which is the cost of not ticking.
 */
export function analyzedWhen(at: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return deckAnalysisCopy.panel.justNow;
  if (minutes < 60) return deckAnalysisCopy.panel.minutesAgo(minutes);
  return formatShortDeckDate(at);
}
