"use client";

// Combos one piece away, the list (combos close R1, calls 2 and 3; `The-List.dc.html`): a sheet at
// 390 and a 900 modal at 1300, in the pass sheet's frame (`SheetFrame`). Grouped You own it (a spare,
// then a copy in another deck) and To buy (cheapest first, unpriced last), in the order the read
// ranked them (`rankNearCombos`: spare, elsewhere, priced buy, unpriced buy), so grouping is a split
// and never a re-sort. A group with no rows is not drawn.
//
// UI-2 (call 4, R1b; `How-It-Works.dc.html`): a row opens its combo INSIDE this sheet, the shipped
// combo body (`ComboBody`) under a `← N combos` bar, at 760 from md where the list is 900. The one
// other control inside a row is the other deck's name, a link, which is why the row is a plain
// container and not a button: a link may not sit inside a button. Its press is the chevron, a real
// button a keyboard reaches; a pointer press anywhere else on the row (but the link) is the same press.
//
// The combo is a view of this one dialog, not a second one: Escape and the browser's Back close the
// sheet as they always did (the dialog owns one history entry, and a second for the combo would have
// to be unwound by every way out). `← N combos` is the way back to the list, at its scroll position.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

import { addCardToDeck } from "../../app/decks/actions";
import { nearComboModal } from "../../lib/bracket/combo-modal";
import { priceCopy } from "../../lib/copy/price";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { GhostButton } from "../ui/button";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { ComboBody, type FindingArt } from "./receipt-modal";
import { useDeckMutation } from "./use-deck-mutation";

import { combosCloseCopy } from "../../lib/copy/combos-close";
import type { MissingPieceWhere, NearCombo, NearCombos } from "../../lib/combos/near-combos";
import { formatCents } from "../../lib/decks/price";
import { producesInfiniteTurns } from "../../lib/spellbook/combo-features";
import { CardFactMark } from "../cards/card-fact-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { ComboGlyph } from "../cards/combo-glyph";
import { SheetFrame } from "./pass-sheet";

const copy = combosCloseCopy.sheet;
const detailCopy = combosCloseCopy.detail;

const buyCents = (c: NearCombo) => (c.missing.where.kind === "buy" ? c.missing.where.cents : null);

