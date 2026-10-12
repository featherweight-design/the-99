"use client";
// The post-import summary: what the collection replace did to the decks.
//
// Three sections, any of which may be empty, and NO PRICES OR TOTALS ANYWHERE. A cleared
// purchase has no honest figure — the app cannot know what the player paid, or whether they
// paid, since booster, trade and gift are all arrivals — and a figure for what is still owed is
// real but not actionable on a receipt. The place to act on a price is the deck's Shopping list,
// which the section note points at. Dropping the totals also removed a defect rather than only
// simplifying: a right-aligned figure on a heading rule, directly under the previous section's
// last row, reads as THAT list's bottom total.
//
// The money sections are the frozen payload; the contested section is live. `Done` is a ROUTE
// and says so: a page of consequences must not look like a form.

import { useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";
import type { ArrivalsSummary, ClearedRow, StillRow } from "../../lib/collection/arrivals";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import { addedCopyCopy } from "../../lib/copy/added-copy";
import { wentSentence } from "../../lib/collection/copy-line";
import { IssueInspector } from "./issue-inspector";
import { ContestedCardRow } from "../decks/contested-card-row";
import { CopyLine } from "../decks/copy-line";
import { PrimaryButton } from "../ui/button";

/** Money sections truncate at four; the contested section never does. */
const MONEY_LIMIT = 4;

function SectionHead({ label, note }: { label: string; note: string }) {
  return (
    <div className="mb-[10px]">
      <h2
        className="font-mono text-[11px] uppercase tracking-[0.16em] m-0"
        style={{ color: "var(--fg-body)" }}
      >
        {label}
      </h2>
      <p className="text-[12.5px] mt-[5px] mb-0" style={{ color: "var(--fg-faint)" }}>{note}</p>
    </div>
  );
}

/**
 * The committed decks this upload left short, named, most short first (the warning's order). A
 * version-2 receipt carries none. A deck whose name was not frozen is left out rather than drawn
 * blank.
 */
export function nowShortDecks(summary: ArrivalsSummary | null, deckNames: Record<string, string>): string[] {
  const byDeck = new Map<string, number>();
  for (const r of summary?.nowShort ?? []) byDeck.set(r.deckId, (byDeck.get(r.deckId) ?? 0) + r.short);
  return [...byDeck]
    .sort((a, b) => b[1] - a[1])
    .flatMap(([deckId]) => (deckNames[deckId] ? [deckNames[deckId]] : []));
}

/** One money row: the card, the deck, and — on a still-owed row — why it is still owed. */
export function ReceiptRow({
  cardName,
  deckName,
  reason,
  warn,
}: {
  cardName: string;
  deckName: string;
  reason?: string;
  /** `--warning` is reserved for the one reason a player can act on without buying anything. */
  warn?: boolean;
}) {
  return (
    <li
      // 46px two-line on a phone, 44px one-line from `md` — the handoff's receipt-row metrics,
      // stated rather than left to padding and an inherited line-height, which landed at about
      // 39px on desktop and 60px on a phone.
      className="flex flex-col justify-center md:flex-row md:items-center gap-[2px] md:gap-[10px] py-[6px] min-h-[46px] md:min-h-[44px]"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <span className="text-[13.5px] font-semibold md:flex-1 min-w-0 md:truncate" style={{ color: "var(--fg)" }}>
        {cardName}
      </span>
      {/* ONE SUBLINE ON A PHONE, two columns from `md`. Left as three flex children the row grew
          a third line and the deck name was ellipsised at every width; the handoff's 390px row
          puts the deck and its reason on one subline and keeps the name whole. Truncation is a
          desktop-only affordance here for the same reason. */}
      <span className="flex items-baseline gap-[8px] min-w-0 md:contents">
        <span className="text-[13px] md:flex-none min-w-0 md:truncate" style={{ color: "var(--fg-body)" }}>
          {deckName}
        </span>
        {reason ? (
          <span
            className="font-mono text-[10.5px] md:text-[11px] flex-none md:flex-none"
            // `--warning` is reserved for the one reason a player can act on without buying
            // anything: they own the card and the CSV line failed. Every other reason is a fact
            // about what they have to go and buy, and reads in the faint ramp.
            style={{ color: warn ? "var(--warning)" : "var(--fg-faint)" }}
          >
            {reason}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/** One `No longer to buy` row: the line for a whole card (version 4), or the shipped deck row. */
type ClearedItem =
  | { kind: "line"; oracleId: string; sentence: string }
  | { kind: "row"; row: ClearedRow };

/**
 * The `No longer to buy` rows. A version-4 receipt read with the switch on draws ONE ROW PER CARD,
 * carrying where its copies went; a card the line cannot speak for (no `went`, a frozen name gone,
 * or a card the contested section is still deciding) keeps its shipped per-deck rows. Every other
 * receipt draws exactly what it always did.
 */
export function clearedItems(
  summary: ArrivalsSummary | null,
  addedCopy: boolean,
  contestedIds: ReadonlySet<string>,
): ClearedItem[] {
  const cleared = summary?.cleared ?? [];
  const went = summary?.went;
  if (!addedCopy || summary?.version !== 4 || !went) return cleared.map((row) => ({ kind: "row", row }));
  const byCard = new Map<string, ClearedRow[]>();
  for (const row of cleared) byCard.set(row.oracleId, [...(byCard.get(row.oracleId) ?? []), row]);
  return [...byCard].flatMap(([oracleId, rows]): ClearedItem[] => {
    const w = went[oracleId];
    const sentence = w && !contestedIds.has(oracleId) ? wentSentence(w, summary.names.decks) : null;
    return sentence ? [{ kind: "line", oracleId, sentence }] : rows.map((row) => ({ kind: "row", row }));
  });
}

function reasonText(row: StillRow): { text: string; warn: boolean } {
  switch (row.reason.kind) {
    case "partly":
      return { text: copy.summary.reasonPartly(row.reason.arrived, row.reason.wanted), warn: false };
    case "unmatched":
      return { text: copy.summary.reasonUnmatched, warn: true };
    default:
      return { text: copy.summary.reasonGone, warn: false };
  }
}

export function ArrivalsSummary({
  summary,
  contested,
  preview,
  filename,
  stampDate,
  addedCopy = false,
  chooser = {},
}: {
  /** Null when the receipt did not survive its write — renders the nothing-to-report state. */
  summary: ArrivalsSummary | null;
  contested: ContestedCard[];
  /** For the issues line's route back. Null when the upload had no problems at all. */
  preview: UploadPreview | null;
  filename: string;
  stampDate: string;
  /** `ADDED_COPY_ENABLED`, read by the page. Off, the receipt draws what it always drew. */
  addedCopy?: boolean;
  /** The chooser behind each line's Change, by oracle id (`loadSummaryView`). */
  chooser?: Record<string, ContestedCard>;
}) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [showAllCleared, setShowAllCleared] = useState(false);
  const [showAllStill, setShowAllStill] = useState(false);

  const cleared = summary?.cleared ?? [];
  const clearedRows = clearedItems(summary, addedCopy, new Set(contested.map((c) => c.oracleId)));
  const hasLine = clearedRows.some((r) => r.kind === "line");
  const still = summary?.still ?? [];
  // What `Still to buy` is actually SHOWING — the rest sit behind `Show all`.
  const stillShown = showAllStill ? still : still.slice(0, MONEY_LIMIT);
  // THE FROZEN SECTIONS DECIDE THIS, not the live one. `summary.contested` is a record of what
  // this import left contested; `contested` is what is still contested NOW, and a row leaves it
  // when the shortage resolves. Reading the live list here makes a receipt whose only
  // consequence was a contested arrival announce that nothing your decks care about moved —
  // about an import that moved something. The live list still controls which rows are DRAWN.
  const names = summary?.names ?? { cards: {}, decks: {} };
  const nowShort = nowShortDecks(summary, names.decks);
  const nothingToReport = cleared.length === 0 && still.length === 0
    && (summary?.contested.length ?? 0) === 0 && nowShort.length === 0;

  const unmatched = summary?.issues.unmatched ?? 0;
  const parseErrors = summary?.issues.parseErrors ?? 0;
  const hasIssues = unmatched + parseErrors > 0;

  return (
    // CENTRED, not pinned left. The 760px cap is the handoff's; what it did not say was where
    // the column sits in a body that is far wider than it, and at 1440 the receipt read as a
    // narrow strip against a screen of empty ground.
    <div className="mx-auto w-full p-[18px] md:p-[28px_34px] max-w-[760px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] m-0" style={{ color: "var(--fg-faint)" }}>
        {copy.summary.eyebrow}
      </p>
      <h1 className="font-display font-bold text-[24px] md:text-[30px] mt-[6px] mb-[8px]" style={{ color: "var(--fg)" }}>
        {/* A LOST RECEIPT HAS NO FIGURE, and must not invent one. `summary` is null only when
            the payload did not survive its write, and `heading(0)` would then tell a player
            with 2,733 cards that they have none — a false statement, and one that makes a
            successful import look like an emptied collection. */}
        {summary ? copy.summary.heading(summary.totalAfter) : copy.summary.headingNoReceipt}
      </h1>
      <p className="text-[13.5px] m-0" style={{ color: "var(--fg-body)" }}>
        {/* THE FROZEN SECTIONS CHOOSE THE SENTENCE, for the reason the empty state does: a row
            whose contention has since resolved leaves the LIVE list, and reading that list here
            would let a receipt that recorded a contested arrival announce that every arrival had
            a copy to spare.

            Three sentences, and the middle one is narrower than it looks. `ledeNoContention`
            claims every arrival a committed deck was waiting for had a copy to SPARE, which is
            false whenever anything is still owed — including a single deck short by two copies,
            which is deliberately not a contested row because there is nobody to choose between.
            That case takes the neutral sentence. */}
        {nothingToReport
          ? copy.summary.ledeNothingToReport
          : (summary?.contested.length ?? 0) > 0
            ? copy.summary.lede(summary?.totalBefore ?? 0, summary?.arrived ?? 0, summary?.left ?? 0)
            : still.length > 0 || nowShort.length > 0
              ? copy.summary.ledeOwing(summary?.totalBefore ?? 0, summary?.arrived ?? 0, summary?.left ?? 0)
              : copy.summary.ledeNoContention(summary?.totalBefore ?? 0, summary?.arrived ?? 0, summary?.left ?? 0)}
        {nowShort.length > 0 ? ` ${copy.summary.nowShort(nowShort)}` : ""}
      </p>
      <p className="font-mono text-[10.5px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
        {copy.summary.fileStamp(stampDate, filename)}
        {/* On the empty receipt the lede says nothing your DECKS care about moved, and without
            the file's own delta beside it that reads as an import which did nothing at all. */}
        {nothingToReport && summary ? ` · ${copy.summary.fileDelta(summary.arrived + summary.left)}` : ""}
      </p>

      {/* The issues line. Counts and a route back, never the list again: `IssueInspector`
          already read it out at the moment it could still change the decision. */}
      {hasIssues ? (
        <p className="text-[12.5px] mt-[14px] mb-0" style={{ color: "var(--warning)" }}>
          {parseErrors > 0
            ? copy.summary.issues(unmatched, parseErrors)
            : copy.summary.issuesUnmatchedOnly(unmatched)}
          {preview ? (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="underline text-[color:var(--accent)]"
              >
                {copy.summary.issuesLink}
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {cleared.length > 0 ? (
        <section className="mt-[26px]">
          <SectionHead
            label={copy.summary.sectionCleared(clearedRows.length)}
            note={hasLine ? copy.summary.sectionClearedNote + addedCopyCopy.summaryNoteTail : copy.summary.sectionClearedNote}
          />
          <ul className="list-none p-0 m-0">
            {(showAllCleared ? clearedRows : clearedRows.slice(0, MONEY_LIMIT)).map((item) => (
              item.kind === "line" ? (
                <CopyLine
                  key={item.oracleId}
                  cardName={names.cards[item.oracleId] ?? ""}
                  sentence={item.sentence}
                  chooser={chooser[item.oracleId]}
                />
              ) : (
                <ReceiptRow
                  key={`${item.row.deckId}:${item.row.oracleId}`}
                  cardName={names.cards[item.row.oracleId] ?? ""}
                  deckName={names.decks[item.row.deckId] ?? ""}
                />
              )
            ))}
          </ul>
          {clearedRows.length > MONEY_LIMIT && !showAllCleared ? (
            <button
              type="button"
              onClick={() => setShowAllCleared(true)}
              className="font-mono text-[11px] mt-[8px] text-[color:var(--accent)]"
            >
              {copy.summary.showAll(clearedRows.length)}
            </button>
          ) : null}
        </section>
      ) : null}

      {still.length > 0 ? (
        <section className="mt-[26px]">
          <SectionHead label={copy.summary.sectionStill(still.length)} note={copy.summary.sectionStillNote} />
          <ul className="list-none p-0 m-0">
            {stillShown.map((row) => {
              const reason = reasonText(row);
              return (
                <ReceiptRow
                  key={`${row.deckId}:${row.oracleId}`}
                  cardName={names.cards[row.oracleId] ?? ""}
                  deckName={names.decks[row.deckId] ?? ""}
                  reason={reason.text}
                  warn={reason.warn}
                />
              );
            })}
          </ul>
          {still.length > MONEY_LIMIT && !showAllStill ? (
            <button
              type="button"
              onClick={() => setShowAllStill(true)}
              className="font-mono text-[11px] mt-[8px] text-[color:var(--accent)]"
            >
              {copy.summary.showAll(still.length)}
            </button>
          ) : null}
        </section>
      ) : null}

      {contested.length > 0 ? (
        <section className="mt-[26px]">
          <SectionHead
            label={copy.summary.sectionShort(contested.length)}
            note={copy.summary.sectionShortNote}
          />
          <div className="flex flex-col gap-[9px]">
            {contested.map((card) => (
              <ContestedCardRow
                key={card.oracleId}
                card={card}
                addedCopy={addedCopy}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-[30px]">
        <PrimaryButton href="/collection" className="px-[18px] py-[9px] text-[13.5px]">{copy.summary.done}</PrimaryButton>
      </div>

      {inspectorOpen && preview ? (
        <IssueInspector
          preview={preview}
          initialTab={preview.unmatchedRows.length === 0 ? "errors" : "unmatched"}
          onClose={() => setInspectorOpen(false)}
        />
      ) : null}
    </div>
  );
}
