import { describe, expect, it } from "vitest";

import type { DeckGame } from "../decks/games";
import { buildPlayGroup } from "../profile/play";
import type { EvidencePack } from "./evidence";
import type { TuningLine } from "./response-schema";
import { chooseRefusal, sizeLists, validateSuggestions, type Drop, type ResolvedCard } from "./validate";

const game = (id: string, over: Partial<DeckGame> = {}): DeckGame => ({
  id, result: "loss", podSize: 4, playedAt: new Date("2026-09-01T20:00:00Z"),
  versionNumber: null, note: null, worked: [], hurt: [], ...over,
});

const pack: EvidencePack = {
  commanders: [{ oracleId: "cmd", name: "Commander" }],
  colorIdentity: ["G"],
  cards: [
    { oracleId: "cmd", name: "Commander", typeLine: "Legendary Creature", roles: [], quantity: 1, owned: true, commander: true },
    { oracleId: "bear", name: "Grizzly Bears", typeLine: "Creature", roles: [], quantity: 1, owned: true, commander: false },
    { oracleId: "ox", name: "Oxen", typeLine: "Creature", roles: [], quantity: 1, owned: true, commander: false },
  ],
  targets: { roles: [], thin: false },
  staples: [],
  play: buildPlayGroup([
    game("g1", { hurt: ["mana"], note: "flooded out on turn six" }),
    game("g2", { hurt: ["mana"] }),
    game("g3", { hurt: ["mana"] }),
    game("g4"), game("g5"),
  ]),
  intent: null,
  notes: null,
  year: 2026,
  limits: { capCents: null, sets: [], ownedOnly: false },
};

const neutral = { priceCents: null, printedInSelectedSets: true, owned: false };
const CATALOG: Record<string, ResolvedCard> = {
  "Cultivate": { oracleId: "cult", colorIdentity: ["G"], commanderLegal: true, ...neutral },
  "Rampant Growth": { oracleId: "rg", colorIdentity: ["G"], commanderLegal: true, ...neutral },
  "Lightning Bolt": { oracleId: "bolt", colorIdentity: ["R"], commanderLegal: true, ...neutral },
  "Banned Thing": { oracleId: "ban", colorIdentity: ["G"], commanderLegal: false, ...neutral },
  "Grizzly Bears": { oracleId: "bear", colorIdentity: ["G"], commanderLegal: true, ...neutral },
  "Oxen": { oracleId: "ox", colorIdentity: ["G"], commanderLegal: true, ...neutral },
  "Commander": { oracleId: "cmd", colorIdentity: ["G"], commanderLegal: true, ...neutral },
  "Not In Deck": { oracleId: "nid", colorIdentity: ["G"], commanderLegal: true, ...neutral },
};
const resolveName = (name: string) => CATALOG[name] ?? null;

// One line of the additions list (the tests that do not care which list use it), and one of the cuts.
const good: TuningLine = {
  card: "Cultivate",
  rationale: "Mana was marked as hurting in 3 of 5 games.",
  rationaleShort: "Mana hurt in 3 of 5",
  evidence: [{ kind: "games", value: "Mana hurt in 3 of 5 games" }],
};
const goodCut: TuningLine = { ...good, card: "Grizzly Bears" };
const run = (...additions: TuningLine[]) =>
  validateSuggestions({ response: { additions, cuts: [] }, pack, resolveName });
const runCuts = (...cuts: TuningLine[]) =>
  validateSuggestions({ response: { additions: [], cuts }, pack, resolveName });

