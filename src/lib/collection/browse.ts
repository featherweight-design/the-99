import { cache } from "react";
import { and, eq, inArray, sql } from "drizzle-orm";
// Type-only, so the set-filter → browse dependency stays one-way at runtime.
import type { OwnedSetMeta } from "./set-filter";
import { matchesColors, type JoinMode } from "../commanders/filter";
import { availabilityState, type Availability, type AvailabilityState, type AvailabilitySummary } from "../decks/availability";
import { faceNames, isTwoFaced } from "../cards/faces";
import { frontFace } from "../cards/facet";

/** Rarity ordering for the "rarity" sort key. */
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

/**
 * One printing the user owns, with the image resolved for that printing specifically.
 * A card owned in four printings has four of these — a single resolved URI on BrowseCard
 * could not represent that, which is why the modal caption reads set + collector number here.
 */
import type { PrintingPrices } from "../cards/price-lookup";
import { factsFor } from "../bracket/facts";
import type { ModalComboPartner } from "../combos/near-miss";
import type { CardBracketFlags } from "../bracket/flags-read";
import type { CardFact } from "../copy/card-mark";
import { recordSoftFailure } from "../cache/soft-failure";

export type BrowsePrinting = {
  setCode: string;           // uppercased for display; stored lowercase
  /**
   * The printing's catalog id, where the holding names one. Optional for the reason
   * `layout` and `availability` are: fixtures and tests build `BrowsePrinting`
   * literals that never touch the catalog.
   *
   * Absent is a real state, not a gap to paper over: `collection_items.scryfall_id`
   * is nullable, and a bare `Name,Qty` import carries neither an id nor a collector
   * number. A reader that needs the printing's own row — the price is the one that
   * does — asks by this id, falls back to `(setCode, collectorNumber)`, and says
   * nothing when neither names a printing. It must NOT fall through to the
   * representative printing the way `resolveImageUri` does: a representative is a
   * different collector number in the same set, so its price would be another
   * printing's figure under this printing's art.
   */
  scryfallId?: string;
  /** From the `sets` catalog. Null when no row exists — callers fall back to setCode. */
  setName: string | null;
  collectorNumber: string;   // "" for exports that carry no collector number
  /** ISO date from `sets`, for the picker's newest-first set grouping. Null sorts last. */
  releasedAt: string | null;
  quantity: number;
  /**
   * Copies owned per finish, e.g. {nonfoil: 3, foil: 1}. Finishes of one printing share art
   * and so collapse into one entry, but the picker names the breakdown when it is not plain
   * nonfoil — otherwise "×4" would hide that one of them is the foil.
   */
  finishes: Partial<Record<Finish, number>>;
  imageUri: string | null;
  /**
   * THIS printing's back face, for the layouts that have one — and null for every layout
   * that does not.
   *
   * Printing-level, not oracle-level, for the same reason `flavorName` is: a treatment
   * redraws both faces, so a flip on a picked printing used to turn to a back belonging to
   * another printing entirely. Falls through the same tiers as the front art, and null
   * where they all miss — a row ingested before the column existed included, which is what
   * makes the oracle-level fallback the reader keeps.
   *
   * Optional rather than `| null` required, for the reason `scryfallId` is: fixtures and
   * tests across nineteen files build `BrowsePrinting` literals that never touch the
   * catalog, and absent means exactly what null does here — fall back to the card's.
   */
  backImageUri?: string | null;
  /**
   * Whether `backImageUri` above is THIS PRINTING's own, rather than the oracle-level
   * fallback `resolveBackImageUri` hands a printing that has none.
   *
   * The two are the same value to anything DRAWING the back, and a different fact to
   * anything deciding whether the copy in hand has two sides. The card modal's turn
   * control needs the second: a reversible printing carries its own back art under a
   * one-sided oracle layout, and reading the resolved value there would also open on an
   * oracle-level back belonging to some other printing entirely. Raised by review on
   * #818, where the gate conflated them and only passed its test because the fixture
   * built props by hand rather than through this loader.
   *
   * Optional for the same reason `backImageUri` is: fixtures build these literals, and
   * absent means "not this printing's own", which is the safe reading.
   */
  hasOwnBack?: boolean;
  /**
   * THIS printing's frame-free crop — what a wash draws behind a commander sleeved from it.
   *
   * Printing-level for the same reason `backImageUri` is: `cards.art_crop_uri` is one
   * arbitrary printing's crop, so a deck whose commander is owned in another printing drew
   * art that is not on the card in the box. Falls through the same tiers as the front art,
   * and null where they all miss — a printing ingested before the column existed included,
   * which is what keeps the oracle-level fallback the reader had.
   *
   * Optional rather than `| null` required, exactly as `backImageUri` is: fixtures across
   * the suite build `BrowsePrinting` literals that never touch the catalog, and absent
   * means what null does here.
   */
  artCropUri?: string | null;
  /**
   * The name printed on THIS printing when it differs from the oracle card's —
   * `printings.flavor_name`, populated for Secret Lair and similar renames
   * (#467). Null on the overwhelming majority of printings, which print the
   * oracle name.
   */
  flavorName: string | null;
};

export type Finish = "nonfoil" | "foil" | "etched";

/** The printing a user chose to represent a card. Set code uppercased, as BrowsePrinting is. */
export type PreferredPrinting = { setCode: string; collectorNumber: string };

/** A deck that prints its copy of a card, for the receipt's second list. */
export type ProxyingDeck = { id: string; name: string };

