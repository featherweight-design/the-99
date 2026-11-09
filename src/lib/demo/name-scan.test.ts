import { describe, expect, it } from "vitest";

import { demoScanRules, isModelText, MODEL_TEXT, withSourceDeckNames } from "../../../scripts/lib/demo-scan-rules";
import { DECK_NAMES } from "../../../scripts/lib/fictional-fixture/names";
import { encodeDemo } from "./wire";
import { scanNames, type ScanRules } from "./name-scan";

const rules: ScanRules = {
  personKeys: ["player", "friends", "opponent"],
  people: ["Wren Calloway", "Alex", "Torin", "Riley"],
  freeText: { deckName: ["Ashen Banner Parade"], notes: ["Sleeved for game night"] },
};

const clean = {
  player: "Wren Calloway",
  friends: ["Alex", "Torin"],
  decks: [{ deckName: "Ashen Banner Parade", notes: ["Sleeved for game night"], cards: [{ name: "Sol Ring" }, { name: "Jace, Multiverse Architect" }] }],
  games: [{ opponent: "Riley" }],
};

describe("scanNames", () => {
  it("passes data that names only the fixture's invented people and text, and any catalog card name", () => {
    expect(scanNames(clean, rules)).toEqual([]);
  });

  it("fails a person field holding a name outside the fixture's list, wherever it sits", () => {
    expect(scanNames({ ...clean, friends: ["Alex", "Jordan"] }, rules).map((f) => [f.path, f.value])).toEqual([["friends", "Jordan"]]);
    expect(scanNames({ ...clean, games: [{ opponent: "Jordan" }] }, rules).map((f) => f.path)).toEqual(["games[0].opponent"]);
    expect(scanNames({ ...clean, player: "Hugh" }, rules).map((f) => f.path)).toEqual(["player"]);
  });

  it("fails free text that is not the fixture's own", () => {
    expect(scanNames({ decks: [{ deckName: "Hugh's brew" }] }, rules).map((f) => f.path)).toEqual(["decks[0].deckName"]);
    expect(scanNames({ decks: [{ notes: ["Sleeved for game night", "Ask Sam about this"] }] }, rules).map((f) => f.value)).toEqual(["Ask Sam about this"]);
  });

  it("fails an email, an @handle, an account id and a profile URL in any string", () => {
    const why = (s: string) => scanNames({ blurb: s }, rules).map((f) => f.why);
    expect(why("write to someone@example.com")).toEqual(["an email address"]);
    expect(why("ping @someone about it")).toEqual(["an @handle"]);
    expect(why("owner user_2abcDEF123456")).toEqual(["an account id"]);
    expect(why("see https://www.reddit.com/u/someone")).toEqual(["a profile or social URL"]);
    expect(why("see https://moxfield.com/users/someone")).toEqual(["a profile or social URL"]);
    expect(why("a deck at https://edhrec.com/commanders/sol-ring-fan or https://moxfield.com/decks/abc123")).toEqual([]);
  });

  it("fails an address used as an object key", () => {
    expect(scanNames({ byOwner: { user_2abcDEF123456: 3 } }, rules).map((f) => f.path)).toEqual(["byOwner.user_2abcDEF123456 (key)"]);
  });

  it("does not take a card name or a card's mana text for an address", () => {
    expect(scanNames({ name: "Sol Ring", text: "{T}: Add {C}{C}." }, rules)).toEqual([]);
  });
});

describe("scanNames, free text found by where it sits", () => {
  const scoped: ScanRules = { ...rules, freeTextAt: [{ path: /(?:^|\.)claims\[\d+\]\.name$/, allowed: ["Ashen Banner Parade"], what: "deckName" }] };

  it("checks a name only at the paths a rule names, so a card's name elsewhere is never taken for one", () => {
    const tree = { cards: [{ name: "Sol Ring", availability: { claims: [{ id: "d1", name: "Ashen Banner Parade" }] } }] };
    expect(scanNames(tree, scoped)).toEqual([]);
    const bad = { cards: [{ name: "Sol Ring", availability: { claims: [{ id: "d1", name: "Hugh's Dragons" }] } }] };
    expect(scanNames(bad, scoped).map((f) => [f.path, f.value])).toEqual([["cards[0].availability.claims[0].name", "Hugh's Dragons"]]);
  });
});