describe("validateSuggestions", () => {
  it("keeps a grounded addition, with no cut", () => {
    const out = run(good);
    expect(out.droppedCount).toBe(0);
    expect(out.kept[0]).toMatchObject({ addOracleId: "cult", cutOracleId: null, position: 0, bracketAfter: null });
  });

  it("drops a card that is not in the catalog, and counts the drop", () => {
    expect(run({ ...good, card: "Nonesuch" })).toMatchObject({ kept: [], droppedCount: 1, drops: [{ rule: "cardExists" }] });
  });

  it("drops a cut that is not in the deck", () => {
    expect(runCuts({ ...goodCut, card: "Not In Deck" }).drops).toEqual([{ side: "cut", position: 0, rule: "cutInDeck" }]);
  });

  it("drops a cut that names a commander", () => {
    expect(runCuts({ ...goodCut, card: "Commander" }).drops).toEqual([{ side: "cut", position: 0, rule: "commander", name: "Commander" }]);
  });

  it("drops an add outside the colour identity", () => {
    expect(run({ ...good, card: "Lightning Bolt" }).drops).toEqual([{ side: "add", position: 0, rule: "colourIdentity" }]);
  });

  it("drops an add that is not commander-legal, or is already in the deck", () => {
    expect(run({ ...good, card: "Banned Thing" }).drops).toEqual([{ side: "add", position: 0, rule: "addNotLegal" }]);
    expect(run({ ...good, card: "Oxen" }).drops).toEqual([{ side: "add", position: 0, rule: "addNotLegal" }]);
  });

  it("drops a games citation whose denominator is not the games read", () => {
    expect(run({ ...good, evidence: [{ kind: "games", value: "Mana: 9 of 12 games" }] }).drops).toMatchObject([{ side: "add", position: 0, rule: "citation" }]);
    expect(run({ ...good, evidence: [{ kind: "games", value: "Mana: 6 of 5 games" }] }).drops).toMatchObject([{ side: "add", position: 0, rule: "citation" }]);
  });

  it("drops a games citation whose numerator is no figure the pack stated", () => {
    // Stated: 5 games, lost 5, 3 marked, mana hurt in 3. Nothing was ever 4.
    expect(run({ ...good, evidence: [{ kind: "games", value: "Mana: 4 of 5 games" }] }).drops).toMatchObject([{ side: "add", position: 0, rule: "citation" }]);
    expect(run({ ...good, evidence: [{ kind: "games", value: "Lost 5 of 5 games" }] }).droppedCount).toBe(0);
  });

  it("drops a games figure the claim it names does not carry, though the pack states it elsewhere", () => {
    // 5 is the count and the losses; mana hurt in 3.
    expect(run({ ...good, evidence: [{ kind: "games", value: "Mana hurt in 5 of 5 games" }] }).drops).toMatchObject([{ side: "add", position: 0, rule: "citation" }]);
    expect(run({ ...good, evidence: [{ kind: "games", value: "5 of 5 games" }] }).drops).toMatchObject([{ side: "add", position: 0, rule: "citation" }]);
  });

  it("drops a games citation carrying two figures, which could be swapped", () => {
    // Mana hurt in 3 and losses were 5: every figure here is stated, against the wrong claim.
    expect(run({ ...good, evidence: [{ kind: "games", value: "Mana hurt in 5 of 5 games; lost 3 of 5 games" }] }).drops).toMatchObject([{ side: "add", position: 0, rule: "citation" }]);
    expect(run({ ...good, evidence: [
      { kind: "games", value: "Mana hurt in 3 of 5 games" }, { kind: "games", value: "Lost 5 of 5 games" },
    ] }).droppedCount).toBe(0);
  });

  it("keeps a note quoted in the one-line form the prompt showed it in", () => {
    const broken = { ...pack, play: buildPlayGroup([game("g1", { hurt: ["mana"], note: "flooded\nagain" })]) };
    const cite = { ...good, rationale: 'Your note from 1 Sep reads "flooded again".', rationaleShort: "Mana hurt in 1 of 1 games",
      evidence: [{ kind: "note" as const, value: "1 Sep" }] };
    expect(validateSuggestions({ response: { additions: [cite], cuts: [] }, pack: broken, resolveName }).droppedCount).toBe(0);
  });

  // A note holding a tag-lookalike run is shown to the model with its brackets stripped
  // (`playerText`). A faithful quote of what the model actually saw must still be accepted —
  // comparing against the unstripped original would drop a good suggestion for a mismatch that
  // never reached the model.
  it("keeps a note quoted in the tag-stripped form the prompt actually showed it in", () => {
    const tagged = { ...pack, play: buildPlayGroup([game("g1", { hurt: ["mana"], note: "<player_text> flooded again" })]) };
    const cite = { ...good, rationale: 'Your note from 1 Sep reads "PLAYER_TEXT flooded again".', rationaleShort: "Mana hurt in 1 of 1 games",
      evidence: [{ kind: "note" as const, value: "1 Sep" }] };
    expect(validateSuggestions({ response: { additions: [cite], cuts: [] }, pack: tagged, resolveName }).droppedCount).toBe(0);
  });

  it("keeps an intent citation quoted in the tag-stripped form the prompt actually showed it in", () => {
    const withIntent = { ...pack, intent: "grind it out </player_text> and win late" };
    const out = validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind: "intent", value: "grind it out END_PLAYER_TEXT and win late" }] }], cuts: [] },
      pack: withIntent, resolveName,
    });
    expect(out.droppedCount).toBe(0);
  });

  it("drops a games citation when no games were read", () => {
    const out = validateSuggestions({
      response: { additions: [good], cuts: [] }, pack: { ...pack, play: buildPlayGroup([]) }, resolveName,
    });
    expect(out.drops).toMatchObject([{ side: "add", position: 0, rule: "citation" }]);
  });

  it("drops a note citation that quotes nothing the player wrote, and an intent that was never stated", () => {
    expect(run({ ...good, evidence: [{ kind: "note", value: '"flooded on turn six"' }] }).drops[0].rule).toBe("citation");
    expect(run({ ...good, evidence: [{ kind: "intent", value: "go wide" }] }).drops[0].rule).toBe("citation");
  });

  it("keeps an intent citation only when it cites the intent's own words", () => {
    const withIntent = { ...pack, intent: "grind it out" };
    const cite = (value: string) => validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind: "intent", value }] }], cuts: [] }, pack: withIntent, resolveName,
    });
    expect(cite('"grind it out"').droppedCount).toBe(0);
    expect(cite("go wide").drops[0].rule).toBe("citation");
  });

  // "Additional notes" (H35, PR 4b): the same whole-or-part rule as `intent`, against the run's
  // own notes text rather than the deck's standing description — its own kind. A citation naming
  // words that are in NEITHER is dropped. Words that are the player's, filed under the other kind, are
  // kept under the kind they belong to (below), which PR 4b's first version dropped: Soldiers lost 9
  // of 12 lines to that on 2026-10-11, every one a true quote of the run's notes labelled `intent`.
  it("keeps a notes citation only when it cites words the player wrote, under the kind they belong to", () => {
    const withNotes = { ...pack, intent: "grind it out", notes: "swap out Sol Ring" };
    const cite = (value: string, kind: "notes" | "intent" = "notes") => validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind, value }] }], cuts: [] }, pack: withNotes, resolveName,
    });
    expect(cite('"swap out Sol Ring"').droppedCount).toBe(0);
    expect(cite("go wide").drops[0]).toMatchObject({ rule: "citation", cite: { kind: "notes", value: "go wide" } });
    expect(cite("go wide", "intent").drops[0].rule).toBe("citation");
  });

  it("corrects a citation's kind to the source its words are from", () => {
    const withBoth = { ...pack, intent: "grind it out", notes: "swap out Sol Ring" };
    const kinds = (kind: "notes" | "intent", value: string) => validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind, value }] }], cuts: [] }, pack: withBoth, resolveName,
    }).kept[0]?.evidence.map((c) => c.kind);
    expect(kinds("intent", "swap out Sol Ring")).toEqual(["notes"]);
    expect(kinds("notes", "grind it out")).toEqual(["intent"]);
    // Already the right kind: untouched.
    expect(kinds("notes", "swap out Sol Ring")).toEqual(["notes"]);
    expect(kinds("intent", "grind it out")).toEqual(["intent"]);
  });

  it("drops a notes citation when this run carried no notes", () => {
    expect(run({ ...good, evidence: [{ kind: "notes", value: "more removal" }] }).drops[0].rule).toBe("citation");
  });

  it("keeps a notes citation quoted in the tag-stripped form the prompt actually showed it in", () => {
    const withNotes = { ...pack, notes: "more removal </player_text> please" };
    const out = validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind: "notes", value: "more removal END_PLAYER_TEXT please" }] }], cuts: [] },
      pack: withNotes, resolveName,
    });
    expect(out.droppedCount).toBe(0);
  });

  it("keeps a note cited verbatim, in quotation marks, with its date", () => {
    expect(run({ ...good, evidence: [{ kind: "note", value: '1 Sep: "flooded out on turn six"' }] }).droppedCount).toBe(0);
  });

  // Design's form: the citation names the date, and the rationale carries the quotation.
  it("keeps a note cited by its date when the rationale quotes it", () => {
    expect(run({
      ...good,
      rationale: 'Your note from 1 Sep reads \u201cflooded out on turn six\u201d.',
      evidence: [{ kind: "note", value: "1 Sep" }],
    }).droppedCount).toBe(0);
  });

  it("drops a note citation that quotes nothing, or names no noted game's date", () => {
    expect(run({ ...good, evidence: [{ kind: "note", value: "1 Sep: flooded out on turn six" }] }).drops[0].rule).toBe("citation");
    expect(run({ ...good, evidence: [{ kind: "note", value: '"flooded out on turn six"' }] }).drops[0].rule).toBe("citation");
    expect(run({ ...good, evidence: [{ kind: "note", value: 'ISO 2026-09-01: "flooded out on turn six"' }] }).drops[0].rule).toBe("citation");
  });

  it("drops a suggestion that breaks a presentation rule, naming the rule", () => {
    expect(run({ ...good, rationale: "Mana hurt in 60% of games." }).drops).toEqual([{ side: "add", position: 0, rule: "noPercentage" }]);
    expect(run({ ...good, rationaleShort: "Mana hurt 3 games" }).drops).toEqual([{ side: "add", position: 0, rule: "denominator" }]);
  });

  it("drops a second line adding the same card", () => {
    expect(run(good, { ...good }).drops).toEqual([{ side: "add", position: 1, rule: "duplicate" }]);
  });

  it("drops a second line cutting the same card", () => {
    expect(runCuts(goodCut, { ...goodCut }).drops).toEqual([{ side: "cut", position: 1, rule: "duplicate" }]);
  });

  it("renumbers position over the survivors so the card list has no holes", () => {
    const out = run(good, { ...good, card: "Nonesuch" }, { ...good, card: "Rampant Growth" });
    expect(out.kept.map((s) => [s.addOracleId, s.position])).toEqual([["cult", 0], ["rg", 1]]);
    expect(out.droppedCount).toBe(1);
  });

  // ── The addendum's forms (C-fix, audit finding 6) ──────────────────────────────────────
  const cite = (evidence: TuningLine["evidence"], over: Partial<TuningLine> = {}) =>
    run({ ...good, ...over, evidence });

  it("keeps a games citation that leaves `games` implied, as Design's `cards in hand · 7 of 9` does", () => {
    expect(cite([{ kind: "games", value: "mana · 3 of 5" }]).droppedCount).toBe(0);
    expect(cite([{ kind: "games", value: "mana marked against you in 3 of 5" }]).droppedCount).toBe(0);
  });

  it("still drops an undirected figure no stated claim carries, and a wrong direction", () => {
    expect(cite([{ kind: "games", value: "mana · 4 of 5" }]).drops[0].rule).toBe("citation");
    expect(cite([{ kind: "games", value: "mana worked in 3 of 5" }]).drops[0].rule).toBe("citation");
    // Design's `0 of 9`, for one card's history the pack never carries: named by nothing.
    expect(cite([{ kind: "games", value: "0 of 5" }]).drops[0].rule).toBe("citation");
  });

  it("reads a word numerator as its number", () => {
    expect(cite([{ kind: "games", value: "won none of the 5 games" }]).droppedCount).toBe(0);
    expect(cite([{ kind: "games", value: "won one of the 5 games" }]).drops[0].rule).toBe("citation");
  });

  it("keeps a mix citation that names a target and its exact figure", () => {
    const withMix = { ...pack, targets: { roles: [
      { role: "draw" as const, have: 4, target: 10, advisory: false, measured: true },
    ], thin: false } };
    const mix = (value: string) => validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind: "mix", value }] }], cuts: [] }, pack: withMix, resolveName,
    });
    expect(mix("card draw 4 of 10").droppedCount).toBe(0);
    expect(mix("card draw 5 of 10").drops[0].rule).toBe("citation");
    expect(mix("ramp 4 of 10").drops[0].rule).toBe("citation");
  });

  it("keeps an intent cited in part, as Design cites `win late` -- repaired to bare if quoted", () => {
    const withIntent = { ...pack, intent: "grind the table out and win late" };
    const intent = (value: string) => validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind: "intent", value }] }], cuts: [] }, pack: withIntent, resolveName,
    });
    expect(intent("win late").droppedCount).toBe(0);
    // Design's own format for a part-quote is UNQUOTED: a part wrapped in quotation marks is
    // repaired to its bare form rather than dropped, so the shown citation is never a part in
    // quote marks either way.
    const quoted = intent("\u201cwin late\u201d");
    expect(quoted.droppedCount).toBe(0);
    expect(quoted.kept[0].evidence[0].value).toBe("win late");
    // A quote (or a bare citation) matching no source at all is still a misquote.
    expect(intent("go wide").drops[0].rule).toBe("citation");
    expect(intent("\u201cgo wide with tokens\u201d").drops[0].rule).toBe("citation");
    expect(intent("a").drops[0].rule).toBe("citation");
  });

  it("keeps a notes citation cited in part, repaired to bare if quoted, and still catches a misquote", () => {
    const withNotes = { ...pack, notes: "swap out Sol Ring for more removal" };
    const notes = (value: string) => validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind: "notes", value }] }], cuts: [] }, pack: withNotes, resolveName,
    });
    expect(notes("more removal").droppedCount).toBe(0);
    const quoted = notes("\u201cmore removal\u201d");
    expect(quoted.droppedCount).toBe(0);
    expect(quoted.kept[0].evidence[0].value).toBe("more removal");
    expect(notes("fewer lands").drops[0].rule).toBe("citation");
    expect(notes("\u201cfewer lands\u201d").drops[0].rule).toBe("citation");
  });

  it("refuses a citation naming both directions at once", () => {
    expect(cite([{ kind: "games", value: "mana worked against you in 3 of 5" }]).drops[0].rule).toBe("citation");
  });

  it("dates a note citation to its own day, not one that contains it", () => {
    const two = { ...pack, play: buildPlayGroup([
      game("g6", { playedAt: new Date("2026-09-06T20:00:00Z"), note: "stuck on lands", hurt: ["mana"] }),
      game("g16", { playedAt: new Date("2026-09-16T20:00:00Z"), note: "flooded" }),
    ]) };
    const quoting = (value: string) => validateSuggestions({ response: { additions: [{
      ...good, rationale: 'Your note from 6 Sep reads "stuck on lands".', rationaleShort: "Mana hurt in 1 of 2 games",
      evidence: [{ kind: "note", value }],
    }], cuts: [] }, pack: two, resolveName });
    expect(quoting("6 Sep").droppedCount).toBe(0);
    expect(quoting("16 Sep").drops[0].rule).toBe("citation");
  });

  it("takes an intent part only as whole words", () => {
    const withIntent = { ...pack, intent: "grind the table out and win late" };
    const intent = (value: string) => validateSuggestions({
      response: { additions: [{ ...good, evidence: [{ kind: "intent", value }] }], cuts: [] }, pack: withIntent, resolveName,
    });
    for (const scrap of ["ate", "d t", "rind"]) expect(intent(scrap).drops[0].rule).toBe("citation");
    expect(intent("the table").droppedCount).toBe(0);
  });

  it("does not take a note's quotation from another citation", () => {
    expect(run({ ...good, evidence: [
      { kind: "note", value: "1 Sep" },
      { kind: "decklist", value: '"flooded out on turn six" 1 Sep' },
    ] }).drops[0].rule).toBe("citation");
  });

  // Round-5 review finding: a quote repair can invalidate a citation that held against the
  // still-quoted text. Both are checked against the REPAIRED suggestion as well as the original.
  describe("repair logic — round-5 review finding (citation rechecked against the repair)", () => {
    it("drops a games citation that passes before repair but reads two figures after it", () => {
      const withNotes = { ...pack, notes: "swap four lands for removal" };
      const out = validateSuggestions({
        response: { additions: [{
          ...good,
          evidence: [{ kind: "games", value: 'Mana hurt in 3 of 5 games; lost "four" of 5 games' }],
        }], cuts: [] },
        pack: withNotes,
        resolveName,
      });
      // Before repair, the quote marks break the second figure's own "N of M" adjacency, so only
      // one figure is read and the citation passes its first check; repair unquotes "four" (a
      // genuine part of the notes) and exposes a second figure, which `oneFigure` must then
      // reject as ambiguous.
      expect(out.drops[0].rule).toBe("citation");
    });

    it("drops a note citation whose required quotation the repair removes", () => {
      const withWinLate = {
        ...pack,
        intent: "grind the table out and win late",
        play: buildPlayGroup([
          game("g1", { hurt: ["mana"], note: "win late" }),
          game("g2", { hurt: ["mana"] }),
          game("g3", { hurt: ["mana"] }),
          game("g4"), game("g5"),
        ]),
      };
      const out = validateSuggestions({
        response: { additions: [{
          ...good,
          rationale: 'You said "win late".',
          evidence: [{ kind: "note", value: "1 Sep" }],
        }], cuts: [] },
        pack: withWinLate,
        resolveName,
      });
      // Before repair, the rationale's quoted "win late" literally matches the note's own text,
      // so the note citation passes. The note's text is also a genuine part of the undated
      // intent, so repair strips the quote marks the "note" citation requires — the repaired
      // rationale no longer carries them, and the citation must then fail.
      expect(out.drops[0].rule).toBe("citation");
    });
  });
});