export type BrowseCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  /** Mana value. The figure the collection row's cost track states (§1b). */
  cmc: number;
  oracleText: string | null;
  keywords: string[];
  rarity: "common" | "uncommon" | "rare" | "mythic";
  colorIdentity: string[];
  /** The primary printing's image — first non-null across printings in display order. */
  imageUri: string | null;
  /**
   * The name printed on the resolved printing, when it differs from the oracle
   * name — otherwise null. Derived from the SAME `primaryPrinting()` call that
   * resolves `imageUri`, because a name that disagrees with the art on screen
   * is the failure this field exists to prevent.
   *
   * Null is the overwhelmingly common case and means "call this card by its
   * oracle name". Use `printedNameOf()` rather than testing this at each site.
   */
  printedName: string | null;
  /**
   * Scryfall's layout word and, for the layouts that have one, the back face's
   * art (#363). Optional rather than `| null` required for the reason
   * `availability` is: BrowseCard literals are built in fixtures and tests that
   * cannot reach the catalog. Absent means no `//` mark and no flip control,
   * which is the direction this is allowed to fail in.
   */
  layout?: string | null;
  backImageUri?: string | null;
  quantity: number;
  /**
   * Optional, not `| null` required — same call as DeckDetailCard in Task 4.
   * `loadBrowseCards` does not set it (the aggregate is joined in the page, not
   * in this query), and the browse fixtures across browse.test.ts, no-results
   * and card-modal build BrowseCard literals that have no availability to give.
   * "Absent" and "read failed" both correctly render nothing.
   */
  /**
   * The standing bracket facts this card carries — Game Changer, mass land denial,
   * extra turns.
   *
   * SET BY `loadBrowseCards` AND BY NOTHING ELSE TODAY. `loadCardDetail` builds its own
   * `BrowseCard` and does not call `attachBracketFacts`, so the modal's block is wired
   * with the surfaces rather than here — do not read a `facts` on a card from that
   * loader as "this card has only these facts".
   *
   * OMITTED WHEN EMPTY rather than sent as `[]`, and that is a payload decision as much
   * as a semantic one: the overwhelming majority of cards carry none, this list is the
   * largest payload in the app, and an empty array per card would spend bytes to say
   * nothing. Absent means the card carries no fact — which is also exactly what the
   * flags table's own absence means.
   *
   * It is NOT a completeness claim in either direction. Detection on two of the three is
   * measured and PARTIAL, so an absent list is silence rather than a cleared check, and
   * nothing drawn from it may say otherwise.
   */
  facts?: CardFact[];
  /**
   * STATE 1 of combo awareness: this card and `comboPartner` are two halves of a two-card
   * combo, both owned, and no single deck holds both.
   *
   * Absent for every other card, and absent is the common case — 65 of 2,805 on the reference
   * collection. A name rather than a flag, because the clause NAMES the partner and never
   * counts: detection excludes template-gated variants by design, so a number beside it would
   * be the first thing on the surface that is not true.
   */
  comboPartner?: { oracleId: string; name: string };
  /**
   * How many OTHER partners the marker's tooltip is not naming.
   *
   * A count of what the SENTENCE omits, never a claim about what exists — which is the one
   * licence a number has in this feature, and the same one `+N more` had. Absent or 0 means
   * the tooltip names the only partner there is.
   */
  comboOtherPartners?: number;
  /**
   * EVERY two-card combo partner of this card, for the modal's `Two-card combos` block.
   *
   * Distinct from `comboPartner` above, which is ONE partner for the inline clause on a list
   * row. The block enumerates; the clause never does, and no surface draws both.
   *
   * Set by the card-detail loader alone, which is the only reader that fetches one card. A
   * list payload never carries it — 65 cards times their partners is a large field to ship
   * for a modal most rows are never opened into.
   */
  comboPartners?: ModalComboPartner[];
  availability?: Availability | null;
  /**
   * The decks printing this card, which is NOT part of `availability.claims` and
   * must never be folded into it: `hardDecks`, `pullSources`, the markers and
   * the pull authorization all read that list, and a proxying deck holds no
   * cardboard for any of them to subtract.
   *
   * Its own field for a second reason — `loadCardDetail` computes availability
   * only for a card the player owns a copy of, and the headline case for a proxy
   * is a card owned in none. The receipt's proxy list has to survive that
   * branch, so this is read on both.
   */
  /** Null when the read FAILED — never an empty array, which would mean "no
   *  deck prints this". The control refuses to guess on null. */
  proxiedBy?: ProxyingDeck[] | null;
  /**
   * The gate on the modal's `Find a deck for it →` door (swap tools, audit F3): the card can be
   * played in Commander, and the reader has at least one deck with a commander to play it in. Only
   * `loadCardDetail` sets them; absent reads as closed, so a specimen or a failed read draws no door.
   */
  commanderLegal?: boolean;
  hasDecks?: boolean;
  /**
   * What the feed last carried for each of this card's printings, indexed both
   * ways `BrowsePrinting` can name one. Optional for the same reason
   * `availability` is: only `loadCardDetail` sets it, because only the modal
   * draws a figure, and the list payload must never carry prices for 2,472 cards
   * so one of them can be opened.
   *
   * Null means the read failed or never ran — which the modal renders as silence,
   * not as `no stock`. `no stock` is what the store answered; null is nobody
   * having asked.
   */
  prices?: PrintingPrices | null;
  printings: BrowsePrinting[];
  setCodes: string[];
  primarySetCode: string;
  /**
   * The stored pick, or null when the user has never chosen. Present even when that printing is
   * no longer owned — the picker renders it as a dormant tile so the pin stays clearable, and
   * the art quietly falls back through the remaining tiers.
   */
  preferredPrinting: PreferredPrinting | null;
};

/**
 * A card as the browse list carries it: everything above except the three
 * fields only the modal reads.
 *
 * `printings`, `oracleText` and `backImageUri` were 1.17 MB of a 2.16 MB
 * payload on the largest collection here — shipped for all 2,472 cards so that
 * one of them could be opened. The modal now fetches the card it opens, exactly
 * as every deck surface already did, and the list ships without them.
 *
 * `setCounts` is what survives of `printings` for the list's purposes: the
 * quantity owned per set, uppercased, which the Set ▾ panel's counts sum. It is
 * a tuple list rather than a record because it serialises smaller, and this
 * type exists to make the payload small.
 */
/**
 * One card as `/collection` ships it: what the list filters, sorts, searches and draws, and
 * nothing the modal reads (it fetches its own card). Trimmed field by field against what the
 * list surfaces actually read, which the compiler enforces through this type
 * (plans/2026-09-28-list-payload-shrink.md, PR 2): `keywords`, `cmc` and `preferredPrinting`
 * have no reader here, `setCodes` is `setCounts`' own keys, and the combo clause names its
 * partner without its id.
 */
export type BrowseListCard = Omit<
  BrowseCard,
  | "printings" | "oracleText" | "backImageUri" | "prices"
  | "keywords" | "cmc" | "preferredPrinting" | "setCodes" | "availability" | "comboPartner"
> & {
  setCounts: [string, number][];
  /** What the markers read, and nothing a pull or a receipt reads: see `AvailabilitySummary`. */
  availability?: AvailabilitySummary | null;
  comboPartner?: { name: string };
};

