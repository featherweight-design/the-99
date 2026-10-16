"use client";
// The Social line's About specimens (Social R3 PR 5, and R2's last PR for the wishlist; the addendum
// `design_handoff_the99_about/addendum-social-line`).
// Each is a SHIPPED component drawn over a fixture, inert inside `Specimen`, with no-op callbacks: no new visuals, so the
// page can never describe a control the app does not draw. The fixtures name no real account.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PodCard } from "../social/pod-card";
import { GameMatchups } from "../decks/game-matchups";
import { WISHLIST_TILE_SHELL, WishlistTileFace, type WishlistTileCard } from "../wishlist/wishlist-tile";
import { CARD_GRID_TRACKS } from "../ui/card-grid";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { DecklistRow } from "../decks/decklist-row";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { ModalPanel } from "../decks/receipt-modal";
import { SparesSheetBody, StaticSparesProvider } from "../social/spare-markers";
import { SwapToolsProvider } from "../../lib/swaps/context";
import { spareCopy } from "../../lib/copy/social";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { FriendSpare } from "../../lib/social/spares";
import type { DeckGame } from "../../lib/decks/games";
import { summarizeMatchups } from "../../lib/decks/matchups";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import type { Pod, PodMember } from "../../lib/social/access";

const member = (over: Partial<PodMember> & Pick<PodMember, "publicId" | "displayName">): PodMember => ({
  joinedAt: new Date("2026-09-01T12:00:00Z"),
  isOwner: false,
  isYou: false,
  isFriend: true,
  commander: null,
  ...over,
});

/** A pod of four around the table, the viewer its owner, sharing spares: the shipped card, as /friends draws it. */
const POD: Pod = {
  id: "about-pod",
  name: "Thursday",
  isOwner: true,
  members: [
    member({ publicId: "m-you", displayName: "You", isOwner: true, isYou: true, isFriend: false }),
    member({ publicId: "m-dave", displayName: "Dave" }),
    member({ publicId: "m-jo", displayName: "Jo" }),
    member({ publicId: "m-sam", displayName: "Samantha" }),
  ],
  nextOwner: { publicId: "m-dave", displayName: "Dave" },
};

/**
 * The shipped components switch to their wide layout on the VIEWPORT (`md`, `lg`), but a figure sits in the page's
 * article, which at a signed-in 1024px is 566px wide: the wide layout then clips a seat or collapses a name column.
 * Where the wide layout needs more than the figure has, the figure keeps its natural width and is scaled down to the
 * space it has; where the compact layout is drawn it already fits and the scale stays 1. The scaled box is a flow root,
 * so the figure's own top margin is inside the height measured for it rather than collapsing out through it.
 */
