// The deck-import pipeline: raw decklist in, a deck's worth of rows out.
//
// Deliberately pure — no db, no auth, no I/O. Every locked edge case below is a
// ruling with a cost if it regresses, and purity is what makes each one a unit
// test rather than an integration one. The server action (import-actions.ts)
// supplies the catalog and owns the writes; this file decides nothing about
// persistence.

import { matchRows, type DetailedCatalogCard, type MatchIndexes } from "../collection/match";
import {
  looksLikeCsv, parseCollectionCsv, type CollectionRow, type ParseError,
} from "../manabox/parse";
import { parsePasteList } from "../manabox/paste";
import { isCommanderCandidate } from "../recs/score";
import { isBasicLand } from "./grouping";

/** A catalog row widened with what the pipeline needs beyond matching. */
export type ImportCatalogCard = DetailedCatalogCard;

/**
 * Everything the import dropped or changed, so the resulting count is explained
 * rather than mysterious. Notes are informational — none of them fails an import.
 */
export type ImportNote =
  | { kind: "sectionSkipped"; section: "sideboard" | "maybeboard"; lineCount: number }
  | { kind: "quantityClamped"; name: string; requested: number; sourceLine: number }
  | { kind: "parseError"; sourceLine: number; reason: string }
  /**
   * Two commanders is the format's whole allowance, so a third is a fact about the
   * paste rather than about the deck. It is dropped rather than imported into the 99,
   * because a commander sitting in the 99 changes the deck's colour identity and its
   * legality. Dropping it silently would change the deck without saying so, which is
   * what this note exists to prevent.
   */
  | { kind: "thirdCommanderDeclared"; name: string; sourceLine: number }
  /**
   * The two commanders the source declares cannot legally partner. The import takes
   * them anyway — the paste is the record of a deck that exists, and refusing it
   * would lose the list rather than correct it — so the note is the only account of
   * the mismatch. Raised by the server action, which reads the oracle text; the pure
   * parser never sees whether a pair is legal.
   *
   * It has no surface yet, and neither does any other note on the first-import path:
   * that flow navigates to the new deck, and notes do not survive the navigation. The
   * update flow renders its notes because it stays on the page. Giving the arrival a
   * note surface is a design call, not wiring.
   */
  | { kind: "illegalPairDeclared"; primary: string; partner: string };

type DeclaredCommander = { oracleId: string; name: string; sourceLine: number };

export type DeckImport = {
  /** `sourceLine` is the first line that named the card — the figure the update
   *  diff prints beside each addition, and the same one `quantityClamped` blames. */
  cards: { oracleId: string; quantity: number; sourceLine: number }[];
  unresolved: { rawName: string; quantity: number; sourceLine: number }[];
  /**
   * Carries sourceLine because the commander picker's rows show `line N` — two
   * similar legends are otherwise indistinguishable. `colorIdentity` and `imageUri`
   * are here for the same reason: the picker reuses create-picker's row verbatim,
   * so it needs the pips, the identity label and the art. Ownership is *not* here —
   * this module is pure, and owning a card is a fact about a user, resolved by the
   * server action.
   */
  legendaryCandidates: {
    oracleId: string;
    name: string;
    sourceLine: number;
    colorIdentity: string[];
    imageUri: string | null;
    /** Read for the Partner ability, which decides who may fill a second slot. */
    oracleText: string | null;
  }[];
  /**
   * Set when the source names its own commander — `*CMDR*`, a trailing
   * `(Commander)`, or a `Commander` section. When it is set the picker is
   * skipped entirely: a confirmation step for a fact we already have is
   * friction.
   */
  declaredCommander: DeclaredCommander | null;
  /**
   * The second commander of a Partner pair, when the source declares two. Null for
   * the single-commander deck most decks are.
   */
  declaredPartner: DeclaredCommander | null;
  /**
   * Real card lines, after sections and annotations are stripped. The caller cannot
   * recover this by parsing the raw text: `parsePasteList` turns any non-blank line
   * into a row, so a `SIDEBOARD:` header counts as a card there. This is the count
   * that decides state 10 (nothing parsed) and the one state 9's copy renders.
   */
  lineCount: number;
  notes: ImportNote[];
  /**
   * Deck printings: every matched line that names a printing (a set code AND a collector number,
   * the shape an export writes), in line order, commander lines included. Which of these becomes
   * the deck's pick is a fact about the player's holdings, so the server action decides: the first
   * line naming a printing they hold wins, as the first line wins a quantity. Set codes are
   * lowercase, as stored.
   */
  printings: { oracleId: string; setCode: string; collectorNumber: string; sourceLine: number }[];
};

