import type { Availability } from "./availability";
import type { DeckDetailCard } from "./grouping";
import type { PriceFact } from "./price";
import { classifyRoles } from "../recs/roles";
import type { MixRole, RecommendedMix } from "./mix";
import { deckBodySize } from "./deck-size";
import type { PoolCard } from "../recs/score";
import type { CandidateFacts } from "../bracket/delta";

export type ReasonType = "edhrec" | "role";

export type DeckSuggestion = {
  oracleId: string;
  /** The oracle name: EDHREC's figures are looked up by it, and the add sends the id. */
  name: string;
  /**
   * The name printed on the owned copy whose art `imageUri` draws, where it has its own (a renamed
   * Secret Lair printing). The tile's caption reads it over `name`. Absent on an unowned suggestion.
   */
  printedName?: string | null;
  reason: "edhrec" | "ramp" | "draw" | "removal" | "wipes" | "land";
  reasonType: ReasonType;
  reasonLabel: string;
  owned: boolean;
  inDeck: boolean;
  // Carried so a click can draw the decklist row before the server answers.
  // Both are server-derived: the client cannot classify a card it has only a
  // name for, and guessing puts the optimistic row in a group it then jumps out
  // of — which is more jarring than the latency it was meant to hide.
  typeLine: string;
  /**
   * Combo awareness states 2 and 3: adding this card completes a two-card combo whose other
   * half is ALREADY IN THIS DECK.
   *
   * On `DeckSuggestion` rather than spread onto it untyped, which is the dead-payload shape
   * the candidate-facts note on `/decks/[id]` records and refuses. A suggestion is
   * deck-scoped by construction — there is no surface that lists one without a deck — so
   * this is not the "optional field on a shared type, populated by nobody" trap that keeps
   * `facts` off `SynergyCard`.
   *
   * Optional because every producer other than the deck page's own read leaves it out, and
   * an absent combo is what most cards have.
   */
  comboPartner?: { oracleId: string; name: string } | null;
  cardTypeGroup: DeckDetailCard["cardTypeGroup"];
  role: DeckDetailCard["role"];
  imageUri: string | null;
  // Scryfall's cost string ("{2}{G}{G}") and its numeric value. Both are drawn:
  // the pips come from the string, the "cheapest to cast" sort from the number,
  // and parsing one out of the other on the client would guess at hybrid and
  // Phyrexian symbols the string spells out exactly.
  manaCost: string | null;
  manaValue: number;
  // The same figure reasonLabel interpolates, kept as a number so a tile can
  // size a bar without parsing a sentence. Null is the drawn "no EDHREC figure"
  // state and must render as absence, never as 0%.
  inclusionPct: number | null;
  // EDHREC synergy: how much more this commander's decks run the card than
  // decks generally. Surfaced only where positive (decision 6) — zero and
  // negative resolve to null, because "runs it less than average" is not a
  // reason to add a card.
  lift: number | null;
  // The same synergy figure without the positive-only filter. The synergy shelf
  // orders on this so a negative rank is still a rank, not an absence —
  // "−3 pts" is a position in the list, not a reason to omit the card from it.
  // Null on role suggestions, which have no EDHREC synergy figure at all.
  synergyFigure: number | null;
  /** Absent or null renders no chip — see DeckDetailCard.availability. */
  availability?: Availability | null;
  /** Absent or null renders the bare `buy` tag — see DeckDetailCard.price. */
  price?: PriceFact | null;
};

/**
 * A suggestion the DECK PAGE has enriched — the shape the Consider tile draws.
 *
 * REQUIRED `facts`, and a separate type rather than an optional field on `DeckSuggestion`,
 * for the reason `TopOffCandidateWithFacts` exists on the other add surface: with the field
 * optional, deleting the page's attachment compiles cleanly and every tile silently renders
 * without a note. That is the dead-payload shape this round exists to close, and an optional
 * field closes it only for as long as somebody remembers.
 *
 * `null` is what a failed facts read and a card with no facts both look like, and both render
 * as nothing at all — which is why the field is required and its VALUE is nullable, rather
 * than the other way round.
 */