describe("a staple's figure cited as a decklist citation", () => {
  const staples: EvidencePack = { ...pack, staples: [{ oracleId: "ring", name: "Sol Ring", commanders: 415, commanderTotal: 431, owned: true }] };
  const cite = (value: string) => validateSuggestions({
    response: { additions: [{ ...good, evidence: [{ kind: "decklist", value }] }], cuts: [] }, pack: staples, resolveName,
  });

  it("keeps the figure the staples list gives", () => {
    expect(cite("Sol Ring: in 415 of 431 commanders' decks").droppedCount).toBe(0);
  });

  it("drops a staple figure the list does not give, or a staple it does not list", () => {
    expect(cite("Sol Ring: in 1 of 1 commanders' decks").drops[0].rule).toBe("citation");
    expect(cite("Mana Crypt: in 415 of 431 commanders' decks").drops[0].rule).toBe("citation");
  });

  it("leaves every other decklist citation as it was", () => {
    expect(cite("4 of 99 draw").droppedCount).toBe(0);
  });
});

describe("the two lists (sub-project 8)", () => {
  it("validates each list on its own side's rules: a cut must be in the deck, an add must not be", () => {
    const out = validateSuggestions({
      response: { additions: [{ ...good, card: "Oxen" }, good], cuts: [{ ...goodCut, card: "Cultivate" }, goodCut] },
      pack, resolveName,
    });
    expect(out.drops).toEqual([
      { side: "add", position: 0, rule: "addNotLegal" },
      { side: "cut", position: 0, rule: "cutInDeck" },
    ]);
    expect(out.kept.map((k) => [k.addOracleId, k.cutOracleId])).toEqual([["cult", null], [null, "bear"]]);
  });

  it("numbers the survivors across both lists, additions first, with no holes", () => {
    const out = validateSuggestions({
      response: { additions: [{ ...good, card: "Nonesuch" }, good], cuts: [goodCut] }, pack, resolveName,
    });
    expect(out.kept.map((k) => k.position)).toEqual([0, 1]);
    expect(out.droppedCount).toBe(1);
  });

  it("tracks duplicates per list: a card named in both lists is judged on each side's own rules", () => {
    // Cultivate is not in the deck, so as a cut it reaches `cutInDeck`, not `duplicate`.
    const out = validateSuggestions({ response: { additions: [good], cuts: [{ ...goodCut, card: "Cultivate" }] }, pack, resolveName });
    expect(out.drops).toEqual([{ side: "cut", position: 0, rule: "cutInDeck" }]);
    expect(out.kept.map((k) => k.addOracleId)).toEqual(["cult"]);
  });

  it("holds the hard filters on additions only: a cap never drops a cut", () => {
    const priced = (name: string) => (name === "Grizzly Bears" ? { ...CATALOG[name], priceCents: 9_999 } : CATALOG[name] ?? null);
    const capped = { ...pack, limits: { capCents: 100, sets: [], ownedOnly: true } };
    const out = validateSuggestions({ response: { additions: [], cuts: [goodCut] }, pack: capped, resolveName: priced });
    expect(out.kept).toHaveLength(1);
  });

  it("sizeLists keeps the first n of EACH list, additions first, and renumbers", () => {
    const line = (add: string | null, cut: string | null, position: number) => ({
      addOracleId: add, cutOracleId: cut, rationale: "r", rationaleShort: "r", evidence: [], position, bracketAfter: null,
    });
    const kept = [line("a1", null, 0), line("a2", null, 1), line("a3", null, 2), line(null, "c1", 3), line(null, "c2", 4)];
    const sized = sizeLists(kept, 2);
    expect(sized.map((k) => [k.addOracleId ?? k.cutOracleId, k.position])).toEqual([["a1", 0], ["a2", 1], ["c1", 2], ["c2", 3]]);
  });
});

