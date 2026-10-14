import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardTokens, cards, deckCards, decks, tokenPrintings, tokens } from "../../db/schema";
import { loadTokenPrices, type TokenPriceFact } from "./price";
import { tokenOwnershipTablesExist, type TokenOwnership } from "./ownership";
import { tokenPriceTablesExist, tokenTablesExist } from "./publish";
import { collidingTokenIds, sortMakers, tokenState, type TokenSource } from "./rules";

/** A card of the deck that makes the token; its art is what the decklist's hover preview draws. */
export type TokenMaker = { oracleId: string; name: string; imageUri: string | null };

/** The printing a token is pictured and sent as: the priced one when any is, else the first by set and number. */
export type TokenPictured = {
  scryfallId: string;
  setCode: string;
  collectorNumber: string;
  /** The normal-size image: the hover preview draws it at 252x352, where the small one would blur. */
  imageUri: string | null;
  imageUriSmall: string | null;
  artCropUri: string | null;
  /** How many printings the token has: "cheapest of N printings" is only true when this is the field. */
  printings: number;
};

export type DeckToken = {
  oracleId: string;
  name: string;
  typeLine: string;
  colors: string[];
  power: string | null;
  toughness: string | null;
  /** Only for a token sharing its name, colors and P/T with another in the same deck (G4). */
  oracleText: string | null;
  makers: TokenMaker[];
  state: TokenOwnership;
  /** What holds it, when held: an upload row, the player's own mark, or an added precon. Null when not held. */
  source: TokenSource | null;
  /** On THIS deck's Shopping list. An owned token is never drawn as joined, whatever the row says. */
  joined: boolean;
  picture: TokenPictured | null;
  price: TokenPriceFact | null;
};

export type DeckTokensRead =
  /** Nothing to draw: no token catalog here, or the deck makes no token and holds no joined token. The group is absent (T5). */
  | { status: "absent" }
  /** A read threw. The group draws its failed line rather than nothing (T4). */
  | { status: "failed" }
  | {
    status: "ok";
    /** Whether the account has been read for tokens at all (the T0 band shows when it has not). */
    read: boolean;
    tokens: DeckToken[];
    /** Distinct cards in the deck (commanders included) that make at least one token. */
    makerCount: number;
    /** The newest token price `as_of`, the yardstick for whether a fact is live. */
    newestPriceAsOf: Date | null;
  };

export type TokenRowFacts = {
  oracleId: string; name: string; typeLine: string; colors: string[];
  power: string | null; toughness: string | null; oracleText: string | null;
};
export type TokenPrintingFacts = {
  scryfallId: string; tokenOracleId: string; setCode: string; collectorNumber: string;
  imageUri: string | null; imageUriSmall: string | null; artCropUri: string | null;
};

export type DeckTokenInputs = {
  /** One row per (maker card, token it makes), restricted to the deck's cards and commanders. */
  links: { tokenOracleId: string; makerOracleId: string; makerName: string; makerImageUri: string | null }[];
  tokens: TokenRowFacts[];
  /** The player's held tokens, by oracle id. */
  held: Map<string, TokenSource>;
  read: boolean;
  /** Tokens on this deck's Shopping list. */
  joined: Set<string>;
  printings: TokenPrintingFacts[];
  prices: Map<string, TokenPriceFact>;
  newestPriceAsOf: Date | null;
  /**
   * The art the DECK draws for its own cards (the printing the player owns or picked), by oracle id, WITH the
   * name of that printing: a Secret Lair art under the oracle name is the mismatch every decklist row refuses.
   * A maker's name, hover preview and card-details opener use it, so a maker reads here as it does on its
   * decklist row; a card missing from it keeps the catalog's own.
   */
  art?: ReadonlyMap<string, DeckArt>;
};

/** What the deck draws for one of its cards: the art, and the name of the printing that art is of. */
export type DeckArt = { imageUri: string | null; name: string };

/**
 * The rows of a deck's Tokens group, from what the queries returned. Pure, so the rules that are easy
 * to get wrong in a join (which token is drawn as joined, who needs rules text, which printing is
 * pictured) are tested without a database.
 */
