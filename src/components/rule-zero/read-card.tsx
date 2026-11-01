"use client";
// The read (Rule 0 handoff, decision 3; T1 to T10, D1 to D10): the kicker, a headline, one sentence, the rail of
// the five brackets with each read seat's face and the dashed `TABLE` band at the middle, the counts key, and the
// honesty line with the shipped provenance opener. No model call and no credit chip: every figure is the shipped
// bracket reading (`slotDeck`, `findings`), compared by `rules.ts`.

import { Fragment, type CSSProperties, type ReactNode } from "react";

import { FINDING_ORDER } from "../../lib/bracket/findings";
import type { Bracket } from "../../lib/bracket/types";
import { BRACKET_NAMES, bracketPhrase, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { joinSaid, leftOutCards, readsList, ruleZeroCopy, seatNames, whose, type Said } from "../../lib/copy/rule-zero";
import { isThirdPartyName, PersonName, type PersonParts } from "../../lib/person-name";
import { middleBrackets, sharedReading, type Headline, type SeatDraw, type TableDraw } from "../../lib/rule-zero/table-view";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { BracketMark } from "../decks/bracket-mark";
import { FindingMark } from "../decks/finding-mark";
import { MarkKey, type MarkKeyEntry } from "../decks/mark-key";
import { ProvenanceOpener } from "../decks/provenance-panel";
import { Face } from "../social/face";
import { FLAG_INK, flagKind, type FlagKind } from "./flag-tag";
import { Changed } from "./table-seat";

const copy = ruleZeroCopy;
const BRACKETS: readonly Bracket[] = [1, 2, 3, 4, 5];
/** The rail's five columns span its box less its 4px side padding; the band and spans are placed on them, not the box. */
const COLS = "(100% - 8px)";
/** A range span's bottom on the first face row (above the marks and names), and the step from one face row up to the next. */
const SPAN_BOTTOM = 34;
const FACE_STEP = 33;

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
      {draw.since.length > 0 && draw.youSwapped !== null ? (
        // The viewer's own swap is said even while others' changes take the sentence's place.
        <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty]">
          <Emphasized text={copy.read.youSwapped(em(draw.youSwapped))} />
        </p>
      ) : null}
      {draw.since.length > 0 ? (
        // S5, W5: a change since the viewer last looked takes the sentence's place, as the boards draw it.
        <p data-testid="since" className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty]">
          <Changed text={copy.read.since} className="text-[12px]" />
          {draw.since.map((s, i) => (
            <Swapped key={i} name={s.name} deck={s.deck} />
          ))}
        </p>
      ) : body ? (
        <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty]">
          <Emphasized text={body} />
        </p>
      ) : null}
      {draw.read.kind === "read" ? <Rail draw={draw} /> : null}
      {/* What the counts on each seat are: the shared key, two columns (three wrap "Two-card infinites" at the card's width), all five marks. */}
      <MarkKey marks={COUNTS_KEY} regionAria={copy.read.keyLabel} phoneColumns={2} keepColumnsFromMd />
      <div className="flex flex-col gap-[2px] border-t border-[color:var(--border)] pt-[10px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">
        <span>{copy.read.honest}</span>
        {/* The opener's sheet draws through the shared modal chrome, which reads the card detail context. */}
        <CardDetailProvider>
          <ProvenanceOpener tone="accent" className="self-start" />
        </CardDetailProvider>
      </div>
    </section>
  );
}

/** ` Colin swapped to **Sai Thopters**.`: the copy's sentence with its deck in bold. */
function Swapped({ name, deck }: { name: Said; deck: Said }) {
  return (
    <>
      {" "}
      <Emphasized text={copy.read.swappedTo(name, em(deck))} />
    </>
  );
}

const asParts = (x: Said): PersonParts => (typeof x === "string" || isThirdPartyName(x) ? [x] : x);

/** The headline's phrase in its flag's ink: the words carry it, and the ink repeats the seat's tag. Only the copy's own words are searched. */
function Inked({ text, ink }: { text: PersonParts; ink: { phrase: string; kind: FlagKind } | null }) {
  const at = ink ? text.findIndex((p) => typeof p === "string" && p.toLowerCase().includes(ink.phrase.toLowerCase())) : -1;
  if (!ink || at < 0) return <Emphasized text={text} />;
  const piece = text[at] as string;
  const from = piece.toLowerCase().indexOf(ink.phrase.toLowerCase());
  const end = from + ink.phrase.length;
  return (
    <>
      <Emphasized text={text.slice(0, at)} />
      {piece.slice(0, from)}
      <span data-ink={ink.kind} style={{ color: FLAG_INK[ink.kind] }}>{piece.slice(from, end)}</span>
      {piece.slice(end)}
      <Emphasized text={text.slice(at + 1)} />
    </>
  );
}