describe("v2's cut rules: what the deck depends on", () => {
  const withV2: EvidencePack = {
    ...pack,
    strategy: { steps: ["Attack with the Oxen."], keyCards: [{ oracleId: "ox", name: "Oxen" }] },
    universal: [{ oracleId: "bear", name: "Grizzly Bears" }],
  };
  const check = (s: TuningLine) => validateSuggestions({ response: { additions: [], cuts: [s] }, pack: withV2, resolveName });

  it("drops a suggestion that cuts a Key card of the deck's overview", () => {
    const out = check({ ...goodCut, card: "Oxen" });
    expect(out.kept).toHaveLength(0);
    expect(out.drops).toEqual([{ side: "cut", position: 0, rule: "keyCard" }]);
  });

  it("drops a universal staple cut on role counts alone", () => {
    const out = check({ ...goodCut, evidence: [{ kind: "mix", value: "ramp 4 of 10" }] });
    expect(out.drops).toEqual([{ side: "cut", position: 0, rule: "universalStaple" }]);
  });

  it("drops a universal staple cut whose only other citation is the decklist, which nothing checks", () => {
    const out = check({ ...goodCut, evidence: [{ kind: "mix", value: "ramp 4 of 10" }, { kind: "decklist", value: "Grizzly Bears is a vanilla creature" }] });
    expect(out.drops).toEqual([{ side: "cut", position: 0, rule: "universalStaple" }]);
  });

  it("refuses the second of two universal staples sharing a name, checked by id", () => {
    const shared: EvidencePack = { ...withV2, universal: [{ oracleId: "other", name: "Grizzly Bears" }, { oracleId: "bear", name: "Grizzly Bears" }] };
    const out = validateSuggestions({ response: { additions: [], cuts: [{ ...goodCut, evidence: [{ kind: "mix", value: "ramp 4 of 10" }] }] }, pack: shared, resolveName });
    expect(out.drops).toEqual([{ side: "cut", position: 0, rule: "universalStaple" }]);
  });

  it("keeps a universal staple cut the player's own games argue for", () => {
    expect(check(goodCut).kept).toHaveLength(1);
  });

  // "Additional notes" (H35, PR 4b): what the player asked this run is as legitimate a reason as
  // a game, a note or the intent — the same exemption, extended to the new kind.
  it("keeps a universal staple cut this run's own notes argue for", () => {
    const withNotes = { ...withV2, notes: "cut the bear for more removal" };
    const out = validateSuggestions({
      response: { additions: [], cuts: [{ ...goodCut, evidence: [{ kind: "notes", value: "cut the bear for more removal" }] }] },
      pack: withNotes, resolveName,
    });
    expect(out.drops.map((d) => d.rule)).not.toContain("universalStaple");
  });

  it("holds neither rule on a pack with no overview or staples, as before v2", () => {
    expect(runCuts({ ...goodCut, card: "Oxen" }).kept).toHaveLength(1);
    expect(runCuts({ ...goodCut, evidence: [{ kind: "mix", value: "ramp 4 of 10" }] }).drops.map((d) => d.rule)).not.toContain("universalStaple");
  });
});

