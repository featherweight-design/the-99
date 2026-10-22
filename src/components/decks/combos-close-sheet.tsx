"use client";

// Combos one piece away, the list (combos close R1, calls 2 and 3; `The-List.dc.html`): a sheet at
// 390 and a 900 modal at 1300, in the pass sheet's frame (`SheetFrame`). Grouped You own it (a spare,
// then a copy in another deck) and To buy (cheapest first, unpriced last), in the order the read
// ranked them (`rankNearCombos`: spare, elsewhere, priced buy, unpriced buy), so grouping is a split
// and never a re-sort. A group with no rows is not drawn.
//
// UI-1: the row is not yet a press (UI-2 makes it open the combo); its chevron column is drawn now so
// that press lands without moving anything. The one control inside a row is the other deck's name, a
// link, which is why the row is a plain container: a link may not sit inside a button.

import { priceCopy } from "../../lib/copy/price";
import Link from "next/link";

import { combosCloseCopy } from "../../lib/copy/combos-close";
import type { NearCombo, NearCombos } from "../../lib/combos/near-combos";
import { formatCents } from "../../lib/decks/price";
import { producesInfiniteTurns } from "../../lib/spellbook/combo-features";
import { CardFactMark } from "../cards/card-fact-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { ComboGlyph } from "../cards/combo-glyph";
import { SheetFrame } from "./pass-sheet";

const copy = combosCloseCopy.sheet;

/** Split the ranked list into the sheet's two groups, keeping the read's order inside each. */
export function groupNearCombos(combos: readonly NearCombo[]): { own: NearCombo[]; buy: NearCombo[] } {
  return {
    own: combos.filter((c) => c.missing.where.kind !== "buy"),
    buy: combos.filter((c) => c.missing.where.kind === "buy"),
  };
}

export function CombosCloseSheet({
  nearCombos,
  deckName,
  commanderOracleIds,
  onClose,
}: {
  nearCombos: NearCombos;
  deckName: string;
  /** The deck's commanders: a held piece among them carries the `commander` tag. */
  commanderOracleIds: readonly string[];
  onClose: () => void;
}) {
  // The count is the read's `total`, the same figure the segment states (one count, two places).
  const n = nearCombos.total;
  const { own, buy } = groupNearCombos(nearCombos.combos);
  return (
    <SheetFrame
      eyebrow={copy.eyebrow}
      title={copy.title(n)}
      lead={copy.lead(n, deckName)}
      closeLabel={copy.closeAria}
      onClose={onClose}
      width={900}
      fit
      doneLabel={copy.done}
    >
      {/* `.oa` */}
      <div className="flex flex-col gap-[6px] px-[12px] pt-[10px] pb-[12px]" data-combos-close-list>
        <Group label={copy.groups.own} combos={own} first commanderOracleIds={commanderOracleIds} />
        <Group label={copy.groups.buy} combos={buy} first={own.length === 0} commanderOracleIds={commanderOracleIds} />
        <p className="m-0 px-[4px] pt-[4px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.foot}</p>
      </div>
    </SheetFrame>
  );
}

function Group({
  label,
  combos,
  first,
  commanderOracleIds,
}: {
  label: string;
  combos: NearCombo[];
  first: boolean;
  commanderOracleIds: readonly string[];
}) {
  if (combos.length === 0) return null;
  return (
    <>
      {/* `.oa h5`: 13px sans, its count in faint mono. */}
      <h3
        data-combos-close-group={label}
        className={`m-0 ml-[2px] mb-[2px] flex items-baseline gap-[8px] font-sans text-[13px] font-semibold text-[color:var(--fg)] ${first ? "" : "mt-[8px]"}`}
      >
        {label}
        <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{combos.length}</span>
      </h3>
      {combos.map((c) => (
        <ComboRow key={c.variantId} combo={c} commanderOracleIds={commanderOracleIds} />
      ))}
    </>
  );
}

/**
 * `.or` at 390 (marks, then the missing card over `with`, the where-line and what it does, then the
 * chevron) and `.md2 .or` from md: one line, columns aligned (marks 38, the name, `with` taking the
 * rest at least 200, where 190, what it does 190 right-aligned), at least 44 tall. One subtree, two
 * layouts. The name may truncate at md (the mock holds it `flex: none`): a long name with `with` at
 * its 200 floor would otherwise push the where column out of line with the rows around it.
 */