/**
 * The sentence names brackets in bold (the boards' `<b>`): `em` marks a phrase where the sentence is spoken, and
 * `Emphasized` draws the marks. The copy module's sentences stay parts: a name inside one is drawn by `PersonName`.
 */
const OPEN = "\u0001";
const CLOSE = "\u0002";
const em = (phrase: Said): PersonParts => [OPEN, ...asParts(phrase), CLOSE];

function Emphasized({ text }: { text: PersonParts }) {
  // Walk the runs, toggling bold at each mark; a name between the marks is a bold name.
  const nodes: Array<{ bold: boolean; node: ReactNode }> = [];
  let bold = false;
  text.forEach((part, i) => {
    if (isThirdPartyName(part)) {
      nodes.push({ bold, node: <PersonName key={i} n={part} /> });
      return;
    }
    part.split(new RegExp(`(${OPEN}|${CLOSE})`)).forEach((piece, j) => {
      if (piece === OPEN) bold = true;
      else if (piece === CLOSE) bold = false;
      else if (piece !== "") nodes.push({ bold, node: <Fragment key={`${i}-${j}`}>{piece}</Fragment> });
    });
  });
  const out: ReactNode[] = [];
  for (let i = 0; i < nodes.length; ) {
    let j = i;
    while (j < nodes.length && nodes[j].bold === nodes[i].bold) j++;
    const run = nodes.slice(i, j).map((n) => n.node);
    out.push(nodes[i].bold ? <b key={i} className="font-semibold text-[color:var(--fg)]">{run}</b> : <Fragment key={i}>{run}</Fragment>);
    i = j;
  }
  return <>{out}</>;
}

/** The bracket a seat reads, spoken: the answer, the single bracket, or the range. */
function readsPhrase(s: SeatDraw): string {
  if (!s.chip) return "";
  if (s.chip.answered !== null) return BRACKET_NAMES[s.chip.answered];
  return bracketPhrase(s.chip.permits);
}

/** Who owns a seat in a sentence: `Colin’s`, or `Your` for the viewer. */
const whoseSeat = (s: SeatDraw): PersonParts => whose(s.seat.you ? null : s.seat.displayName);

/** One seat's part of a read sentence (T4 to T6): what it declared, the range it is measured from, or its bracket. */
function seatPart(s: SeatDraw): PersonParts {
  const r = copy.read;
  const deck = s.seat.deck?.name ?? "";
  if (!s.chip || !s.read) return [];
  if (s.chip.answered !== null && s.chip.permits.length > 1) {
    return r.seatDeclared(s.seat.you ? "You" : s.seat.displayName, em(BRACKET_NAMES[s.chip.answered]));
  }
  if (s.chip.answered === null && s.chip.permits.length > 1) {
    return r.seatReadsRange(whoseSeat(s), deck, em(bracketPhrase(s.chip.permits)), BRACKET_NAMES[s.read.face]);
  }
  return r.seatReads(whoseSeat(s), deck, em(readsPhrase(s)));
}

/** The read seats, the viewer's first, as T8 and T9 name them, and what they all read (null when they differ). */
function compared(draw: TableDraw): { names: PersonParts; both: boolean; reads: PersonParts | null } {
  const read = draw.seats.filter((s) => s.read).sort((a, b) => Number(b.seat.you) - Number(a.seat.you));
  const shared = sharedReading(read);
  return {
    names: seatNames(read.map((s) => (s.seat.you ? null : s.seat.displayName))),
    both: read.length === 2,
    reads: shared ? em(bracketPhrase(shared)) : null,
  };
}

type Speech = { title: PersonParts; ink: { phrase: string; kind: FlagKind } | null; body: PersonParts | null };