/** Drops what only the modal reads, and rolls the printings up into set counts. */
export function toListCards(cards: BrowseCard[]): BrowseListCard[] {
  return cards.map((card) => {
    const {
      /* eslint-disable @typescript-eslint/no-unused-vars -- destructured to drop them from `rest` */
      printings, oracleText, backImageUri, prices, keywords, cmc, preferredPrinting, setCodes,
      availability, comboPartner,
      /* eslint-enable @typescript-eslint/no-unused-vars */
      ...rest
    } = card;
    const counts = new Map<string, number>();
    for (const p of printings) {
      // Uppercased here rather than trusted: `buildSetOptions` looks these codes
      // up against uppercased catalog codes, and the aggregation that builds
      // `BrowseCard` is not the only thing that can construct one.
      const code = p.setCode.toUpperCase();
      counts.set(code, (counts.get(code) ?? 0) + p.quantity);
    }
    const list: BrowseListCard = { ...rest, setCounts: [...counts] };
    // Set only when present: an absent key costs nothing on the wire, and `undefined` does.
    if (comboPartner) list.comboPartner = { name: comboPartner.name };
    return list;
  });
}

export type BrowseFilters = {
  search: string;
  colors: string[];       // subset of ["W","U","B","R","G"]
  /**
   * How `colors` is matched (H10): `contains` (the default) keeps a card whose identity holds
   * every selected colour, `exactly` one whose identity is the selection and nothing else. The
   * lanes' rule, read through `matchesColors`. Absent reads as `contains`, which is every caller
   * that predates the mode, including the counts that clear the colour selection anyway.
   */
  match?: JoinMode;
  /**
   * Multi-select (#100): a card matches when ANY selected type is a substring of
   * its typeLine. ORs internally, ANDs with every other filter — the same shape
   * as `setCodes`, because "Creature AND Land" would match almost nothing.
   */
  types: string[];
  /** Multi-select (#86): a card matches when ANY selected code is one of its setCodes. */
  setCodes: string[];
  /**
   * Multi-select (#43): a card matches when its state is ANY selected state.
   * ORs internally, ANDs with every other filter — the `setCodes` shape.
   *
   * Optional, unlike its three siblings: fourteen files build BrowseFilters
   * literals and a required field would break every one of them for no gain.
   * Absent and empty both mean "no availability filter".
   */
  availability?: AvailabilityState[];
};

export type SortKey = "name" | "quantity" | "set" | "rarity" | "color";
export type SortDirection = "asc" | "desc";

export function cssUrl(uri: string): string {
  return `url("${encodeURI(uri).replaceAll('"', "%22")}")`;
}

/**
 * The art fallback for a card whose printing carries no image. It lives beside
 * `cssUrl` because every surface that calls one calls the other, and two copies
 * of a stripe angle drift the first time one is adjusted.
 */
export const ART_STRIPES =
  "repeating-linear-gradient(135deg, var(--surface) 0 11px, var(--surface-sunken) 11px 22px), var(--bg)";

/** Subtitle date per design: "today" / "yesterday" / "Jul 12" (year appended when not current). */
export function formatLastUpdated(date: Date, now: Date = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(date)) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (date.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return date.toLocaleDateString("en-US", opts);
}

/** Shared WUBRG palette — used by mana-pips, rows-view, the chassis chips, card-modal. */
export const WUBRG_COLOR: Record<string, string> = {
  W: "var(--w)", U: "var(--u)", B: "var(--b)", R: "var(--r)", G: "var(--g)",
};

/** Coarse card-type options shown in the Type ▾ dropdown (property table §Filter Button). */
export const AVAILABLE_TYPES = [
  "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Land",
] as const;

export type RawCollectionRow = {
  cmc: number;
  oracleId: string;
  quantity: number;
  setCode: string;
  collectorNumber: string;
  finish: Finish;
  name: string;
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
  keywords: string[];
  rarity: string;
  colorIdentity: string[];
  /**
   * Scryfall's own `game_changer`. It rides the card row, so every reader that already
   * selects a card gets it free — which is why it is here and the other two facts are
   * not: those cost a join and are attached per card actually drawn.
   */
  gameChanger: boolean;
  layout: string;
  backImageUri: string | null;
  /** From `sets`, joined on the holding's set code. Null when the catalog has no row. */
  setName: string | null;
  releasedAt: string | null;
  /**
   * The user's stored pick for this oracle id, lowercase as stored. Null when unset. Constant
   * across every row of an oracle — the preference is per card, not per holding.
   *
   * There is deliberately no `preferredImageUri` tier here (§3.5 tier 0). This function resolves
   * ONE PRINTING's art, and the preference is oracle-level: a tier-0 arm would paint every
   * printing tile with the chosen printing's art, so the picker would show eleven copies of the
   * same image. Tier 0 is applied where it belongs — in `primaryPrinting`, which selects WHICH
   * printing represents the card. The chosen printing's own art then resolves through tiers 1-3
   * exactly like any other, which is also what makes the null-image edge case fall through for
   * free.
   */
  preferredSetCode: string | null;
  preferredCollectorNumber: string | null;
  /**
   * The holding's own `collection_items.scryfall_id`. Null on a name-only import.
   * Not an image tier — the id of the printing this row IS.
   */
  scryfallId: string | null;
  /** Tier 1 — the printing joined on collection_items.scryfall_id. */
  exactImageUri: string | null;
  /** Tier 2 — the representative printing for (oracle_id, set_code). */
  representativeImageUri: string | null;
  /** Tier 3 — the oracle-level catalog image, i.e. today's behavior. */
  cardImageUri: string | null;
  /** Tier 1's frame-free crop — the exact printing's own art. */
  exactArtCropUri: string | null;
  /** Tier 2's crop. `resolveArtCropUri` takes whichever tier the front art came from. */
  representativeArtCropUri: string | null;
  /** Tier 3's crop — `cards.art_crop_uri`, one arbitrary printing's, i.e. today's behavior. */
  cardArtCropUri: string | null;
  /** Tier 1's printed name — the exact printing's `printings.flavor_name`, or null. */
  flavorName: string | null;
  /** Tier 2's printed name. `resolveFlavorName` takes whichever tier the art came from. */
  representativeFlavorName: string | null;
  /** Tier 1's back face — the exact printing's own second side, or null. */
  exactBackImageUri: string | null;
  /** Tier 2's back face. `resolveBackImageUri` takes whichever tier the art came from. */
  representativeBackImageUri: string | null;
};

/**
 * Image resolution (§3.5) — a COALESCE on non-null VALUE, never a first-tier-wins cascade.
 *
 * Selecting on match success would send a double-faced card, whose printing row exists but
 * whose top-level image_uris is absent, straight to a blank tile. Falling through on null is
 * the whole point: tier 4 (the identity gradient, already implemented downstream) only applies
 * when all three tiers are genuinely null.
 */
export function resolveImageUri(r: {
  exactImageUri: string | null;
  representativeImageUri: string | null;
  cardImageUri: string | null;
}): string | null {
  return r.exactImageUri ?? r.representativeImageUri ?? r.cardImageUri ?? null;
}