/** A combo's pieces, held first and the missing one last, each part in the read's order. */
export function heldFirst<P extends { held: boolean }>(pieces: readonly P[]): P[] {
  return [...pieces.filter((p) => p.held), ...pieces.filter((p) => !p.held)];
}

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
  deckId,
  deckName,
  commanderOracleIds,
  art,
  onClose,
}: {
  nearCombos: NearCombos;
  /** The deck an Add adds to. */
  deckId: string;
  deckName: string;
  /** The deck's commanders: a held piece among them carries the `commander` tag. */
  commanderOracleIds: readonly string[];
  /** The deck's own rows' names and art (`findingArt`): every held piece is one of them. */
  art: FindingArt;
  onClose: () => void;
}) {
  // The count is the read's `total`, the same figure the segment states (one count, two places).
  const n = nearCombos.total;
  const { own, buy } = groupNearCombos(nearCombos.combos);
  // The combo pushed over the list, by id: when the read stops listing it (its piece was added), the
  // sheet is back on the list without anyone popping it.
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId === null ? null : (nearCombos.combos.find((c) => c.variantId === openId) ?? null);

  const listRef = useRef<HTMLDivElement>(null);
  // Where the list stood, and the row that was pressed, so the way back lands on both.
  const left = useRef<{ scrollTop: number; variantId: string } | null>(null);
  const scroller = () => listRef.current?.parentElement ?? null;

  const push = (variantId: string) => {
    left.current = { scrollTop: scroller()?.scrollTop ?? 0, variantId };
    setOpenId(variantId);
  };
  const pop = () => setOpenId(null);
  // An Add answers for ITS combo only: if the reader has gone back and opened another meanwhile, a
  // late success must not dismiss that one.
  const added = (variantId: string) => setOpenId((current) => (current === variantId ? null : current));

  // The list stays mounted (hidden) under the combo, so going back restores its scroll and puts focus
  // on the row's press. Layout, so neither the combo nor the list paints at the other's position first.
  const shown = open?.variantId ?? null;
  useLayoutEffect(() => {
    const el = scroller();
    if (shown !== null) {
      if (el) el.scrollTop = 0;
      listRef.current?.closest('[role="dialog"]')?.querySelector<HTMLButtonElement>("[data-sheet-back]")?.focus();
      return;
    }
    const was = left.current;
    if (!was) return;
    left.current = null;
    if (el) el.scrollTop = was.scrollTop;
    const row = listRef.current?.querySelector<HTMLButtonElement>(`[data-combo-row="${CSS.escape(was.variantId)}"] [data-combo-press]`);
    // The pressed row's combo may have been added (its row is gone): the list's first row stands in.
    (row ?? listRef.current?.querySelector<HTMLButtonElement>("[data-combo-press]"))?.focus({ preventScroll: true });
  }, [shown]);

  // A revalidation can remove the focused row after the way back (an Add whose read lands late): focus
  // would fall to the page under the dialog. Only then, and only while the list is showing, it goes to
  // the list's first row, so no control or stacked card the reader has since moved to loses focus.
  const rowIds = nearCombos.combos.map((c) => c.variantId).join("|");
  const seenRows = useRef(rowIds);
  useEffect(() => {
    // Not on mount, where the dialog places its own first focus: only when the rows change.
    if (seenRows.current === rowIds) return;
    seenRows.current = rowIds;
    if (shown !== null) return;
    const list = listRef.current;
    if (!list || (document.activeElement && document.activeElement !== document.body)) return;
    list.querySelector<HTMLButtonElement>("[data-combo-press]")?.focus({ preventScroll: true });
  }, [rowIds, shown]);

  // One order for the combo everywhere it is named (title, plates, a stacked card's back label):
  // what you have, then what it needs. The read sorts pieces by name.
  const ordered = open ? heldFirst(open.pieces) : [];
  const names = ordered.map((p) => art.get(p.oracleId)?.name ?? p.name);
  return (
    <SheetFrame
      eyebrow={copy.eyebrow}
      title={open ? detailCopy.name(names) : copy.title(n)}
      lead={copy.lead(n, deckName)}
      closeLabel={copy.closeAria}
      onClose={onClose}
      // The mock draws the combo at 760 (`How-It-Works.dc.html` `.md`), the list at 900.
      width={open ? 760 : 900}
      fit
      doneLabel={copy.done}
      back={open ? { label: detailCopy.back(n), aria: detailCopy.backAria(n), onBack: pop } : undefined}
      // A card stacked on the combo goes back to the combo (`← Avatar Aang + Searing Touch`).
      backLabel={open ? detailCopy.name(names) : undefined}
    >
      {/* `.oa` */}
      <div ref={listRef} hidden={open !== null} className="flex flex-col gap-[6px] px-[12px] pt-[10px] pb-[12px]" data-combos-close-list>
        <Group label={copy.groups.own} combos={own} first commanderOracleIds={commanderOracleIds} onOpen={push} />
        <Group label={copy.groups.buy} combos={buy} first={own.length === 0} commanderOracleIds={commanderOracleIds} onOpen={push} />
        <p className="m-0 px-[4px] pt-[4px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.foot}</p>
      </div>
      {open ? <ComboDetail key={open.variantId} combo={open} deckId={deckId} art={art} onAdded={() => added(open.variantId)} /> : null}
    </SheetFrame>
  );
}

/**
 * The combo, pushed (`How-It-Works.dc.html` `.cbd`, `.cft`): the shipped combo body, each plate saying
 * where its piece is, the missing one outlined, and Add for the missing card bottom right. Add is
 * offered wherever the card is, a spare, another deck's or one to buy, as the handoff draws it: the
 * plate already says which.
 */
function ComboDetail({ combo, deckId, art, onAdded }: { combo: NearCombo; deckId: string; art: FindingArt; onAdded: () => void }) {
  const { missing } = combo;
  // The held pieces draw the deck's own art and printed names; the missing one, the catalog's.
  const plates: FindingArt = new Map([...art, [missing.oracleId, { name: missing.name, imageUri: missing.card?.imageUri ?? null }]]);
  const { isPending, error, run } = useDeckMutation(false, DECK_ADD_FALLBACK_MESSAGE);
  const addOptimisticCard = useAddOptimisticCard();
  const card = missing.card;

  function add() {
    run(
      async () => {
        const outcome = await addCardToDeck(deckId, missing.oracleId);
        // Back to the list once the server has it: the revalidated read drops the row and the count.
        if (!outcome || outcome.ok) onAdded();
        return outcome;
      },
      card
        ? () =>
            addOptimisticCard({
              oracleId: missing.oracleId,
              name: missing.name,
              typeLine: card.typeLine,
              cardTypeGroup: card.cardTypeGroup,
              role: card.role,
              cmc: card.cmc,
              owned: missing.where.kind !== "buy",
              quantity: 1,
              auto: false,
              printedName: null,
              printedSetCode: null,
              printedCollectorNumber: null,
              manaCost: card.manaCost,
              imageUri: card.imageUri,
            })
        : undefined,
    );
  }

  return (
    <div data-combo-detail={combo.variantId}>
      <ComboBody
        // Held pieces first, the missing one last (the board's plates and title read "what you have + what it needs").
        combo={nearComboModal({ ...combo, pieces: heldFirst(combo.pieces) })}
        art={plates}
        oneAway={{
          missingOracleId: missing.oracleId,
          where: (oracleId) =>
            oracleId === missing.oracleId ? (
              <MissingPieceWhereLine where={missing.where} on="plate" />
            ) : (
              <>
                <Dot owned />
                <span className="text-[color:var(--success)]">{detailCopy.plate.inThisDeck}</span>
              </>
            ),
          action: (
            <>
              {/* `.addb`: 44 tall on the phone, 36 from md, the pending treatment the Consider tile's Add has. */}
              <GhostButton
                onClick={add}
                disabled={isPending}
                className="h-[44px] md:h-[36px] min-h-0 md:min-h-0 rounded-[9px] px-[18px] text-[13.5px] font-semibold disabled:opacity-50"
              >
                {detailCopy.add(missing.name)}
              </GhostButton>
              {error ? <MutationError message={error} /> : null}
            </>
          ),
        }}
      />
    </div>
  );
}