export function assembleDeckTokens(i: DeckTokenInputs): DeckTokensRead {
  if (i.tokens.length === 0) return { status: "absent" };

  const makersOf = new Map<string, Map<string, TokenMaker>>();
  for (const l of i.links) {
    const m = makersOf.get(l.tokenOracleId) ?? new Map<string, TokenMaker>();
    m.set(l.makerOracleId, {
      oracleId: l.makerOracleId,
      name: i.art?.get(l.makerOracleId)?.name ?? l.makerName,
      imageUri: i.art?.get(l.makerOracleId)?.imageUri ?? l.makerImageUri,
    });
    makersOf.set(l.tokenOracleId, m);
  }
  const printingsOf = new Map<string, TokenPrintingFacts[]>();
  for (const p of i.printings) printingsOf.set(p.tokenOracleId, [...(printingsOf.get(p.tokenOracleId) ?? []), p]);

  const colliding = collidingTokenIds(i.tokens.map((t) => ({ ...t })));

  const rows: DeckToken[] = [];
  for (const t of i.tokens) {
    const makers = makersOf.get(t.oracleId);
    const { state, source } = tokenState(i.held.get(t.oracleId) ?? null, i.read);
    // A token no card of this deck makes is the deck's only while it is JOINED and not held: the player put it
    // on this deck's Shopping list, then its maker left the list (G9), and it stays there with no maker named.
    // Any other token row no link reaches is not this deck's.
    if (!makers && !(state !== "owned" && i.joined.has(t.oracleId))) continue;
    const price = i.prices.get(t.oracleId) ?? null;
    const all = printingsOf.get(t.oracleId) ?? [];
    const chosen = (price && all.find((p) => p.scryfallId === price.printing.scryfallId))
      ?? [...all].sort((a, b) =>
        a.setCode.localeCompare(b.setCode) || a.collectorNumber.localeCompare(b.collectorNumber, "en", { numeric: true })
        || a.scryfallId.localeCompare(b.scryfallId))[0];
    rows.push({
      oracleId: t.oracleId,
      name: t.name,
      typeLine: t.typeLine,
      colors: t.colors,
      power: t.power,
      toughness: t.toughness,
      oracleText: colliding.has(t.oracleId) ? t.oracleText : null,
      makers: makers ? sortMakers([...makers.values()]) : [],
      state,
      source,
      joined: state !== "owned" && i.joined.has(t.oracleId),
      picture: chosen
        ? {
          scryfallId: chosen.scryfallId, setCode: chosen.setCode, collectorNumber: chosen.collectorNumber,
          imageUri: chosen.imageUri, imageUriSmall: chosen.imageUriSmall, artCropUri: chosen.artCropUri, printings: all.length,
        }
        : null,
      price,
    });
  }
  if (rows.length === 0) return { status: "absent" };
  rows.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    || a.colors.join("").localeCompare(b.colors.join("")) || a.oracleId.localeCompare(b.oracleId));

  return {
    status: "ok",
    read: i.read,
    tokens: rows,
    makerCount: new Set(i.links.map((l) => l.makerOracleId)).size,
    newestPriceAsOf: i.newestPriceAsOf,
  };
}

export type UserTokenState = {
  held: { id: string; source: TokenSource }[];
  read: boolean;
  joined: string[];
};

/**
 * The query, exported so a test can render it. ONE STATEMENT, because the three facts are written
 * together: an upload commits ownership with the read marker, and `I have one` commits ownership with
 * the join's deletion. Three statements could each land on a different side of such a commit and draw
 * a state that never existed (a first-upload token as "not owned", a joined token as neither joined
 * nor owned); one statement reads one snapshot.
 */
export function userTokenStateQuery(deckId: string, userId: string, tokenIds: string[], ownershipReady: boolean) {
  const ids = sql.param(tokenIds);
  const joined = sql`(select coalesce(jsonb_agg(j.token_oracle_id), '[]'::jsonb) from deck_token_joins j
    where j.deck_id = ${deckId} and j.user_id = ${userId})`;
  // `ownershipReady` includes `deck_token_joins`, so a database that lags a migration reads none of the three.
  if (!ownershipReady) return sql`select '[]'::jsonb as held, false as read, '[]'::jsonb as joined`;
  return sql`select
    (select coalesce(jsonb_agg(jsonb_build_object('id', o.token_oracle_id, 'source', o.source)), '[]'::jsonb)
      from token_ownership o where o.user_id = ${userId} and (o.token_oracle_id = any(${ids}::uuid[])
        or o.token_oracle_id in (select j2.token_oracle_id from deck_token_joins j2
          where j2.deck_id = ${deckId} and j2.user_id = ${userId}))) as held,
    exists (select 1 from token_reads r where r.user_id = ${userId}) as read,
    ${joined} as joined`;
}