/**
 * The printed name of whichever printing `resolveImageUri` just took the art from.
 *
 * The name and the art come off one printing or they disagree, and the art falls
 * through three tiers — so the name has to fall through the same three, in step.
 * A collection row with no `scryfall_id` misses the exact join entirely and shows
 * the representative printing's art; sourcing the name from the exact printing
 * alone would caption a Secret Lair art with the oracle name. Tier 3 is
 * `cards.imageUri`, which belongs to no printing and therefore prints no name.
 */
export function resolveFlavorName(r: {
  exactImageUri: string | null;
  representativeImageUri: string | null;
  flavorName: string | null;
  representativeFlavorName: string | null;
}): string | null {
  if (r.exactImageUri !== null) return r.flavorName;
  if (r.representativeImageUri !== null) return r.representativeFlavorName;
  return null;
}

/**
 * The back face of whichever printing `resolveImageUri` just took the front from.
 *
 * Both faces come off one printing or the card turns into a different printing's back —
 * the same rule, and the same three tiers in step, as `resolveFlavorName`. Tier 3 is the
 * oracle-level `cards.back_image_uri`, which belongs to no printing and is where every
 * flip stood before this column existed: a printing row written by an older ingest carries
 * a null back and falls through to it rather than losing its second face.
 */
export function resolveBackImageUri(r: {
  exactImageUri: string | null;
  representativeImageUri: string | null;
  exactBackImageUri: string | null;
  representativeBackImageUri: string | null;
  backImageUri: string | null;
}): string | null {
  // WHICHEVER TIER THE FRONT CAME FROM, AND THEN THE ORACLE — never the tier below.
  // A first pass fell through to the representative printing's back when the exact
  // printing had none, which pairs one printing's front with another's back: the very
  // defect this column closes, reached from the other side. A printing with no back of
  // its own is one an older ingest wrote, and the honest answer for it is the
  // oracle-level image every flip used before the column existed.
  if (r.exactImageUri !== null) return r.exactBackImageUri ?? r.backImageUri;
  if (r.representativeImageUri !== null) return r.representativeBackImageUri ?? r.backImageUri;
  return r.backImageUri;
}

/**
 * Whether `resolveBackImageUri` just returned THIS printing's own back art rather than the
 * oracle-level fallback.
 *
 * Deliberately mirrors the tiering above line for line rather than re-deriving it: the two
 * answer about the same pixels, and a second copy of the rule that drifted would put a turn
 * control on a card whose back belongs to another printing. Same shape as
 * `compareForRepresentative`, which exists to keep one ordering in two places honest.
 */
export function backImageIsOwn(r: {
  exactImageUri: string | null;
  representativeImageUri: string | null;
  exactBackImageUri: string | null;
  representativeBackImageUri: string | null;
}): boolean {
  if (r.exactImageUri !== null) return r.exactBackImageUri !== null;
  if (r.representativeImageUri !== null) return r.representativeBackImageUri !== null;
  return false;
}

/**
 * The frame-free crop of whichever printing `resolveImageUri` just took the front art from.
 *
 * Same rule as `resolveBackImageUri`, for the same reason: the crop and the front art come
 * off one printing or they disagree. A printing ingested before `printings.art_crop_uri`
 * existed has none of its own, and the honest answer for it is the oracle-level crop every
 * wash drew before the column existed — never the tier below, which is another printing's
 * art under this printing's name.
 */
export function resolveArtCropUri(r: {
  exactImageUri: string | null;
  representativeImageUri: string | null;
  exactArtCropUri: string | null;
  representativeArtCropUri: string | null;
  cardArtCropUri: string | null;
}): string | null {
  if (r.exactImageUri !== null) return r.exactArtCropUri ?? r.cardArtCropUri;
  if (r.representativeImageUri !== null) return r.representativeArtCropUri ?? r.cardArtCropUri;
  return r.cardArtCropUri;
}

/**
 * A collector number's digits with every non-digit stripped, so "12a" and "A-12" both sort as 12
 * and numberless values like "★" sort last. Deliberately the same rule as `numericPart` in
 * transform-printings.ts: browse order has to agree with the order the ingest chose the
 * representative printing by, or a tile shows one printing's art under another's caption.
 */
function collectorNumberSortKey(collectorNumber: string): number {
  const digits = collectorNumber.replace(/\D/g, "");
  return digits === "" ? Number.MAX_SAFE_INTEGER : Number(digits);
}

/** Scryfall occasionally emits a rarity outside the four the UI knows (e.g. "bonus"). */
export function coerceRarity(rarity: string): BrowseCard["rarity"] {
  return (RARITY_ORDER[rarity] !== undefined ? rarity : "common") as BrowseCard["rarity"];
}

/** Deterministic printing order: set code, then natural collector number, then the raw value. */
export function comparePrintings(a: BrowsePrinting, b: BrowsePrinting): number {
  if (a.setCode !== b.setCode) return a.setCode < b.setCode ? -1 : 1;
  const na = collectorNumberSortKey(a.collectorNumber);
  const nb = collectorNumberSortKey(b.collectorNumber);
  if (na !== nb) return na - nb;
  if (a.collectorNumber === b.collectorNumber) return 0;
  return a.collectorNumber < b.collectorNumber ? -1 : 1;
}

/**
 * Aggregate collection_items × printings × cards rows into one BrowseCard per oracleId.
 *
 * Quantities sum across printings; printings are grouped on (setCode, collectorNumber) rather
 * than on set alone, so the same card in two arts is two entries. Set codes are uppercased for
 * display — they are stored lowercase so the printings join is exact (§3.3), but the captions
 * have always read "C21".
 *
 * The card-level imageUri is the first non-null image in printing order, not "whatever row the
 * database returned first": under the printing-level primary key, "first" is arbitrary.
 */
