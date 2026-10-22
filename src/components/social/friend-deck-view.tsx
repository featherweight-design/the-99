"use client";
// A friend's deck, read-only (friend decks handoff, board 1 and States): the open precon page's anatomy
// (`open-precon-view.tsx`) over the owner's list, grouped as the owner's deck page groups it. The viewer may open card
// details (the shipped sheet, Wishlist included), switch List and Cards, and see what THEY own: the row's dot, the own
// band and each group's note. Nothing of the owner's money or plans is drawn: no price, buy tag, status, ✕, stepper,
// auto tag, proxy, lock, notes, tabs or ⋯.

import Link from "next/link";
import { socialCopy } from "../../lib/copy/social";
import { preconsCopy } from "../../lib/copy/precons";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { groupByCardType, type DeckDetailCard } from "../../lib/decks/grouping";
import { colorLabel } from "../../lib/decks/format";
import { commanderRepeats } from "../../lib/decks/commander-repeats";
import type { ProfileCommander } from "../../lib/social/commander";
import { isBasicType } from "../../lib/decks/basic-type";
import type { FriendDeckCard, FriendDeckPage } from "../../lib/social/decks";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { DecklistGroup } from "../decks/decklist-group";
import { DECK_VIEWS, isDeckView } from "../decks/group-toggle";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { MarkKey } from "../decks/mark-key";
import { ReadOnlyCardTile } from "../decks/read-only-card-tile";
import { BasicsLine, commanderNote, groupOwned } from "../decks/read-only-list";
import { PendingReporter } from "../shell/pending-reporter";
import { CommanderThumb } from "../ui/commander-thumb";
import { OwnershipDot } from "../ui/ownership-dot";
import { useStoredView } from "../ui/use-stored-view";
import { ViewToggle } from "../ui/view-toggle";
import { Face } from "./face";

const copy = socialCopy.friendDeck;
const open = preconsCopy.open;

/** The view choice, shared with the open precon page: both are the same read-only list, read the same way. */
const VIEW_KEY = "the99:precons:openView";

function toDetail(c: FriendDeckCard): DeckDetailCard {
  return { ...c, auto: false };
}