export type DeckImportInput = { catalog: ImportCatalogCard[]; indexes?: MatchIndexes } & (
  // Paste and text-file modes, where section markers and inline commander
  // markers are visible.
  | { text: string; rows?: never }
  // CSV mode, already normalised to the parser's row shape. A CSV carries no
  // section markers, so none are looked for.
  | { rows: CollectionRow[]; text?: never }
);

/**
 * What a paste or an uploaded file turned out to be, decided once so both call
 * sites (a fresh import and a deck update) make the same call from the same
 * text.
 *
 * `rejected` exists because a CSV's errors must never become a partial
 * import: `parseCollectionCsv` itself skips a malformed ROW and keeps going
 * — the right call for the collection upload's own preview-then-confirm
 * flow, where the player sees every row before anything is written — but
 * deck import commits on one round trip with no review step, so any error at
 * all here means the *whole* file is refused rather than silently thinned.
 */
export type ResolvedDeckListInput =
  | { kind: "text"; text: string }
  | { kind: "rows"; rows: CollectionRow[] }
  | { kind: "rejected"; detail: string };

/**
 * One line naming the first problem, plus a count of anything else that
 * failed — specific enough that "fix it and try again" is an instruction the
 * player can act on rather than a dead end.
 *
 * `looksLikeCsv` requires only ONE of the two columns, so a header missing
 * the other one still reaches `parseCollectionCsv`, whose own
 * "header missing Name/Quantity column" error is a single entry on line 1
 * rather than a row — named on its own rather than as "Row 1: …", which
 * would read as a line of data when it is the header itself.
 */
function describeCsvErrors(errors: ParseError[]): string {
  const [first, ...rest] = errors;
  const named =
    first.line === 1 && first.reason.startsWith("header")
      ? `${first.reason[0].toUpperCase()}${first.reason.slice(1)}`
      : `Row ${first.line}: ${first.reason}`;
  if (rest.length === 0) return named;
  return `${named} (and ${rest.length} more ${rest.length === 1 ? "row" : "rows"})`;
}

/**
 * Sniffs `text` for a CSV header before anything else looks at it, from a
 * paste or a file alike — there is nothing in `text` itself that says which.
 * Plain decklist text comes back unchanged for the existing
 * section-marker/annotation pipeline. Text whose first line is a multi-cell
 * header carrying a recognized Name OR Quantity column (`looksLikeCsv`) is
 * parsed with the same flexible CSV parser the collection upload uses
 * (`parseCollectionCsv`), and any parse error at all — including the header
 * missing whichever of the two columns it does not carry — rejects the
 * whole text rather than importing what parsed.
 */
export function resolveDeckListInput(text: string): ResolvedDeckListInput {
  if (!looksLikeCsv(text)) return { kind: "text", text };
  const { rows, errors } = parseCollectionCsv(text);
  if (errors.length > 0) return { kind: "rejected", detail: describeCsvErrors(errors) };
  return { kind: "rows", rows };
}

// Section markers the exporters emit, on a line of their own. Moxfield writes
// "SIDEBOARD:", Archidekt "Sideboard:", and both bare-word forms occur.
const SECTION_MARKERS: { re: RegExp; section: "sideboard" | "maybeboard" | null }[] = [
  { re: /^side ?board$/i, section: "sideboard" },
  { re: /^maybe ?board$/i, section: "maybeboard" },
  { re: /^considering$/i, section: "maybeboard" },
  { re: /^(deck|main ?board|main deck|commander|companion)$/i, section: null },
];