export function aggregateCollection(rows: RawCollectionRow[]): BrowseCard[] {
  const byOracle = new Map<string, BrowseCard>();
  const printingsByOracle = new Map<string, Map<string, BrowsePrinting>>();
  // Printing entries whose rows disagreed about which catalog printing they are.
  // Tracked rather than inferred from the entry, because "id dropped for
  // disagreeing" and "never had one" look identical on the entry itself and must
  // not be allowed to heal when a third row arrives carrying an id.
  const ambiguousIds = new Set<string>();
  for (const r of rows) {
    const setCode = r.setCode.toUpperCase();
    const printing: BrowsePrinting = {
      setCode,
      scryfallId: r.scryfallId ?? undefined,
      setName: r.setName,
      collectorNumber: r.collectorNumber,
      releasedAt: r.releasedAt,
      quantity: r.quantity,
      finishes: { [r.finish]: r.quantity },
      imageUri: resolveImageUri(r),
      artCropUri: resolveArtCropUri(r),
      backImageUri: resolveBackImageUri(r),
      hasOwnBack: backImageIsOwn(r),
      flavorName: resolveFlavorName(r),
    };
    const existing = byOracle.get(r.oracleId);
    if (existing) {
      existing.quantity += r.quantity;
      if (!existing.setCodes.includes(setCode)) existing.setCodes.push(setCode);
    } else {
      byOracle.set(r.oracleId, {
        oracleId: r.oracleId,
        name: r.name,
        typeLine: r.typeLine,
        manaCost: r.manaCost,
        cmc: r.cmc,
        oracleText: r.oracleText,
        keywords: r.keywords,
        rarity: coerceRarity(r.rarity),
        colorIdentity: r.colorIdentity,
        facts: r.gameChanger ? ["gameChanger"] : undefined,
        imageUri: null,
        printedName: null,
        layout: r.layout,
        backImageUri: r.backImageUri,
        quantity: r.quantity,
        printings: [],
        setCodes: [setCode],
        primarySetCode: setCode,
        // Uppercased to match BrowsePrinting.setCode — the preference is stored lowercase, and
        // comparing the two raw would silently never match.
        preferredPrinting: r.preferredSetCode === null
          ? null
          : {
            setCode: r.preferredSetCode.toUpperCase(),
            collectorNumber: r.preferredCollectorNumber ?? "",
          },
      });
      printingsByOracle.set(r.oracleId, new Map());
    }
    // Finishes of one printing share art, so they collapse to a single entry here.
    const printings = printingsByOracle.get(r.oracleId)!;
    const printingKey = `${setCode}|${r.collectorNumber}`;
    const seen = printings.get(printingKey);
    if (seen) {
      seen.quantity += r.quantity;
      seen.finishes[r.finish] = (seen.finishes[r.finish] ?? 0) + r.quantity;
      seen.imageUri ??= printing.imageUri;
      // Both finishes of one printing ARE one printing, so this can only ever
      // coalesce a null onto the same value — belt and braces, in the spirit of
      // the image line above.
      seen.flavorName ??= printing.flavorName;
      seen.backImageUri ??= printing.backImageUri;
      // `||=`, beside the line above rather than instead of it: coalescing the back art
      // and leaving the provenance behind is the one way these two can end up disagreeing,
      // and a filled back with a false flag reads as "this printing has no second side" on
      // a row that has one. Both finishes of one printing resolve through the same tiers,
      // so this can only ever set true onto true — belt and braces, in the same spirit,
      // and it means no future caller has to remember the pair travels together.
      seen.hasOwnBack ||= printing.hasOwnBack;
      seen.artCropUri ??= printing.artCropUri;
      // NOT `??=`, unlike the two lines above. Two finishes of one printing normally
      // share a catalog id, but the import path already records that they can
      // disagree and rules that null is the honest answer when they do
      // (`pending.ts:30-33`). The same rule holds here for a stronger reason: this
      // id is what a price is looked up by, so keeping whichever row was processed
      // first would put one printing's figure under an entry that is not certainly
      // that printing. Dropped, the entry falls back to its (set, collector number)
      // identity, which is the thing the rows DO agree on.
      // ANY disagreement drops the id, including a known id meeting a null one.
      //
      // The tempting rule is that a null row "does not know" and should defer to
      // the row that does. It cannot, because at this layer a null has two
      // histories and they are indistinguishable: a name-only import that never
      // named a printing, and a row `aggregatePendingItems` deliberately nulled
      // because two imports contradicted each other (`pending.ts:30-33`). Deferring
      // to the known id would let the second history resurrect an id the import
      // already ruled unsafe.
      //
      // Dropping it costs almost nothing: the entry is keyed by (set code,
      // collector number) and `priceFor` falls back to exactly that, which names
      // the same printing. The only case it costs a figure is a holding with no
      // collector number either — and there the id is the sole identity, which is
      // the state this rule exists to distrust. A missing figure is a state the
      // design draws; a figure belonging to another printing is the one thing
      // row 1.10 forbids outright.
      if (seen.scryfallId !== printing.scryfallId) {
        ambiguousIds.add(`${r.oracleId}|${printingKey}`);
      }
      if (ambiguousIds.has(`${r.oracleId}|${printingKey}`)) seen.scryfallId = undefined;
    } else {
      printings.set(printingKey, printing);
    }
  }

  for (const card of byOracle.values()) {
    card.printings = [...printingsByOracle.get(card.oracleId)!.values()].sort(comparePrintings);
    card.setCodes.sort();
    // Every card here was built from at least one collection row, so a primary always exists.
    const primary = primaryPrinting(card.printings, card.preferredPrinting);
    if (primary) Object.assign(card, cardArt(card.name, primary));
  }
  return [...byOracle.values()];
}

/** Whether a printing is the one a preference names. Both sides are uppercased set codes. */
export function matchesPreference(p: BrowsePrinting, pref: PreferredPrinting | null): boolean {
  return pref !== null && p.setCode === pref.setCode && p.collectorNumber === pref.collectorNumber;
}

/**
 * The one printing a card is represented by (§3.5 tier 0): the user's pick when they still own
 * it, else the first in display order that has art, else the first overall.
 *
 * The pick wins even when its own image is null. The caption states the user's intent, which
 * stays true when the art cannot render; falling the caption back too would make an explicit
 * choice silently vanish. Only the image falls through, and it does so in resolveImageUri.
 *
 * Art and caption MUST come from this same printing. Picking the image from the first
 * image-bearing printing while captioning the first printing outright is #84 again in miniature:
 * the tile would show one printing's art under another printing's set code.
 */
function primaryPrinting(
  printings: BrowsePrinting[],
  preference: PreferredPrinting | null = null,
  // Undefined only when `printings` is empty. A collection row always has one, but the type
  // says so honestly rather than handing callers an index that can miss.
): BrowsePrinting | undefined {
  const preferred = printings.find((p) => matchesPreference(p, preference));
  // A pick the user no longer owns is absent here, so it falls through to the normal
  // resolver — silently, per decision 5. The dormant tile is the picker's business, not this.
  return preferred ?? printings.find((p) => p.imageUri !== null) ?? printings[0];
}

/**
 * The three card-level fields a resolved printing decides: the art, the set code the
 * caption states, and the printed name.
 *
 * Extracted because a pick has to move them on the CLIENT too. `loadBrowseCards`
 * resolves them on the server, and until a route re-renders the reader's own pick is
 * invisible on the list behind the modal — `revalidatePath` does not refresh a mounted
 * client route. The list patches its own copy from this instead of refetching a payload
 * measured in megabytes, and the two answers cannot disagree because there is one rule.
 */
