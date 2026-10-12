import { validateCardForDeck } from "../decks/add-validation";
import type { TuningCitation } from "../../db/schema";
import type { EvidencePack } from "./evidence";
import { playerTextBody } from "../model/player-text";
import { mentionsDate, noteDate } from "./note-date";
import { NUMBER_WORDS, presentationFailures, type Quotable, type RuleKey } from "./presentation";
import { axisLabel } from "./prompt";
import { escapeRegExp, quotesPlayerText } from "./quote-match";
import type { TuningLine, TuningResponse } from "./response-schema";

/**
 * What the model is NOT trusted about. Pure and client-safe: the catalog lookup is injected as
 * `resolveName`, a closure the caller builds over one read of every name the reply used.
 *
 * Six rules, in order, run on each LINE of the two lists, and a line is kept only if it survives all six:
 *  1. schema — already enforced by the structured output and the SDK's parse;
 *  2. the card exists — its name resolves in the catalog;
 *  3. a CUT is real — in this deck, and not a commander; and it is not one the deck depends on:
 *     never a Key card of its overview, and never a universal staple cut without a game, a note or
 *     the intent behind it
 *     (tuning v2, Hugh's ruling 2026-09-24; the prompt asks for both, and this holds it to them);
 *  4. an ADD is legal — `validateCardForDeck`, the add path's own rule (commander-legal, inside
 *     the colour identity, not a commander), not already in the deck, and inside the deck's limits
 *     (price cap, sets, owned only);
 *  5. the evidence exists — a cited game count matches the games read, a cited note is one the
 *     player wrote, a cited intent was stated;
 *  6. presentation — the text rules, on the rationale, the short rationale and every citation.
 *
 * Every drop is LISTED in `drops`, and every drop but `neverCut` is COUNTED in `droppedCount` (the
 * lead's "we dropped N"): a cut of a card the player locked is the player's rule working, not a
 * suggestion the model got wrong (Locked, F4). Survivors are renumbered within the whole answer,
 * additions first, so the item list has no holes.
 */
export type ResolvedCard = {
  oracleId: string;
  colorIdentity: string[];
  commanderLegal: boolean;
  /**
   * "Kept for this deck" (H35, PR 4a): the SAME figure the buy tag shows (`priceOf`/`priceState`
   * over `loadPrices`), cents, the buy tag's PREFERRED live printing — never "cheapest": real
   * non-foil stock outranks foil-only at any price (`price-query.ts`, "a $50 non-foil is never
   * displaced by a $2.10 foil"). Null with no usable price (sold out, never listed) — never
   * dropped for a cap it cannot be checked against.
   */
  priceCents: number | null;
  /** The same `printedIn` rule decision 9 gave the Set control — true for every card when no
   *  set is selected, since an empty selection filters nothing. */
  printedInSelectedSets: boolean;
  /** The same ownership rule `pool: "sleeveable"` filters a fill's candidates on (`fill.ts`):
   *  a plain boolean, already read once per run. */
  owned: boolean;
};

export type ValidatedSuggestion = {
  /** Exactly one of the two is set: an addition has only its add, a cut only its cut. */
  addOracleId: string | null;
  cutOracleId: string | null;
  rationale: string;
  rationaleShort: string;
  evidence: TuningCitation[];
  position: number;
  /** Set after validation by the bracket flag; null when the change moves no bracket. */
  bracketAfter: number[] | null;
};

/** Why a suggestion was dropped: a rule key the model was instructed with, or one of the
 *  structural checks no instruction covers. `commander` is split out of the generic
 *  `cutInDeck` (H35, PR 4a) so a refusal can name the commander specifically; `overCap`/
 *  `offSet`/`notOwned` are "Kept for this deck"'s three hard filters, checked on the ADD. */
export type Drop = {
  /** Which list the dropped line was in. Absent on a drop persisted before the two lists. */
  side?: "add" | "cut";
  /** The line's place in ITS list as the model wrote it (before the two lists, in the one list). */
  position: number;
  rule: RuleKey | "cardExists" | "addNotLegal" | "duplicate" | "keyCard" | "universalStaple" | "neverCut"
    | "commander" | "overCap" | "offSet" | "notOwned";
  /** The card this drop is about, for a refusal sentence that names it — the model's own
   *  spelling (`s.cut`/`s.add`), not a resolved catalog name, since drops the model got wrong
   *  before a card ever resolved (`cardExists`) have none to give. */
  name?: string;
  /** For a `citation` drop: the KIND of the citation that failed, so a run whose cuts all dropped can be
   *  read back without the model's reply (which is not stored). Never its text: an `intent` or `notes`
   *  citation quotes the player's words, and the run's notes are never saved. */
  cite?: { kind: string };
};

