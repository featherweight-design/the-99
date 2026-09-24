/**
 * What the stand-ins sheet draws, from one `StandInsRead` (swap tools, PR 4a). Pure, so every kind the
 * design names is a unit test rather than a browser walk: lands, fetch, spells, a partner deck, a pair
 * the index does not hold (F14), no role, nothing cheaper, and a sold-out original (F5).
 *
 * The component draws this and decides nothing. Copy is keyed here and never composed in JSX.
 */
import { swapToolsCopy } from "../copy/swap-tools";
import { formatCents } from "../decks/price";
import type { StandInsRead } from "./gather";
import { drawbacks, type BasicType, type Color, type Drawback, type GivenUp } from "./land";
import type { SpellRole, StandIn } from "./stand-ins";

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
const typesText = (types: readonly BasicType[]) => listWords(types.map((t) => TYPE_WORD[t]), "or");
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
export const givenUpText = (g: GivenUp) => copy.givesUp(g.kind === "named" ? g.label : `“${g.text}”`);

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

export type SheetGroup = { heading: string; rows: SheetRow[] };

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
  const commander = read.commanders.join(" + ");
  const soldOut = read.originalCents === null;
  const price = read.originalCents === null ? "" : formatCents(read.originalCents);

  if (job.kind === "none") {
    const land = /\bLand\b/.test(original.typeLine);
    return {
      job: copy.jobNoRole, lead: null, groups: [], foot: false,
      sentence: land ? copy.noRoleLand(original.name) : copy.noRole(original.name),
    };
  }

  const own = job.kind === "spell" ? [] : drawbacks(original);
  const landColors: Color[] = job.kind === "land" ? job.colors : job.kind === "fetch" ? job.types.map((t) => TYPE_COLOR[t]) : [];

  const jobLine =
    job.kind === "land" ? [copy.jobColors(colorsText(job.colors)), ...own.map((d) => drawbackText(d, job.colors))].join(" · ")
    : job.kind === "fetch" ? [copy.jobFinds(typesText(job.types)), ...own.map((d) => drawbackText(d, landColors))].join(" · ")
    : copy.jobRole(rolesText(job.roles), job.mv);

  const facts = (s: StandIn): string[] => {
    if (job.kind === "spell") {
      const out = [rolesText(s.shared), copy.mv(s.card.cmc)];
      if (s.inclusion !== null) out.push(copy.figure(String(Math.round(s.inclusion)), commander));
      return out;
    }
    const clauses = [...s.drawbacks.map((d) => drawbackText(d, landColors)), ...s.givesUp.map(givenUpText)];
    // H3: `gives up nothing` only when it is true, which is when nothing above was said.
    return clauses.length ? clauses : [copy.givesUpNothing];
  };

  const groups: SheetGroup[] = [];
  const push = (heading: string, list: StandIn[]) => {
    if (list.length) groups.push({ heading, rows: list.map((s) => row(s, facts(s))) });
  };
  push(copy.groupFree, read.free);
  if (job.kind === "spell") {
    push(copy.groupByCommander(commander), read.byCommander);
    push(copy.groupUnlisted(commander), read.unlisted);
  } else {
    push(copy.groupCheapest, read.cheapest);
  }

  if (groups.length === 0) {
    const sentence =
      soldOut ? copy.soldOutNone(original.name)
      : job.kind === "spell" ? copy.nothingCheaper(rolesText(job.roles), job.mv, commander, price)
      : copy.nothingCheaperLand(colorsText(landColors), price);
    return { job: jobLine, lead: null, groups: [], sentence, foot: false };
  }

  const lead =
    soldOut ? copy.leadSoldOut
    : job.kind === "land" ? copy.leadLands(colorsText(job.colors))
    : job.kind === "fetch" ? copy.leadFetch(typesText(job.types))
    // F14: nothing listed for this commander or pair, so the order clause has nothing to name.
    : read.byCommander.length === 0 ? copy.leadSpellsUnlisted(rolesText(job.roles), job.mv)
    : copy.leadSpells(rolesText(job.roles), job.mv, commander);

  return { job: jobLine, lead, groups, sentence: null, foot: true };
}

/** The loading status, from what the tapped row already knows. Only a spell's job is readable there. */
export function loadingStatus(role: string): string | null {
  return role === "land" || role === "other" ? null : copy.loadingSpells(role);
}
