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
import { drawbacks, landColors as repeatableColors, nonManaAbilities, type BasicType, type Color, type Drawback, type GivenUp } from "./land";
import { fitCompare, type Compare } from "./compare";
import { mainType, type MainType, type StandIn } from "./stand-ins";

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

// Close-out ruling 6: all five read `every color`, 22 characters shorter on a line that holds 36 at 390.
const colorsText = (colors: readonly Color[]) =>
  new Set(colors).size === 5 ? copy.everyColor : listWords(colors.map((c) => COLOR_WORD[c]), "and");
const article = (word: string) => `${/^[AEIOU]/.test(word) ? "an" : "a"} ${word}`;
/** `a Mountain or Forest` in the job line's `finds {types} card`; the lead repeats the article: `a Mountain or an Island`. */
const typesText = (types: readonly BasicType[], each = false) =>
  listWords(types.map((t, i) => (i === 0 || each ? article(TYPE_WORD[t]) : TYPE_WORD[t])), "or");

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

/** H3: a named ability as its label, an unnamed one quoted from the card's own text. The lead's form. */
const abilityText = (g: GivenUp) => (g.kind === "named" ? g.label : `“${g.text}”`);
export const givenUpText = (g: GivenUp) => copy.givesUp(abilityText(g));

/**
 * A row's form (close-out ruling 6, d9 from Hugh's emphasis on details): one `gives up` clause listing
 * every named ability, then the unnamed ones COUNTED rather than quoted. A quote runs to 60 characters, and three
 * of them put a row's facts at nine lines on a phone; the lead, said once above every row, may still
 * quote what they share.
 */
export function rowGivesUp(list: readonly GivenUp[]): string[] {
  if (list.length === 0) return [];
  const named = list.filter((g) => g.kind === "named").map((g) => abilityText(g));
  const unnamed = list.length - named.length;
  // One clause, the abilities listed in it, as the lead says a shared give-up.
  return [copy.givesUp(listWords(unnamed > 0 ? [...named, copy.otherAbilities(unnamed, named.length > 0)] : named, "and"))];
}

export type SheetRow = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  free: boolean;
  /** Soft-held by a brew: the availability marker's count. */
  soft: number;
  cents: number | null;
  foilOnly: boolean;
  /** The row's second line, in --fg-body: a land's mana line, or a spell's type, MV and extra jobs. */
  body: string[];
  /** Then, in --fg-muted: what it costs or gives up (addendum §1a, R1). Joined to `body` by ` · `. */
  muted: string[];
  /** A spell row's comparison instead of a facts line (stand-in row addendum 3a, E2). Absent on a land row. */
  compare?: Compare | null;
};