/**
 * What a run measured about its own answer (H35, PR 4a) — persisted so a drop rate can be read
 * back without re-deriving it, and so the refusal note (an empty result) names what caused it.
 * `survivedCount` is before the 8-asked/5-kept slice; `keptCount` after it, what was actually
 * persisted. `survivedCount > keptCount` is the `tooMany` caption's own condition.
 */
export type ValidationReport = {
  askedCount: number;
  survivedCount: number;
  keptCount: number;
  refusal?: RefusalDetail;
  /** "Owned only" was set and nothing the player owns fit this deck, so the adds are cards to buy.
   *  The panel says so before the lists. Absent for every other run. */
  ownedNone?: true;
  /** The credit came back although suggestions are shown: too few held up (`refundsCredit`). The
   *  panel says so before the lists. Absent for every other run. */
  refunded?: true;
  /** "Additional notes" (H35, PR 4b): whether THIS run carried any, for `ReadFrom`'s "your
   *  notes" line — the field itself is never saved, so only the run record remembers it.
   *  Absent for a run persisted before this column's meaning existed, same as every other
   *  optional field here. */
  hadNotes?: boolean;
  /** Every drop `validateSuggestions` produced, per candidate — the same list `chooseRefusal`
   *  reads to pick the one-line `refusal`, kept here in full rather than discarded once that
   *  choice is made. No cost to persist (already computed, pure data); lets an "every candidate
   *  dropped" run be read back without re-running the model to see WHY. Absent for a run
   *  persisted before this field existed. */
  drops?: Drop[];
};

export type RefusalDetail =
  | { reason: "commander"; name: string }
  | { reason: "locked"; name: string }
  | { reason: "lockedMany"; count: number }
  | { reason: "overCap"; name: string; capCents: number }
  | { reason: "nothingLeft" };

/**
 * The refusal sentence's own selection (H35, PR 4a review-approved precedence): `commander` >
 * `locked`/`lockedMany` > `overCap` > `nothingLeft`. Pure, over the `drops` an empty-result run
 * already produced — the model never writes this sentence, the app does.
 *
 * `locked`/`lockedMany` read the existing `neverCut` drops (Locked, never cut): the only
 * populated "locked" cause today. `playerText`'s own notes-driven lock concept (H35, PR 4b)
 * reaches the SAME two sentences once it ships, through the same drops.
 */
export function chooseRefusal(drops: readonly Drop[], capCents: number | null): RefusalDetail {
  const commander = drops.find((d) => d.rule === "commander" && d.name);
  if (commander) return { reason: "commander", name: commander.name! };

  const lockedNames = [...new Set(drops.filter((d) => d.rule === "neverCut" && d.name).map((d) => d.name!))];
  if (lockedNames.length === 1) return { reason: "locked", name: lockedNames[0] };
  if (lockedNames.length > 1) return { reason: "lockedMany", count: lockedNames.length };

  const overCap = drops.find((d) => d.rule === "overCap" && d.name);
  if (overCap && capCents !== null) return { reason: "overCap", name: overCap.name!, capCents };

  return { reason: "nothingLeft" };
}

/**
 * The first `max` survivors of EACH list, additions first, renumbered so the item list has no
 * holes. 6-asked/5-kept per list (`ASK_PER_LIST`, `MAX_SUGGESTIONS`): the first survivors in
 * whatever order the validator already gives — no new ranking pass.
 */
export function sizeLists(kept: readonly ValidatedSuggestion[], max: number): ValidatedSuggestion[] {
  const adds = kept.filter((k) => k.addOracleId !== null).slice(0, max);
  const cuts = kept.filter((k) => k.addOracleId === null).slice(0, max);
  return [...adds, ...cuts].map((k, position) => ({ ...k, position }));
}

