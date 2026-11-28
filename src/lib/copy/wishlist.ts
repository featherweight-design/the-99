// Social R2 (the wishlist): copy. Taken from the handoff's `social-r2 · copy strings.ts` (round 2), brought to round 3
// (README "Round 3 changes": a collected card LEAVES the list, so no Collected group, caption or friend mark, and the
// one-time strip says what left), with the strings the R3 boards draw that the file lacked, after /copy-review.
// PR 3 brings the whole module; the tab (PR 4), card details' section (PR 5) and the friend page (PR 6) read it.
// The spare strings are not here: they sit beside socialCopy with the Shopping work. No string here reaches a model.

import { storeCopy } from "./store";
import { STORE_INFO } from "../stores/info";

/** A run of text, drawn strong (500 or 600 in `--fg`) where the boards draw it bold. */
export type CopyPart = { text: string; strong?: true };

/** "A", "A and B", "A, B and C" (the app's list join, no serial comma), each name strong. */
const joinNames = (names: readonly string[]): CopyPart[] =>
  names.flatMap((name, i) => [
    ...(i === 0 ? [] : [{ text: i === names.length - 1 ? " and " : ", " }]),
    { text: name, strong: true as const },
  ]);

/** A card's short name for the phone's strip: before its first comma, and its front face alone. */
const shortName = (name: string) => name.split(" // ")[0]!.split(", ")[0]!;

const left = (cardCount: number) => (cardCount === 1 ? "It’s left your wishlist." : "They’ve left your wishlist.");

