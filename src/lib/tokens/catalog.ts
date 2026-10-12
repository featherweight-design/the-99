/**
 * The token catalog, built from the `default_cards` bulk the printings ingest already streams
 * (plan `2026-10-11-tokens-for-my-deck.md`, PR 1). Pure: no database import, so the whole rule set
 * is unit-testable and the ingest only feeds it entries and publishes what it returns.
 *
 * Three facts come out of one pass:
 *   - a TOKEN record per token oracle id, and a PRINTING row for every non-digital printing of it;
 *   - which tokens a CARD makes: `all_parts` entries with `component: "token"` and nothing else.
 *     A card with related parts lists itself as a `combo_piece`, and meld parts are their own
 *     components; neither is a token, so neither is read;
 *   - the share of those part ids that resolved to a token printing, which is the floor that
 *     notices an upstream shape change before the publish does.
 *
 * A part id is ONE PRINTING of the token (`parts[].id`), so it resolves to the token's oracle id
 * only through a token printing seen in the same stream. Order in the file is not guaranteed, so
 * parts are held and resolved at `finish`.
 *
 * EMBLEMS AND ART SERIES ARE NOT TOKENS HERE (Hugh's ruling 4). They are layouts of their own and
 * are never read. What counts is the layout (`token`, `double_faced_token`), plus the one shape the
 * layout cannot see: a token Scryfall files as a `reversible_card`, found by its faces' type lines
 * (`sld/1969` Mechtitan), exactly as `classifyPrinting` finds it.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Scryfall bulk JSON is untyped by design.
type Raw = Record<string, any>;

export type TokenRow = {
  oracleId: string;
  name: string;
  typeLine: string;
  colors: string[];
  power: string | null;
  toughness: string | null;
  layout: string;
  oracleText: string | null;
};

export type TokenPrintingRow = {
  scryfallId: string;
  tokenOracleId: string;
  setCode: string;
  collectorNumber: string;
  imageUri: string | null;
  imageUriSmall: string | null;
  artCropUri: string | null;
  backImageUri: string | null;
  finishes: string[];
};

export type CardTokenLink = { cardOracleId: string; tokenOracleId: string };

export type TokenCatalogStats = {
  tokenPrintings: number;
  tokens: number;
  links: number;
  makers: number;
  /** Token part ids named by cards, counted once per card and part. */
  partRefs: number;
  /** Of those, the ones that resolved to a token printing in this bulk. */
  resolvedRefs: number;
  /** Links dropped because the maker has no `cards` row (the oracle ingest is behind). */
  unknownMakers: number;
};

export type TokenCatalog = {
  tokens: TokenRow[];
  printings: TokenPrintingRow[];
  links: CardTokenLink[];
  stats: TokenCatalogStats;
};

const TOKEN_LAYOUTS = new Set(["token", "double_faced_token"]);

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function faceList(raw: Raw): Raw[] {
  return Array.isArray(raw.card_faces) ? (raw.card_faces as Raw[]) : [];
}

/** The oracle id a printing carries, at the top or on its faces (a reversible card's only home). */
function oracleIdOf(raw: Raw): string | null {
  const top = str(raw.oracle_id);
  if (top) return top;
  const ids = faceList(raw).map((f) => str(f.oracle_id));
  if (ids.length === 0 || ids.some((id) => id === null)) return null;
  return new Set(ids).size === 1 ? ids[0] : null;
}

/** A token printed as a reversible card: the layout is `reversible_card`, the faces say `Token`. */
function isReversibleToken(raw: Raw): boolean {
  return raw.layout === "reversible_card"
    && faceList(raw).some((f) => typeof f.type_line === "string" && f.type_line.startsWith("Token"));
}

export function isTokenEntry(raw: Raw): boolean {
  return TOKEN_LAYOUTS.has(raw.layout) || isReversibleToken(raw);
}

/**
 * One `default_cards` entry as a token and one of its printings, or null when the entry is not a
 * token, is digital-only, or carries no usable oracle id. A digital printing is dropped the way
 * the printings ingest drops it: nobody holds one in a paper collection.
 */