describe("the demo's own rules (scripts/lib/demo-scan-rules.ts) on the exported shapes", () => {
  const played = DECK_NAMES.played;
  const claim = (name: string) => ({ id: "d1", name, mature: true });
  const deck = (name: string) => ({ id: "d1", name, commanders: ["Giada, Font of Hope"], need: null, reason: { kind: "combo", with: { oracleId: "o", name: "Swords to Plowshares", imageUri: null } } });
  // Encoded as the exporter writes it, so a Map's entries sit under `$map` as they do in the committed file.
  const data = (deckName: string) => encodeDemo({
    decks: { played: { deckName: played, cards: [{ name: "Sol Ring", availability: { claims: [claim(played)] } }],
      analysis: { ledgerAvailability: new Map([["o-sol", { owned: true, availability: { claims: [claim(deckName)] } }]]) } } },
    fits: {
      name: "Swords to Plowshares",
      list: { read: { card: { name: "Swords to Plowshares" }, fits: [deck(played)], holds: [{ id: "d2", name: DECK_NAMES.over, quantity: 1, commanders: [] }], excluded: [] } },
      panel: { fits: { card: { name: "Swords to Plowshares" }, fits: [deck(deckName)], holds: [], excluded: [] } },
    },
  });

  it("passes the fixture's deck names in a claim and in Which deck's lists, and the card names beside them", () => {
    expect(scanNames(data(played), demoScanRules)).toEqual([]);
  });

  it("fails a real-looking deck name in a claim (a Map's entry included) and in Which deck's lists", () => {
    expect(scanNames(data("Marcus's Goblins"), demoScanRules).map((f) => f.path)).toEqual([
      "decks.played.analysis.ledgerAvailability.$map[0][1].availability.claims[0].name",
      "fits.panel.fits.fits[0].name",
    ]);
    const holds = encodeDemo({ fits: { list: { read: { fits: [], holds: [{ id: "d", name: "Jordan Lee's EDH", quantity: 1, commanders: [] }], excluded: [{ id: "e", name: "Priya's Elves", commanders: [], outside: ["G"] }] } } } });
    expect(scanNames(holds, demoScanRules).map((f) => f.value)).toEqual(["Jordan Lee's EDH", "Priya's Elves"]);
  });
});

describe("card details' decks (step 5l-c)", () => {
  const details = (deck: string) => ({
    cardDetails: {
      x: {
        name: "Swords to Plowshares",
        proxiedBy: [{ id: "d1", name: deck }],
        cardCombos: { combos: [{ others: [{ name: "Sol Ring", decks: [{ id: "d2", name: deck, committed: true }] }], where: { kind: "elsewhere", decks: [{ id: "d3", name: deck, committed: true }] } }] },
      },
    },
  });

  it("passes the fixture's deck names where a card is proxied and where a combo partner's copies sit", () => {
    expect(scanNames(details(DECK_NAMES.played), demoScanRules)).toEqual([]);
  });

  it("fails any other deck name there", () => {
    expect(scanNames(details("Marcus's Goblins"), demoScanRules).map((f) => f.path)).toEqual([
      "cardDetails.x.proxiedBy[0].name",
      "cardDetails.x.cardCombos.combos[0].others[0].decks[0].name",
      "cardDetails.x.cardCombos.combos[0].where.decks[0].name",
    ]);
  });
});

describe("a Top off candidate's deck (`committedTo`)", () => {
  it("passes the fixture's deck or none, and fails any other deck name", () => {
    const pool = (committedTo: string | null) => encodeDemo({ topOff: { candidates: [{ name: "Sol Ring", committedTo }] } });
    expect(scanNames(pool(null), demoScanRules)).toEqual([]);
    expect(scanNames(pool(DECK_NAMES.under), demoScanRules)).toEqual([]);
    expect(scanNames(pool("Marcus's Goblins"), demoScanRules).map((f) => f.path)).toEqual(["topOff.candidates[0].committedTo"]);
  });
});