export type CardArt = Pick<BrowseCard, "imageUri" | "printedName" | "primarySetCode">;

export function cardArt(cardName: string, printing: BrowsePrinting): CardArt {
  return {
    primarySetCode: printing.setCode,
    imageUri: printing.imageUri,
    // Exact equality, verbatim, per spec: a printing whose flavor name IS the
    // oracle name has not renamed anything, and normalising would silently
    // change which cards count as renamed.
    printedName:
      printing.flavorName !== null && printing.flavorName !== cardName
        ? printing.flavorName
        : null,
  };
}

/**
 * The printing whose art the card is currently showing. The picker needs it to mark one tile
 * "shown now" (decision 10), and it must be the same call the caption and the grid tile make or
 * the badge lands on a tile whose art is not the one on screen.
 */
export function resolvedPrinting(card: BrowseCard): BrowsePrinting | undefined {
  return primaryPrinting(card.printings, card.preferredPrinting);
}

/**
 * The name to show a player looking at their own copy: the printing's own name
 * where it has one, the oracle name otherwise. One place, so no surface has to
 * remember which way round the fallback goes.
 */
export function printedNameOf(card: Pick<BrowseCard, "name" | "printedName">): string {
  return card.printedName ?? card.name;
}

/**
 * The same name, cut to its front face — what a row or a tile shows.
 *
 * Scryfall's `flavor_name` is one string per printing and joins a two-faced
 * card's halves with ` // `, exactly as `cards.name` does, so a renamed modal
 * card arrives here as `Battle of Olympus // Aftermath`. A 93px tile caption
 * cannot hold that and locked decision 3 forbids the second line, so rows and
 * tiles take the front half and the modal keeps the whole string.
 *
 * The split is applied ONLY to a printed name on a card whose layout really has
 * two faces. `Fire // Ice` and `Bonecrusher Giant // Stomp` carry the separator
 * on one piece of card stock, so cutting them would drop half of a name the row
 * shows whole today — the same reason `isTwoFaced` asks the layout word instead
 * of looking for the mark. A card with no printed name is returned
 * byte-identically, `//` and all: today's rows print the full oracle string and
 * the control state must not move.
 */
export function printedFaceName(
  card: Pick<BrowseCard, "name" | "printedName" | "layout">,
): string {
  if (!card.printedName) return card.name;
  return isTwoFaced(card.layout) ? faceNames(card.printedName).front : card.printedName;
}

/**
 * Modal caption for the printing whose art is on screen: "C21 · 263", plus a count of the
 * other printings owned. Grid and row captions stay on primarySetCode alone — they are one
 * line of a dense list — but the modal shows one specific piece of art and has to say which.
 */
export function printingCaption(
  card: BrowseCard,
  /**
   * The list `+N more` counts, when it is not the one the caption resolves against.
   *
   * One caller separates them: the modal injects the printing it was opened at so the face
   * resolves to it, and that row is art rather than a holding. Counting it would caption an
   * owned card's single holding `TLA · 282 +1 more` while the picker beside it says one
   * printing is owned. Defaulted, so every other caller is unchanged.
   */
  countFrom: BrowsePrinting[] = card.printings,
): string {
  const primary = primaryPrinting(card.printings, card.preferredPrinting);
  // The set code comes off the resolved printing even with no collector number to pair it
  // with: `primarySetCode` is the server's answer, which lags an optimistic pick by a
  // revalidate and would caption a bare `Name,Qty` printing with the set it replaced.
  const base = primary === undefined
    ? card.primarySetCode
    : primary.collectorNumber
      ? `${primary.setCode} · ${primary.collectorNumber}`
      : primary.setCode;
  // Minus the resolved one, but only when it is IN the list being counted. Opened at a
  // printing the reader does not own, the resolved row is not one of their holdings — so
  // subtracting it there hid a printing they do own, and two owned printings reported one.
  const resolvedIsCounted =
    primary !== undefined
    && countFrom.some((p) => p.setCode === primary.setCode
      && p.collectorNumber === primary.collectorNumber);
  const others = countFrom.length - (resolvedIsCounted ? 1 : 0);
  return others > 0 ? `${base} +${others} more` : base;
}

/**
 * Does this card answer to `search` under either of its names?
 *
 * `search` arrives already trimmed and lowercased — the caller does it once per filter
 * pass rather than once per card.
 */
function matchesName(card: Pick<BrowseCard, "name" | "printedName">, search: string): boolean {
  // THROUGH `printedNameOf`, not a null test of its own. `printedName` is typed
  // `string | null` and is ABSENT — not null — on the card literals ten test files build,
  // so `!== null` admits `undefined` and the `.toLowerCase()` after it throws, which took
  // out the whole collection browser rather than just its search. `printedNameOf` has
  // answered that with `??` since it was written, and a card with no printed name simply
  // tests its own name twice.
  return printedNameOf(card).toLowerCase().includes(search)
    || card.name.toLowerCase().includes(search);
}

export function filterCards(list: BrowseListCard[], f: BrowseFilters): BrowseListCard[] {
  const search = f.search.trim().toLowerCase();
  // Types and sets each OR internally and AND with every other filter.
  const types = f.types.map((t) => t.toLowerCase());
  const setCodes = new Set(f.setCodes.map((s) => s.toLowerCase()));
  return list.filter((c) => {
    // BOTH NAMES, because the row draws the printed one. A Secret Lair rename is the
    // name on the card in the box and the name on screen — `Mimir's Ancient Wisdom` over
    // `Teferi's Ageless Insight` — so a search that read the oracle name alone found
    // nothing for what the reader was looking at, and found a row under a name that is
    // not printed anywhere on it. Reported by Hugh on 2026-09-21.
    //
    // The oracle name keeps matching: it is what every other printing of the card is
    // called, what the rules text is filed under, and what a player who knows the card
    // by its real name will type. Neither name is the truer one, so the filter takes
    // either.
    if (search && !matchesName(c, search)) return false;
    if (!matchesColors(c.colorIdentity, f.colors, f.match ?? "contains")) return false;
    if (types.length > 0) {
      const line = frontFace(c.typeLine).toLowerCase();
      if (!types.some((t) => line.includes(t))) return false;
    }
    if (
      setCodes.size > 0 &&
      !c.setCounts.some(([code]) => setCodes.has(code.toLowerCase()))
    ) return false;
    if (f.availability && f.availability.length > 0) {
      // No entry reads as free — an unclaimed card and a failed read are the
      // same silence everywhere else in this feature.
      const state = c.availability ? availabilityState(c.availability) : "free";
      if (!f.availability.includes(state)) return false;
    }
    return true;
  });
}