export type DeckSuggestionWithFacts = DeckSuggestion & {
  facts: CandidateFacts | null;
};

export type Suggestion = { oracleId: string; reason: "edhrec" | "ramp" | "draw" | "removal" | "wipes" | "land" };
// The body ceiling and the land target both move with the commander count, so
// neither can be a module constant. `landTarget` is re-exported as a function
// rather than a number so no caller can read a stale 37.
export { landTarget } from "./deck-size";

// The slot a suggestion was picked to fill, which is not what the card is:
// suggestDeck offers a card against the first role it can close a gap on, so a
// card classified as removal can arrive to close the ramp gap, and it is the
// ramp figure it was counted against. EDHREC picks were chosen for no slot at
// all, so they fall back to the card's own role.
export function shelfRoleOf(s: DeckSuggestion): DeckDetailCard["role"] {
  return s.reasonType === "role" && s.reason !== "edhrec" ? s.reason : s.role;
}

export function humanRole(reason: Suggestion["reason"]): string {
  return reason === "land" ? "lands" : reason;
}

export function buildSuggestionPayload(
  s: Suggestion & {
    name: string;
    printedName?: string | null;
    owned: boolean;
    typeLine: string;
    cardTypeGroup: DeckDetailCard["cardTypeGroup"];
    role: DeckDetailCard["role"];
    imageUri: string | null;
    manaCost: string | null;
    manaValue: number;
  },
  // Sparse: a name EDHREC never reported is simply absent from either map.
  inclusionByName: Record<string, number | undefined>,
  synergyByName: Record<string, number | undefined> = {},
  // THE RESOLVED TARGETS, not the asserted ones. The tile says `rec 10` and the shelf header
  // above it says `have / 12`; before this they read two different sources and disagreed by
  // construction on any commander whose measured ramp was not ten. Carries the pair adjustment
  // too, which is why `hasPartner` no longer needs to come separately.
  mix: RecommendedMix,
): DeckSuggestion {
  let reasonType: ReasonType;
  let reasonLabel: string;
  let inclusionPct: number | null = null;
  let lift: number | null = null;
  let synergyFigure: number | null = null;

  if (s.reason === "edhrec") {
    reasonType = "edhrec";
    // EDHREC keys DFCs/MDFCs by front face while Scryfall names them
    // "Front // Back" — fall back to the front face on a miss.
    const lower = s.name.toLowerCase();
    // Both maps arrive as parameters, so this is their own boundary — parse.ts
    // filtering non-finite figures upstream does not bind a caller that builds
    // a map some other way. A NaN would otherwise reach the label as
    // "EDHREC · NaN% of decks", and an Infinity would clear the `> 0` test and
    // render as a real lift.
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    const inclusion = raw != null && Number.isFinite(raw) ? raw : undefined;
    inclusionPct = inclusion ?? null;
    const synergy = synergyByName[lower] ?? synergyByName[lower.split(" // ")[0]];
    const figure = synergy != null && Number.isFinite(synergy) ? synergy : null;
    // `lift` is the positive-only figure the Evidence line prints — a card the
    // commander runs *less* often than average is not a lift and never was.
    // `synergyFigure` is the same number unfiltered, because the synergy shelf
    // orders on it and "−3 pts" is a rank, not an absence.
    lift = figure != null && figure > 0 ? figure : null;
    synergyFigure = figure;
    reasonLabel = inclusion != null ? `EDHREC · ${inclusion}% of decks` : "EDHREC staple";
  } else {
    reasonType = "role";
    const target = mix.cells[s.reason as MixRole]?.target ?? mix.cells.land.target;
    reasonLabel = `Fills ${humanRole(s.reason)} · rec ${target}`;
  }

  return {
    oracleId: s.oracleId,
    name: s.name,
    ...(s.printedName ? { printedName: s.printedName } : {}),
    reason: s.reason,
    reasonType,
    reasonLabel,
    owned: s.owned,
    inDeck: false,
    typeLine: s.typeLine,
    cardTypeGroup: s.cardTypeGroup,
    role: s.role,
    imageUri: s.imageUri,
    manaCost: s.manaCost,
    manaValue: s.manaValue,
    inclusionPct,
    lift,
    synergyFigure,
  };
}

