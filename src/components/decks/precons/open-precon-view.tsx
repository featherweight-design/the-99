"use client";

// `/decks/precons/[fileName]` (design table: Route /decks/precons/[fileName]). The precon's list,
// drawn with the deck view's own `DecklistGroup` in its read-only form: the owned dot, card details
// on press and the hover preview stay; nothing edits. Ownership is a count, never a verdict, and the
// bar is neutral at every share.

import Link from "next/link";
import { preconsCopy, preconDate } from "../../../lib/copy/precons";
import { cardTypeGroup, groupByCardType, type DeckDetailCard } from "../../../lib/decks/grouping";
import type { OpenPrecon, OpenPreconCard } from "../../../lib/precons/open-read";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { CardDetailProvider } from "../../cards/card-detail-provider";
import { PendingReporter } from "../../shell/pending-reporter";
import { EmptyCollectionBand } from "./empty-collection-band";
import { CommanderThumb } from "../../ui/commander-thumb";
import { DecklistGroup } from "../decklist-group";
import { HoverPreviewProvider } from "../hover-preview";

const copy = preconsCopy;
type Loaded = Extract<OpenPrecon, { kind: "precon" }>;

function toDetail(c: OpenPreconCard): DeckDetailCard {
  return {
    oracleId: c.oracleId,
    name: c.name,
    typeLine: c.typeLine,
    cardTypeGroup: cardTypeGroup(c.typeLine),
    role: "other",
    cmc: 0,
    owned: c.owned,
    quantity: c.quantity,
    auto: false,
    printedName: null,
    printedSetCode: c.printing ? c.printing.label.split(" ")[0] : null,
    printedCollectorNumber: c.printing ? c.printing.label.split(" ").slice(1).join(" ") : null,
    manaCost: c.manaCost ?? undefined,
    imageUri: c.printing?.imageUri ?? c.imageUri,
  };
}

/** A group's note: how many of its distinct non-basic cards the reader owns. */
function groupOwned(cards: OpenPreconCard[]) {
  const counted = cards.filter((c) => !c.basic);
  return { owned: counted.filter((c) => c.owned).length, of: counted.length };
}

function commanderNote(cards: OpenPreconCard[]) {
  const owned = cards.filter((c) => c.owned).length;
  if (cards.length === 1) return owned === 1 ? copy.group.own1 : copy.group.own0of1;
  if (cards.length === 2 && owned === 2) return copy.group.ownBoth;
  if (cards.length === 2 && owned === 0) return copy.group.ownNeither;
  return copy.group.own(owned, cards.length);
}