function ComboRow({ combo, commanderOracleIds }: { combo: NearCombo; commanderOracleIds: readonly string[] }) {
  const held = combo.pieces.filter((p) => p.held && p.oracleId !== combo.missing.oracleId);
  return (
    <div
      data-combo-row
      data-where={combo.missing.where.kind}
      className="relative flex items-start gap-[10px] rounded-[9px] bg-[color:var(--surface-rail)] py-[10px] pr-[4px] pl-[11px] md:min-h-[44px] md:items-center md:gap-[12px] md:py-0 md:pr-[6px] md:pl-[14px]"
    >
      {/* `.gl`: the lemniscate, and the turn-again mark under it (beside it from md) for a loop of turns. */}
      <span className="flex flex-none flex-col gap-[5px] pt-[2px] md:w-[38px] md:flex-row md:pt-0">
        <ComboGlyph />
        {producesInfiniteTurns(combo.produces) ? (
          <FactTooltip sentence={copy.loopMark}>
            <CardFactMark fact="extraTurns" />
          </FactTooltip>
        ) : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[12px]">
        <span className="min-w-0 truncate text-[14px] font-semibold text-[color:var(--fg)] md:flex-initial md:text-[13.5px]">
          {combo.missing.name}
        </span>
        <span className="text-[12.5px] leading-[1.4] text-[color:var(--fg-body)] md:min-w-[200px] md:flex-1 md:truncate md:whitespace-nowrap">
          {copy.with}{" "}
          {held.map((p, i) => (
            <span key={p.oracleId}>
              {i > 0 ? ", " : null}
              <b className="font-medium text-[color:var(--fg)]">{p.name}</b>
              {commanderOracleIds.includes(p.oracleId) ? (
                <span className="ml-[4px] font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.commander}</span>
              ) : null}
            </span>
          ))}
        </span>
        <span className="mt-[2px] flex flex-wrap items-center gap-[8px] font-mono text-[10.5px] text-[color:var(--fg-body)] md:mt-0 md:flex-none md:flex-nowrap">
          <span className="inline-flex items-center gap-[7px] md:w-[190px]" data-where-line>
            <Where combo={combo} />
          </span>
          {combo.produces[0] ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] md:w-[190px] md:whitespace-nowrap md:text-right">
              {combo.produces[0]}
            </span>
          ) : null}
        </span>
      </div>
      <span aria-hidden className="w-[28px] flex-none self-center text-center text-[15px] text-[color:var(--fg-faint)]">
        ›
      </span>
    </div>
  );
}

/** A green dot for a card the reader owns; a hollow dashed ring for one to buy. */
function Dot({ owned }: { owned: boolean }) {
  return owned ? (
    <span aria-hidden data-dot="owned" className="inline-block size-[8px] flex-none rounded-full bg-[color:var(--success)]" />
  ) : (
    <span aria-hidden data-dot="buy" className="inline-block size-[8px] flex-none rounded-full [border:1.5px_dashed_var(--fg-locked)]" />
  );
}

function Where({ combo }: { combo: NearCombo }) {
  const where = combo.missing.where;
  if (where.kind === "spare") {
    return (
      <>
        <Dot owned />
        <span>{copy.where.spare}</span>
      </>
    );
  }
  if (where.kind === "elsewhere") {
    // The decks arrive committed first (`holdingDecks`), so the first is the first committed one (G4).
    const [deck, ...rest] = where.decks;
    return (
      <>
        <Dot owned />
        {deck ? (
          <span>
            {copy.where.inDeck}{" "}
            {/* `.dlk`: card details' In your decks link, its hit reaching 44px tall past the 14px line. */}
            <Link
              href={`/decks/${deck.id}`}
              aria-label={copy.where.deckLinkAria(deck.name)}
              className="inline-block -my-[15px] py-[15px] leading-[14px] text-[color:var(--fg-body)] underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current transition-colors"
            >
              {deck.name}
            </Link>
            {rest.length > 0 ? (
              <>{" "}<span className="text-[color:var(--fg-faint)]">{copy.where.more(rest.length)}</span></>
            ) : null}
          </span>
        ) : (
          <span>{copy.where.inAnotherDeck}</span>
        )}
      </>
    );
  }
  return (
    <>
      <Dot owned={false} />
      {where.cents !== null ? (
        // `.btag`: the buy tag's ink and figure (`formatCents`, as the shipped tag formats it).
        <span className="rounded-[4px] px-[5px] font-mono text-[10px] leading-[15px] text-[color:var(--warning)] [border:1px_solid_var(--accent-shadow)]">
          {formatCents(where.cents)}
        </span>
      ) : where.soldOut ? (
        // The buy tag's own word, for a card stocked before and not now. A card the feed has never
        // stocked gets nothing, as the buy tag leaves it (`priceCopy`: silence is a state).
        <span className="text-[color:var(--fg-muted)]">{priceCopy.tag.soldOut}</span>
      ) : null}
    </>
  );
}