/**
 * Moxfield's annotation flags, e.g. `1 Sol Ring (LTC) 284 *F*` or
 * `1 Atraxa, Praetors' Voice (2X2) 145 *CMDR*`. Stripped right-to-left so a name
 * carrying none is untouched.
 *
 * The printing identity before them, `(LTC) 284`, is KEPT on the line (deck printings): the
 * paste parser reads it into the row's set and collector number exactly as a collection paste
 * does (`splitPrinting` in `manabox/paste.ts`), and a printing the player holds becomes the
 * deck's pick. Matching never reads it, so keeping it changes no card a line resolves to.
 */
const ANNOTATION_RE = /\s+\*([A-Za-z]+)\*$/;

/**
 * The same declaration in round brackets, after the printing identity:
 * `1 Rootha, Mastering the Moment (SOC) 8 (Commander)`. ManaBox writes decks
 * this way, and it is the shape a player exporting from their collection app
 * brings here.
 *
 * Missing it costs more than a missed flag. The tag sits past the set code, so
 * the printing's end anchor fails too and the whole tail stays glued to the
 * name — the deck's own commander arrives as a line we cannot name, which is
 * exactly what an update diff should never say about it.
 *
 * `(Partner)` reads the same way and means the same thing here: a partner IS
 * the deck's second commander, so the line declares one. Exporters write it on
 * the second of a pair — `Atreus, Impulsive Son (SLD) 2212 (Partner)` — and
 * without it that line arrives as a card we cannot name, on a deck whose own
 * commander it is.
 *
 * Narrow on purpose: these words in full, and only in a trailing bracket. Any
 * parenthetical is a card name's business, and a two-to-six-character one is
 * already a set code — which is exactly why `(CMDR)` is not read here. The
 * abbreviation fits the set-code shape, so claiming it would take a printing
 * identity away from the paste parser. `partner` is seven characters and cannot be
 * mistaken for one. The asterisk spelling of the abbreviation is unambiguous
 * and is still read, by ANNOTATION_RE.
 */
const COMMANDER_TAG_RE = /\s+\((?:commander|partner)\)$/i;

/**
 * Reduces a candidate header to the bare word the markers match.
 *
 * Exporters decorate headers with a trailing colon, a count, or both — `Commander (1)`,
 * `Sideboard (14):`, `Deck (99)`. An undetected `Sideboard (14)` is the expensive one: its
 * fourteen lines stop being a skipped section and become fourteen cards in the deck.
 *
 * Safe against real card lines because every marker regex is anchored end to end — a card
 * named "Sideboard Shenanigans" still fails to match once the count is gone.
 */
function normalizeHeader(trimmed: string): string {
  return trimmed.replace(/:$/, "").replace(/\s*\(\d+\)$/, "").trim();
}

type PreparedLine = {
  /** The line with markers and annotations removed, its printing kept; "" if excluded. */
  text: string;
  isCommander: boolean;
};

/**
 * Splits the source into importable lines, blanking what must not be imported.
 *
 * Excluded lines are blanked rather than removed so parsePasteList's 1-based
 * line numbers still address the player's original file — `line 41 of the
 * import` has to mean line 41 of what they pasted.
 */