export function OpenPreconView({ precon, fromNew }: { precon: Loaded; fromNew: boolean }) {
  const { row, cards } = precon;
  const commanders = cards.filter((c) => c.isCommander);
  const body = cards.filter((c) => !c.isCommander);
  const basics = body.filter((c) => c.basic);
  const listed = body.filter((c) => !c.basic);
  const total = cards.reduce((n, c) => n + c.quantity, 0);
  const bodyCount = body.reduce((n, c) => n + c.quantity, 0);
  const basicCopies = basics.reduce((n, c) => n + c.quantity, 0);
  const share = row.of === 0 ? 0 : row.owned / row.of;
  const groups = groupByCardType(listed.map((c) => ({ ...c, cardTypeGroup: cardTypeGroup(c.typeLine) })));
  const siblings = [...commanders, ...groups.flatMap(([, g]) => g)].map((c) => c.oracleId);
  const ident = row.identity.length > 0 ? row.identity.join("") : "C";
  // Card details open on the precon's own printing and offer no pick (O6): the provider's deck
  // printings with no deck, as the review screen uses them.
  const printingPicks = Object.fromEntries(
    cards.flatMap((c) => (c.printing ? [[c.oracleId, { setCode: c.printing.setCode, collectorNumber: c.printing.collectorNumber }]] : [])),
  );

  return (
    <CardDetailProvider deckPrintingPicks={printingPicks}>
      <div className="pb-[96px]">
        <header className="flex flex-col gap-[12px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] p-[12px_16px_14px] md:p-[16px_22px_18px]">
          <Link href={fromNew ? "/decks/precons?from=new" : "/decks/precons"} className="font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
            {fromNew ? copy.open.backNew : copy.open.back}
            <PendingReporter href="/decks/precons" />
          </Link>
          <div className="flex items-start gap-[12px]">
            <div className="flex flex-none gap-[6px]">
              {row.commanders.map((c) => (
                <span key={c.oracleId}>
                  <CommanderThumb imageUri={c.imageUri} colorIdentity={c.colorIdentity} size="open" className="md:hidden" />
                  <CommanderThumb imageUri={c.imageUri} colorIdentity={c.colorIdentity} size="openWide" className="hidden md:block" />
                </span>
              ))}
            </div>
            <div className="flex min-w-0 flex-col gap-[4px]">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{copy.open.eyebrow}</span>
              <h1 className="m-0 font-display text-[22px] font-normal leading-[1.15] text-[color:var(--fg)] md:text-[26px]">{row.name}</h1>
              <span className="text-[13.5px] text-[color:var(--fg-body)]">{row.commanders.map((c) => c.name).join(" + ")}</span>
              <span className="flex items-center gap-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">
                <span aria-hidden className="flex gap-[3px]">
                  {(row.identity.length > 0 ? row.identity : ["C"]).map((c) => (
                    <span key={c} className="h-[10px] w-[10px] rounded-full" style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }} />
                  ))}
                </span>
                {copy.open.meta(ident, row.setCode, precon.setName, preconDate(row.releaseDate))}
              </span>
            </div>
          </div>

          {!precon.hasCollection && <EmptyCollectionBand />}
          <section aria-label={`${copy.open.ownLead} ${copy.open.own(row.owned, row.of)} ${copy.open.ownTail}`} className="flex flex-col gap-[8px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[11px_13px] md:p-[12px_16px]">
            <p className="m-0 flex flex-wrap items-baseline gap-x-[6px] text-[14px] text-[color:var(--fg-body)]">
              {copy.open.ownLead}
              <span className="font-mono text-[15px] font-semibold text-[color:var(--fg)]">{copy.open.own(row.owned, row.of)}</span>
              {copy.open.ownTail}
              {basicCopies > 0 && <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.open.basics(basicCopies)}</span>}
            </p>
            <div aria-hidden className="h-[3px] rounded-[2px] bg-[color:var(--border-strong)]">
              <div className="h-full rounded-[2px] bg-[color:var(--fg-muted)]" style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
            {row.built.slice(0, 2).map((b) => (
              <p key={b.deckId} className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
                {b.sameCommanders ? copy.open.builtSame(b.deckName, b.shared, row.commanders.length === 2) : copy.open.builtAny(b.deckName, b.shared)}
              </p>
            ))}
            {row.twinName && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.open.twin(row.twinName)}</p>}
            {row.unmapped > 0 && (
              <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.open.unmapped(row.unmapped, total)}</p>
            )}
            {commanders.length === 2 && (
              <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.open.pair(bodyCount, total)}</p>
            )}
          </section>
          <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:hidden">{copy.open.listNotePhone}</p>
          <p className="m-0 hidden font-mono text-[10.5px] text-[color:var(--fg-faint)] md:block">{copy.open.listNote}</p>
        </header>

        {/* No gap: each group carries its own bottom margin. */}
        <HoverPreviewProvider className="flex flex-col px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
          {/* `deckId` is empty: a read-only row calls no deck action, which is all it is read for. */}
          <DecklistGroup
            readOnly
            deckId=""
            label={commanders.length === 1 ? copy.group.commander : copy.group.commanders}
            cards={commanders.map(toDetail)}
            siblings={siblings}
            note={commanderNote(commanders)}
            noteColor="var(--fg-muted)"
            newestAsOf={null}
          />
          {groups.map(([label, group]) => {
            const o = groupOwned(group);
            const lands = label === "Lands";
            const note = copy.group.own(o.owned, o.of) + (lands && basicCopies > 0 ? ` · ${copy.group.basics(basicCopies)}` : "");
            return (
              <DecklistGroup
                key={label}
                readOnly
                deckId=""
                label={label}
                cards={group.map(toDetail)}
                siblings={siblings}
                note={note}
                noteColor="var(--fg-muted)"
                newestAsOf={null}
                // The basics are listed under Lands and counted in its figure (O2), never as rows.
                footer={lands && basics.length > 0 ? <BasicsLine basics={basics} /> : null}
                footerCount={lands ? basicCopies : 0}
              />
            );
          })}
          {!groups.some(([label]) => label === "Lands") && basics.length > 0 && <BasicsLine basics={basics} />}
        </HoverPreviewProvider>
      </div>
    </CardDetailProvider>
  );
}

/** The precon's basic lands, at the foot of Lands: listed, never counted (Q4). */
function BasicsLine({ basics }: { basics: OpenPreconCard[] }) {
  return (
    <p className="m-0 mt-[4px] flex flex-wrap items-baseline gap-x-[8px] rounded-[7px] border border-dashed border-[color:var(--border-dashed)] p-[8px_9px]">
      <span className="text-[13px] text-[color:var(--fg-muted)]">{basics.map((b) => `${b.name} ×${b.quantity}`).join(" · ")}</span>
      <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.group.basicTag}</span>
    </p>
  );
}