export function classifyTokenEntry(raw: Raw): { token: TokenRow; printing: TokenPrintingRow } | null {
  if (!isTokenEntry(raw) || raw.digital === true) return null;
  const oracleId = oracleIdOf(raw);
  const scryfallId = str(raw.id);
  const setCode = str(raw.set);
  const collectorNumber = str(raw.collector_number);
  if (!oracleId || !scryfallId || !setCode || !collectorNumber) return null;

  const faces = faceList(raw);
  const face0 = faces[0];
  // A reversible card prints the SAME token on both faces, and Scryfall's top-level name doubles it
  // (`Mechtitan // Mechtitan`), so the first face names it. A double-faced token keeps the joined
  // name, because its two faces are different objects.
  const name = raw.layout === "reversible_card"
    ? str(face0?.name) ?? str(raw.name)
    : str(raw.name) ?? str(face0?.name);
  const typeLine = str(raw.type_line) ?? faces.map((f) => str(f.type_line)).filter(Boolean).join(" // ");
  if (!name || !typeLine) return null;

  // Faces are joined the way Scryfall prints a double-faced card's name, so a two-faced token's
  // text keeps both halves in order.
  const oracleText = str(raw.oracle_text)
    ?? (faces.map((f) => str(f.oracle_text)).filter(Boolean).join("\n//\n") || null);
  const colors: unknown = Array.isArray(raw.colors) ? raw.colors : face0?.colors;
  const imageUri = raw.image_uris?.normal ?? faces.find((f) => f.image_uris?.normal)?.image_uris.normal ?? null;
  const imageUriSmall = raw.image_uris?.small ?? faces.find((f) => f.image_uris?.small)?.image_uris.small ?? null;
  const artCropUri = raw.image_uris?.art_crop ?? faces.find((f) => f.image_uris?.art_crop)?.image_uris.art_crop ?? null;

  return {
    token: {
      oracleId,
      name,
      typeLine,
      colors: Array.isArray(colors) ? colors.filter((c): c is string => typeof c === "string") : [],
      power: str(raw.power) ?? str(face0?.power),
      toughness: str(raw.toughness) ?? str(face0?.toughness),
      layout: String(raw.layout),
      oracleText,
    },
    printing: {
      scryfallId,
      tokenOracleId: oracleId,
      setCode: setCode.toLowerCase(),
      collectorNumber,
      imageUri,
      imageUriSmall,
      artCropUri,
      backImageUri: faces[1]?.image_uris?.normal ?? null,
      finishes: Array.isArray(raw.finishes) && raw.finishes.length > 0 ? raw.finishes : ["nonfoil"],
    },
  };
}

/** The ids of the token parts one card printing names. A token printing's own parts are never read. */
export function tokenPartIds(raw: Raw): string[] {
  if (isTokenEntry(raw) || !Array.isArray(raw.all_parts)) return [];
  const ids: string[] = [];
  for (const part of raw.all_parts as Raw[]) {
    if (part?.component === "token" && str(part.id)) ids.push(part.id as string);
  }
  return ids;
}

/**
 * Accumulates one pass over the bulk. `add` takes every entry in file order; `finish` resolves the
 * held part ids and returns what to publish. Deterministic whatever the file's order: a token's
 * record comes from its lowest-id printing, rows come out sorted, and a link is a set.
 */
export class TokenCatalogBuilder {
  private readonly tokens = new Map<string, { row: TokenRow; from: string }>();
  private readonly printings = new Map<string, TokenPrintingRow>();
  private readonly makerParts = new Map<string, Set<string>>();

  add(raw: Raw): void {
    const token = classifyTokenEntry(raw);
    if (token) {
      this.printings.set(token.printing.scryfallId, token.printing);
      const seen = this.tokens.get(token.token.oracleId);
      if (!seen || token.printing.scryfallId < seen.from) {
        this.tokens.set(token.token.oracleId, { row: token.token, from: token.printing.scryfallId });
      }
      return;
    }
    const parts = tokenPartIds(raw);
    if (parts.length === 0) return;
    const maker = oracleIdOf(raw);
    if (!maker) return;
    const held = this.makerParts.get(maker) ?? new Set<string>();
    for (const id of parts) held.add(id);
    this.makerParts.set(maker, held);
  }