export const wishlistCopy = {
  tab: "Wishlist", // Collection's place strip, fifth, after History

  page: {
    meta: (wanted: number) => `${wanted} wanted`,
    friendsLine: "Your friends can see this list", // only with at least one friend
    sort: { label: "Sort", lead: "Sort:", newest: "Newest", name: "Name", friends: "Friends’ spares" }, // desktop only: "Sort: Newest ▾"; `label` names the control
    // The tile's friend-spare press (find-a-friend's-spare R1): the modal and its rows are the shipped `spareCopy`.
    sparePress: {
      aria: (card: string, friends: number) => `Friends with a spare of ${card}, ${friends === 1 ? "1 friend" : `${friends} friends`}`,
      kicker: "on your wishlist",
    },
    search: {
      placeholder: "Add a card to your wishlist…",
      add: "Add to wishlist",
      addShort: "Add", // phone
      // A result row's line under the name: what the collection holds, and whether the card is already on the list.
      have: (copyCount: number) => `you have ${copyCount}`,
      onList: "on your wishlist",
      haveOnList: (copyCount: number) => `you have ${copyCount} · on your wishlist`,
    },
    emptyTitle: "Nothing on your wishlist yet",
    emptyBody:
      "Cards you want that no deck is asking for, in any printing. Search above or press Add to wishlist in any card’s details, and a card leaves once you have enough.",
    // The one-time receipt strip (role status, bare ✕) naming the cards that left because the collection reached them.
    // Parts, because the names are drawn strong.
    collectedLeft: (names: readonly string[]): CopyPart[] => [
      { text: "Collected since you last looked: " },
      ...joinNames(names),
      { text: `. ${left(names.length)}` },
    ],
    collectedLeftShort: (names: readonly string[]): CopyPart[] => [
      { text: "Collected: " },
      ...joinNames(names.map(shortName)),
      { text: `. ${left(names.length)}` },
    ], // phone
    dismiss: "Dismiss", // the strip's ✕, aria-label
    // Cart on your wishlist, call 2: offered once while the Settings switch is off and the decks need a card. The board's
    // `cards you don’t own` is cut: the count is the sync set (plan F7), which includes a card owned but held by a
    // senior deck, so the clause would be false for it.
    offer: {
      lead: (cards: number) => `Your decks need ${cards === 1 ? "1 card" : `${cards} cards`}.`,
      body: "Put them here so friends can see them. They follow your decks, and leave once you have them.",
      add: "Add them",
      dismiss: "Not now", // the ✕, aria-label
      failed: "Couldn’t add them. Try again.",
    },
    // Call 3: the tab split by source while the switch is on. The band draws its count beside the title.
    groups: {
      you: "Added by you",
      deck: (deck: string) => `For ${deck}`,
      openDeck: "Open deck ›",
      openDeckAria: (deck: string) => `Open deck, ${deck}`,
    },
  },

  tile: {
    // `have 1 of 2`, the want strong (`--fg-body`). The want is the copies wanted IN ALL, so the caption reads it as the
    // total the holding counts toward, never as copies on top of it (d9, for Hugh, 2026-10-15).
    caption: (want: number, have: number): CopyPart[] => [
      { text: `have ${have} of ` },
      { text: String(want), strong: true },
    ],
    // A friend's tile (their page, view only): `wants 2`, the count strong, and never an owned count.
    wants: (want: number): CopyPart[] => [{ text: "wants " }, { text: String(want), strong: true }],
  },

  details: {
    add: "Add to wishlist",
    section0: "Wishlist", // the box's label before the card is added
    section: "In your wishlist",
    remove: "Remove",
    want: "want in all", // the stepper's label, and its count's spoken name: the copies wanted in all
    have: (copyCount: number) => `you have ${copyCount}`,
    fewer: "Want one fewer", // the stepper's −, aria-label (the tab's result stepper too)
    more: "Want one more", // the stepper's +, aria-label
    failedSet: "We couldn’t change that. Your wishlist is unchanged.", // toast, role alert
    failedAdd: "We couldn’t add that to your wishlist. Try again.", // toast, role alert
  },

  friend: {
    back: "‹ Friends",
    since: (date: string) => `Friend since ${date}`, // date reads "Oct 2"
    head: (name: string) => `${name}’s wishlist`,
    viewOnly: "view only",
    wants: (copyCount: number) => `wants ${copyCount}`,
    emptyTitle: (name: string) => `${name}’s wishlist is empty`,
    emptyBody: (name: string) => `When ${name} adds a card, it shows here with how many they want, until they have them.`,
  },

  // Cart on your wishlist (M1): the deck ⋯ menu's row under Hidden from friends, drawn only while Settings' switch is on.
  deckMenu: {
    keepOff: "Keep off my wishlist",
    failed: "We couldn’t save that. Try again.", // toast, role alert
  },
};

/** Wishlist printing (handoff R1): a line that names the printing it wants. Reused: `priceCopy.tag.soldOut` for `sold out`. */
export const wishlistPrintingCopy = {
  box: {
    label: "Printing",
    any: "Any printing", // also the press back to any printing
    cheapest: "cheapest", // after `Any printing ·` when no other printing is on screen
    want: (set: string, collectorNumber: string) => `Want ${set} ${collectorNumber}`,
    wantAria: (set: string, collectorNumber: string, setName: string, card: string) => `Want ${set} ${collectorNumber}, ${card} from ${setName}`,
    soldOut: "sold out",
    soldOutNote: (price: string) => storeCopy.soldOutNote(STORE_INFO.manapool, price),
  },
  panel: {
    wantedAny: "Wanted: any printing",
    wanted: (set: string, collectorNumber: string) => `Wanted: ${set} ${collectorNumber}`,
  },
  tile: {
    aria: (set: string, collectorNumber: string) => `wanted printing ${set} ${collectorNumber}`,
  },
  linkOut: (set: string, collectorNumber: string) => storeCopy.linkOutPrinting(STORE_INFO.manapool, set, collectorNumber),
  announce: (set: string, collectorNumber: string) => `Wanted ${set} ${collectorNumber}.`,
  announceAny: "Wanted any printing.",
  failed: "Couldn’t change the printing. Try again.",
} as const;