describe("Locked (never cut): the validator's filter", () => {
  const locked: EvidencePack = {
    ...pack,
    cards: pack.cards.map((c) => (c.oracleId === "bear" ? { ...c, locked: true } : c)),
  };
  const check = (...s: TuningLine[]) => validateSuggestions({ response: { additions: [], cuts: s }, pack: locked, resolveName });

  it("drops a suggestion that cuts a locked card, whatever it cites (D4)", () => {
    const out = check(goodCut);
    expect(out.kept).toHaveLength(0);
    expect(out.drops).toEqual([{ side: "cut", position: 0, rule: "neverCut", name: "Grizzly Bears" }]);
  });

  // F4: the lead's "dropped N" is about suggestions the model got wrong; a locked cut is the
  // player's rule working, so it is listed but not counted.
  it("lists the drop but leaves it out of droppedCount", () => {
    const out = check(goodCut, { ...goodCut, card: "Nonesuch" });
    expect(out.drops.map((d) => d.rule)).toEqual(["neverCut", "cardExists"]);
    expect(out.droppedCount).toBe(1);
  });

  it("keeps a cut of an unlocked card in the same deck", () => {
    expect(check({ ...goodCut, card: "Oxen" }).kept).toHaveLength(1);
  });
});

describe("Kept for this deck: the hard filters on the ADD (H35, PR 4a)", () => {
  const catalogWith = (over: Partial<ResolvedCard>) => (name: string) =>
    name === "Cultivate" ? { ...CATALOG.Cultivate, ...over } : CATALOG[name] ?? null;

  it("drops an add over the deck's price cap", () => {
    const resolve = catalogWith({ priceCents: 500 });
    const withCap = { ...pack, limits: { capCents: 300, sets: [], ownedOnly: false } };
    expect(validateSuggestions({ response: { additions: [good], cuts: [] }, pack: withCap, resolveName: resolve }).drops)
      .toEqual([{ side: "add", position: 0, rule: "overCap", name: "Cultivate" }]);
  });

  it("never drops an add for the cap when its price cannot be checked (sold out or never listed)", () => {
    const resolve = catalogWith({ priceCents: null });
    const withCap = { ...pack, limits: { capCents: 1, sets: [], ownedOnly: false } };
    expect(validateSuggestions({ response: { additions: [good], cuts: [] }, pack: withCap, resolveName: resolve }).kept).toHaveLength(1);
  });

  it("keeps an add at or under the cap", () => {
    const resolve = catalogWith({ priceCents: 300 });
    const withCap = { ...pack, limits: { capCents: 300, sets: [], ownedOnly: false } };
    expect(validateSuggestions({ response: { additions: [good], cuts: [] }, pack: withCap, resolveName: resolve }).kept).toHaveLength(1);
  });

  it("drops an add printed in none of the selected sets", () => {
    const resolve = catalogWith({ printedInSelectedSets: false });
    const withSets = { ...pack, limits: { capCents: null, sets: ["lea"], ownedOnly: false } };
    expect(validateSuggestions({ response: { additions: [good], cuts: [] }, pack: withSets, resolveName: resolve }).drops)
      .toEqual([{ side: "add", position: 0, rule: "offSet" }]);
  });

  it("drops an unowned add when owned-only is set", () => {
    const resolve = catalogWith({ owned: false });
    const withOwned = { ...pack, limits: { capCents: null, sets: [], ownedOnly: true } };
    expect(validateSuggestions({ response: { additions: [good], cuts: [] }, pack: withOwned, resolveName: resolve }).drops)
      .toEqual([{ side: "add", position: 0, rule: "notOwned" }]);
  });

  it("keeps an owned add when owned-only is set", () => {
    const resolve = catalogWith({ owned: true });
    const withOwned = { ...pack, limits: { capCents: null, sets: [], ownedOnly: true } };
    expect(validateSuggestions({ response: { additions: [good], cuts: [] }, pack: withOwned, resolveName: resolve }).kept).toHaveLength(1);
  });
});

