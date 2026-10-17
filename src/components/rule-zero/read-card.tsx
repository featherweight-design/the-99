"use client";
// The read (Rule 0 handoff, decision 3; T1 to T10, D1 to D10): the kicker, a headline, one sentence, the rail of
// the five brackets with each read seat's face and the dashed `TABLE` band at the middle, the counts key, and the
// honesty line with the shipped provenance opener. No model call and no credit chip: every figure is the shipped
// bracket reading (`slotDeck`, `findings`), compared by `rules.ts`.

import type { CSSProperties } from "react";

import { FINDING_ORDER } from "../../lib/bracket/findings";
import type { Bracket } from "../../lib/bracket/types";
import { BRACKET_NAMES, bracketPhrase, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { leftOutCards, readsList, ruleZeroCopy, seatNames, whose } from "../../lib/copy/rule-zero";
import { middleBrackets, type Headline, type SeatDraw, type TableDraw } from "../../lib/rule-zero/table-view";
import { BracketMark } from "../decks/bracket-mark";
import { FindingMark } from "../decks/finding-mark";
import { ProvenanceOpener } from "../decks/provenance-panel";
import { Face } from "../social/face";
import { FLAG_INK, flagKind, type FlagKind } from "./flag-tag";

const copy = ruleZeroCopy;
const BRACKETS: readonly Bracket[] = [1, 2, 3, 4, 5];

export function ReadCard({ draw, updated }: { draw: TableDraw; /** `updated just now`'s when, once the poll lands (PR 4). */ updated?: string }) {
  const { title, ink, body } = speak(draw);
  return (
    <section
      aria-label={copy.page.readKicker}
      data-testid="read-card"
      data-headline={draw.headline.kind}
      className="relative flex flex-col gap-[12px] overflow-hidden rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[14px] pb-[12px] pt-[14px]"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
          {copy.page.readKicker}
        </span>
        {updated ? <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.page.updated(updated)}</span> : null}
      </div>
      <h2 className="m-0 font-display text-[19px] font-bold leading-[1.3] [text-wrap:pretty]">
        <Inked text={title} ink={ink} />
      </h2>
      {body ? (
        <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty]">
          <Emphasized text={body} />
        </p>
      ) : null}
      {draw.read.kind === "read" ? <Rail draw={draw} /> : null}
      <CountsKey />
      <div className="flex flex-col gap-[2px] border-t border-[color:var(--border)] pt-[10px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">
        <span>{copy.read.honest}</span>
        <ProvenanceOpener tone="accent" className="self-start" />
      </div>
    </section>
  );
}

/** The headline's phrase in its flag's ink: the words carry it, and the ink repeats the seat's tag. */
function Inked({ text, ink }: { text: string; ink: { phrase: string; kind: FlagKind } | null }) {
  const at = ink ? text.toLowerCase().indexOf(ink.phrase.toLowerCase()) : -1;
  if (!ink || at < 0) return <>{text}</>;
  const end = at + ink.phrase.length;
  return (
    <>
      {text.slice(0, at)}
      <span data-ink={ink.kind} style={{ color: FLAG_INK[ink.kind] }}>{text.slice(at, end)}</span>
      {text.slice(end)}
    </>
  );
}

/**
 * The sentence names brackets in bold (the boards' `<b>`): `em` marks a phrase where the sentence is spoken, and
 * `Emphasized` draws the marks. The copy module's sentences stay plain strings.
 */
const OPEN = "\u0001";
const CLOSE = "\u0002";
const em = (phrase: string): string => `${OPEN}${phrase}${CLOSE}`;