function Group({
  label,
  combos,
  first,
  commanderOracleIds,
  onOpen,
}: {
  label: string;
  combos: NearCombo[];
  first: boolean;
  commanderOracleIds: readonly string[];
  onOpen: (variantId: string) => void;
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
        <ComboRow key={c.variantId} combo={c} commanderOracleIds={commanderOracleIds} onOpen={onOpen} />
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
function ComboRow({
  combo,
  commanderOracleIds,
  onOpen,
}: {
  combo: NearCombo;
  commanderOracleIds: readonly string[];
  onOpen: (variantId: string) => void;
}) {
  const held = combo.pieces.filter((p) => p.held && p.oracleId !== combo.missing.oracleId);
  return (
    <div
      data-combo-row={combo.variantId}
      data-where={combo.missing.where.kind}
      // A pointer press anywhere on the row but its link and its chevron button opens the combo, as
      // the chevron does. A press on the turn-again mark is part of the row and opens it too.
      onClick={(e) => {
        if ((e.target as Element).closest("a, button")) return;
        onOpen(combo.variantId);
      }}
      // `.or.press`: the 2px accent outline, 1px off the row, while the row is pressed or its press has focus.
      className="relative flex cursor-pointer items-start gap-[10px] rounded-[9px] bg-[color:var(--surface-rail)] py-[10px] pr-[4px] pl-[11px] active:[outline:2px_solid_var(--accent)] active:outline-offset-1 has-[[data-combo-press]:focus-visible]:[outline:2px_solid_var(--accent)] has-[[data-combo-press]:focus-visible]:outline-offset-1 lg:min-h-[44px] lg:items-center lg:gap-[12px] lg:py-0 lg:pr-[6px] lg:pl-[14px]"
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
            <MissingPieceWhereLine where={combo.missing.where} on="row" />
          </span>
          {combo.produces[0] ? (
            <span title={combo.produces[0]} className="font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] lg:w-[190px] lg:truncate lg:whitespace-nowrap lg:text-right">
              {combo.produces[0]}
            </span>
          ) : null}
        </span>
      </div>
      {/* The row's press: the chevron column, a real button (its own focus ring is the row's outline). */}
      <button
        type="button"
        data-combo-press
        onClick={() => onOpen(combo.variantId)}
        aria-label={copy.openAria(combo.missing.name, held.map((p) => p.name))}
        className="w-[28px] flex-none self-center cursor-pointer border-0 bg-transparent p-0 text-center text-[15px] text-[color:var(--fg-faint)] outline-none"
      >
        <span aria-hidden>›</span>
      </button>
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

/**
 * Where the missing piece is: the list row's where-line (`on="row"`), and the same decision under the
 * combo's missing plate (`on="plate"`). The plate is itself a press (it opens the card), so there the
 * other deck's name is words, not a link, and a spare is the plate's one word (`How-It-Works.dc.html`).
 */
function MissingPieceWhereLine({ where, on }: { where: MissingPieceWhere; on: "row" | "plate" }) {
  if (where.kind === "spare") {
    return (
      <>
        <Dot owned />
        <span>{on === "row" ? copy.where.spare : detailCopy.plate.spare}</span>
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
            {on === "plate" ? (
              // The combo's detail lists every deck holding a copy (G4); the row names the first.
              where.decks.map((d) => d.name).join(", ")
            ) : (
            // `.dlk`: card details' In your decks link, its hit reaching 44px tall past the 14px line.
            <Link
              href={`/decks/${deck.id}`}
              aria-label={copy.where.deckLinkAria(deck.name)}
              className="inline -my-[15px] py-[15px] leading-[14px] [overflow-wrap:anywhere] [box-decoration-break:clone] text-[color:var(--fg-body)] underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current transition-colors"
            >
              {deck.name}
            </Link>
            )}
            {on === "row" && rest.length > 0 ? (
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
