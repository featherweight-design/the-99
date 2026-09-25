/**
 * What the stand-ins sheet draws, from one `StandInsRead` (swap tools, PR 4a). Pure, so every kind the
 * design names is a unit test rather than a browser walk: lands, fetch, spells, a partner deck, a pair
 * the index does not hold (F14), no role, nothing cheaper, and a sold-out original (F5).
 *
 * The component draws this and decides nothing. Copy is keyed here and never composed in JSX.
 */
import { swapToolsCopy } from "../copy/swap-tools";
import { isLandFace } from "../cards/facet";
import { shortName } from "../cards/short-name";
import { formatCents } from "../decks/price";
import type { StandInsRead } from "./gather";
import { drawbacks, nonManaAbilities, type BasicType, type Color, type Drawback, type GivenUp } from "./land";
import { mainType, type MainType, type SpellRole, type StandIn } from "./stand-ins";

const copy = swapToolsCopy.sheet;

const COLOR_WORD: Record<Color, string> = { W: "white", U: "blue", B: "black", R: "red", G: "green" };
const TYPE_WORD: Record<BasicType, string> = {
  plains: "Plains", island: "Island", swamp: "Swamp", mountain: "Mountain", forest: "Forest",
};
const TYPE_COLOR: Record<BasicType, Color> = { plains: "W", island: "U", swamp: "B", mountain: "R", forest: "G" };