function speak(draw: TableDraw): Speech {
  const h: Headline = draw.headline;
  const r = copy.read;
  let out: Speech;
  switch (h.kind) {
    case "nothing":
      return { title: [r.nothing], ink: null, body: [r.nothingBody] };
    case "split":
      out = {
        title: [r.split],
        ink: { phrase: copy.seat.split, kind: "split" },
        body: joinSaid([r.splitBody, readsList(draw.seats.filter((s) => s.read).map(seatPart))]),
      };
      break;
    case "balanced":
      out = { title: [h.reads ? r.balanced(bracketPhrase(h.reads)) : r.balancedMixed], ink: null, body: [r.balancedBody] };
      break;
    case "one": {
      const deck = h.seat.seat.deck?.name ?? "";
      const who = whose(h.seat.seat.you ? null : h.seat.seat.displayName);
      const middle = draw.read.kind === "read" ? em(bracketPhrase(middleBrackets(draw.read.middle))) : [];
      const reads = em(readsPhrase(h.seat));
      const line = h.seat.rangeLine;
      // T7: a drifted declaration replaces the closing line; T3: a low seat closes on its own line.
      const body = line?.kind === "drifted"
        ? joinSaid([r.sitsAt(middle, deck, reads), r.driftNote(who, BRACKET_NAMES[line.declared])])
        : h.seat.seat.you && draw.closer > 0
          ? joinSaid([r.sitsAt(middle, deck, reads), r.closer(draw.closer)])
          : h.dir === "high" ? r.oneBody(middle, deck, reads) : r.lowBody(middle, deck, reads);
      out = h.dir === "high"
        ? { title: r.high(who, deck), ink: { phrase: copy.seat.above, kind: "high" }, body }
        : { title: r.low(who, deck), ink: { phrase: copy.seat.below, kind: "low" }, body };
      break;
    }
    case "two":
    case "many": {
      const middle = draw.read.kind === "read" ? em(bracketPhrase(middleBrackets(draw.read.middle))) : [];
      const parts = readsList(draw.seats.filter((s) => s.read?.flag).map(seatPart));
      out = { title: [h.kind === "two" ? r.two : r.many(h.n)], ink: null, body: joinSaid([r.middleIs(middle), parts]) };
      break;
    }
    case "reading": {
      // The seat being read is left out until it lands, and the sentence already says it joins.
      const c = compared(draw);
      const name = h.seat.seat.displayName;
      const body = c.reads ? r.readingBody(c.names, c.both, c.reads, name) : r.readingMixed(c.names, name);
      out = { title: r.reading(name), ink: null, body };
      break;
    }
    case "leftOut": {
      const c = compared(draw);
      const sized = draw.seats.flatMap((s) =>
        s.state.kind === "illegal" ? [{ name: s.seat.you ? null : s.seat.displayName, cards: s.state.cards }] : [],
      );
      const comparing = c.reads ? r.comparing(c.names, c.both, c.reads) : r.comparingMixed(c.names);
      const body = joinSaid([comparing, leftOutCards(sized)].filter((x) => x.length > 0));
      out = { title: [r.leftOut(h.n)], ink: null, body };
      break;
    }
  }
  // S2: the viewer's own swap this visit replaces the sentence, until the visit ends. A read that says a seat is still
  // being read, or which seats it leaves out, keeps that after it: the swap does not make it untrue.
  const keeps = h.kind === "reading" || h.kind === "leftOut";
  if (draw.youSwapped !== null) out.body = joinSaid([r.youSwapped(em(draw.youSwapped)), ...(keeps && out.body ? [out.body] : [])]);
  // The headline says it leaves seats out (decision 3): the sentence that follows says so whenever the headline
  // itself does not.
  if (draw.leftOut > 0 && !keeps) out.body = joinSaid([...(out.body ? [out.body] : []), r.leftOut(draw.leftOut)]);
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
          style={{ left: `calc(${COLS} * ${(middle - 1) / 5} + 6px)`, width: `calc(${COLS} / 5 - 4px)` }}
        >
          <span className="absolute inset-x-0 top-[5px] text-center font-mono text-[8.5px] font-medium tracking-[0.14em] text-[color:var(--accent-text)]">
            {copy.read.band}
          </span>
        </span>
      ) : null}
      {ranges.map((s) => {
        const lo = s.chip!.permits[0];
        const hi = s.chip!.permits[s.chip!.permits.length - 1];
        // A span rides its own face's row: faces in a column stack upward from the marks, one 30px face and a 3px gap
        // apart, so two ranges whose faces share a column each follow their own face rather than overlapping.
        const row = placed.filter((p) => p.read!.face === s.read!.face).indexOf(s);
        return (
          <span
            key={s.key}
            data-testid="read-span"
            data-row={row}
            className="absolute z-0 h-[30px] rounded-[15px] border border-dashed border-[color:var(--fg-faint)]"
            style={{
              bottom: `${SPAN_BOTTOM + row * FACE_STEP}px`,
              left: `calc(${COLS} * ${(lo - 1 + 0.2) / 5} + 4px)`,
              width: `calc(${COLS} * ${(hi - lo + 0.6) / 5})`,
            }}
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

/** The five finding marks in `findings` order, each with its shipped label. Always all five: every seat draws all five counts. */
const COUNTS_KEY: MarkKeyEntry[] = FINDING_ORDER.map((id) => ({ id, sample: <FindingMark id={id} />, word: deckAnalysisCopy.findings.labels[id] }));
