"use client";

import { useState } from "react";

import { SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import type { BracketLean } from "../../lib/bracket/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { cssUrl } from "../../lib/collection/browse";
import type { CardRef } from "../../lib/profile/types";
import { ComboGlyph } from "../cards/combo-glyph";
import { CardDetailTrigger, type Sibling } from "../cards/card-detail-provider";
import { ModalChrome, type FindingArt } from "./receipt-modal";

const copy = deckAnalysisCopy;

/**
 * The lean: "How we determined this bracket", one sentence, and the reasoning behind it.
 *
 * DRAWN ONLY WHERE A COMBO DECIDED A SINGLE BRACKET. `leanFor` returns null on a range and on a
 * deck already past Upgraded for another reason, so this line and the declaration ask never
 * share the block — frames 1e/1f of the declaration canvas draw them together, and that is a
 * state the code cannot produce.
 *
 * THE PAIR NAMED, AND WHAT THE SENTENCE SAYS ABOUT IT, come from `leanReading` below. The two
 * names open their cards; the control opens the reasoning.
 */
export function LeanLine({
  lean,
  bracket,
  art,
  commanderOracleIds,
}: {
  lean: BracketLean;
  /** The single bracket the verdict permits: 4 when reachable, 3 when not. */
  bracket: 3 | 4;
  art: FindingArt;
  commanderOracleIds: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const read = leanReading(lean, commanderOracleIds);
  if (!read) return null;
  const { receipt, reading } = read;
  const [a, b] = receipt.combo.cards;
  const nameOf = (c: CardRef) => art.get(c.oracleId)?.name ?? c.name;
  const parts = {
    reachable: copy.lean.reachableParts,
    reachableCommander: copy.lean.reachableCommanderParts,
    reachableZone: copy.lean.reachableZoneParts,
    oneHalf: copy.lean.oneHalfParts,
    neither: copy.lean.drawOnlyParts,
  }[reading](nameOf(a), nameOf(b));
  const siblings = receipt.combo.cards.map((c) => ({ oracleId: c.oracleId, name: nameOf(c), imageUri: art.get(c.oracleId)?.imageUri ?? null }));

  return (
    <div
      className="mt-[13px] flex flex-col gap-[5px] border-t border-[color:var(--border)] pt-[11px]"
      data-testid="lean-line"
      data-reason={lean.reason}
      data-reading={reading}
    >
      <span
        className="font-mono text-[9px] uppercase tracking-[0.14em]"
        style={{ color: "var(--fg-disabled)" }}
      >
        {copy.lean.label}
      </span>
      <p className="m-0 text-[12.5px] leading-[1.6] [text-wrap:pretty]" style={{ color: "var(--fg-muted)" }}>
        {parts.map((part, i) =>
          i === 1 || i === 3 ? (
            <CardDetailTrigger
              key={i}
              oracleId={(i === 1 ? a : b).oracleId}
              name={part}
              siblings={siblings}
              className="inline border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)] text-[color:var(--fg)] text-[length:inherit] leading-[inherit]"
            >
              {part}
            </CardDetailTrigger>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="self-start mt-[2px] inline-flex min-h-[44px] md:min-h-0 items-center gap-[6px] bg-transparent border-0 p-0 font-mono text-[10px] cursor-pointer text-[color:var(--accent)]"
      >
        {/* The arrow because it opens a sheet: every opener on the tab carries one (§2). */}
        <span className="border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)]">{copy.lean.open}</span>
        <span aria-hidden>→</span>
      </button>
      {open ? (
        <ReasoningModal
          reading={reading}
          receipt={receipt}
          bracket={bracket}
          art={art}
          commanderOracleIds={commanderOracleIds}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export type LeanReading = "reachable" | "reachableCommander" | "reachableZone" | "oneHalf" | "neither";

/**
 * Which pair the lean names, and which of three things is true of it.
 *
 * `leanFor` reads `drawOnly` whenever the tutors fall short of EVERY piece, which covers a pair
 * with one half found as well as a pair with none — and the handoff's draw-only sentence ("nothing
 * in it searches for either half") is only true of the second. So coverage is counted here per
 * piece, a commander half counting as covered because the format puts it in the zone every game,
 * exactly as `comboLandsEarly` counts it.
 *
 * On a reachable lean the pair is `decidedBy`. On a draw-only one nothing decided anything and
 * the combos are NOT alike, so the one named is the best covered — the pair nearest to being
 * assembled, which is what a reader deciding what to cut or add wants to see first — with the
 * join's order breaking a tie.
 */
export function leanReading(
  lean: BracketLean,
  commanderOracleIds: readonly string[],
): { receipt: BracketLean["receipts"][number]; reading: LeanReading } | null {
  const covered = (r: BracketLean["receipts"][number]) =>
    r.pieces.filter((p) => p.tutors.length > 0 || commanderOracleIds.includes(p.piece.oracleId)).length;
  if (lean.reason === "reachable") {
    const receipt =
      lean.receipts.find((r) => r.combo.variantId === lean.decidedBy?.variantId) ?? lean.receipts[0];
    if (!receipt) return null;
    // "This deck can find both halves" is false of a commander half, which the command zone
    // covers with no tutor — so the reachable sentence counts them, as coverage does.
    const inZone = receipt.pieces.filter((p) => commanderOracleIds.includes(p.piece.oracleId)).length;
    return {
      receipt,
      reading: inZone >= 2 ? "reachableZone" : inZone === 1 ? "reachableCommander" : "reachable",
    };
  }
  let best: BracketLean["receipts"][number] | null = null;
  for (const r of lean.receipts) if (!best || covered(r) > covered(best)) best = r;
  if (!best) return null;
  return { receipt: best, reading: covered(best) > 0 ? "oneHalf" : "neither" };
}

/**
 * The receipt modal's third body: the deciding combo, one plate per half, and what finds each.
 *
 * TUTORS ARE GROUPED BY THE HALF THEY FIND — never a flat list, never a total, never `n of n` in
 * the header. A commander half is covered with no tutor at all, because the format puts it in
 * the zone every game, and it says so rather than reading as unfound.
 */
function ReasoningModal({
  reading,
  receipt,
  bracket,
  art,
  commanderOracleIds,
  onClose,
}: {
  reading: LeanReading;
  receipt: BracketLean["receipts"][number];
  bracket: 3 | 4;
  art: FindingArt;
  commanderOracleIds: readonly string[];
  onClose: () => void;
}) {
  const title = copy.reasoning.title(bracket);
  // "Both halves findable" is true of all three reachable readings: a commander half is found
  // by the command zone, which is what the body's `found by` says of it.
  const qualifier =
    reading === "oneHalf" ? copy.reasoning.qualifierOneHalf(bracket)
    : reading === "neither" ? copy.reasoning.qualifierDrawOnly(bracket)
    : copy.reasoning.qualifierReachable(bracket);
  const siblingCards = new Map<string, CardRef>();
  for (const p of receipt.pieces) {
    siblingCards.set(p.piece.oracleId, p.piece);
    for (const t of p.tutors) siblingCards.set(t.oracleId, t);
  }
  const siblings = [...siblingCards.values()].map((c) => ({
    oracleId: c.oracleId,
    name: art.get(c.oracleId)?.name ?? c.name,
    imageUri: art.get(c.oracleId)?.imageUri ?? null,
  }));

  return (
    <ModalChrome
      mark={<ComboGlyph />}
      title={title}
      // DESKTOP ONLY in the header. At 390 the heading and the qualifier cannot share the one
      // 43px line the stacked card sheet leaves visible — the contact sheet drew both truncated —
      // so on the phone the qualifier opens the body instead, whole.
      aside={<span className="hidden md:inline">{qualifier}</span>}
      closeLabel={copy.receipt.closeAria(title)}
      onClose={onClose}
      width={700}
      ground="var(--elevated)"
    >
      <div className="flex flex-col gap-[15px] px-[16px] pt-[14px] pb-[16px] md:px-[18px] md:pt-[16px] md:pb-[18px]">
        <span className="md:hidden font-mono text-[11px]" style={{ color: "var(--fg-faint)" }} data-testid="reasoning-qualifier">
          {qualifier}
        </span>
        <p className="m-0 text-[12.5px] leading-[1.65]" style={{ color: "var(--fg-muted)" }}>
          {copy.reasoning.threshold(4)}
          {receipt.pieces.some((p) => commanderOracleIds.includes(p.piece.oracleId))
            ? ` ${copy.reasoning.thresholdCommander}`
            : null}
        </p>
        <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-[14px]" data-testid="reasoning-pieces">
          {receipt.pieces.map(({ piece, tutors }, i) => {
            const commander = commanderOracleIds.includes(piece.oracleId);
            return (
              <li
                key={piece.oracleId}
                className="flex gap-[13px] rounded-[10px] border border-[color:var(--border)] p-[13px]"
                style={{ background: "var(--surface)" }}
                data-testid="reasoning-piece"
              >
                <CardDetailTrigger
                  oracleId={piece.oracleId}
                  name={art.get(piece.oracleId)?.name ?? piece.name}
                  siblings={siblings}
                  className="flex-none"
                >
                  <span
                    className="block w-[100px] h-[140px] rounded-[6px] border border-[color:var(--border-strong)] bg-cover bg-center"
                    style={{
                      backgroundColor: "var(--surface-raised)",
                      backgroundImage: art.get(piece.oracleId)?.imageUri
                        ? cssUrl(art.get(piece.oracleId)!.imageUri!)
                        : undefined,
                    }}
                  />
                </CardDetailTrigger>
                <span className="flex min-w-0 flex-col gap-[8px]">
                  <span className="flex flex-col gap-[3px]">
                    <span className="text-[13px] font-semibold leading-[1.3]" style={{ color: "var(--fg)" }}>
                      {art.get(piece.oracleId)?.name ?? piece.name}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>
                      {commander ? copy.reasoning.pieceCommander(i + 1) : copy.reasoning.piece(i + 1)}
                    </span>
                  </span>
                  <span className="flex flex-col gap-[5px] border-t border-[color:var(--border)] pt-[8px]">
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.12em]"
                      style={{ color: "var(--fg-disabled)" }}
                    >
                      {copy.reasoning.foundBy}
                    </span>
                    {commander ? (
                      <span className="text-[11.5px]" style={{ color: "var(--fg-body)" }} data-found="command-zone">
                        {copy.reasoning.foundByCommandZone}
                      </span>
                    ) : tutors.length === 0 ? (
                      <span className="text-[11.5px]" style={{ color: "var(--fg-faint)" }} data-found="none">
                        {copy.reasoning.foundByNone}
                      </span>
                    ) : (
                      <span className="flex flex-col items-start gap-[4px]" data-found="tutors">
                        {tutors.map((t) => (
                          <CardDetailTrigger
                            key={t.oracleId}
                            oracleId={t.oracleId}
                            name={art.get(t.oracleId)?.name ?? t.name}
                            siblings={siblings}
                            className="text-left text-[11.5px] border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)] text-[color:var(--fg-body)]"
                          >
                            {art.get(t.oracleId)?.name ?? t.name}
                          </CardDetailTrigger>
                        ))}
                      </span>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-[6px] border-t border-[color:var(--border)] pt-[12px]">
          <p className="m-0 text-[12px] leading-[1.6]" style={{ color: "var(--fg-faint)" }}>
            {copy.reasoning.tutorsAreNotALimit}
          </p>
          <span className="flex flex-wrap items-center gap-[14px]">
            <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
              {copy.receipt.assembled}
            </span>
            <a
              href={SPELLBOOK_SOURCE.variantUrl(receipt.combo.variantId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] md:min-h-0 items-center font-mono text-[10.5px] no-underline text-[color:var(--accent)]"
            >
              <span className="border-b border-b-[color:var(--accent)] border-[color:var(--accent)]">{copy.provenance.source(copy.receipt.spellbook)}</span>
            </a>
          </span>
        </div>
      </div>
    </ModalChrome>
  );
}