export function validateSuggestions(args: {
  response: TuningResponse;
  pack: EvidencePack;
  resolveName: (name: string) => ResolvedCard | null;
}): { kept: ValidatedSuggestion[]; droppedCount: number; drops: Drop[] } {
  const { response, pack, resolveName } = args;
  const inDeck = new Map(pack.cards.map((c) => [c.oracleId, c]));
  const keyCards = new Set((pack.strategy?.keyCards ?? []).map((k) => k.oracleId));
  const universal = new Set((pack.universal ?? []).map((u) => u.oracleId));
  // Everything the player wrote that a suggestion may quote: each note with its game's date, as
  // the prompt renders it, and the intent, which has none. In the exact form the model was shown
  // — `playerTextBody`, not `oneLine` alone — because a note or intent containing a tag-lookalike
  // run is shown to the model with its brackets stripped; comparing against the unstripped
  // original would fail a faithful quote and drop a good suggestion for a mismatch that never
  // reached the model.
  const year = pack.year;
  const quotable: Quotable[] = [
    ...pack.play.games.flatMap((g) => (g.note === null ? [] : [{ text: playerTextBody(g.note), date: noteDate(g.playedAt, year) }])),
    ...(pack.intent === null ? [] : [{ text: playerTextBody(pack.intent), date: null }]),
    ...(pack.notes === null ? [] : [{ text: playerTextBody(pack.notes), date: null }]),
  ];
  const [primary, partner] = pack.commanders;
  const deck = {
    commanderOracleId: primary?.oracleId ?? "",
    // The pack's identity is already the pair's union, which is what the rule measures against.
    commanderColorIdentity: pack.colorIdentity,
    partnerOracleId: partner?.oracleId ?? null,
    partnerColorIdentity: null,
    built: 0,
  };

  const kept: ValidatedSuggestion[] = [];
  const drops: Drop[] = [];
  const used = new Set<string>();
  // A genuine part-quote of the intent or this run's notes is repaired to its bare, unquoted
  // form by `firstFailure`'s presentation check rather than dropped (Design's own format for a
  // part is unquoted) — kept here, by line, since `firstFailure` only reports pass/fail.
  const repairs = new Map<TuningLine, { rationale: string; rationaleShort: string; evidence: TuningCitation[] }>();

  // A quotation of the run's notes filed as `intent` (or the reverse) is the right words under the
  // wrong label. With notes in the run the model did this on most lines (Soldiers, 2026-10-11: 9 of 12
  // dropped as `citation`, each a faithful quote of the notes labelled `intent`), and the dropped
  // lines were true. The label decides which chip the player sees, so it is corrected to the source
  // the words are actually from, never accepted as written.
  const relabel = (line: TuningLine): TuningLine => {
    let changed = false;
    const evidence = line.evidence.map((c) => {
      const other = c.kind === "intent" ? "notes" : c.kind === "notes" ? "intent" : null;
      if (other === null || citationHolds(c, line) || !citationHolds({ ...c, kind: other }, line)) return c;
      changed = true;
      return { ...c, kind: other } as TuningCitation;
    });
    return changed ? { ...line, evidence } : line;
  };
  const sides = [["add", response.additions.map(relabel)], ["cut", response.cuts.map(relabel)]] as const;
  for (const [side, lines] of sides) {
    lines.forEach((line, position) => {
      const reason = firstFailure(side, line);
      if (reason) {
        drops.push({ side, position, ...reason });
        return;
      }
      const card = resolveName(line.card)!;
      used.add(`${side}:${card.oracleId}`);
      const fixed = repairs.get(line);
      kept.push({
        addOracleId: side === "add" ? card.oracleId : null,
        cutOracleId: side === "cut" ? card.oracleId : null,
        rationale: fixed?.rationale ?? line.rationale,
        rationaleShort: fixed?.rationaleShort ?? line.rationaleShort,
        evidence: fixed?.evidence ?? line.evidence,
        position: kept.length,
        bracketAfter: null,
      });
    });
  }

  // A `neverCut` drop is NOT counted (Locked, F4): the lead's "we dropped N" describes suggestions
  // the model got wrong, and a cut of a card the player locked is the player's rule working, not a
  // failed suggestion. Still listed in `drops`, so a run whose every drop is one can say so (F10).
  return { kept, droppedCount: drops.filter((d) => d.rule !== "neverCut").length, drops };

  function firstFailure(side: "add" | "cut", s: TuningLine): { rule: Drop["rule"]; name?: string; cite?: Drop["cite"] } | null {
    const card = resolveName(s.card);
    if (!card) return { rule: "cardExists" };
    // Two lines naming the same card in one list cannot both be applied.
    if (used.has(`${side}:${card.oracleId}`)) return { rule: "duplicate" };

    if (side === "cut") {
      const cutRow = inDeck.get(card.oracleId);
      if (!cutRow) return { rule: "cutInDeck" };
      // Named, so the refusal note can name the commander directly (H35, PR 4a) — split out of
      // the generic `cutInDeck` it used to share.
      if (cutRow.commander) return { rule: "commander", name: s.card };
      // Never cut (Locked): a FILTER, whatever the prompt told the model (D4).
      if (cutRow.locked) return { rule: "neverCut", name: s.card };
      if (keyCards.has(card.oracleId)) return { rule: "keyCard" };
      // "Just to fix a role count": a universal staple may still go for a reason the PLAYER gave, a
      // game, a note, their stated intent or what they asked this run (H35, PR 4b), each checked
      // against what they wrote below. A role count is not that, and neither is a decklist
      // citation, which `citationHolds` cannot check and which would otherwise let a count-only cut
      // through by adding one.
      if (universal.has(card.oracleId) && !s.evidence.some((c) => c.kind === "games" || c.kind === "note" || c.kind === "intent" || c.kind === "notes")) return { rule: "universalStaple" };
    } else {
      const rejection = validateCardForDeck(card, deck);
      if (rejection === "off-color-identity") return { rule: "colourIdentity" };
      if (rejection !== null || inDeck.has(card.oracleId)) return { rule: "addNotLegal" };
      // "Kept for this deck" (H35, PR 4a): hard filters on an ADD, checked on the model's own
      // resolved card rather than left to the model to self-police. A card with no usable price
      // is never dropped for the cap — `priceCents` is null for sold-out or never-listed, not for
      // "free".
      if (pack.limits.capCents !== null && card.priceCents !== null && card.priceCents > pack.limits.capCents) {
        return { rule: "overCap", name: s.card };
      }
      if (pack.limits.sets.length > 0 && !card.printedInSelectedSets) return { rule: "offSet" };
      if (pack.limits.ownedOnly && !card.owned) return { rule: "notOwned" };
    }

    for (const c of s.evidence) {
      if (!citationHolds(c, s)) return { rule: "citation", cite: { kind: c.kind } };
    }

    const rationaleCheck = presentationFailures(s.rationale, quotable);
    if (rationaleCheck.broken[0]) return { rule: rationaleCheck.broken[0] };
    const shortCheck = presentationFailures(s.rationaleShort, quotable);
    if (shortCheck.broken[0]) return { rule: shortCheck.broken[0] };
    const evidenceChecks = s.evidence.map((c) => ({ c, check: presentationFailures(c.value, quotable) }));
    const failedEvidence = evidenceChecks.find((e) => e.check.broken[0]);
    if (failedEvidence) return { rule: failedEvidence.check.broken[0] };

    // Citations are RECHECKED against the REPAIRED suggestion, on top of the check above against
    // the original — a quote repair can invalidate a citation that held against the still-quoted
    // text: stripping the quote marks a "note" citation requires, or unmasking a second games
    // figure `oneFigure` must then reject as ambiguous. A citation valid against what the model
    // wrote is not automatically valid against what the player actually sees once repaired.
    const repairedEvidence = evidenceChecks.map((e) => ({ ...e.c, value: e.check.text }));
    const repaired: TuningLine = { ...s, rationale: rationaleCheck.text, rationaleShort: shortCheck.text, evidence: repairedEvidence };
    for (const c of repairedEvidence) {
      if (!citationHolds(c, repaired)) return { rule: "citation", cite: { kind: c.kind } };
    }

    repairs.set(s, {
      rationale: rationaleCheck.text,
      rationaleShort: shortCheck.text,
      evidence: repairedEvidence,
    });
    return null;
  }

  /** Every game figure the prompt states, with the words that name it. */
  function gameClaims(): { words: RegExp[]; n: number }[] {
    const { record, marked, axes } = pack.play.summary;
    return [
      { words: [/\b(won|wins?)\b/], n: record.wins },
      { words: [/\b(lost|loss|losses)\b/], n: record.losses },
      { words: [/\b(drew|draws?)\b/], n: record.draws },
      { words: [/\bmark/], n: marked },
      ...axes.flatMap((a) => {
        const label = new RegExp(escapeRegExp(axisLabel(a.key).toLowerCase()));
        return [
          { words: [label, HURT], n: a.hurt },
          { words: [label, WORKED], n: a.worked },
        ];
      }),
    ];
  }

  /** The one `N of M` figure in a citation — a word numerator read as its number — or null
   *  when there is none or more than one: two figures cannot be tied to the claims they label
   *  without parsing the sentence, and a suggestion has four citations for its facts. */
  function oneFigure(text: string, nouns: string): { n: number; m: number } | null {
    const figures = [...text.matchAll(new RegExp(`\\b(\\d+|${NUMBER_WORDS})\\s+of\\s+(?:the\\s+|your\\s+)?(\\d+)(?:\\s+${nouns})?\\b`, "g"))];
    if (figures.length !== 1) return null;
    const [, n, m] = figures[0];
    return { n: /^\d+$/.test(n) ? Number(n) : NUMBER_WORDS.split("|").indexOf(n), m: Number(m) };
  }

  function citationHolds(c: TuningCitation, s: TuningLine): boolean {
    const count = pack.play.summary.count;
    const text = c.value.toLowerCase();
    switch (c.kind) {
      case "games": {
        if (count === 0) return false;
        // The figure must be about the games actually read — M the count — and N must be what
        // the prompt stated for a claim the citation NAMES: `Mana hurt in 5 of 5` is refused
        // when mana hurt in 3, though 5 is the count. "games" may be left implied, as Design's
        // `cards in hand · 7 of 9` leaves it. An axis named with no direction may carry either
        // of its figures, since both were stated; a direction, when given, must be the right one.
        const figure = oneFigure(text, "games?");
        if (!figure || figure.m !== count) return false;
        // Both directions at once ("worked against you") says neither: refused, never read as
        // whichever figure happens to match.
        const hurt = HURT.test(text);
        const worked = WORKED.test(text);
        if (hurt && worked) return false;
        const directed = hurt || worked;
        return gameClaims().some((claim) => claim.n === figure.n
          && claim.words.every((w) => w.test(text) || (!directed && (w === HURT || w === WORKED))));
      }
      case "note": {
        // Design's form: the citation names the note's date as the notes list writes it
        // (`26 Aug`), and the suggestion quotes that note — `suggestionRules.quotedNote` then
        // holds the quotation to the byte and to its date wherever it appears.
        const year = pack.year;
        // In the rationale, or in this citation itself — both are drawn on the card. Not in some
        // other citation, where a quotation would be doing a different citation's job.
        const own = [s.rationale, s.rationaleShort, c.value];
        return pack.play.games.some((g) => {
          if (g.note === null || !mentionsDate(c.value, noteDate(g.playedAt, year))) return false;
          const note = playerTextBody(g.note);
          return own.some((t) => t.includes(`"${note}"`) || t.includes(`\u201c${note}\u201d`));
        });
      }
      case "intent":
        return citationQuotesPlayerText(pack.intent, c.value);
      // "Additional notes" (H35, PR 4b): the same whole-or-part rule as `intent`, against the
      // run's own notes text rather than the deck's standing description.
      case "notes":
        return citationQuotesPlayerText(pack.notes, c.value);
      case "mix": {
        // A target and its figure, as the targets list writes it: `draw 4 of 10`. The cell the
        // citation names must carry exactly that have and target.
        const figure = oneFigure(text, "cards?");
        return figure !== null && pack.targets.roles.some((cell) =>
          cell.have === figure.n && cell.target === figure.m && text.includes(cell.role.replace(/s$/, "")));
      }
      case "decklist": {
        // A decklist citation is otherwise unchecked, but the prompt sends a staple's figure
        // through it ("Sol Ring: in 415 of 431 commanders' decks"), so that one form is held to
        // the staples list: the card named must be one the pack lists, with exactly that figure.
        const staple = /\bin (\d+) of (\d+) commanders/.exec(text);
        if (!staple) return true;
        return pack.staples.some((st) => text.includes(st.name.toLowerCase())
          && st.commanders === Number(staple[1]) && st.commanderTotal === Number(staple[2]));
      }
    }
  }
}

/** A citation's direction: the axis worked against the player, or for them. */
const HURT = /\bhurt|\bagainst\b/;
const WORKED = /\bwork|\bfor you\b/;

/**
 * `quotesPlayerText` (now shared with `presentation.ts` via `quote-match.ts`) takes a bare
 * source string; a citation's source is player text that must first pass through
 * `playerTextBody` — the SAME form the model was shown, not the raw field — before the quote
 * check runs against it.
 */
function citationQuotesPlayerText(source: string | null, value: string): boolean {
  return quotesPlayerText(source === null ? null : playerTextBody(source), value);
}