describe("the source database's own deck names (`withSourceDeckNames`)", () => {
  // The source holds the fixture's decks and two real ones; only the real ones are forbidden.
  const rules = withSourceDeckNames([...Object.values(DECK_NAMES), "Marcus's Goblins", "Priya's Elves"]);

  it("fails a string equal to a real deck under any key, whatever its case, and passes the fixture's", () => {
    const tree = encodeDemo({ anywhere: { label: "marcus's goblins  " }, decks: { played: { deckName: DECK_NAMES.played } } });
    expect(scanNames(tree, rules).map((f) => f.path)).toEqual(["anywhere.label"]);
  });

  it("fails a model's sentence that quotes a real deck, and passes one that names only the fixture's", () => {
    const read = (text: string) => encodeDemo({ fits: { panel: { view: { stored: { picks: [{ deckId: "d1", parts: [{ text }, { card: "o-swords" }] }] } } } } });
    expect(scanNames(read(`${DECK_NAMES.over} is short on removal`), rules)).toEqual([]);
    expect(scanNames(read("Priya's Elves is short on removal"), rules).map((f) => f.path)).toEqual(["fits.panel.view.stored.picks[0].parts[0].text"]);
  });

  it("a name only CONTAINED in a string fails only in a model's text, so a card name that holds a deck's is not refused", () => {
    expect(scanNames(encodeDemo({ cards: [{ name: "Priya's Elves Reborn" }] }), rules)).toEqual([]);
  });
});

describe("every model-written text is scanned for a source deck name inside it", () => {
  const rules = withSourceDeckNames([...Object.values(DECK_NAMES), "Priya's Elves"]);
  const finds = (tree: unknown) => scanNames(encodeDemo(tree), rules).map((f) => f.path);

  it("fails a Look deeper reason that names a real deck", () => {
    expect(finds({ cuts: { items: [{ cutName: "Sol Ring", reason: "Priya's Elves already runs this; cut it here" }] } })).toEqual(["cuts.items[0].reason"]);
    expect(finds({ cuts: { items: [{ cutName: "Sol Ring", reason: `${DECK_NAMES.over} has enough ramp` }] } })).toEqual([]);
  });

  it("covers the softened report, the Overview, Suggested changes, Help me choose and Which deck", () => {
    const text = "Better in Priya's Elves";
    expect(finds({
      cuts: { itemsReport: { softened: [{ position: 1, name: "Sol Ring", rule: "citeMismatch", failed: { kind: "role", note: text } }] } },
      overview: { state: { synopsis: { paragraphs: [text] } } },
      suggested: { state: { items: [{ reason: text }] } },
      choose: { read: { picks: [{ why: text }] } },
      fits: { panel: { view: { stored: { picks: [{ parts: [{ quote: text }] }] } } } },
    })).toEqual([
      "cuts.itemsReport.softened[0].failed.note",
      "overview.state.synopsis.paragraphs[0]",
      "suggested.state.items[0].reason",
      "choose.read.picks[0].why",
      "fits.panel.view.stored.picks[0].parts[0].quote",
    ]);
  });

  it("matches a name inside model text only as whole words", () => {
    expect(finds({ cuts: { items: [{ reason: "Not like priya's elvesong at all" }] } })).toEqual([]);
    expect(finds({ cuts: { items: [{ reason: "Like PRIYA'S ELVES, short on draw" }] } })).toEqual(["cuts.items[0].reason"]);
  });

  it("classifies the file's paths by step, and nothing outside a model step's prefix is model text", () => {
    expect(isModelText("cuts.items[3].reason")).toBe(true);
    expect(isModelText("cuts.itemsReport")).toBe(true);
    expect(isModelText("cuts.total")).toBe(false);
    expect(isModelText("cuts.itemsX")).toBe(false);
    expect(isModelText("decks.played.cards[0].name")).toBe(false);
    expect(Object.keys(MODEL_TEXT).sort()).toEqual(
      ["analysis", "cardDetails", "choose", "collection", "commanders", "cuts", "decks", "fits", "mana", "overview", "suggested", "topOff"],
    );
  });
});