/** The roles a pool card fills under this basis: the classifier's, or, with `roleSets`, its fresh label's
 *  (no label, no role). A land is the classifier's either way, so the land slots are untouched. */
export function rolesForSuggestion(
  card: PoolCard,
  roleSets: ReadonlyMap<string, readonly Exclude<MixRole, "land">[]> | undefined,
): ReturnType<typeof classifyRoles> {
  const byText = classifyRoles(card);
  if (!roleSets || byText.includes("land")) return byText;
  return [...(roleSets.get(card.oracleId) ?? [])];
}

export function suggestDeck(args: {
  commander: PoolCard;
  ownedPool: PoolCard[];
  edhrecTopCards: string[] | null;
  // Required, not defaulted: a missed call site would quietly plan a pair deck
  // to 99 cards and 37 lands, which is the one mistake this argument exists to
  // make impossible.
  hasPartner: boolean;
  /** The same targets the tiles quote and the shelf headers count against. */
  mix: RecommendedMix;
  /**
   * Fresh-label role sets by oracle id, when the roles are counted by LABEL (`LABEL_ROLE_COUNTS_ENABLED`,
   * labels-everywhere plan). A card absent from the map has no fresh label and counts toward no role,
   * the rule the strip beside this shelf counts under; absent altogether is the classifier for every
   * card, exactly as before. A land stays the classifier's call either way.
   */
  roleSets?: ReadonlyMap<string, readonly Exclude<MixRole, "land">[]>;
}): Suggestion[] {
  const rolesOf = (c: PoolCard) => rolesForSuggestion(c, args.roleSets);
  const max = deckBodySize(args.hasPartner);
  const lands = args.mix.cells.land.target;
  const out: Suggestion[] = [];
  const used = new Set<string>();
  const add = (oracleId: string, reason: Suggestion["reason"]) => {
    if (out.length < max && !used.has(oracleId)) { used.add(oracleId); out.push({ oracleId, reason }); }
  };

  if (args.edhrecTopCards) {
    // Iterate EDHREC's list (not the pool) so suggestion order follows
    // EDHREC's ranking regardless of DB/pool ordering. Index full name AND
    // front face — EDHREC lists DFCs/MDFCs by front face while Scryfall
    // names them "Front // Back".
    const ownedByName = new Map<string, PoolCard>();
    for (const c of args.ownedPool) {
      const lower = c.name.toLowerCase();
      if (!ownedByName.has(lower)) ownedByName.set(lower, c);
      const front = lower.split(" // ")[0];
      if (!ownedByName.has(front)) ownedByName.set(front, c);
    }
    for (const name of args.edhrecTopCards) {
      const c = ownedByName.get(name.toLowerCase());
      if (c) add(c.oracleId, "edhrec");
    }
  }

  const counts: Record<"ramp" | "draw" | "removal" | "wipes" | "land", number> = {
    ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0,
  };
  for (const c of args.ownedPool) {
    if (used.has(c.oracleId)) {
      for (const r of rolesOf(c)) counts[r]++;
    }
  }
  for (const c of args.ownedPool) {
    if (used.has(c.oracleId)) continue;
    for (const role of rolesOf(c)) {
      const target = role === "land" ? lands : args.mix.cells[role].target;
      if (counts[role] < target) { add(c.oracleId, role); counts[role]++; break; }
    }
  }
  return out;
}
