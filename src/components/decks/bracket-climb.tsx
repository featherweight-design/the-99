import { useState, type ReactNode } from "react";

import { climb } from "../../lib/bracket/climb";
import type { Bracket, BracketLimitReport, BracketVerdict, RuleId } from "../../lib/bracket/types";
import { upgradePath, type UpgradePath } from "../../lib/bracket/upgrade";
import type { DeckProfile } from "../../lib/profile/types";
import { BRACKET_NAMES, deckAnalysisCopy, nameList } from "../../lib/copy/deck-analysis";
import { downgradeTargets } from "../../lib/bracket/upgrade-view";
import { upgradePathCopy } from "../../lib/copy/upgrade-path";
import { BracketMark, bracketInk } from "./bracket-mark";
import { FindingMark } from "./finding-mark";
import { AllBracketsSheet } from "./all-brackets-sheet";
import { UpgradePathSheet } from "./upgrade-path";

/**
 * "Where you sit, and what moves you" — the bracket below, yours, and the one above.
 *
 * THREE RUNGS, AND THAT IS THE RULE. The brackets a deck is nowhere near are not drawn, which
 * removes the repeated "ruled out" line by construction rather than by editing — and it makes the
 * block SHORTER on a high-bracket deck than a low one, which is the opposite of what the
 * five-rung version did. `climb` decides which three; a deck at 1 or at 5 draws two.
 *
 * THE CLIMB STATES. Every figure here is plain text, and the one control is Round 4's: the
 * lower rung's `what would have to go →`, which opens the upgrade path as a sheet (the Analysis
 * tab handoff's 3b). That rung's sentence is the short answer; the sheet is its full one, so it
 * opens from the rung rather than becoming a block of its own. The arrow is the tab's rule for
 * every opener, because every one opens a sheet.
 *
 * AND THE MARK STAYS AT 390. The rungs carry it at 22 / 26px, both above Round 0's 20px floor; a
 * numeral-only rung was tried and rejected. That crossing is why the neighbour rungs mount the
 * mark twice — 22 is the CHIP form and 26 the full one, so they resolve to different files and
 * one element cannot serve both widths. The rung that HOLDS is 26 / 36, both full, and needs one.
 */
/**
 * The neighbour rungs' marks draw at this opacity, so the rung a reader sits on is the one that
 * reads first. Exported because the theme contract holds the COMPOSITE at 3:1: an opacity is not
 * a colour change, and a figure that lived only in a class string had no assertion behind it.
 */
export const NEIGHBOUR_OPACITY = 0.75;

/** How much of the rank's ink tints the rung a deck sits on. Exported for the same reason. */
export const YOURS_TINT = 0.12;