/** `white`, `white and red`, `white, blue and red`. */
export function listWords(words: readonly string[], joiner: "and" | "or"): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} ${joiner} ${words.at(-1)}`;
}

const colorsText = (colors: readonly Color[]) => listWords(colors.map((c) => COLOR_WORD[c]), "and");
const article = (word: string) => `${/^[AEIOU]/.test(word) ? "an" : "a"} ${word}`;
/** `a Mountain or Forest` in the job line's `finds {types} card`; the lead repeats the article: `a Mountain or an Island`. */
const typesText = (types: readonly BasicType[], each = false) =>
  listWords(types.map((t, i) => (i === 0 || each ? article(TYPE_WORD[t]) : TYPE_WORD[t])), "or");
const rolesText = (roles: readonly SpellRole[]) => listWords(roles, "and");

export function drawbackText(d: Drawback, colors: readonly Color[]): string {
  switch (d.kind) {
    case "entersTapped": return copy.drawback.entersTapped;
    case "entersTappedUnless": return copy.drawback.entersTappedUnless(d.condition);
    case "damage": return copy.drawback.damage(d.amount, colorsText(d.colors.length ? d.colors : colors));
    case "life": return copy.drawback.life(d.amount, colorsText(d.colors.length ? d.colors : colors));
    case "lifeFetch": return copy.drawback.lifeFetch(d.amount);
    case "basicOnly": return copy.drawback.basicOnly;
  }
}

/** H3: a named ability as its label, an unnamed one quoted from the card's own text. */
const abilityText = (g: GivenUp) => (g.kind === "named" ? g.label : `“${g.text}”`);
export const givenUpText = (g: GivenUp) => copy.givesUp(abilityText(g));

export type SheetRow = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  free: boolean;
  /** Soft-held by a brew: the availability marker's count. */
  soft: number;
  cents: number | null;
  foilOnly: boolean;
  facts: string[];
};

export type SheetGroup = {
  heading: string;
  /** The order note drawn at the heading's right (addendum §1b). */
  order: string;
  /** What `Show all {n} {noun}` counts: `lands`, `creatures`, `other types`. */
  noun: string;
  rows: SheetRow[];
};

const PLURAL: Record<MainType, string> = {
  creature: "creatures", planeswalker: "planeswalkers", battle: "battles", instant: "instants", sorcery: "sorceries",
  artifact: "artifacts", enchantment: "enchantments", land: "lands", other: "cards",
};

export type SheetModel = {
  /** The job line under the original's name. */
  job: string;
  lead: string | null;
  groups: SheetGroup[];
  /** The one sentence drawn in place of a list: no role, nothing cheaper, sold out with nothing free. */
  sentence: string | null;
  /** Whether the foot's price provenance is drawn: only over a list. */
  foot: boolean;
};

function row(s: StandIn, facts: string[]): SheetRow {
  return {
    oracleId: s.card.oracleId, name: s.card.name, imageUri: s.card.imageUri,
    free: s.free, soft: s.soft, cents: s.cents, foilOnly: s.foilOnly, facts,
  };
}

export function sheetModel(read: StandInsRead): SheetModel {
  const { job, original } = read;
  const commander = read.commanders.map(shortName).join(" + ");
  const soldOut = read.originalCents === null;
  const price = read.originalCents === null ? "" : formatCents(read.originalCents);

  if (job.kind === "none") {
    // The front face decides, as `jobOf` does: a spell with a land back face is a spell here.
    const land = isLandFace(original.typeLine);
    return {
      job: copy.jobNoRole, lead: null, groups: [], foot: false,
      sentence: land ? copy.noRoleLand(original.name) : copy.noRole(original.name),
    };
  }

  // `finds only a basic` leads: it is what a fetch IS, and its costs follow.
  const firstBasicOnly = (list: Drawback[]) =>
    [...list].sort((a, b) => Number(b.kind === "basicOnly") - Number(a.kind === "basicOnly"));
  const own = job.kind === "spell" ? [] : firstBasicOnly(drawbacks(original));
  const landColors: Color[] = job.kind === "land" ? job.colors : job.kind === "fetch" ? job.types.map((t) => TYPE_COLOR[t]) : [];

  const jobLine =
    // A land's own line says what it costs, or, for a plain land that costs nothing and does nothing
    // else (the handoff's Plateau), `gives up nothing`. Never for a utility land: Cavern of Souls does
    // something no stand-in will, and H3 forbids the phrase wherever it is not true.
    job.kind === "land"
      ? [
          copy.jobColors(colorsText(job.colors)),
          ...(own.length
            ? own.map((d) => drawbackText(d, job.colors))
            : nonManaAbilities(original).length === 0 ? [copy.givesUpNothing] : []),
        ].join(" · ")
    : job.kind === "fetch" ? [copy.jobFinds(typesText(job.types)), ...own.map((d) => drawbackText(d, landColors))].join(" · ")
    : copy.jobRole(rolesText(job.roles), job.mv);

  // Hugh, 2026-09-24: when every stand-in gives up the SAME thing, the lead says it once and the rows
  // show only what differs. Mixed, each row keeps its own clause.
  const everyRow = read.groups.flatMap((g) => g.rows);
  const givenUpKey = (s: StandIn) => s.givesUp.map(abilityText).join("|");
  // A sold-out lead names no give-up, so a sold-out sheet keeps every row's own clause.
  const shared =
    !soldOut && job.kind !== "spell" && everyRow.length > 0 && everyRow[0].givesUp.length > 0
      && everyRow.every((s) => givenUpKey(s) === givenUpKey(everyRow[0]))
      ? listWords(everyRow[0].givesUp.map(abilityText), "and")
      : null;

  const facts = (s: StandIn): string[] => {
    if (job.kind === "spell") {
      const out = [rolesText(s.shared), copy.mv(s.card.cmc)];
      // Addendum §1: a staple's figure is about every commander, so the row says so rather than
      // quoting it as this one's. A free staple keeps the clause in `yours, free` too.
      // Hugh's Q2: no % on a stand-in row. The list is ordered by synergy, which a printed inclusion
      // figure would contradict (a 12% row above a 61% one). A staple still says it is one.
      if (s.isUniversal) out.push(copy.stapleFact);
      return out;
    }
    const costs = firstBasicOnly(s.drawbacks).map((d) => drawbackText(d, landColors));
    // Said once in the lead: the row keeps only its costs, and may be left with nothing at all.
    if (shared !== null) return costs;
    const clauses = [...costs, ...s.givesUp.map(givenUpText)];
    // H3: `gives up nothing` only when it is true, which is when nothing above was said.
    return clauses.length ? clauses : [copy.givesUpNothing];
  };

  const order = job.kind === "spell" ? copy.orderMostShared : copy.orderBestMana;
  const groups: SheetGroup[] = read.groups.map((g) => {
    const noun = g.same ? PLURAL[g.type] : copy.groupOtherTypes;
    return {
      heading: g.same ? copy.groupSameType(PLURAL[g.type]) : copy.groupOtherTypes,
      order,
      noun,
      // An other-types row names its type first (addendum §1b): the heading cannot say it for the row.
      rows: g.rows.map((s) => row(s, g.same ? facts(s) : [mainType(s.card.typeLine), ...facts(s)])),
    };
  });

  if (groups.length === 0) {
    const sentence =
      soldOut ? copy.soldOutNone(original.name)
      : job.kind === "spell" ? copy.nothingCheaper(rolesText(job.roles), job.mv, commander, price)
      : copy.nothingCheaperLand(colorsText(landColors), price);
    return { job: jobLine, lead: null, groups: [], sentence, foot: false };
  }

  const sameGroup = read.groups.find((g) => g.same);
  const lead =
    soldOut ? copy.leadSoldOut
    : job.kind === "land"
      ? shared !== null ? copy.leadLandsGivesUp(colorsText(job.colors), shared) : copy.leadLands(colorsText(job.colors))
    : job.kind === "fetch"
      ? shared !== null ? copy.leadFetchGivesUp(typesText(job.types, true), shared) : copy.leadFetch(typesText(job.types, true))
    : [
        copy.leadSpellsJob(rolesText(job.roles), job.mv),
        ...(sameGroup && read.groups.length > 1 ? [copy.leadSpellsTypes(PLURAL[sameGroup.type])] : []),
        // F14: nothing listed for this commander or pair, so the order clause names no commander.
        everyRow.some((s) => s.synergy !== null) ? copy.leadSpellsOrder(original.name, commander) : copy.leadSpellsOrderUnlisted(original.name),
        ...(everyRow.some((s) => s.isUniversal) ? [copy.leadSpellsStaples] : []),
      ].join(" ");

  return { job: jobLine, lead, groups, sentence: null, foot: true };
}

/** The loading status, from what the tapped row already knows. Only a spell's job is readable there. */
export function loadingStatus(role: string): string | null {
  return role === "land" || role === "other" ? null : copy.loadingSpells(role);
}