export type SheetGroup = {
  heading: string;
  /** The order note drawn at the heading's right (addendum §1b). */
  order: string;
  /** What `Show all {n} {noun}` counts: `lands`, `creatures`, `other types`. */
  noun: string;
  rows: SheetRow[];
  /**
   * Every stand-in in the group, which `rows` holds only once the whole group has been read. The sheet's
   * model always sets it; a group built without a read (the About figure's) leaves it out, meaning its
   * rows are the whole group.
   */
  total?: number;
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

type Line = { body: string[]; muted: string[]; compare?: Compare | null };

function row(s: StandIn, line: Line): SheetRow {
  return {
    oracleId: s.card.oracleId, name: s.card.name, imageUri: s.card.imageUri,
    free: s.free, soft: s.soft, cents: s.cents, foilOnly: s.foilOnly, ...line,
  };
}

/** A role and a theme can share a word (draw): a list names each word once. */
const jobWords = (jobs: readonly (keyof typeof copy.job)[]) => [...new Set(jobs.map((j) => copy.job[j]))];

const BASIC = /\b(plains|island|swamp|mountain|forest)\b/g;
const NUMBER_WORDS = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const NUMBER = new RegExp(`\\b(?:${NUMBER_WORDS.join("|")})\\b(?= or (?:more|fewer|less)\\b)`, "gi");
const EARLY_TURNS = /^it'?s your first, second,? or third turn of the game$/;
const REVEAL = /^you revealed an? ([\w-]+) card this way or you control an? \1$/;
/** A land's state on entering, from its drawbacks: the mana line's second half (addendum §1a). */
function entering(list: readonly Drawback[]): string {
  const unless = list.find((d) => d.kind === "entersTappedUnless");
  if (unless?.kind === "entersTappedUnless") {
    // Close-out ruling 6: the Starting Town lands' condition, said the short way.
    if (EARLY_TURNS.test(unless.condition)) return copy.mana.untappedEarly;
    // The reveal lands: `you revealed a soldier card this way or you control a soldier`.
    const reveal = REVEAL.exec(unless.condition);
    if (reveal) return copy.mana.untappedWith(copy.mana.inHandOrPlay(reveal[1][0].toUpperCase() + reveal[1].slice(1)));
    const cond = unless.condition
      .replace(BASIC, (t) => t[0].toUpperCase() + t.slice(1))
      // Close-out ruling 6: a count as a figure, `8 or more lands`, as the condition's own `13 or less life` is.
      .replace(NUMBER, (w) => String(NUMBER_WORDS.indexOf(w.toLowerCase()) + 2));
    return cond.startsWith("you control ") ? copy.mana.untappedWith(cond.slice("you control ".length)) : copy.mana.untappedIf(cond);
  }
  return list.some((d) => d.kind === "entersTapped") ? copy.mana.tapped : copy.mana.untapped;
}

export function sheetModel(read: StandInsRead): SheetModel {
  const { job, original } = read;
  const commander = read.commanders.map(shortName).join(" + ");
  const soldOut = read.originalCents === null;
  const price = read.originalCents === null ? "" : formatCents(read.originalCents);

  // E1: a spell whose every job is limited to cards this deck doesn't play has no job here. Its coarse
  // roles would make the "nothing cheaper" sentence claim a job the deck was ruled unable to use.
  if (job.kind === "spell" && read.jobRoles.length === 0) {
    return { job: copy.jobNotHere, lead: null, groups: [], foot: false, sentence: copy.noJobHere(original.name) };
  }
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
    : copy.jobSpell(mainType(original.typeLine), job.mv, listWords(jobWords(read.jobRoles), "and"));

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

  const line = (s: StandIn, same: boolean): Line => {
    if (job.kind === "spell") {
      // Stand-in row addendum 3a: what the row keeps, gains and loses against the original, fitted to its
      // budget by `fitCompare`. An other-types row leads with its type; a staple says it is one. No `MV n`:
      // a lower mana value is a gain. A word the row keeps is never also a gain or a loss (READINESS E1),
      // and losses are never capped or dropped. Hugh's Q2: no % on a stand-in row.
      const keeps = jobWords([...s.shared, ...s.sharedThemes]);
      const gains: string[] = jobWords(s.extra).filter((w) => !keeps.includes(w));
      if (s.card.cmc < job.mv) gains.push(copy.mvGain(s.card.cmc));
      // Q3: a stand-in that keeps removal but not the original's permanent answer says which it gives up.
      const loses = [
        ...jobWords(s.missing).filter((w) => !keeps.includes(w) && !gains.includes(w)),
        ...s.lostMethods.map((m) => copy.method[m]),
      ];
      const type = [...(same ? [] : [mainType(s.card.typeLine)]), ...(s.isUniversal ? [copy.compare.staple] : [])].join(" · ");
      return { body: [], muted: [], compare: fitCompare({ type: type || null, keeps, gains, loses }) };
    }
    const giving = shared !== null ? [] : rowGivesUp(s.givesUp);
    if (job.kind === "fetch") {
      const clauses = [...firstBasicOnly(s.drawbacks).map((d) => drawbackText(d, landColors)), ...giving];
      // H3: `gives up nothing` only when it is true, which is when nothing above was said.
      return { body: [], muted: clauses.length || shared !== null ? clauses : [copy.givesUpNothing] };
    }
    // A land: `makes {colors}, {state}`, with the entering condition read into the line itself, then the
    // costs that remain, the colors it makes only once, and what it gives up (addendum §1a).
    const again = job.colors.filter((c) => !s.once.includes(c));
    // Every job color made only once: the line names what the land makes again and again instead
    // (Ravaged Highlands for a white job still taps for red), and colorless only when that is nothing.
    const order: Color[] = ["W", "U", "B", "R", "G"];
    const lineColors = again.length ? again : (() => { const own = repeatableColors(s.card); return order.filter((c) => own.has(c)); })();
    // A cost is named for the colors this job asks for: Mana Confluence's life is paid for white and red
    // here, and naming all five would break the row's two lines at 390 to say nothing the reader asked.
    // Close-out ruling 6: and not at all when it is paid for every color the mana line just named, where
    // `for {colors}` repeats the line (a five-color painland's cost was 50 characters of it).
    const costs = s.drawbacks
      .filter((d) => d.kind !== "entersTapped" && d.kind !== "entersTappedUnless")
      .map((d) => {
        if (d.kind !== "damage" && d.kind !== "life") return drawbackText(d, again.length ? again : job.colors);
        const paid = d.colors.filter((c) => job.colors.includes(c));
        const every = paid.length === 0 || lineColors.every((c) => paid.includes(c));
        return every
          ? (d.kind === "life" ? copy.drawback.lifeFetch(d.amount) : copy.drawback.damageAny(d.amount))
          : drawbackText({ ...d, colors: paid }, again.length ? again : job.colors);
      });
    return {
      body: [copy.mana.line(lineColors.length ? colorsText(lineColors) : copy.mana.colorless, entering(s.drawbacks))],
      // Close-out ruling 6: the one-shot colors in one clause, not a clause each.
      // All five made, the one-shot ones being every color the line did not name: `every other color`.
      muted: [...costs, ...(s.once.length ? [copy.mana.once(
        new Set([...lineColors, ...s.once]).size === 5 && lineColors.length > 0 && s.once.length > 1 ? copy.everyOtherColor
          : colorsText(order.filter((c) => s.once.includes(c))),
      )] : []), ...giving],
    };
  };

  const order = job.kind === "spell" ? copy.orderMostShared : copy.orderBestMana;
  const groups: SheetGroup[] = read.groups.map((g) => {
    const noun = g.same ? PLURAL[g.type] : copy.groupOtherTypes;
    return {
      heading: g.same ? copy.groupSameType(PLURAL[g.type]) : copy.groupOtherTypes,
      order,
      noun,
      // An other-types row names its type first (addendum §1b): the heading cannot say it for the row.
      rows: g.rows.map((s) => row(s, line(s, g.same))),
      total: g.total,
    };
  });

  if (groups.length === 0) {
    const sentence =
      soldOut ? copy.soldOutNone(original.name)
      // E1: the jobs a stand-in had to keep, ramp by its kind, so the sentence is true of what was ruled out.
      : job.kind === "spell" ? copy.nothingCheaper(listWords([...new Set(read.jobRoles.map((j) => copy.job[j]))], "or"), job.mv, commander, price)
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
        copy.leadSpellsJob(original.name, listWords(jobWords(read.jobRoles), "or")),
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