function prepareLines(text: string): { lines: PreparedLine[]; notes: ImportNote[] } {
  const raw = text.split(/\r?\n/);
  const lines: PreparedLine[] = [];
  const skipped = new Map<"sideboard" | "maybeboard", number>();
  let excludedSection: "sideboard" | "maybeboard" | null = null;

  for (const line of raw) {
    const trimmed = line.trim();
    if (trimmed === "") {
      lines.push({ text: "", isCommander: false });
      continue;
    }

    // A marker only counts on a line of its own — "1 Sideboard Shenanigans" is a card.
    const marker = SECTION_MARKERS.find((m) => m.re.test(normalizeHeader(trimmed)));
    if (marker) {
      excludedSection = marker.section;
      lines.push({ text: "", isCommander: false });
      continue;
    }

    if (excludedSection) {
      // Commander has no sideboard; importing one inflates the deck past 100.
      skipped.set(excludedSection, (skipped.get(excludedSection) ?? 0) + 1);
      lines.push({ text: "", isCommander: false });
      continue;
    }

    let body = trimmed;
    let isCommander = false;
    // One loop over both spellings: a line can carry an asterisk flag and a
    // bracketed tag, in either order, and stripping one can expose the other.
    for (;;) {
      const annotation = ANNOTATION_RE.exec(body);
      if (annotation) {
        if (annotation[1].toUpperCase() === "CMDR") isCommander = true;
        body = body.slice(0, annotation.index);
        continue;
      }
      const tag = COMMANDER_TAG_RE.exec(body);
      if (tag) {
        isCommander = true;
        body = body.slice(0, tag.index);
        continue;
      }
      break;
    }
    lines.push({ text: body, isCommander });
  }

  const notes: ImportNote[] = [...skipped].map(([section, lineCount]) => ({
    kind: "sectionSkipped" as const,
    section,
    lineCount,
  }));
  return { lines, notes };
}