export function FriendDeckView({
  deck,
  friend,
}: {
  deck: FriendDeckPage;
  friend: { publicId: string; displayName: string; commander: ProfileCommander | null };
}) {
  const [storedView, storeView] = useStoredView(VIEW_KEY, isDeckView);
  const view = storedView ?? "list";
  const card = view === "card";
  const name = friend.displayName;
  const decksHref = `/friends/${friend.publicId}/decks`;

  const basics = deck.cards.filter((c) => isBasicType(c.typeLine));
  const listed = deck.cards.filter((c) => !isBasicType(c.typeLine));
  const basicCopies = basics.reduce((n, c) => n + c.quantity, 0);
  const groups = groupByCardType(listed.map(toDetail));
  const empty = deck.cards.length === 0;
  // What the viewer owns of it, as a precon's band counts it: distinct non-basic cards, the commanders included.
  const own = groupOwned([...deck.commanders, ...listed]);
  const share = own.of === 0 ? 0 : own.owned / own.of;
  const hasLands = groups.some(([label]) => label === "Lands");
  const basicIds = card ? basics.map((b) => b.oracleId) : [];
  const siblings = [
    ...deck.commanders.map((c) => c.oracleId),
    ...groups.flatMap(([label, g]) => [...g.map((c) => c.oracleId), ...(label === "Lands" ? basicIds : [])]),
    ...(hasLands ? [] : basicIds),
  ];
  // Card details view the owner's printing on every open, paging included, and offer no pick: the precon page's rule.
  // The same picks go in as deck printings with no deck, which is what keeps the viewer's own picker (and its save) away.
  const named = [...deck.commanders, ...deck.cards].filter((c) => c.printedSetCode && c.printedCollectorNumber);
  const printingPicks = Object.fromEntries(named.map((c) => [c.oracleId, { setCode: c.printedSetCode!, collectorNumber: c.printedCollectorNumber! }]));
  const viewPrintings = Object.fromEntries(
    named.map((c) => [c.oracleId, {
      setCode: c.printedSetCode!, collectorNumber: c.printedCollectorNumber!, imageUri: c.imageUri ?? null,
      ...(c.printedBackImageUri !== undefined ? { backImageUri: c.printedBackImageUri } : {}),
      ...(c.printedScryfallId ? { scryfallId: c.printedScryfallId } : {}),
    }]),
  );
  const head = deck.commanders[0];
  // The commander line is left out when the deck's name already says it (whole, or the part before the comma).
  const commanderLine = deck.commanders.map((c) => c.name).join(" + ");
  const repeats = head !== undefined && commanderRepeats(deck.name, head.name, deck.commanders[1]?.name ?? null);

  return (
    <CardDetailProvider deckPrintingPicks={printingPicks} viewPrintings={viewPrintings}>
      <div className="pb-[96px]">
        <header className="flex flex-col gap-[12px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] p-[12px_16px_14px] md:p-[16px_26px_18px]">
          <Link href={decksHref} className="font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
            {copy.back(name)}
            <PendingReporter href={decksHref} />
          </Link>
          <div className="flex items-start gap-[12px]">
            <div className="flex flex-none gap-[6px]">
              {deck.commanders.map((c) => (
                <span key={c.oracleId}>
                  <CommanderThumb imageUri={c.imageUri ?? null} colorIdentity={deck.colorIdentity} size="open" className="md:hidden" />
                  <CommanderThumb imageUri={c.imageUri ?? null} colorIdentity={deck.colorIdentity} size="openWide" className="hidden md:block" />
                </span>
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
              <span data-testid="friend-deck-eyebrow" className="flex items-center gap-[6px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">
                <Face name={name} commander={friend.commander} size={16} />
                {copy.eyebrow(name)}
              </span>
              <h1 className="m-0 font-display text-[22px] font-normal leading-[1.15] text-[color:var(--fg)] md:text-[26px]">{deck.name}</h1>
              {!repeats && <span data-testid="friend-deck-commanders" className="text-[13.5px] text-[color:var(--fg-body)]">{commanderLine}</span>}
              <span className="flex flex-wrap items-center gap-[8px] font-mono text-[11px] text-[color:var(--fg-faint)]">
                {copy.cards(deck.built)}
                <span aria-hidden className="flex gap-[3px]">
                  {(deck.colorIdentity.length > 0 ? deck.colorIdentity : ["C"]).map((c) => (
                    <span key={c} className="h-[10px] w-[10px] rounded-full" style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }} />
                  ))}
                </span>
                {colorLabel([...deck.colorIdentity])}
              </span>
            </div>
          </div>

          {!empty && (
            <section
              data-testid="friend-deck-own"
              aria-label={`${open.ownLead} ${open.own(own.owned, own.of)} ${open.ownTail}`}
              className="flex flex-col gap-[8px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[11px_13px] md:p-[12px_16px]"
            >
              <p className="m-0 flex flex-wrap items-baseline gap-x-[6px] text-[14px] text-[color:var(--fg-body)]">
                {open.ownLead}
                <span className="font-mono text-[15px] font-semibold text-[color:var(--fg)]">{open.own(own.owned, own.of)}</span>
                {open.ownTail}
              </p>
              <div aria-hidden className="h-[3px] rounded-[2px] bg-[color:var(--border-strong)]">
                <div className="anim-grow-x origin-left h-full rounded-[2px] bg-[color:var(--fg-muted)]" style={{ width: `${Math.round(share * 100)}%` }} />
              </div>
              {deck.shares.map((s) => (
                <p key={s.deckId} className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
                  {s.sameCommanders ? open.builtSame(s.deckName, s.shared, deck.commanders.length === 2) : open.builtAny(s.deckName, s.shared)}
                </p>
              ))}
            </section>
          )}
          {!empty && (
            <div className="flex items-center justify-between gap-[12px]">
              <p className="m-0 min-w-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:hidden">{open.listNotePhone}</p>
              <p className="m-0 hidden min-w-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:block">
                {card ? copy.listNoteCard : copy.listNote}
              </p>
              <ViewToggle options={DECK_VIEWS} value={view} onChange={storeView} />
            </div>
          )}
        </header>

        {!empty && (
          <div className="flex items-center gap-x-[14px] px-[16px] pt-[10px] md:px-[26px]">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.keyLead}</span>
            <MarkKey
              regionAria={copy.keyAria}
              marks={[
                { id: "owned", sample: <OwnershipDot owned committed={false} size={9} />, word: copy.keyOwned },
                { id: "not-owned", sample: <OwnershipDot owned={false} committed={false} size={9} />, word: copy.keyNotOwned },
              ]}
            />
          </div>
        )}
        {/* No gap: each group carries its own bottom margin. */}
        <HoverPreviewProvider className="flex flex-col px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
          {/* `deckId` is empty: a read-only row calls no deck action, which is all it is read for. */}
          <DecklistGroup
            readOnly
            deckId=""
            view={view}
            label={deck.commanders.length === 1 ? preconsCopy.group.commander : preconsCopy.group.commanders}
            cards={deck.commanders.map(toDetail)}
            siblings={siblings}
            note={commanderNote(deck.commanders)}
            noteColor="var(--fg-muted)"
            newestAsOf={null}
          />
          {empty && head && (
            <div data-testid="friend-deck-empty" className="flex flex-col gap-[6px] rounded-[12px] border border-dashed border-[color:var(--border-dashed)] p-[22px_20px] md:p-[30px_32px]">
              <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)]">{copy.emptyTitle(name)}</p>
              <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)]">{copy.emptyBody(name)}</p>
            </div>
          )}
          {groups.map(([label, group]) => {
            const o = groupOwned(group);
            const lands = label === "Lands";
            const note = preconsCopy.group.own(o.owned, o.of) + (lands && basicCopies > 0 ? ` · ${preconsCopy.group.basics(basicCopies)}` : "");
            return (
              <DecklistGroup
                key={label}
                readOnly
                deckId=""
                view={view}
                label={label}
                cards={group}
                siblings={siblings}
                note={note}
                noteColor="var(--fg-muted)"
                newestAsOf={null}
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

/** Card view's basics: one dashed tile per name, after the other lands, as on a precon. */
function BasicTiles({ basics, siblings }: { basics: FriendDeckCard[]; siblings: string[] }) {
  return (
    <>
      {basics.map((b) => <ReadOnlyCardTile key={b.oracleId} card={toDetail(b)} siblings={siblings} basic={{ arts: 1 }} />)}
    </>
  );
}