function FitFigure({ wideAt, children }: { wideAt: string; children: ReactNode }) {
  const [fit, setFit] = useState({ scale: 1, height: null as number | null });
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const scale = Math.min(1, box.clientWidth / Math.max(1, content.scrollWidth));
      setFit({ scale, height: scale < 1 ? Math.ceil(content.offsetHeight * scale) : null });
    });
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={outer} style={{ height: fit.height ?? undefined, overflow: "hidden" }}>
      <div ref={inner} className={"flow-root " + wideAt} style={{ transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

const noop = () => {};
const noopAsync = async () => true;

export function FriendsFigureBody() {
  return (
    // Five 116px seats and four 12px gaps, with the card's own padding, are about 660px.
    <FitFigure wideAt="md:min-w-[660px]">
      <PodCard
        pod={POD}
        shared
        onRemove={noop}
        onAdd={noop}
        onShare={noop}
        onRename={noop}
        onLeave={noopAsync}
        onDelete={noopAsync}
      />
    </FitFigure>
  );
}

const game = (id: string, result: DeckGame["result"], day: number): DeckGame => ({
  id, result, podSize: 4, playedAt: new Date(Date.UTC(2026, 8, day)), versionNumber: null, note: null, worked: [], hurt: [],
});
const GAMES: DeckGame[] = [game("g1", "loss", 2), game("g2", "win", 9), game("g3", "win", 16), game("g4", "draw", 23)];
const yuriko = { oracleId: "about-y", name: "Yuriko, the Tiger’s Shadow", imageUri: null };
const tymna = { oracleId: "about-t", name: "Tymna the Weaver", imageUri: null };
const seat = (over: Partial<GameOpponent>): GameOpponent => ({
  seat: 1, friend: null, deckName: null, commander: null, partner: null, colorIdentity: [], label: null, won: false, ...over,
});
const BY_GAME = new Map<string, GameOpponent[]>([
  ["g1", [seat({ friend: { key: "dave", name: "Dave" }, deckName: "Avengers Tempo", commander: yuriko, colorIdentity: ["U", "B"], won: true })]],
  ["g2", [seat({ friend: { key: "dave", name: "Dave" }, deckName: "Avengers Tempo", commander: yuriko, colorIdentity: ["U", "B"] }), seat({ seat: 2, commander: tymna, colorIdentity: ["W", "U", "B", "G"] })]],
  ["g3", [seat({ commander: tymna, colorIdentity: ["W", "U", "B", "G"] })]],
]);
const MATCHUPS = summarizeMatchups(GAMES, BY_GAME);

export function OpponentsFigureBody() {
  // The `lg` row's fixed tracks need 572px before the name column takes any.
  return (
    <FitFigure wideAt="lg:min-w-[780px]">
      <GameMatchups matchups={MATCHUPS} />
    </FitFigure>
  );
}

/**
 * `fixtures.wishlist` (the board's E1): three lines of a wishlist, one partly held. Each tile is the catalog's name and
 * image, as the tab draws it.
 */
const WISHLIST: WishlistTileCard[] = [
  { name: "Lathliss, Dragon Queen", imageUri: "https://cards.scryfall.io/normal/front/0/c/0cb48015-627b-49cd-8dc3-d446e82b8172.jpg?1783907068", want: 2, have: 1 },
  { name: "Giada, Font of Hope", imageUri: "https://cards.scryfall.io/normal/front/8/a/8ae6fc26-cfad-4da8-98d9-49c27c24d293.jpg?1783909085", want: 1, have: 0 },
  // The board drew Miku, a Secret Lair name for Trostani; the tab draws the catalog's name and image, so the specimen does too.
  { name: "Trostani, Selesnya's Voice", imageUri: "https://cards.scryfall.io/normal/front/3/4/34ea44f2-cb2f-4b86-83fc-fe507f05bb9d.jpg?1783932732", want: 1, have: 0 },
];

/**
 * The Wishlist tab's tiles, three across in the tab's own grid track. The shared `WishlistTileFace` in a plain box
 * rather than the tab's card-details press: the specimen is inert, and the press needs the provider the tab mounts.
 */
export function WishlistFigureBody() {
  // Three 178px tracks and two 20px gaps are 574px, more than the article has at a signed-in 1024px.
  return (
    <FitFigure wideAt="md:min-w-[574px]">
      <ul className={`m-0 grid list-none p-0 ${CARD_GRID_TRACKS} gap-[8px] md:gap-[20px]`}>
        {WISHLIST.map((tile) => (
          <li key={tile.name} className="flex flex-col" data-testid="wishlist-tile">
            <span className={WISHLIST_TILE_SHELL}>
              <WishlistTileFace tile={tile} eager={false} />
            </span>
          </li>
        ))}
      </ul>
    </FitFigure>
  );
}

/**
 * `fixtures.friendSpares` (the board's E2): a deck with a $4 limit buying two cards. Demand Answers is under the limit
 * and two friends can spare one, both through the Thursday pod; Valakut Awakening is over it, with no spare. Faces are
 * initials: the board's faces are canvas assets that name no commander.
 */
const SPARES_AS_OF = new Date("2026-09-01T00:00:00.000Z");
const spareRow = (over: Partial<DeckDetailCard> & Pick<DeckDetailCard, "oracleId" | "name" | "typeLine">): DeckDetailCard => ({
  cardTypeGroup: "Instants",
  role: "other",
  cmc: 2,
  owned: false,
  quantity: 1,
  auto: false,
  manaCost: null,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  availability: null,
  ...over,
});
const DEMAND_ANSWERS = spareRow({
  oracleId: "about-spare-demand",
  name: "Demand Answers",
  typeLine: "Instant",
  role: "draw",
  manaCost: "{1}{R}",
  imageUri: "https://cards.scryfall.io/normal/front/e/c/eca092fc-7c67-4a73-989e-5297bbaaea76.jpg?1783912883",
  price: { cents: 26, foilCents: null, etchedCents: null, asOf: SPARES_AS_OF },
});
const VALAKUT = spareRow({
  oracleId: "about-spare-valakut",
  name: "Valakut Awakening // Valakut Stoneforge",
  typeLine: "Instant // Land",
  cmc: 3,
  manaCost: "{2}{R}",
  imageUri: "https://cards.scryfall.io/normal/front/2/2/228e551e-023a-4c9a-8f32-58dae6ffdf7f.jpg?1783929350",
  price: { cents: 1390, foilCents: null, etchedCents: null, asOf: SPARES_AS_OF },
});
const friend = (publicId: string, displayName: string) => ({ publicId, displayName, commander: null, pods: ["Thursday pod"] });
const FRIEND_SPARES: FriendSpare[] = [
  { oracleId: DEMAND_ANSWERS.oracleId, friend: friend("about-colin", "Colin"), spare: 1 },
  { oracleId: DEMAND_ANSWERS.oracleId, friend: friend("about-max", "Max"), spare: 2 },
];

/**
 * Two Shopping rows, the first carrying the spare glyph in its other-ways press, then the spares-only modal that press
 * opens, drawn IN PLACE: `ModalPanel` (the sheet's own header and body) in a box of the sheet's border and ground, with
 * `SparesSheetBody` (its Replacing box and `FriendSpareSection`) inside. The rows read the spares through
 * `StaticSparesProvider`, so the figure reads no friend; the swap tools' provider gives Valakut its `over $4` and ⇄.
 */
export function FriendSparesFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <SwapToolsProvider deckId="about-figure" deckName="HD - Kratos" storedLimitCents={400}>
        <StaticSparesProvider spares={FRIEND_SPARES}>
          <div className="flex flex-col gap-[18px]">
            <div className="flex flex-col">
              {[DEMAND_ANSWERS, VALAKUT].map((card) => (
                <DecklistRow key={card.oracleId} deckId="about-figure" card={card} siblings={[]} inShopping newestAsOf={SPARES_AS_OF} />
              ))}
            </div>
            <div
              data-testid="spares-sheet-in-place"
              className="flex w-full max-w-[640px] flex-col self-center overflow-hidden rounded-[14px] border border-[color:var(--border-strong)]"
              style={{ background: "var(--surface-raised)", boxShadow: "var(--modal-shadow)" }}
            >
              <ModalPanel title={spareCopy.modalTitleSpares} closeLabel={spareCopy.close} onClose={noop}>
                <HoverPreviewProvider waitForMove>
                  <SparesSheetBody card={DEMAND_ANSWERS} spares={FRIEND_SPARES} newestAsOf={SPARES_AS_OF} />
                </HoverPreviewProvider>
              </ModalPanel>
            </div>
          </div>
        </StaticSparesProvider>
      </SwapToolsProvider>
    </CardDetailProvider>
  );
}