function Emphasized({ text }: { text: string }) {
  const parts = text.split(new RegExp(`${OPEN}(.*?)${CLOSE}`, "g"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} className="font-semibold text-[color:var(--fg)]">{p}</b>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** The bracket a seat reads, spoken: the answer, the single bracket, or the range. */
function readsPhrase(s: SeatDraw): string {
  if (!s.chip) return "";
  if (s.chip.answered !== null) return BRACKET_NAMES[s.chip.answered];
  return bracketPhrase(s.chip.permits);
}

/** Who owns a seat in a sentence: `Colin’s`, or `Your` for the viewer. */
const whoseSeat = (s: SeatDraw): string => whose(s.seat.you ? null : s.seat.displayName);

/** One seat's part of a read sentence (T4 to T6): what it declared, the range it is measured from, or its bracket. */
function seatPart(s: SeatDraw): string {
  const r = copy.read;
  const deck = s.seat.deck?.name ?? "";
  if (!s.chip || !s.read) return "";
  if (s.chip.answered !== null && s.chip.permits.length > 1) {
    return r.seatDeclared(s.seat.you ? "You" : s.seat.displayName, em(BRACKET_NAMES[s.chip.answered]));
  }
  if (s.chip.answered === null && s.chip.permits.length > 1) {
    return r.seatReadsRange(whoseSeat(s), deck, em(bracketPhrase(s.chip.permits)), BRACKET_NAMES[s.read.face]);
  }
  return r.seatReads(whoseSeat(s), deck, em(readsPhrase(s)));
}

/** The read seats, the viewer's first, as T8 and T9 name them, and the brackets they read. */
function compared(draw: TableDraw): { names: string; both: boolean; reads: string } {
  const read = draw.seats.filter((s) => s.read).sort((a, b) => Number(b.seat.you) - Number(a.seat.you));
  const faces = [...new Set(read.map((s) => s.read!.face))].sort((a, b) => a - b);
  return {
    names: seatNames(read.map((s) => (s.seat.you ? null : s.seat.displayName))),
    both: read.length === 2,
    reads: em(bracketPhrase(faces)),
  };
}

function speak(draw: TableDraw): { title: string; ink: { phrase: string; kind: FlagKind } | null; body: string | null } {
  const h: Headline = draw.headline;
  const r = copy.read;
  let out: { title: string; ink: { phrase: string; kind: FlagKind } | null; body: string | null };
  switch (h.kind) {
    case "nothing":
      return { title: r.nothing, ink: null, body: r.nothingBody };
    case "split":
      out = {
        title: r.split,
        ink: { phrase: copy.seat.split, kind: "split" },
        body: `${r.splitBody} ${readsList(draw.seats.filter((s) => s.read).map(seatPart))}`,
      };
      break;
    case "balanced":
      out = { title: r.balanced(bracketPhrase(h.reads)), ink: null, body: r.balancedBody };
      break;
    case "one": {
      const deck = h.seat.seat.deck?.name ?? "";
      const who = whose(h.seat.seat.you ? null : h.seat.seat.displayName);
      const middle = draw.read.kind === "read" ? em(bracketPhrase(middleBrackets(draw.read.middle))) : "";
      const reads = em(readsPhrase(h.seat));
      const line = h.seat.rangeLine;
      // T7: a drifted declaration replaces the closing line; T3: a low seat closes on its own line.
      const body = line?.kind === "drifted"
        ? `${r.sitsAt(middle, deck, reads)} ${r.driftNote(who, BRACKET_NAMES[line.declared])}`
        : h.dir === "high" ? r.oneBody(middle, deck, reads) : r.lowBody(middle, deck, reads);
      out = h.dir === "high"
        ? { title: r.high(who, deck), ink: { phrase: copy.seat.above, kind: "high" }, body }
        : { title: r.low(who, deck), ink: { phrase: copy.seat.below, kind: "low" }, body };
      break;
    }
    case "two":
    case "many": {
      const middle = draw.read.kind === "read" ? em(bracketPhrase(middleBrackets(draw.read.middle))) : "";
      const parts = readsList(draw.seats.filter((s) => s.read?.flag).map(seatPart));
      out = { title: h.kind === "two" ? r.two : r.many(h.n), ink: null, body: `${r.middleIs(middle)} ${parts}` };
      break;
    }
    case "reading": {
      // The seat being read is left out until it lands, and the sentence already says it joins.
      const c = compared(draw);
      return { title: r.reading(h.seat.seat.displayName), ink: null, body: r.readingBody(c.names, c.both, c.reads, h.seat.seat.displayName) };
    }
    case "leftOut": {
      const c = compared(draw);
      const sized = draw.seats.flatMap((s) =>
        s.state.kind === "illegal" ? [{ name: s.seat.you ? null : s.seat.displayName, cards: s.state.cards }] : [],
      );
      const body = [r.comparing(c.names, c.both, c.reads), leftOutCards(sized)].filter(Boolean).join(" ");
      return { title: r.leftOut(h.n), ink: null, body };
    }
  }
  // The headline says it leaves seats out (decision 3): the sentence that follows says so whenever the headline
  // itself does not.
  if (draw.leftOut > 0) out.body = [out.body, r.leftOut(draw.leftOut)].filter(Boolean).join(" ");
  return out;
}

/** Five columns, Exhibition to cEDH: each read seat's face over its bracket, a range as a dashed span. */
function Rail({ draw }: { draw: TableDraw }) {
  if (draw.read.kind !== "read") return null;
  const { middle, band } = draw.read;
  const placed = draw.seats.filter((s) => s.read);
  const ranges = placed.filter((s) => s.chip && s.chip.answered === null && s.chip.permits.length > 1);
  return (
    // One image to assistive tech: every face here is a seat below, with its chip and its tag in words.
    <div
      role="img"
      aria-label={copy.read.railLabel}
      data-testid="read-rail"
      className="relative grid grid-cols-5 rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[4px] pb-[6px] pt-[10px]"
    >
      {band ? (
        <span
          data-testid="read-band"
          className="absolute bottom-[4px] top-[4px] z-0 rounded-[8px] border border-dashed border-[color:color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_7%,transparent)]"
          style={{ left: `calc(${(middle - 1) * 20}% + 6px)`, width: "calc(20% - 4px)" }}
        >
          <span className="absolute inset-x-0 top-[5px] text-center font-mono text-[8.5px] font-medium tracking-[0.14em] text-[color:var(--accent)]">
            {copy.read.band}
          </span>
        </span>
      ) : null}
      {ranges.map((s) => {
        const lo = s.chip!.permits[0];
        const hi = s.chip!.permits[s.chip!.permits.length - 1];
        return (
          <span
            key={s.key}
            data-testid="read-span"
            className="absolute bottom-[34px] z-0 h-[30px] rounded-[15px] border border-dashed border-[color:var(--fg-faint)]"
            style={{ left: `calc(${(lo - 1) * 20 + 4}% + 4px)`, width: `${(hi - lo) * 20 + 12}%` }}
          />
        );
      })}
      {BRACKETS.map((b) => (
        <div key={b} className="relative z-[1] flex min-h-[92px] flex-col items-center justify-end gap-[6px]">
          <span className="mt-[16px] flex flex-col-reverse items-center gap-[3px]">
            {placed.filter((s) => s.read!.face === b).map((s) => (
              <RailFace key={s.key} seat={s} />
            ))}
          </span>
          <span className="flex flex-col items-center gap-[1px] font-mono text-[9px] text-[color:var(--fg-faint)]">
            <BracketMark bracket={b} px={22} />
            <span>{BRACKET_NAMES[b]}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function RailFace({ seat }: { seat: SeatDraw }) {
  const kind = seat.read?.flag ? flagKind(seat.read.flag) : null;
  // A flagged seat's ring is its flag's ink, the viewer's own included (T5); the accent rings an unflagged own seat.
  const ring = kind ? `0 0 0 2px ${FLAG_INK[kind]}` : seat.seat.you ? "0 0 0 1.5px var(--accent)" : "0 0 0 1px rgba(255,255,255,.12)";
  const style: CSSProperties = { boxShadow: ring };
  return (
    <span data-testid="rail-face" data-you={seat.seat.you ? "" : undefined} data-flag={kind ?? undefined} className="rounded-full" style={style}>
      <Face
        name={seat.seat.displayName}
        commander={seat.seat.deck ? { artCropUri: seat.seat.deck.commander.artCropUri } : null}
        size={30}
        className="rounded-full! bg-[color:var(--elevated)]! font-semibold! text-[color:var(--fg-muted)]! [border:1.5px_solid_var(--bg)]!"
      />
    </span>
  );
}

/** What the counts on each seat are: each fact's mark and its shipped label, in `findings` order. */
function CountsKey() {
  const labels = deckAnalysisCopy.findings.labels;
  return (
    <div role="group" aria-label={copy.read.keyLabel} data-testid="counts-key" className="flex flex-wrap gap-x-[12px] gap-y-[4px] font-mono text-[10px] text-[color:var(--fg-muted)]">
      {FINDING_ORDER.map((id) => (
        <span key={id} className="inline-flex items-center gap-[5px]">
          <span aria-hidden className="[&_svg]:h-[12px] [&_svg]:w-[12px]">
            <FindingMark id={id} />
          </span>
          {labels[id]}
        </span>
      ))}
    </div>
  );
}
