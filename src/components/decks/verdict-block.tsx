import type { ReactNode } from "react";

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
import { BracketMark, bracketInk } from "./bracket-mark";

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
}: {
  verdict: BracketVerdict;
  profile: Pick<DeckProfile, "cards" | "commanderOracleIds" | "brackets">;
}) {
  const head = verdictHead(verdict.permits);
  const subLine = verdictSubLine(verdict);
  const low = verdict.permits[0];
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
          holds at full strength, the one above it at 0.45 — with the border and the label in the
          lower bracket's ink, which is the same derivation `verdictHead.glyphBracket` makes for
          the ringed `?`. Listing the two ranges instead would leave a third inkless.
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
      <SubLine reading={subLine} glyphBracket={head.glyphBracket} />
      <Population verdict={verdict} profile={profile} />
    </section>
  );
}

function SubLine({
  reading,
  glyphBracket,
}: {
  reading: ReturnType<typeof verdictSubLine>;
  glyphBracket: Bracket | null;
}) {
  const copy = deckAnalysisCopy.verdict;
  if (reading.kind === "none") return null;
  if (reading.kind === "intent") {
    const low = reading.low;
    return (
      <div className="mt-[10px] flex items-start gap-2 md:mt-3">
        {/*
          THE RINGED `?`, IN THE LOWER BRACKET'S INK. It asks the question a range poses and
          carries no other meaning, so it is drawn only here — the climb's own declare rung is
          the one other place, and nothing else on the tab may borrow it.
        */}
        {glyphBracket === null ? null : (
          <span
            aria-label={copy.declareGlyphAria}
            role="img"
            className="mt-0.5 flex h-[14px] w-[14px] flex-none items-center justify-center rounded-full border font-mono text-[9px] font-semibold leading-none md:h-[15px] md:w-[15px] md:text-[9.5px]"
            style={{ borderColor: bracketInk(glyphBracket), color: bracketInk(glyphBracket) }}
          >
            ?
          </span>
        )}
        <p className="text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)] md:text-[13px] md:leading-[1.6]">
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
      </div>
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
 * below, and naming one would let a reader cut those cards and find the answer unmoved. The
 * allowance clause is the bracket's own, and it takes the LOWEST limit among the reasons: they
 * are all zero at brackets 1 and 2, and at bracket 3 only game changers has room, so the lowest
 * is the one a reader has to satisfy.
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