function colorSortKey(identity: string[]): number {
  if (identity.length === 0) return 100;         // colorless last
  if (identity.length >= 2) return 50;           // multicolor after monocolor
  return WUBRG_ORDER[identity[0]] ?? 40;         // mono: WUBRG position (0–4)
}

/** Each key's primary comparator, always in ascending form. */
const SORT_COMPARATORS: Record<SortKey, (a: BrowseListCard, b: BrowseListCard) => number> = {
  // THE NAME ON SCREEN, which is `printedFaceName` — the printed name where a printing
  // renames the card, and its FRONT HALF where the layout has two faces, because that is
  // all a row or a tile draws (`rows-view:115`, `grid-view:157`). Keying on the whole
  // `A // B` string let hidden back-face text order the visible labels: two rows drawing
  // `Battle` and `Battle of Olympus` sort by what follows the separator, which is on
  // neither of them. Raised by review.
  // Sorting on the oracle name filed `Mimir's Ancient Wisdom` under T, so a reader
  // scanning an A-Z list looked where the name they could see belonged and it was not
  // there — the same defect as the search reading that name alone, and found by sweeping
  // for it. Measured on STAGING, which is where this repo counts a frequency: 9 of 3,235
  // collection rows resolve a printing that renames the card (0.28%), out of 634 renamed
  // printings in 103,309 (0.61%). Small, and every one of them is a row whose drawn name
  // disagreed with its own position in the list.
  // `"en"` PINNED, as `sort-cards.ts`, `sort.ts` and `touched.ts` each pin it and for
  // their reason: this component is statically imported, so this runs in Node for the SSR
  // pass and again in the browser, and an unpinned collation can order the two differently
  // — a list that reshuffles on hydration. The strings it now keys on are Secret Lair
  // renames, which carry exactly the punctuation and diacritics collations disagree about.
  name: (a, b) => printedFaceName(a).localeCompare(printedFaceName(b), "en"),
  quantity: (a, b) => a.quantity - b.quantity,
  set: (a, b) => a.primarySetCode.localeCompare(b.primarySetCode),
  rarity: (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity],
  color: (a, b) => colorSortKey(a.colorIdentity) - colorSortKey(b.colorIdentity),
};

/**
 * The direction each key opens in. Quantity is the odd one out: "sort by
 * quantity" means most-owned-first to everyone, so its natural order is
 * descending even though every other key reads forwards.
 */
export const DEFAULT_SORT_DIRECTION: Record<SortKey, SortDirection> = {
  name: "asc",
  quantity: "desc",
  set: "asc",
  rarity: "asc",
  color: "asc",
};

export function sortCards(
  list: BrowseListCard[],
  sort: SortKey,
  direction: SortDirection = DEFAULT_SORT_DIRECTION[sort],
): BrowseListCard[] {
  const primary = SORT_COMPARATORS[sort];
  const sign = direction === "asc" ? 1 : -1;
  // The name tiebreak stays A→Z in both directions. It is not part of what the
  // user asked to reverse, and flipping it would shuffle every equal-quantity
  // run on a direction change for no reason the user could name.
  return [...list].sort((a, b) => sign * primary(a, b)
    || printedFaceName(a).localeCompare(printedFaceName(b), "en"));
}

/**
 * Server query — joins collection_items × cards for the user, optionally narrowed to one
 * oracle id or to a list of them. Untested-query pattern (see recommend.ts / summary.ts): thin, logic-free SQL,
 * pure aggregation covered by tests above.
 *
 * Rooted in collection_items, so a card the user does not own yields no rows at all —
 * card-detail.ts falls those through to the catalog rather than reporting "no such card".
 */
