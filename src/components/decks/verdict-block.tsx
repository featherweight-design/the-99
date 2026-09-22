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
import { deckAnalysisCopy, BRACKET_NAMES, nameList } from "../../lib/copy/deck-analysis";
import { declarationAsk } from "../../lib/bracket/declaration-ask";
import { versionComparison } from "../../lib/bracket/version-reading";
import { declarationCopy } from "../../lib/copy/declaration";
import { BracketMark, bracketInk } from "./bracket-mark";
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
}: {
  verdict: BracketVerdict;
  profile: Pick<DeckProfile, "cards" | "commanderOracleIds" | "brackets">;
  /**
   * The player's own answer and the control to give one. Absent draws the block as Round 2
   * drew it — no ask, no answer — which is what a surface with no deck to write to gets.
   */
  declaration?: DeclarationControl;
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
  const ask =
    read?.kind === "answered" && changing ? { kind: "ask" as const, permits: read.permits } : read;
  const answered = ask?.kind === "answered" ? ask.declared : null;
  const head = verdictHead(verdict.permits, answered);
  const subLine = verdictSubLine(verdict);
  const low = head.chip;
  const high = verdict.permits[verdict.permits.length - 1];
  const copy = deckAnalysisCopy.verdict;
  return (
    <section
      aria-label={copy.heading}
      className="flex flex-col rounded-[11px] border border-[color:var(--border)] bg-[color:var(--surface)] px-[15px] py-[13px] md:rounded-xl md:px-[18px] md:py-4"
    >
      <h3 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:text-[10px]">
        {copy.heading}
      </h3>
      <p className="mt-2 text-[13.5px] font-semibold text-[color:var(--fg)] md:mt-[9px] md:text-[14px]">
        {head.face}
      </p>
      <div className="mt-[9px] md:mt-[10px] md:flex md:items-center md:gap-[10px]">
        {/*
          ONE PILL, INKED BY THE LOWER MEMBER. A range draws both marks inside it — the one that
          holds at full strength, the one above it at 0.65 — with the border and the label in the
          lower bracket's ink — `verdictHead.chip`, which on an answered range is the answer and
          draws one mark. Listing the two ranges instead would leave a third inkless.
        */}
        <span
          className="inline-flex items-center gap-[7px] rounded-full border py-0.5 pl-1 pr-[11px]"
          style={{ borderColor: `color-mix(in oklab, ${bracketInk(low)} 55%, transparent)` }}
        >
          <BracketMark bracket={low} px={MARK_PX} mdPx={MARK_PX_MD} />
          {head.split ? (
            <>
              <span
                aria-hidden="true"
                className="font-mono text-[11px] opacity-70 md:text-[12px]"
                style={{ color: bracketInk(low) }}
              >
                /
              </span>
              <BracketMark bracket={high} px={MARK_PX} mdPx={MARK_PX_MD} dim />
            </>
          ) : null}
          <span
            className="text-[11.5px] font-medium"
            style={{ color: bracketInk(low) }}
          >
            {head.split ? copy.splitChip : BRACKET_NAMES[low]}
          </span>
        </span>
      </div>
      {answered === null ? (
        <SubLine reading={subLine} />
      ) : (
        // THE RANGE MOVES HERE rather than disappearing. The face now names the answer, so the
        // two brackets the cards permit are said once, in the description line.
        <p className="mt-[10px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] md:mt-[11px] md:text-[13px] md:leading-[1.6]">
          {declarationCopy.declared.permitsBelow(verdict.permits)}
        </p>
      )}
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
          onChange={() => setChanging(true)}
          comparison={
            declaration.previous
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
      <p className="mt-[10px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] md:mt-3 md:text-[13px] md:leading-[1.6]">
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
    <p className="mt-[10px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] md:mt-3 md:text-[13px] md:leading-[1.6]">
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
    const [one, many] = copy.ruleNouns[r.rule];
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