export function BracketClimb({
  verdict,
  profile,
  locked,
}: {
  verdict: BracketVerdict;
  profile: DeckProfile;
  /** The deck's locked cards, for the path's sheet (Locked, D5). */
  locked: ReadonlySet<string>;
}) {
  const copy = deckAnalysisCopy.climb;
  const rungs = climb(verdict.permits);
  // THE PATH'S SHEET. Local, not persisted; the dialog returns focus to the rung's opener.
  const [open, setOpen] = useState(false);
  // THE REFERENCE SHEET's own, separate from the path's: the two never open together.
  const [allOpen, setAllOpen] = useState(false);
  const targets = downgradeTargets(verdict.permits);
  return (
    <section className="flex flex-col gap-[9px] md:gap-[11px]">
      <h3 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:text-[10px] md:tracking-[0.16em]">
        {copy.heading}
      </h3>
      <div className="flex flex-col gap-[7px] rounded-[11px] border border-[color:var(--border)] bg-[color:var(--surface)] p-[11px] md:gap-2 md:p-[14px]">
        {rungs.map((rung) => (
          <Rung
            key={rung.bracket}
            bracket={rung.bracket}
            role={rung.role}
            verdict={verdict}
            profile={profile}
            path={
              rung.role === "below" && targets.length > 0
                ? { onOpen: () => setOpen(true) }
                : null
            }
          />
        ))}
      </div>
      {/*
        THE FOOT: `see all brackets →`, right-aligned under the rungs box (addendum 1a). A pressed
        (and, at 1300, hovered) state that the path's opener does not have, drawn as the canvas
        draws it (audit finding 5). A 44px target at 390, pulled back into the section gap.
      */}
      <div className="-mb-[6px] -mr-[8px] -mt-[4px] flex justify-end md:m-0">
        <button
          type="button"
          aria-haspopup="dialog"
          data-testid="see-all-brackets"
          onClick={() => setAllOpen(true)}
          className="group flex min-h-[44px] items-center rounded-[6px] px-[8px] font-mono text-[11px] text-[color:var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] active:bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] active:text-[color:var(--accent-hover)] md:h-[28px] md:min-h-0 md:hover:bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] md:hover:text-[color:var(--accent-hover)]"
        >
          <span className="border-b border-dotted border-current group-active:border-solid md:group-hover:border-solid">
            {deckAnalysisCopy.bracketsSheet.open} <span aria-hidden="true">→</span>
          </span>
        </button>
      </div>
      {allOpen ? <AllBracketsSheet onClose={() => setAllOpen(false)} /> : null}
      {open && targets.length > 0 ? (
        <UpgradePathSheet
          profile={profile}
          verdict={verdict}
          target={targets[0]}
          locked={locked}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}

function Rung({
  bracket,
  role,
  verdict,
  profile,
  path,
}: {
  bracket: Bracket;
  role: "below" | "yours" | "above";
  verdict: BracketVerdict;
  profile: DeckProfile;
  /** The lower rung's sheet opener, or null on every other rung. */
  path: { onOpen: () => void } | null;
}) {
  const copy = deckAnalysisCopy.climb;
  const ink = bracketInk(bracket);
  // THE DECLARE RUNG IS `[4,5]`'s, AND ONLY IT. §2 says so by name — the rung above is "either
  // already allowed, or, at 4-5, the declare split" — and the copy it draws says why: "Four and
  // five share their card limits." Nothing of the sort is true of 1 and 2, where the intent sits
  // at the BOTTOM of the range and the verdict block's own sub-line carries it. Keying this on
  // "the above rung of any range" put the 4-5 sentence on a `[1,2]` deck's rung at 2, claiming
  // two brackets share limits that differ.
  const declares = role === "above" && verdict.permits.length > 1 && verdict.permits[0] === 4;
  return (
    <div
      data-testid="climb-rung"
      data-role={role}
      data-bracket={bracket}
      className={
        "grid rounded-lg px-[11px] md:grid-cols-[186px_1fr] md:items-center md:gap-[14px] md:px-3 "
        + (role === "yours"
          ? "gap-[9px] py-[11px] md:py-[11px] "
          : "gap-[7px] py-[10px] md:py-[10px] ")
        + (role === "below" ? "border border-[color:var(--border)] bg-[color:var(--surface-sunken)] " : "")
        + (role === "yours" ? "border " : "")
        + (role === "above" && !declares ? "border border-[color:var(--border)] " : "")
        + (declares ? "border border-dashed " : "")
      }
      style={
        role === "yours"
          ? { background: `color-mix(in oklab, ${ink} ${YOURS_TINT * 100}%, var(--surface))`, borderColor: ink }
          : declares
            ? { borderColor: `color-mix(in oklab, ${ink} 55%, transparent)` }
            : undefined
      }
    >
      <span className="flex items-center gap-2 md:gap-[9px]">
        {role === "yours" ? (
          <BracketMark bracket={bracket} px={26} mdPx={36} />
        ) : (
          <>
            {/*
              TWO MOUNTS, forced by the asset rather than chosen. A neighbour rung draws the CHIP
              form at 22px and the FULL form at 26px, which are different files; a CSS rule can
              change a box's size across a breakpoint and cannot change its mask, so `BracketMark`
              refuses an `mdPx` that crosses a form boundary rather than drawing the wrong art at
              one of the two widths.
            */}
            <span className="md:hidden" style={{ opacity: NEIGHBOUR_OPACITY }}>
              <BracketMark bracket={bracket} px={22} />
            </span>
            <span className="hidden md:inline-flex" style={{ opacity: NEIGHBOUR_OPACITY }}>
              <BracketMark bracket={bracket} px={26} />
            </span>
          </>
        )}
        {/*
          AT 390 THE LABEL IS ONE LINE, with the role pushed to the far end — the rung is a
          single column there, so stacking the two would spend a second line on nine characters
          and push the body further from the mark it belongs to. Above 768px the rung's first
          column is a fixed 186px and the two stack inside it.
        */}
        <span className="flex flex-1 items-baseline gap-2 md:flex-none md:flex-col md:items-start md:gap-0.5">
          <span
            className={
              role === "yours"
                ? "text-[13px] font-semibold text-[color:var(--fg)] md:text-[13.5px]"
                : "text-[12.5px] font-semibold text-[color:var(--fg-body)]"
            }
          >
            {BRACKET_NAMES[bracket]}
          </span>
          <span
            className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.1em] md:ml-0 md:text-[9px]"
            style={{ color: role === "yours" ? "var(--fg)" : "var(--fg-faint)" }}
          >
            {role === "below" ? (
              upgradePathCopy.rungLabel
            ) : role === "yours" ? (
              <>
                {/* `display:none` is not announced, so exactly one reaches a screen reader. */}
                <span className="md:hidden">{copy.roleHereShort}</span>
                <span className="hidden md:inline">{copy.roleHere}</span>
              </>
            ) : declares ? (
              copy.roleDeclare
            ) : (
              copy.roleAbove
            )}
          </span>
        </span>
      </span>
      <span className="flex flex-col gap-1.5">
        <RungBody bracket={bracket} role={role} declares={declares} verdict={verdict} profile={profile} />
        {path ? (
          // Phone: its own row, pushed to the rung's right edge, a 44px target pulled back into
          // the rung's padding. Desktop: under the body, at its left.
          <span className="-mt-[6px] -mb-[8px] flex min-h-[44px] items-center justify-end md:m-0 md:block md:min-h-0">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={path.onOpen}
              className="flex min-h-[44px] items-center font-mono text-[11px] text-[color:var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:min-h-0"
            >
              <span className="border-b border-dotted border-[color:var(--accent)]">
                {upgradePathCopy.open} <span aria-hidden="true">→</span>
              </span>
            </button>
          </span>
        ) : null}
      </span>
    </div>
  );
}

function RungBody({
  bracket,
  role,
  declares,
  verdict,
  profile,
}: {
  bracket: Bracket;
  role: "below" | "yours" | "above";
  declares: boolean;
  verdict: BracketVerdict;
  profile: DeckProfile;
}) {
  const copy = deckAnalysisCopy.climb;
  if (role === "below") {
    // NARROWED, NOT CAST. `climb` puts `yours` at `permits[0]`, which `permitsFor` never returns
    // above 4, so the rung below is 1, 2 or 3 and `upgradePath`'s target type is satisfied. The
    // check is here rather than a `as` because the day `permitsFor` gains a shape this reads as
    // a missing sentence rather than as a runtime throw inside a pure function.
    if (bracket !== 1 && bracket !== 2 && bracket !== 3) return null;
    // THE SHIPPED RULE, not a second copy of it. `upgradePath` is Tier A's and already knows
    // which combos a target forbids, which cards sit in the command zone and cannot be cut, and
    // that bracket 1 is the only target counting extra turns.
    return (
      <span className="pl-[7px] text-[12px] leading-[1.55] text-[color:var(--fg-muted)] md:pl-0 md:text-[12.5px] md:leading-[1.6]">
        {dropSentence(upgradePath(profile, bracket), bracket, verdict.limits[`bracket${bracket}`])}
      </span>
    );
  }
  if (role === "above") {
    // THE 4-5 RUNG POINTS AT THE ANSWER rather than asking a second time. Round 3 moved the ask
    // into the verdict block and retired the ringed `?` with it: one ask per surface.
    return (
      <span className="pl-[7px] text-[12px] leading-[1.55] text-[color:var(--fg-muted)] md:pl-0 md:text-[12.5px] md:leading-[1.6]">
        {declares ? copy.declare : copy.aboveAllowed}
      </span>
    );
  }
  return <Allowances bracket={bracket} verdict={verdict} />;
}

/**
 * The figures that reach the rung the deck is on, each with what that bracket allows.
 *
 * ONLY THE RULES THE DECK ACTUALLY HOLDS. A rung listing four zeroes says nothing and pushes the
 * two figures that matter off the line; the findings block below carries every count including
 * the zeroes, which is the division the whole tab is built on.
 *
 * `no cap` AT 4 AND 5, and it is a reading rather than a gap. `limits` covers brackets 1 to 3
 * because those are the only brackets with card limits — the round's own copy says so in the
 * sentence a `[4,5]` deck reads: "Four and five have no card limits between them." So a rule a
 * deck holds at 4 has no allowance to print, and `no cap` is what that is.
 */
function Allowances({ bracket, verdict }: { bracket: Bracket; verdict: BracketVerdict }) {
  const copy = deckAnalysisCopy.climb;
  const report = bracket <= 3 ? verdict.limits[`bracket${bracket}` as "bracket1"] : null;
  const rows: { rule: RuleId; have: number; allowance: string }[] = [];
  const push = (rule: RuleId, have: number, allowance: string) => {
    if (have > 0) rows.push({ rule, have, allowance });
  };
  if (report) {
    push("gameChangers", report.gameChangers.have, copy.allowed(report.gameChangers.limit));
    push("massLandDenial", report.massLandDenial.have, copy.allowed(0));
    push(
      "extraTurns",
      report.extraTurns.have,
      // `counted: false` is why an extra-turn figure at 2 or 3 prints `no cap` rather than an
      // allowance: those brackets REPORT the count and attach no verdict to it.
      report.extraTurns.counted ? copy.allowed(0) : copy.noCap,
    );
    push(
      "twoCardCombos",
      report.twoCardCombos.have,
      report.twoCardCombos.policy === "forbidden" ? copy.allowed(0) : copy.noCap,
    );
  } else {
    const b = verdict;
    push("gameChangers", b.limits.bracket3.gameChangers.have, copy.noCap);
    push("massLandDenial", b.limits.bracket3.massLandDenial.have, copy.noCap);
    push("extraTurns", b.limits.bracket3.extraTurns.have, copy.noCap);
    push("twoCardCombos", b.limits.bracket3.twoCardCombos.have, copy.noCap);
  }
  // NOTHING, rather than a sentence. A deck that holds none of the four reaches its rung with
  // no figures, and the only sentence available to put there is the one the rung ABOVE draws —
  // which the contact sheet caught doing exactly that: a `[1,2]` deck read "Nothing rules it
  // out. It permits more than this deck uses." on both rungs, one under the other. The verdict
  // block above has already said what this deck is; an empty cell is quiet and true.
  if (rows.length === 0) return null;
  return (
    <span className="flex flex-col gap-[6px] pl-[7px] md:flex-row md:flex-wrap md:items-center md:gap-x-[18px] md:gap-y-2 md:pl-0">
      {rows.map((row) => (
        <span key={row.rule} data-testid="climb-figure" className="inline-flex items-center gap-[7px]">
          {/*
            THE SAME MARK THE FINDINGS AND THE CARD SURFACES DRAW, at the one size it has:
            `CARD_FACT_MARK_PX` is 16 everywhere and is not a prop, ruled 2026-09-21 after the
            set shipped at 12, 13, 14 and 16 across six mounts and the same fact read as a
            different mark depending on which list a player was looking at. The canvas draws 12
            here; that ruling supersedes it.
          */}
          <FindingMark id={row.rule} />
          <span className="font-mono text-[10.5px] text-[color:var(--fg)]">
            {copy.ruleNames[row.rule]}
          </span>
          <span className="font-mono text-[13px] font-semibold text-[color:var(--fg)]">
            {row.have}
          </span>
          <span className="font-mono text-[9.5px] text-[color:var(--fg-faint)] md:text-[10px]">
            {row.allowance}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * `Cut Chance for Glory: Exhibition allows none.`
 *
 * NAMES THE CARDS AT ONE OR TWO and counts above that. Nine card names in a row is not a
 * sentence a reader takes in, and the receipts live in the findings.
 */
function dropSentence(
  path: UpgradePath,
  bracket: Bracket,
  /** The target bracket's own report — where the allowance comes from. See below. */
  report: BracketLimitReport,
): ReactNode {
  const copy = deckAnalysisCopy.climb;
  const name = BRACKET_NAMES[bracket];
  if (path.blocked) return copy.dropBlocked(name);
  const clauses = path.items.map((item) => {
    if (item.rule === "twoCardCombos") {
      const n = item.combos.length;
      return copy.dropParts.count(n, n === 1 ? "two-card infinite" : "two-card infinites", name);
    }
    const noun = deckAnalysisCopy.verdict.ruleNouns[item.rule];
    const word = item.removeCount === 1 ? noun[0] : noun[1];
    // THE LIMIT COMES FROM THE TARGET'S OWN REPORT, never from the candidate list. `candidates`
    // is the CUTTABLE subset — `upgradePath` filters the commanders out of it, because a
    // commander cannot be cut — so `candidates.length - removeCount` under-reports the allowance
    // by the number of commanders holding that rule. A deck with four game changers one of which
    // is its commander would have read "only two allowed at Upgraded" where Upgraded allows
    // three. The report is where the figure actually lives.
    //
    // Game changers is the only rule with room at any of the three targets; mass land denial and
    // extra turns cap at zero wherever they are counted at all, and a forbidden combo at zero.
    const limit = item.rule === "gameChangers" ? report.gameChangers.limit : 0;
    if (item.candidates.length <= 2 && limit === 0) {
      return copy.dropParts.named(nameList(item.candidates.map((c) => c.name)), name);
    }
    return limit > 0
      ? copy.dropParts.countAllowing(item.removeCount, word, name, limit)
      : copy.dropParts.count(item.removeCount, word, name);
  });
  // ONE SENTENCE PER RULE, joined by a space rather than by `nameList`: these are whole
  // sentences with their own full stops, and a comma-joined list of them is unreadable. The
  // THING TO CUT carries the emphasis the canvas gives it; the rest of the clause stays muted.
  return clauses.flatMap((parts, clause) =>
    parts.map((part, i) =>
      part.strong ? (
        <b key={`${clause}-${i}`} className="font-semibold text-[color:var(--fg)]">
          {part.text}
        </b>
      ) : (
        <span key={`${clause}-${i}`}>{i === 0 && clause > 0 ? ` ${part.text}` : part.text}</span>
      ),
    ),
  );
}