  finish(knownCards: ReadonlySet<string>): TokenCatalog {
    const tokenOf = new Map<string, string>();
    for (const p of this.printings.values()) tokenOf.set(p.scryfallId, p.tokenOracleId);

    const linkKeys = new Set<string>();
    const links: CardTokenLink[] = [];
    const makers = new Set<string>();
    let partRefs = 0, resolvedRefs = 0, unknownMakers = 0;
    for (const [cardOracleId, parts] of [...this.makerParts].sort(([a], [b]) => (a < b ? -1 : 1))) {
      partRefs += parts.size;
      const resolved = new Set<string>();
      for (const id of parts) {
        const tokenOracleId = tokenOf.get(id);
        if (tokenOracleId) { resolvedRefs++; resolved.add(tokenOracleId); }
      }
      if (!knownCards.has(cardOracleId)) { if (resolved.size > 0) unknownMakers++; continue; }
      for (const tokenOracleId of [...resolved].sort()) {
        const key = `${cardOracleId}>${tokenOracleId}`;
        if (linkKeys.has(key)) continue;
        linkKeys.add(key);
        links.push({ cardOracleId, tokenOracleId });
        makers.add(cardOracleId);
      }
    }
    const tokens = [...this.tokens.values()].map((t) => t.row).sort((a, b) => (a.oracleId < b.oracleId ? -1 : 1));
    const printings = [...this.printings.values()].sort((a, b) => (a.scryfallId < b.scryfallId ? -1 : 1));
    return {
      tokens,
      printings,
      links,
      stats: {
        tokenPrintings: printings.length,
        tokens: tokens.length,
        links: links.length,
        makers: makers.size,
        partRefs,
        resolvedRefs,
        unknownMakers,
      },
    };
  }
}

/**
 * Floors, each about HALF of what the first real run measured on 2026-10-11 (3,163 token
 * printings, 1,006 tokens, 4,165 links from 3,966 making cards, 7,256 of 7,306 part ids resolved =
 * 99.3%), the way the combo ingest's are. A run under any of them publishes nothing, because a half-read token
 * catalog is indistinguishable from a complete one to every reader.
 */
export const TOKEN_FLOORS = {
  tokenPrintings: 1_500,
  tokens: 500,
  links: 2_000,
  makers: 1_900,
  resolvedShare: 0.9,
} as const;

/**
 * The price ingest's floor: token printings priced in one feed run, HALF of the 2,919 the first run
 * measured on 2026-10-11. Enforced only where a token catalog is published (at least
 * `TOKEN_FLOORS.tokenPrintings` token printings), so a database whose catalog has not been filled
 * yet is not refused for pricing nothing. Under it the token prices are not written and the run
 * fails: an id or shape regression upstream would otherwise write zero token rows, leave the table's
 * newest `as_of` unchanged, and let every old token price keep reading as live.
 */
export const TOKEN_PRICE_FLOOR = 1_400;

/** Why the token prices of this run must not be written, or null when they may. Pure. */
export function tokenPriceFloorFailure(priced: number, catalogTokenPrintings: number): string | null {
  if (catalogTokenPrintings < TOKEN_FLOORS.tokenPrintings) return null;
  if (priced >= TOKEN_PRICE_FLOOR) return null;
  return `Token prices were not written: ${priced} feed rows matched a token printing (floor ${TOKEN_PRICE_FLOOR}, `
    + `against ${catalogTokenPrintings} token printings in the catalog). That is an upstream id or shape change, not `
    + "a market state; the previous token prices are untouched and the card prices of this run were written.";
}

/** Why this run must not publish, or null when it may. Pure so every floor has a test. */
export function tokenFloorFailure(stats: TokenCatalogStats): string | null {
  const under: string[] = [];
  if (stats.tokenPrintings < TOKEN_FLOORS.tokenPrintings) under.push(`${stats.tokenPrintings} token printings (floor ${TOKEN_FLOORS.tokenPrintings})`);
  if (stats.tokens < TOKEN_FLOORS.tokens) under.push(`${stats.tokens} tokens (floor ${TOKEN_FLOORS.tokens})`);
  if (stats.links < TOKEN_FLOORS.links) under.push(`${stats.links} card-to-token links (floor ${TOKEN_FLOORS.links})`);
  if (stats.makers < TOKEN_FLOORS.makers) under.push(`${stats.makers} making cards (floor ${TOKEN_FLOORS.makers})`);
  const share = stats.partRefs === 0 ? 0 : stats.resolvedRefs / stats.partRefs;
  if (share < TOKEN_FLOORS.resolvedShare) {
    under.push(`${stats.resolvedRefs} of ${stats.partRefs} token part ids resolved (${(share * 100).toFixed(1)}%, floor ${TOKEN_FLOORS.resolvedShare * 100}%)`);
  }
  if (under.length === 0) return null;
  return `The token catalog was not published: ${under.join("; ")}. That is an upstream shape change `
    + "or a truncated bulk, not a catalog state; the previous token tables are untouched.";
}