async function loadUserTokenState(
  deckId: string, userId: string, tokenIds: string[], ownershipReady: boolean,
): Promise<UserTokenState> {
  const { rows } = await db.execute<UserTokenState>(userTokenStateQuery(deckId, userId, tokenIds, ownershipReady));
  const row = rows[0];
  return { held: row.held ?? [], read: row.read === true, joined: row.joined ?? [] };
}

/** The ids of every card a deck holds: its list plus both commanders (G10: a commander makes tokens too). */
export async function deckMakerIds(deckId: string, userId: string): Promise<string[] | null> {
  const [deck] = await db
    .select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) return null;
  const list = await db.select({ oracleId: deckCards.oracleId }).from(deckCards).where(eq(deckCards.deckId, deckId));
  return [...new Set([deck.commander, deck.partner, ...list.map((r) => r.oracleId)].filter((x): x is string => !!x))];
}

/** The links from a deck's cards to the tokens they make. */
async function linksFor(makerIds: string[]): Promise<DeckTokenInputs["links"]> {
  if (makerIds.length === 0) return [];
  return db
    .select({
      tokenOracleId: cardTokens.tokenOracleId, makerOracleId: cards.oracleId, makerName: cards.name, makerImageUri: cards.imageUri,
    })
    .from(cardTokens)
    .innerJoin(cards, eq(cards.oracleId, cardTokens.cardOracleId))
    .where(inArray(cardTokens.cardOracleId, makerIds));
}

/**
 * The Tokens group's rows for one deck of one player. Never throws: a read that fails returns
 * `failed` so the deck page draws its failed line and the rest of the page stands. A deck that is not
 * the player's reads as `absent`, the same as one with neither linked tokens nor retained joined ones.
 */
export async function loadDeckTokens(
  deckId: string,
  userId: string,
  art?: ReadonlyMap<string, DeckArt>,
): Promise<DeckTokensRead> {
  try {
    if (!(await tokenTablesExist())) return { status: "absent" };
    const makerIds = await deckMakerIds(deckId, userId);
    if (!makerIds) return { status: "absent" };
    const links = await linksFor(makerIds);
    const linkIds = [...new Set(links.map((l) => l.tokenOracleId))];

    // The player's own state first, in its one statement: it names the tokens joined to this deck, and one of
    // those may be made by no card of it any more, so the rows to read are the links' AND the joins'.
    const ownershipReady = await tokenOwnershipTablesExist();
    const state = await loadUserTokenState(deckId, userId, linkIds, ownershipReady);
    const tokenIds = [...new Set([...linkIds, ...state.joined])];
    if (tokenIds.length === 0) return { status: "absent" };
    const [tokenRows, printingRows, priced] = await Promise.all([
      db.select({
        oracleId: tokens.oracleId, name: tokens.name, typeLine: tokens.typeLine, colors: tokens.colors,
        power: tokens.power, toughness: tokens.toughness, oracleText: tokens.oracleText,
      }).from(tokens).where(inArray(tokens.oracleId, tokenIds)),
      db.select({
        scryfallId: tokenPrintings.scryfallId, tokenOracleId: tokenPrintings.tokenOracleId,
        setCode: tokenPrintings.setCode, collectorNumber: tokenPrintings.collectorNumber,
        imageUri: tokenPrintings.imageUri, imageUriSmall: tokenPrintings.imageUriSmall, artCropUri: tokenPrintings.artCropUri,
      }).from(tokenPrintings).where(inArray(tokenPrintings.tokenOracleId, tokenIds)),
      (await tokenPriceTablesExist()) ? loadTokenPrices(tokenIds) : Promise.resolve({ prices: new Map(), newestAsOf: null }),
    ]);

    return assembleDeckTokens({
      links,
      tokens: tokenRows,
      held: new Map(state.held.map((h) => [h.id, h.source])),
      read: state.read,
      joined: new Set(state.joined),
      printings: printingRows,
      prices: priced.prices,
      newestPriceAsOf: priced.newestAsOf,
      art,
    });
  } catch (err) {
    console.error("[tokens] loadDeckTokens failed", err instanceof Error ? err.message : err);
    return { status: "failed" };
  }
}