export function buildDeckImport(input: DeckImportInput): DeckImport {
  let rows: CollectionRow[];
  let notes: ImportNote[] = [];
  // Lines a `Commander` header, a `*CMDR*` flag or a trailing `(Commander)`
  // marked as the deck's leader.
  const commanderLines = new Set<number>();

  if (input.rows) {
    rows = input.rows;
  } else {
    const prepared = prepareLines(input.text);
    notes = prepared.notes;
    prepared.lines.forEach((l, i) => {
      if (l.isCommander) commanderLines.add(i + 1);
    });
    const parsed = parsePasteList(prepared.lines.map((l) => l.text).join("\n"));
    rows = parsed.rows;
    // A dropped line is a card the player expected; surface it rather than lose it.
    notes = notes.concat(
      parsed.errors.map((e) => ({ kind: "parseError" as const, sourceLine: e.line, reason: e.reason })),
    );
    // A `Commander` section declares its members without annotating them.
    const commanderSection = commanderSectionLines(input.text);
    for (const line of commanderSection) commanderLines.add(line);
  }

  const byOracleId = new Map(input.catalog.map((c) => [c.oracleId, c]));
  const { matched, unmatched } = matchRows(rows, input.catalog, input.indexes);

  let declaredCommander: DeckImport["declaredCommander"] = null;
  let declaredPartner: DeckImport["declaredPartner"] = null;
  const declaredIds = new Set<string>();
  const quantities = new Map<string, { quantity: number; firstLine: number }>();
  const legendaryCandidates: DeckImport["legendaryCandidates"] = [];

  // A deck holds one of each commander, so `2 <name>` under a Commander header
  // is clamped the same way a duplicate in the 99 is — and says so, rather than
  // dropping the count with no account of itself.
  function noteClampedCommander(row: { quantity: number; line: number }, name?: string): void {
    if (row.quantity <= 1) return;
    notes.push({
      kind: "quantityClamped",
      name: name ?? "",
      requested: row.quantity,
      sourceLine: row.line,
    });
  }

  for (const { row, oracleId } of matched) {
    const card = byOracleId.get(oracleId);
    if (commanderLines.has(row.line) && !declaredCommander) {
      declaredCommander = { oracleId, name: card?.name ?? row.name, sourceLine: row.line };
      declaredIds.add(oracleId);
      noteClampedCommander(row, card?.name);
      continue;
    }
    // A commander that also appears in the 99 is an export artifact, not intent.
    // Deduped silently: there is nothing here for the player to act on. A list naming
    // the same commander twice is a duplicate line, not a pair.
    if (declaredIds.has(oracleId)) continue;

    if (commanderLines.has(row.line)) {
      // A second, different card marked as commander is a Partner pair, which the deck
      // can hold. A third is past the format's allowance: noted rather than dropped
      // quietly, and kept out of the 99 rather than imported into it.
      if (!declaredPartner) {
        declaredPartner = { oracleId, name: card?.name ?? row.name, sourceLine: row.line };
        declaredIds.add(oracleId);
        noteClampedCommander(row, card?.name);
      } else {
        notes.push({
          kind: "thirdCommanderDeclared",
          name: card?.name ?? row.name,
          sourceLine: row.line,
        });
      }
      continue;
    }

    const existing = quantities.get(oracleId);
    if (existing) existing.quantity += row.quantity;
    else quantities.set(oracleId, { quantity: row.quantity, firstLine: row.line });

    // commanderLegal as well as the type check: the picker's whole output is submitted
    // straight back, and the server action rejects an illegal commander by throwing.
    // Offering a banned legendary here would turn a pick into an unexplained error.
    if (
      card &&
      card.commanderLegal &&
      isCommanderCandidate(card) &&
      !legendaryCandidates.some((c) => c.oracleId === oracleId)
    ) {
      legendaryCandidates.push({
        oracleId,
        name: card.name,
        sourceLine: row.line,
        colorIdentity: card.colorIdentity,
        imageUri: card.imageUri,
        oracleText: card.oracleText,
      });
    }
  }

  // A declared commander appearing later in the list would otherwise have been
  // counted before the declaration was seen; drop it and any candidate row.
  for (const declared of [declaredCommander, declaredPartner]) {
    if (!declared) continue;
    quantities.delete(declared.oracleId);
    const i = legendaryCandidates.findIndex((c) => c.oracleId === declared.oracleId);
    if (i !== -1) legendaryCandidates.splice(i, 1);
  }

  const cards: DeckImport["cards"] = [];
  for (const [oracleId, { quantity, firstLine }] of quantities) {
    const card = byOracleId.get(oracleId);
    // The card is identifiable and only the count is wrong, so this is a note,
    // not an unresolved row — an unresolved row would overstate the problem.
    if (quantity > 1 && !isBasicLand(card?.typeLine ?? "")) {
      notes.push({
        kind: "quantityClamped",
        name: card?.name ?? "",
        requested: quantity,
        sourceLine: firstLine,
      });
      cards.push({ oracleId, quantity: 1, sourceLine: firstLine });
    } else {
      cards.push({ oracleId, quantity, sourceLine: firstLine });
    }
  }

  return {
    cards,
    unresolved: unmatched.map((row) => ({
      rawName: row.name,
      quantity: row.quantity,
      sourceLine: row.line,
    })),
    legendaryCandidates,
    declaredCommander,
    declaredPartner,
    // Matched plus unmatched, never rows.length: matchRows also drops tokens, emblems
    // and art series, which are neither imported nor shown as unresolved. Counting
    // them would tell the player about lines they will never see anywhere.
    lineCount: matched.length + unmatched.length,
    notes,
    printings: matched
      .filter(({ row }) => row.setCode !== "" && row.collectorNumber !== "")
      .map(({ row, oracleId }) => ({
        oracleId,
        setCode: row.setCode.toLowerCase(),
        collectorNumber: row.collectorNumber,
        sourceLine: row.line,
      }))
      .sort((a, b) => a.sourceLine - b.sourceLine),
  };
}

/** 1-based line numbers falling under a `Commander` header, before the next header. */
function commanderSectionLines(text: string): number[] {
  const lines = text.split(/\r?\n/);
  const out: number[] = [];
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = normalizeHeader(lines[i].trim());
    if (trimmed === "") continue;
    if (SECTION_MARKERS.some((m) => m.re.test(trimmed))) {
      inSection = /^commander$/i.test(trimmed);
      continue;
    }
    if (inSection) out.push(i + 1);
  }
  return out;
}
