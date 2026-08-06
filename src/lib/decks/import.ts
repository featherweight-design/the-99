// The deck-import pipeline: raw decklist in, a deck's worth of rows out.
//
// Deliberately pure — no db, no auth, no I/O. Every locked edge case below is a
// ruling with a cost if it regresses, and purity is what makes each one a unit
// test rather than an integration one. The server action (import-actions.ts)
// supplies the catalog and owns the writes; this file decides nothing about
// persistence.

import { matchRows, type DetailedCatalogCard, type MatchIndexes } from "../collection/match";
import type { CollectionRow } from "../manabox/parse";
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
  | { kind: "parseError"; sourceLine: number; reason: string };

export type DeckImport = {
  cards: { oracleId: string; quantity: number }[];
  unresolved: { rawName: string; quantity: number; sourceLine: number }[];
  /** Carries sourceLine because the commander picker's rows show `line N`. */
  legendaryCandidates: { oracleId: string; name: string; sourceLine: number }[];
  /**
   * Set when the source names its own commander (`*CMDR*`, or a `Commander`
   * section). When it is set the picker is skipped entirely — a confirmation
   * step for a fact we already have is friction.
   */
  declaredCommander: { oracleId: string; name: string; sourceLine: number } | null;
  /**
   * Real card lines, after sections and annotations are stripped. The caller cannot
   * recover this by parsing the raw text: `parsePasteList` turns any non-blank line
   * into a row, so a `SIDEBOARD:` header counts as a card there. This is the count
   * that decides state 10 (nothing parsed) and the one state 9's copy renders.
   */
  lineCount: number;
  notes: ImportNote[];
};

export type DeckImportInput = { catalog: ImportCatalogCard[]; indexes?: MatchIndexes } & (
  // Paste and text-file modes, where section markers and *CMDR* are visible.
  | { text: string; rows?: never }
  // CSV and (from PR 3) Moxfield modes, already normalised to the parser's row
  // shape. A CSV carries no section markers, so none are looked for.
  | { rows: CollectionRow[]; text?: never }
);

// Section markers the exporters emit, on a line of their own. Moxfield writes
// "SIDEBOARD:", Archidekt "Sideboard:", and both bare-word forms occur.
const SECTION_MARKERS: { re: RegExp; section: "sideboard" | "maybeboard" | null }[] = [
  { re: /^side ?board$/i, section: "sideboard" },
  { re: /^maybe ?board$/i, section: "maybeboard" },
  { re: /^considering$/i, section: "maybeboard" },
  { re: /^(deck|main ?board|main deck|commander|companion)$/i, section: null },
];

/**
 * Trailing printing identity and Moxfield's annotation flags, e.g.
 * `1 Sol Ring (LTC) 284 *F*` or `1 Atraxa, Praetors' Voice (2X2) 145 *CMDR*`.
 * Stripped right-to-left so a name containing neither is untouched.
 */
const ANNOTATION_RE = /\s+\*([A-Za-z]+)\*$/;
const SET_CODE_RE = /\s+\([A-Za-z0-9]{2,6}\)(\s+[A-Za-z0-9★†★-]+)?$/;

type PreparedLine = {
  /** The line with markers, set codes and annotations removed; "" if excluded. */
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
    const marker = SECTION_MARKERS.find((m) => m.re.test(trimmed.replace(/:$/, "")));
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
    for (let m = ANNOTATION_RE.exec(body); m; m = ANNOTATION_RE.exec(body)) {
      if (m[1].toUpperCase() === "CMDR") isCommander = true;
      body = body.slice(0, m.index);
    }
    body = body.replace(SET_CODE_RE, "");
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
  // Lines a `Commander` header or a `*CMDR*` flag marked as the deck's leader.
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
  const quantities = new Map<string, { quantity: number; firstLine: number }>();
  const legendaryCandidates: DeckImport["legendaryCandidates"] = [];

  for (const { row, oracleId } of matched) {
    const card = byOracleId.get(oracleId);
    if (commanderLines.has(row.line) && !declaredCommander) {
      declaredCommander = { oracleId, name: card?.name ?? row.name, sourceLine: row.line };
      continue;
    }
    // A commander that also appears in the 99 is an export artifact, not intent.
    // Deduped silently: there is nothing here for the player to act on.
    if (declaredCommander?.oracleId === oracleId) continue;

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
      legendaryCandidates.push({ oracleId, name: card.name, sourceLine: row.line });
    }
  }

  // A declared commander appearing later in the list would otherwise have been
  // counted before the declaration was seen; drop it and any candidate row.
  if (declaredCommander) {
    quantities.delete(declaredCommander.oracleId);
    const i = legendaryCandidates.findIndex((c) => c.oracleId === declaredCommander!.oracleId);
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
      cards.push({ oracleId, quantity: 1 });
    } else {
      cards.push({ oracleId, quantity });
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
    // Matched plus unmatched, never rows.length: matchRows also drops tokens, emblems
    // and art series, which are neither imported nor shown as unresolved. Counting
    // them would tell the player about lines they will never see anywhere.
    lineCount: matched.length + unmatched.length,
    notes,
  };
}

/** 1-based line numbers falling under a `Commander` header, before the next header. */
function commanderSectionLines(text: string): number[] {
  const lines = text.split(/\r?\n/);
  const out: number[] = [];
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim().replace(/:$/, "");
    if (trimmed === "") continue;
    if (SECTION_MARKERS.some((m) => m.re.test(trimmed))) {
      inSection = /^commander$/i.test(trimmed);
      continue;
    }
    if (inSection) out.push(i + 1);
  }
  return out;
}