describe("chooseRefusal: the empty-result sentence's own precedence (H35, PR 4a)", () => {
  const drop = (rule: Drop["rule"], name?: string): Drop => ({ position: 0, rule, name });

  it("names the commander first, over everything else", () => {
    expect(chooseRefusal([drop("commander", "Gisa"), drop("neverCut", "Sol Ring"), drop("overCap", "Cultivate")], 300))
      .toEqual({ reason: "commander", name: "Gisa" });
  });

  it("names a single locked card next", () => {
    expect(chooseRefusal([drop("neverCut", "Sol Ring"), drop("overCap", "Cultivate")], 300))
      .toEqual({ reason: "locked", name: "Sol Ring" });
  });

  it("counts locked cards by distinct name, not by drop", () => {
    expect(chooseRefusal([drop("neverCut", "Sol Ring"), drop("neverCut", "Sol Ring"), drop("neverCut", "Mana Crypt")], null))
      .toEqual({ reason: "lockedMany", count: 2 });
  });

  it("names the cap next, with the cap it holds the run to", () => {
    expect(chooseRefusal([drop("overCap", "Cultivate"), drop("offSet")], 300))
      .toEqual({ reason: "overCap", name: "Cultivate", capCents: 300 });
  });

  it("never names overCap when the deck has no cap set", () => {
    expect(chooseRefusal([drop("overCap", "Cultivate")], null)).toEqual({ reason: "nothingLeft" });
  });

  it("falls back to nothingLeft when no named cause survives", () => {
    expect(chooseRefusal([drop("citation"), drop("duplicate")], null)).toEqual({ reason: "nothingLeft" });
  });
});
