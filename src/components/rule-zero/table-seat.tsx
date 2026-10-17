"use client";
// One seat at a Rule 0 table (handoff decision 3; boards `R1 - Read-Phone` T1 to T10, `R2 - Read-Desktop` D1 to D10).
// ONE COMPONENT AT BOTH WIDTHS, restyled rather than drawn twice: the phone's card (84 × 60 art, the chip line, the
// counts under it) and the desktop's full-width row (132 × 92 art, the chip with the name, the flag tag over the
// counts at the right edge) are the same elements placed by one grid.
//
// FACTS CARRY NO LINKS (readiness gap 11, lock 12): nothing on a seat opens a deck page, a profile or a receipt. The
// counts are plain text, the names are plain text, and that holds on the viewer's own seat too, since the boards
// draw no link there either; the seat's one control, `Change deck`, arrives with the swap (plan PR 7).

import type { CSSProperties } from "react";

import { FINDING_ORDER, type FindingId } from "../../lib/bracket/findings";
import { BRACKET_NAMES, bracketPhrase, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { socialCopy } from "../../lib/copy/social";
import { changedLine } from "../../lib/rule-zero/live";
import type { Drivers } from "../../lib/rule-zero/rules";
import type { RangeLine, SeatDraw } from "../../lib/rule-zero/table-view";
import { faceInitials } from "../../lib/social/initials";
import { BracketChip } from "../decks/bracket-chip";
import { FindingMark } from "../decks/finding-mark";
import { FadingImg } from "../ui/hydrated-art";
import { FLAG_INK, FlagTag, flagKind } from "./flag-tag";

const copy = ruleZeroCopy.seat;

/** The name a seat prints: the game log's `You` for the viewer, else the display name as seated. */
export const seatName = (d: SeatDraw): string => (d.seat.you ? gameSeatsCopy.seats.you : d.seat.displayName);

export function TableSeat({ draw, now }: { draw: SeatDraw; /** The clock the changed line counts from. */ now: Date }) {
  const { seat, state, chip, read } = draw;
  const deck = seat.deck;
  const kind = read?.flag ? flagKind(read.flag) : null;
  const name = seatName(draw);
  const why = driversSentence(draw);
  const art = deck?.commander.artCropUri ?? null;

  return (
    <article
      aria-label={copy.label(seat.you ? null : seat.displayName)}
      data-testid="table-seat"
      data-state={state.kind}
      data-you={seat.you ? "" : undefined}
      data-flag={kind ?? undefined}
      style={kind ? ({ "--flag": FLAG_INK[kind] } as CSSProperties) : undefined}
      className={
        "relative overflow-hidden rounded-[12px] border bg-[color:var(--surface-rail)] "
        + (seat.you
          ? "border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent)] "
          : kind
            ? "border-[color:color-mix(in_oklab,var(--flag)_70%,transparent)] "
            : "border-[color:var(--border-strong)] ")
        + (kind ? "xl:bg-[color:color-mix(in_srgb,var(--flag)_7%,var(--surface-rail))]" : "")
      }
    >
      {art ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <FadingImg
            src={art}
            alt=""
            className="absolute inset-[-30px] h-[calc(100%+60px)] w-[calc(100%+60px)] max-w-none object-cover opacity-[.22] [filter:blur(30px)_saturate(1.2)] xl:opacity-[.26] xl:[filter:blur(28px)_saturate(1.25)]"
          />
        </span>
      ) : null}

      <div
        className={
          // Phone rows are spaced by margins (R1's `.ln` rows: 10px under the art, 8px to a sub line, 12px to the
          // counts); desktop's three columns by the grid's gap. Placement uses start and end lines only: a `span`
          // shorthand at one width resets the other width's start line, and the cell is then auto-placed.
          "relative grid grid-cols-[84px_minmax(0,1fr)_auto] gap-x-[12px] gap-y-0 p-[12px] "
          + "xl:grid-cols-[132px_minmax(0,1fr)_auto] xl:items-center xl:gap-x-[18px] xl:gap-y-[4px] xl:pl-[12px] xl:pr-[16px] "
          + (kind ? "xl:pt-[16px] xl:pb-[14px]" : "")
        }
      >
        <span
          aria-hidden
          className={
            "col-start-1 row-start-1 flex h-[60px] w-[84px] items-center justify-center overflow-hidden rounded-[9px] bg-[color:var(--surface-sunken)] [border:1px_solid_rgba(255,255,255,.08)] shadow-[0_8px_18px_rgba(0,0,0,.45)] xl:row-end-3 xl:h-[92px] xl:w-[132px] xl:rounded-[10px] xl:shadow-[0_10px_22px_rgba(0,0,0,.5)] "
            + (art ? "" : "bg-[radial-gradient(120px_80px_at_50%_40%,var(--elevated),var(--surface))]")
          }
        >
          {art ? (
            <FadingImg src={art} alt="" className="block h-full w-full object-cover" />
          ) : (
            <span data-testid="seat-initials" className="font-display text-[22px] font-bold text-[color:var(--fg-muted)] xl:text-[26px]">
              {faceInitials(seat.displayName)}
            </span>
          )}
        </span>

        <span
          className={
            "col-start-2 col-end-4 row-start-1 flex min-w-0 flex-col gap-[3px] xl:col-end-3 xl:gap-[4px] "
            + (chip ? "xl:self-end" : "xl:row-end-3 xl:self-center")
          }
        >
          <span className="flex min-w-0 items-baseline gap-[7px] text-[15px] font-semibold text-[color:var(--fg)] xl:gap-[8px] xl:text-[16px]">
            {/* A display name runs to 30 characters with no break; it truncates so the tag beside it stays in view. */}
            <span data-testid="seat-name" className="min-w-0 truncate">{name}</span>
            <SeatTag draw={draw} />
          </span>
          {deck ? (
            <>
              <span className="truncate text-[13.5px] text-[color:var(--fg-body)] xl:text-[14px]">{deck.name}</span>
              <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{deck.partner ? copy.commanders(deck.commander.name, deck.partner.name) : deck.commander.name}</span>
            </>
          ) : state.kind === "waiting" ? (
            <>
              <span className="truncate text-[13.5px] text-[color:var(--fg-muted)] xl:text-[14px]">
                {seat.you ? copy.pickingOwn : copy.picking}
              </span>
              <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                {seat.you ? copy.pickingSubOwn : copy.pickingSub}
              </span>
            </>
          ) : null}
        </span>

        {/* The phone's chip line: the chip, then the flag at the right, wrapping onto a second line when both do not fit
            (a range chip and a flag at 320px), and the sub line always on a line of its own. On desktop this wrapper
            dissolves (`contents`): the chip row (`.br`) sits in the name column with the sub line beside the chip, and
            the flag in the right column over the counts. */}
        {chip ? (
          <span className="col-start-1 col-end-4 row-start-2 mt-[10px] flex flex-wrap items-center justify-between gap-[8px] xl:contents">
            <span className="max-xl:contents xl:col-start-2 xl:row-start-2 xl:mt-[4px] xl:flex xl:min-w-0 xl:flex-wrap xl:items-center xl:gap-x-[10px] xl:gap-y-[4px] xl:self-start">
              <BracketChip permits={chip.permits} answered={chip.answered} />
              {state.kind === "stale" || draw.rangeLine ? (
                <span className="order-last flex basis-full flex-wrap items-center gap-x-[10px] gap-y-[4px] xl:contents">
                  {state.kind === "stale" ? (
                    <span data-testid="seat-stale" className="inline-flex items-center gap-[5px] font-mono text-[10.5px] text-[color:var(--warning)]">
                      <i aria-hidden className="block h-[6px] w-[6px] rounded-full bg-[color:var(--warning)]" />
                      {copy.stale}
                    </span>
                  ) : null}
                  {draw.rangeLine ? (
                    <span data-testid="seat-range-line" className="font-mono text-[10.5px] text-[color:var(--fg-faint)] xl:text-[10px]">
                      {rangeLineText(draw.rangeLine)}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
            {kind ? (
              <span className="ml-auto xl:col-start-3 xl:row-start-1 xl:ml-0 xl:self-end xl:justify-self-end">
                <FlagTag kind={kind} />
              </span>
            ) : null}
          </span>
        ) : null}

        {chip && draw.counts ? (
          <span
            className={
              "col-start-1 col-end-4 row-start-3 mt-[12px] xl:col-start-3 xl:col-end-4 xl:mt-0 xl:justify-self-end "
              + (kind ? "xl:row-start-2 xl:mt-[4px] xl:self-start" : "xl:row-start-1 xl:row-end-3 xl:self-center")
            }
          >
            <SeatFacts counts={draw.counts} driving={draw.driving} />
          </span>
        ) : null}
      </div>

      <SeatMore draw={draw} why={why} />
      {draw.changed ? (
        <div className="relative -mt-[6px] flex items-center justify-between gap-[8px] px-[12px] pb-[12px]">
          <Changed text={changedLine(draw.changed, now)} />
        </div>
      ) : null}
    </article>
  );
}

/** `owner` or `not a friend`, as the pod card tags its seats (the owner wins); the viewer's own is `YOU`. */
function SeatTag({ draw }: { draw: SeatDraw }) {
  const { seat } = draw;
  if (seat.you) {
    return <span className="flex-none font-mono text-[9.5px] font-medium tracking-[0.12em] text-[color:var(--accent)]">{copy.you}</span>;
  }
  const tag = seat.podOwner ? socialCopy.pods.ownerTag : seat.publicId === null ? socialCopy.pods.notFriendTag : null;
  if (!tag) return null;
  return <small className="flex-none whitespace-nowrap font-mono text-[10px] font-normal text-[color:var(--fg-muted)]">{tag}</small>;
}

const MORE = "relative mx-[12px] mb-[12px] xl:mb-[14px] xl:ml-[162px] xl:mr-[16px]";
const WAIT = `${MORE} rounded-[9px] border-[1.5px] border-dashed border-[color:var(--border-dashed)] px-[12px] py-[10px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]`;

/** What opens under the seat: the reason it is flagged, or why it is not in the read. */
function SeatMore({ draw, why }: { draw: SeatDraw; why: string | null }) {
  const { state, seat } = draw;
  if (state.kind === "illegal") {
    const short = state.cards < 100;
    return (
      <div data-testid="seat-wait" className={WAIT}>
        <b className="font-semibold text-[color:var(--fg-body)]">{short ? copy.short(state.cards) : copy.over(state.cards)}</b>{" "}
        {short ? copy.shortBody : copy.overBody}
        {short ? (
          <div aria-hidden className="mt-[8px] h-[4px] overflow-hidden rounded-[2px] bg-[color:var(--elevated)]">
            <i className="block h-full bg-[color:var(--warning)]" style={{ width: `${Math.max(0, Math.min(100, state.cards))}%` }} />
          </div>
        ) : null}
      </div>
    );
  }
  if (state.kind === "unread") {
    return (
      <div data-testid="seat-wait" className={`${WAIT} flex items-center gap-[10px]`}>
        <span
          aria-hidden
          className="inline-block h-[14px] w-[14px] flex-none animate-spin rounded-full border-2 border-[color:var(--border-strong)] border-t-[color:var(--accent)] motion-reduce:animate-none"
        />
        <span>
          <b className="font-semibold text-[color:var(--fg-body)]">{copy.readingNow}</b> {copy.readingNowBody}
        </span>
      </div>
    );
  }
  if (state.kind === "needsAnalysis") {
    return (
      <div data-testid="seat-wait" className={WAIT}>
        <b className="font-semibold text-[color:var(--fg-body)]">{copy.needsAnalysis}</b>{" "}
        {copy.needsAnalysisBody(seat.you ? null : seat.displayName)}
      </div>
    );
  }
  // The viewer's own waiting seat says only `Picking your deck` on its deck line: a sentence telling them to pick
  // would have no control under it until Change deck arrives (PR 7).
  if (state.kind === "waiting" && !seat.you) {
    return (
      <div data-testid="seat-wait" className={WAIT}>
        {copy.waiting(seat.displayName)}
      </div>
    );
  }
  if (why) {
    return (
      <div
        data-testid="seat-why"
        className={`${MORE} rounded-[9px] border border-[color:color-mix(in_oklab,var(--flag)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--flag)_9%,var(--surface-sunken))] px-[12px] py-[10px] text-[13px] leading-[1.55] text-[color:var(--fg-body)] xl:bg-[color:color-mix(in_srgb,var(--flag)_10%,var(--surface-sunken))]`}
      >
        <b className="font-semibold text-[color:var(--fg)]">{copy.whyLead}</b> {why}
      </div>
    );
  }
  return null;
}

/** The five counts in `findings` order, each its fact mark and number. A zero is a dim number, never a word. */
export function SeatFacts({ counts, driving }: { counts: Record<FindingId, number>; driving: readonly FindingId[] }) {
  const labels = deckAnalysisCopy.findings.labels;
  return (
    <span className="flex flex-nowrap items-center gap-[4px]" data-testid="seat-facts">
      {FINDING_ORDER.map((id) => {
        const n = counts[id] ?? 0;
        const lifted = driving.includes(id);
        return (
          <span
            key={id}
            data-finding={id}
            data-driving={lifted ? "" : undefined}
            className={
              "inline-flex h-[26px] items-center gap-[4px] rounded-[7px] border px-[7px] font-mono text-[12px] "
              + (lifted
                ? "border-[color:color-mix(in_oklab,var(--flag)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--flag)_12%,var(--surface-sunken))] font-semibold text-[color:var(--fg)]"
                : n === 0
                  ? "border-[color:var(--border)] bg-transparent font-normal text-[color:var(--fg-locked)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface-sunken)] font-semibold text-[color:var(--fact)]")
            }
          >
            {/* The shared marks keep their 16px everywhere (`card-fact-mark.tsx`), over the boards' 13px. */}
            <span aria-hidden className={n === 0 && !lifted ? "opacity-50" : undefined}>
              <FindingMark id={id} />
            </span>
            <span className="sr-only">{labels[id]}: </span>
            {n}
          </span>
        );
      })}
    </span>
  );
}

function rangeLineText(line: RangeLine): string {
  if (line.kind === "declared") return copy.declared(BRACKET_NAMES[line.answer], bracketPhrase(line.permits));
  if (line.kind === "drifted") return copy.drifted(BRACKET_NAMES[line.declared], BRACKET_NAMES[line.from]);
  return copy.undeclared(BRACKET_NAMES[line.from]);
}

/**
 * `What puts it here:` and the sentence after it (readiness gap 10), or null when there is nothing to name. A
 * passed limit speaks each count against the bracket below's limit, in the verdict's own nouns; an assembled combo
 * names its two cards and the tutors that reach it; a low seat says nothing counted passes its bracket, and that
 * counts can miss cards.
 */
export function driversSentence(draw: SeatDraw): string | null {
  const d: Drivers = draw.drivers;
  if (d.kind === "low") {
    // T6: a low range nobody answered says the rules leave its two ends to the player.
    const chip = draw.chip;
    if (chip && chip.answered === null && chip.permits.length > 1 && draw.rangeLine?.kind === "undeclared") {
      const lo = chip.permits[0];
      const hi = chip.permits[chip.permits.length - 1];
      return copy.whyLowRange(BRACKET_NAMES[lo], BRACKET_NAMES[hi], draw.seat.you ? null : draw.seat.displayName);
    }
    return copy.whyLow(BRACKET_NAMES[d.bracket]);
  }
  if (d.kind === "ruledOut") {
    const nouns = deckAnalysisCopy.verdict.ruleNouns;
    return d.reasons
      .map((r) => {
        // At Core and Upgraded the extra-turn rule counts combos that loop turns, not extra-turn cards (`slotDeck`'s
        // loop clause); only Exhibition counts the cards themselves.
        const noun = r.rule === "extraTurns" && d.below > 1 ? copy.loopNouns : nouns[r.rule];
        return copy.whyLimit(r.have, noun[r.have === 1 ? 0 : 1], BRACKET_NAMES[d.below], r.limit);
      })
      .join(" ");
  }
  if (d.kind === "assembled") {
    const [a, b] = d.combo?.cards ?? [];
    // The sentence names the pair; with no deciding combo there is no pair to name, and nothing is guessed.
    if (!a || !b) return null;
    return copy.whyCombo(a.name, b.name, d.tutors);
  }
  return null;
}

/** The changed dot and its words (S5), in the accent: a 7px dot, then the line. Shared with the read's `Since you looked`. */
export function Changed({ text, className = "text-[10.5px]" }: { text: string; className?: string }) {
  return (
    <span data-testid="changed" className={"inline-flex items-center gap-[6px] font-mono text-[color:var(--accent)] " + className}>
      <i aria-hidden className="block h-[7px] w-[7px] rounded-full bg-[color:var(--accent)]" />
      {text}
    </span>
  );
}
