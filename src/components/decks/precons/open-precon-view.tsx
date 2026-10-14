"use client";

// `/decks/precons/[fileName]` (design table: Route /decks/precons/[fileName]). The precon's list,
// drawn with the deck view's own `DecklistGroup` in its read-only form: the owned dot, card details
// on press and the hover preview stay; nothing edits. Ownership is a count, never a verdict, and the
// bar is neutral at every share. R4 §6: List (the default) or Card view, through the deck page's own
// well, stored per browser apart from the deck page's choice.

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
import { StartPrecon } from "./start-precon";
import { LinkDeckButton, UnlinkPrecon } from "./precon-link-dialogs";
import { DECK_VIEWS, isDeckView } from "../group-toggle";
import { ReadOnlyCardTile } from "../read-only-card-tile";
import { useStoredView } from "../../ui/use-stored-view";
import { ViewToggle } from "../../ui/view-toggle";
import { useState } from "react";
import { mirrorUrl } from "../../../lib/url/mirror";
import { EditionSwitch } from "./edition-switch";
import type { PreconEdition } from "../../../lib/precons/edition";

/** The open precon's view, kept apart from the deck page's (`the99:deck-view`): one is a reading
 *  choice, the other a building one. List is the default and what the server draws, so no cookie. */
export const PRECON_OPEN_VIEW_KEY = "the99:precons:openView";

const copy = preconsCopy;
type Loaded = Extract<OpenPrecon, { kind: "precon" }>;
/** A card as the page draws it: its copies summed across the printings the feed lists, and how many
 *  of those printings there are (a basic's arts, G-R4-2). */
type ByCard = OpenPreconCard & { arts: number };

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
    layout: c.layout,
    // `preconArt`: the precon's printing where the catalog has it, as the thumbs and card details.
    imageUri: c.imageUri,
  };
}

/**
 * One entry per card. The feed lists a card once per printing (in practice, a precon's basics in
 * several arts), so two rows share an oracle id: they are one card here, with their copies summed
 * and the first printing named, and so one row, one React key and one card-details pick.
 */
export function byCard(cards: OpenPreconCard[]): ByCard[] {
  const merged = new Map<string, ByCard>();
  for (const c of cards) {
    const seen = merged.get(c.oracleId);
    merged.set(c.oracleId, seen ? { ...seen, quantity: seen.quantity + c.quantity, foil: seen.foil + c.foil, arts: seen.arts + 1 } : { ...c, arts: 1 });
  }
  return [...merged.values()];
}

/** A group's note: how many of its distinct non-basic cards the reader owns. */
function groupOwned(cards: OpenPreconCard[]) {
  // By oracle id: the feed lists a card once per printing, and two printings are one card.
  const counted = new Map(cards.filter((c) => !c.basic).map((c) => [c.oracleId, c.owned]));
  return { owned: [...counted.values()].filter(Boolean).length, of: counted.size };
}

function commanderNote(cards: OpenPreconCard[]) {
  const owned = cards.filter((c) => c.owned).length;
  if (cards.length === 1) return owned === 1 ? copy.group.own1 : copy.group.own0of1;
  if (cards.length === 2 && owned === 2) return copy.group.ownBoth;
  if (cards.length === 2 && owned === 0) return copy.group.ownNeither;
  return copy.group.own(owned, cards.length);
}