export async function selectCollectionRows(
  userId: string,
  // A list, for the deck route, which needs ~99 of them in one pass. Never pass
  // an empty array: `inArray` with no values is a SQL error in some drivers and
  // a full scan in others, so callers guard on length.
  oracleId?: string | string[],
): Promise<RawCollectionRow[]> {
  const { db } = await import("../../db");
  const { cardArtPreferences, cards, collectionItems, printings, sets } =
    await import("../../db/schema");
  const { alias } = await import("drizzle-orm/pg-core");
  // Two aliases of `printings`: the exact printing owned (tier 1) and the representative
  // printing for that (oracle, set) (tier 2). Both are LEFT joins — a missing row must fall
  // through to the next tier, and resolveImageUri falls through on a null image too.
  const exact = alias(printings, "exact_printing");
  const representative = alias(printings, "representative_printing");
  const rows = await db
    .select({
      oracleId: collectionItems.oracleId,
      quantity: collectionItems.quantity,
      setCode: collectionItems.setCode,
      collectorNumber: collectionItems.collectorNumber,
      finish: collectionItems.finish,
      setName: sets.name,
      releasedAt: sets.releasedAt,
      preferredSetCode: cardArtPreferences.setCode,
      preferredCollectorNumber: cardArtPreferences.collectorNumber,
      // The holding's own printing id, for readers that ask the catalog about this
      // exact printing rather than about the card. Null on a name-only import.
      scryfallId: collectionItems.scryfallId,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      cmc: cards.cmc,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      rarity: cards.rarity,
      colorIdentity: cards.colorIdentity,
      gameChanger: cards.gameChanger,
      layout: cards.layout,
      backImageUri: cards.backImageUri,
      exactImageUri: exact.imageUri,
      exactArtCropUri: exact.artCropUri,
      representativeArtCropUri: representative.artCropUri,
      cardArtCropUri: cards.artCropUri,
      // The `exact` alias is the printing joined on `collection_items.scryfall_id`
      // — the printing the player physically owns, and the only one whose printed
      // name is theirs to show.
      flavorName: exact.flavorName,
      exactBackImageUri: exact.backImageUri,
      representativeImageUri: representative.imageUri,
      representativeFlavorName: representative.flavorName,
      representativeBackImageUri: representative.backImageUri,
      cardImageUri: cards.imageUri,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .leftJoin(exact, eq(exact.scryfallId, collectionItems.scryfallId))
    .leftJoin(
      representative,
      and(
        eq(representative.oracleId, collectionItems.oracleId),
        // set_code is stored lowercase on both sides since 0008; lower() here keeps any row
        // written by an older build from silently dropping to tier 3.
        eq(representative.setCode, sql`lower(${collectionItems.setCode})`),
        eq(representative.isRepresentative, true),
      ),
    )
    // sets.code is the primary key, so this is at most 1:1 and multiplies no rows.
    .leftJoin(sets, eq(sets.code, sql`lower(${collectionItems.setCode})`))
    // The user's pick for this card, if any. Oracle-level, so it repeats across the card's rows.
    .leftJoin(
      cardArtPreferences,
      and(
        eq(cardArtPreferences.userId, collectionItems.userId),
        eq(cardArtPreferences.oracleId, collectionItems.oracleId),
      ),
    )
    .where(and(
      eq(collectionItems.userId, userId),
      oracleId === undefined
        ? undefined
        : Array.isArray(oracleId)
          ? inArray(collectionItems.oracleId, oracleId)
          : eq(collectionItems.oracleId, oracleId),
    ));
  return rows;
}

/**
 * Attach the stored bracket facts that are NOT on a card row: mass land denial, extra turns and
 * tutor.
 *
 * `game_changer` is already aggregated — it rides `cards` — so this asks only about
 * mass land denial, extra turns and tutor, which live in `card_bracket_flags`. One query for
 * the whole collection rather than one per card.
 *
 * NULL-SAFE BY OMISSION, in the one direction this is allowed to fail: a card with no
 * row carries none of the three, and a read that comes back empty leaves every card exactly
 * as `aggregateCollection` left it. The surface then draws fewer marks than it might
 * have, which is silence — never a claim that a card is clear.
 *
 * QUIET ON FAILURE, for the same reason and with the same shape as the availability
 * read on this page (`/collection/page.tsx`, "Quiet failure"). A mark is an annotation
 * on a list that is useful without it, so a flags outage costs the marks and must not
 * cost the collection: rejecting here would take the whole route down to hide four
 * glyphs. The cards come back exactly as they went in.
 */
export async function attachBracketFacts(
  cards: BrowseCard[],
  /**
   * The flags read, injected so this is testable without a database. `loadBrowseCards`
   * passes nothing and gets the real one — the seam exists because the alternative is
   * an untested attachment path, and deleting every line here would otherwise leave the
   * suite green while two of the three facts silently vanished from the list.
   */
  read?: (ids: readonly string[]) => Promise<Map<string, CardBracketFlags>>,
): Promise<BrowseCard[]> {
  const loadBracketFlags = read ?? (await import("../bracket/flags-read")).loadBracketFlags;
  const flags = await loadBracketFlags(cards.map((c) => c.oracleId)).catch(() => {
    recordSoftFailure();
    return null;
  });
  if (!flags) return cards;
  if (flags.size === 0) return cards;
  for (const card of cards) {
    // One assembly for every surface (`factsFor`), rather than a second copy of the rule
    // here: the ORDER is part of the contract — gameChanger, massLandDenial, extraTurns, tutor,
    // which is what the key lists and every surface draws — and two implementations of an
    // ordering is how it drifts. `gameChanger` is already on the card from the row query,
    // so it is re-derived from the list rather than re-read.
    const facts = factsFor(card.facts?.includes("gameChanger") ?? false, flags.get(card.oracleId));
    if (facts) card.facts = facts;
  }
  return cards;
}

/**
 * STATE 1 of combo awareness, attached to a PAGE of cards.
 *
 * Modelled on `attachBracketFacts` deliberately, down to the injected read: the alternative is
 * an untested attachment path, where deleting every line here leaves the suite green while the
 * clause silently vanishes from the list.
 *
 * THE WHOLE COLLECTION, in one set-based read — 492ms on staging for 2,805 cards. This surface
 * has no server page to scope to: it ships every card in one payload and windows client-side.
 *
 * A separate pass rather than a join, because the list query is already the largest payload in
 * the app and this touches 65 rows of it on the reference collection.
 *
 * DEGRADES TO SILENCE. A failed read leaves every card without a clause, which is the same
 * thing the absence of a combo looks like, and is the honest outcome — nothing here is load
 * bearing for choosing a card, and a list that refused to draw because Spellbook was
 * unreachable would be worse than one that says less.
 */
export async function attachComboPartners(
  userId: string,
  cards: BrowseCard[],
  read?: (args: {
    userId: string;
    oracleIds?: readonly string[];
  }) => Promise<
    Map<string, { partnerOracleId: string; partnerName: string; otherPartners?: number }>
  >,
): Promise<BrowseCard[]> {
  if (cards.length === 0) return cards;
  const load = read ?? (await import("../combos/near-miss")).loadOwnBothPartners;
  // NO ID WINDOW. `/collection` ships every card in one payload and windows client-side, so
  // there is no server page to scope to and any card can scroll into view — and passing all
  // 2,805 ids is the SLOWER of the two forms, not the faster one (913ms against 492ms on
  // staging, for the same 65 answers).
  const partners = await load({ userId }).catch(() => {
    recordSoftFailure();
    return null;
  });
  if (!partners || partners.size === 0) return cards;
  for (const card of cards) {
    const hit = partners.get(card.oracleId);
    if (hit) {
      card.comboPartner = { oracleId: hit.partnerOracleId, name: hit.partnerName };
      if (hit.otherPartners) card.comboOtherPartners = hit.otherPartners;
    }
  }
  return cards;
}

export const loadBrowseCards = cache(async function loadBrowseCards(
  userId: string,
): Promise<BrowseListCard[]> {
  const aggregated = aggregateCollection(await selectCollectionRows(userId));
  // SEQUENTIAL, and the order is not arbitrary: both passes mutate the same card objects, and
  // running them together would be two concurrent writers to one array for no gain — the combo
  // read is 492ms of database time that does not overlap with the flags read's own round trip
  // in any way this function can express.
  return toListCards(await attachComboPartners(userId, await attachBracketFacts(aggregated)));
});

/**
 * Server query — the `sets` catalog rows for the sets this user owns, for the
 * Set ▾ panel's names and release-date ordering (#86).
 *
 * Same untested-query pattern as above: an inner join over the user's distinct
 * owned set codes, no logic. A code with no `sets` row simply does not come
 * back; buildSetOptions falls the option back to the uppercased code.
 */
export const loadOwnedSetMeta = cache(async function loadOwnedSetMeta(
  userId: string,
): Promise<OwnedSetMeta[]> {
  const { db } = await import("../../db");
  const { collectionItems, sets } = await import("../../db/schema");
  const rows = await db
    .selectDistinct({ code: sets.code, name: sets.name, releasedAt: sets.releasedAt })
    .from(collectionItems)
    // set_code is stored lowercase on both sides since 0008; lower() keeps a row
    // written by an older build from dropping out of the join.
    .innerJoin(sets, eq(sets.code, sql`lower(${collectionItems.setCode})`))
    .where(eq(collectionItems.userId, userId));
  return rows;
});
