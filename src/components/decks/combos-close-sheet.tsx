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

const buyCents = (c: NearCombo) => (c.missing.where.kind === "buy" ? c.missing.where.cents : null);

/**
 * Split the ranked list into the sheet's two groups. You own it keeps the read's order (spares, then a
 * copy in another deck). To buy is strictly cheapest first, an unpriced card last: the read leads each
 * bucket with one combo per outcome, which can put a $10 combo ahead of a $2 one, and this group is
 * drawn as a price list. Ties keep the read's order (the sort is stable).
 */
export function groupNearCombos(combos: readonly NearCombo[]): { own: NearCombo[]; buy: NearCombo[] } {
  const price = (c: NearCombo) => buyCents(c) ?? Number.POSITIVE_INFINITY;
  return {
    own: combos.filter((c) => c.missing.where.kind !== "buy"),
    buy: combos.filter((c) => c.missing.where.kind === "buy").sort((a, b) => price(a) - price(b)),
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
 * chevron) and `.md2 .or` from lg (1024): one line, columns aligned (marks 38, the name, `with` taking the
 * rest at least 200, where 190, what it does 190 right-aligned), at least 44 tall. One subtree, two
 * layouts. One line waits for lg, not md: from 768 the modal is narrower than its 900, and the
 * fixed columns (with-line 200, where 190, what it does 190) left the name a few pixels. The name
 * may truncate at lg (the mock holds it `flex: none`): a long name with `with` at
 * its 200 floor would otherwise push the where column out of line with the rows around it.
 */
function ComboRow({ combo, commanderOracleIds }: { combo: NearCombo; commanderOracleIds: readonly string[] }) {
  const held = combo.pieces.filter((p) => p.held && p.oracleId !== combo.missing.oracleId);
  return (
    <div
      data-combo-row
      data-where={combo.missing.where.kind}
      className="relative flex items-start gap-[10px] rounded-[9px] bg-[color:var(--surface-rail)] py-[10px] pr-[4px] pl-[11px] lg:min-h-[44px] lg:items-center lg:gap-[12px] lg:py-0 lg:pr-[6px] lg:pl-[14px]"
    >
      {/* `.gl`: the lemniscate, and the turn-again mark under it (beside it from md) for a loop of turns. */}
      <span className="flex flex-none flex-col gap-[5px] pt-[2px] lg:w-[38px] lg:flex-row lg:pt-0">
        <ComboGlyph />
        {producesInfiniteTurns(combo.produces) ? (
          <FactTooltip sentence={copy.loopMark}>
            <CardFactMark fact="extraTurns" />
          </FactTooltip>
        ) : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] lg:flex-row lg:items-baseline lg:gap-[12px]">
        <span className="min-w-0 truncate text-[14px] font-semibold text-[color:var(--fg)] lg:flex-initial lg:text-[13.5px]">
          {combo.missing.name}
        </span>
        <span className="text-[12.5px] leading-[1.4] text-[color:var(--fg-body)] lg:min-w-[200px] lg:flex-1 lg:truncate lg:whitespace-nowrap">
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
        <span className="mt-[2px] flex flex-wrap items-center gap-[8px] font-mono text-[10.5px] text-[color:var(--fg-body)] lg:mt-0 lg:flex-none lg:flex-nowrap">
          <span className="inline-flex min-w-0 max-w-full items-center gap-[7px] lg:w-[190px]" data-where-line>
            <Where combo={combo} />
          </span>
          {combo.produces[0] ? (
            <span title={combo.produces[0]} className="font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] lg:w-[190px] lg:truncate lg:whitespace-nowrap lg:text-right">
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
          // Shrinkable, and a long deck name (up to 120 characters) wraps inside the column rather
          // than painting over the next one; the +N stays after the name.
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {copy.where.inDeck}{" "}
            {/* `.dlk`: card details' In your decks link, its hit reaching 44px tall past the 14px line. */}
            <Link
              href={`/decks/${deck.id}`}
              aria-label={copy.where.deckLinkAria(deck.name)}
              className="inline -my-[15px] py-[15px] leading-[14px] [overflow-wrap:anywhere] [box-decoration-break:clone] text-[color:var(--fg-body)] underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current transition-colors"
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
          {where.qualifier ? ` ${where.qualifier}` : null}
        </span>
      ) : where.soldOut ? (
        // The buy tag's own word, for a card stocked before and not now. A card the feed has never
        // stocked gets nothing, as the buy tag leaves it (`priceCopy`: silence is a state).
        <span className="text-[color:var(--fg-muted)]">{priceCopy.tag.soldOut}</span>
      ) : null}
    </>
  );
}