export function OpenPreconView({ precon, fromNew, canOwn = false, edition: initialEdition = "regular" }: {
  precon: Loaded;
  fromNew: boolean;
  /** Collection editing is on for this reader: the Start dialog offers "I own this precon". */
  canOwn?: boolean;
  /** The edition the URL named (`?edition=collector`); Regular when the precon has no Collector's Edition. */
  edition?: PreconEdition;
}) {
  const { row } = precon;
  const [storedView, storeView] = useStoredView(PRECON_OPEN_VIEW_KEY, isDeckView);
  const view = storedView ?? "list";
  const card = view === "card";
  const [chosen, setChosen] = useState<PreconEdition>(initialEdition);
  const edition: PreconEdition = precon.collector ? chosen : "regular";
  const pickEdition = (next: PreconEdition) => {
    // Only `edition` is this page's to write; Regular, the default, is its absence.
    const live = new URLSearchParams(window.location.search);
    live.delete("edition");
    if (next === "collector") live.set("edition", "collector");
    const qs = live.toString();
    mirrorUrl(qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    setChosen(next);
  };
  // The Collector's Edition is the same list in its own printings and finish: only the art, the
  // SET number and the foil move, and the counts, ownership and groups stay as they are.
  const cards = byCard(edition === "collector" && precon.collector ? precon.collector.cards : precon.cards);
  const commanders = cards.filter((c) => c.isCommander);
  const body = cards.filter((c) => !c.isCommander);
  const basics = body.filter((c) => c.basic);
  const listed = body.filter((c) => !c.basic);
  const total = cards.reduce((n, c) => n + c.quantity, 0);
  const bodyCount = body.reduce((n, c) => n + c.quantity, 0);
  const basicCopies = basics.reduce((n, c) => n + c.quantity, 0);
  const share = row.of === 0 ? 0 : row.owned / row.of;
  const groups = groupByCardType(listed.map((c) => ({ ...c, cardTypeGroup: cardTypeGroup(c.typeLine) })));
  // Card details page through the cards in display order. In Card view the basics are tiles too, at
  // the foot of Lands (or last, with no Lands), so they join the run there; a tile missing from it
  // would open with no Prev/Next.
  const hasLands = groups.some(([label]) => label === "Lands");
  const basicIds = card ? basics.map((b) => b.oracleId) : [];
  const siblings = [
    ...commanders.map((c) => c.oracleId),
    ...groups.flatMap(([label, g]) => [...g.map((c) => c.oracleId), ...(label === "Lands" ? basicIds : [])]),
    ...(hasLands ? [] : basicIds),
  ];
  const ident = row.identity.length > 0 ? row.identity.join("") : "C";
  const linked = row.built.filter((b) => b.linked);
  const linkDeck = (className: string) => (
    <LinkDeckButton fileName={row.fileName} preconName={row.name} of={row.of} decks={precon.decks} className={className} />
  );
  // Card details view the precon's own printing on every open, paging included, owned or not
  // (`viewPrintings`), and offer no pick (O6): the provider's deck printings with no deck.
  const printingPicks = Object.fromEntries(
    cards.flatMap((c) => (c.printing ? [[c.oracleId, { setCode: c.printing.setCode, collectorNumber: c.printing.collectorNumber }]] : [])),
  );
  const viewPrintings = Object.fromEntries(
    cards.flatMap((c) => (c.printing ? [[c.oracleId, {
      setCode: c.printing.setCode, collectorNumber: c.printing.collectorNumber,
      scryfallId: c.printing.scryfallId, imageUri: c.printing.imageUri, backImageUri: c.printing.backImageUri,
    }]] : [])),
  );

  return (
    <CardDetailProvider deckPrintingPicks={printingPicks} viewPrintings={viewPrintings}>
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
            <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
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
            {/* R3 K7: a ghost beside Start at 900; docked beside it at 390, inside Start's dock. */}
            {linkDeck("hidden h-[40px] flex-none rounded-[8px] px-[16px] text-[13px] md:inline-flex md:items-center")}
            <StartPrecon
              row={row}
              cards={total}
              body={bodyCount}
              illegal={[...new Set(cards.filter((c) => !c.legal && !c.isCommander).map((c) => c.name))]}
              dockSummary={linked[0] ? copy.link.linked.dock(row.name, linked[0].deckName) : undefined}
              dockBeside={linkDeck("h-[48px] min-w-0 flex-1 rounded-[10px] px-[12px] text-[13px]")}
              // The chosen edition's own box and its own added date (a Collector's Edition add is its own entry).
              addedOn={edition === "collector" && precon.collector ? precon.collector.addedOn : precon.addedOn}
              addFileName={edition === "collector" && precon.collector ? precon.collector.fileName : row.fileName}
              canOwn={canOwn}
            />
          </div>

          {precon.collector && (
            <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px]">
              <EditionSwitch edition={edition} onEdition={pickEdition} />
              {edition === "collector" && (
                <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.open.edition.collectorNote}</p>
              )}
            </div>
          )}
          {!precon.hasCollection && <EmptyCollectionBand />}
          <section aria-label={`${copy.open.ownLead} ${copy.open.own(row.owned, row.of)} ${copy.open.ownTail}`} className="flex flex-col gap-[8px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[11px_13px] md:p-[12px_16px]">
            <p className="m-0 flex flex-wrap items-baseline gap-x-[6px] text-[14px] text-[color:var(--fg-body)]">
              {copy.open.ownLead}
              <span className="font-mono text-[15px] font-semibold text-[color:var(--fg)]">{copy.open.own(row.owned, row.of)}</span>
              {copy.open.ownTail}
            </p>
            <div aria-hidden className="h-[3px] rounded-[2px] bg-[color:var(--border-strong)]">
              <div className="anim-grow-x origin-left h-full rounded-[2px] bg-[color:var(--fg-muted)]" style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
            {/* R3 K8, K16: a linked deck first, with Unlink beside it, whatever the collection; then
                the decks that only share, in R2's words, which need a collection to be read (L2). */}
            {linked.map((b) => (
              <div key={b.deckId} className="flex items-center justify-between gap-[10px]">
                <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.link.linked.preconSentence(b.deckName, b.shared, row.of)}</p>
                <UnlinkPrecon deckId={b.deckId} deckName={b.deckName} fileName={row.fileName} preconName={row.name} />
              </div>
            ))}
            {precon.hasCollection && row.built.filter((b) => !b.linked).map((b) => (
              <p key={b.deckId} className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
                {b.sameCommanders ? copy.open.builtSame(b.deckName, b.shared, row.commanders.length === 2) : copy.open.builtAny(b.deckName, b.shared)}
              </p>
            ))}
            {/* The edition switch already names the twin; the line stays only where no switch is drawn. */}
            {row.twinName && !precon.collector && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.open.twin(row.twinName)}</p>}
            {row.unmapped > 0 && (
              <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.open.unmapped(row.unmapped, total)}</p>
            )}
            {commanders.length === 2 && (
              <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.open.pair(bodyCount, total)}</p>
            )}
          </section>
          {/* The switch sits at the right end of the list-note line, under everything that must not
              move between views (STATES must-not). */}
          <div className="flex items-center justify-between gap-[12px]">
            <p className="m-0 min-w-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:hidden">{copy.open.listNotePhone}</p>
            <p className="m-0 hidden min-w-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:block">
              {card ? copy.open.listNoteCard : copy.open.listNote}
            </p>
            <ViewToggle options={DECK_VIEWS} value={view} onChange={storeView} />
          </div>
        </header>

        {/* No gap: each group carries its own bottom margin. */}
        <HoverPreviewProvider className="flex flex-col px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
          {/* `deckId` is empty: a read-only row calls no deck action, which is all it is read for. */}
          <DecklistGroup
            readOnly
            deckId=""
            view={view}
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
                view={view}
                label={label}
                cards={group.map(toDetail)}
                siblings={siblings}
                note={note}
                noteColor="var(--fg-muted)"
                newestAsOf={null}
                // The basics are listed under Lands and counted in its figure (O2), never as rows.
                footer={lands && basics.length > 0 && !card ? <BasicsLine basics={basics} /> : null}
                footerCount={lands ? basicCopies : 0}
                cardTail={lands && card ? <BasicTiles basics={basics} siblings={siblings} /> : null}
              />
            );
          })}
          {!hasLands && basics.length > 0 && (card ? (
            <ul className="m-0 grid list-none grid-cols-2 gap-[12px] p-0 md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] md:gap-[20px]">
              <BasicTiles basics={basics} siblings={siblings} />
            </ul>
          ) : <BasicsLine basics={basics} />)}
        </HoverPreviewProvider>
      </div>
    </CardDetailProvider>
  );
}

/** Card view's basics: one dashed tile per name, after the other lands (R4 §6). */
function BasicTiles({ basics, siblings }: { basics: ByCard[]; siblings: string[] }) {
  return (
    <>
      {basics.map((b) => <ReadOnlyCardTile key={b.oracleId} card={toDetail(b)} siblings={siblings} basic={{ arts: b.arts }} />)}
    </>
  );
}

/** The precon's basic lands, at the foot of Lands: in Lands' figure, never in what you own (Q4). */
function BasicsLine({ basics }: { basics: OpenPreconCard[] }) {
  return (
    <p className="m-0 mt-[4px] flex flex-wrap items-baseline gap-x-[8px] rounded-[7px] border border-dashed border-[color:var(--border-dashed)] p-[8px_9px]">
      <span className="text-[13px] text-[color:var(--fg-muted)]">{basics.map((b) => `${b.name} ×${b.quantity}`).join(" · ")}</span>
      <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.group.basicTag}</span>
    </p>
  );
}
