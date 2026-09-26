import { describe, expect, it } from "vitest";
import { matchRows, type CatalogCard } from "./match";
import type { CollectionRow } from "../manabox/parse";

const card = (oracleId: string, scryfallId: string, name: string, over: Partial<CatalogCard> = {}): CatalogCard =>
  ({ oracleId, scryfallId, name, layout: "normal", typeLine: "Artifact", ...over });
const catalog = [
  card("o-1", "s-1", "Sol Ring"),
  card("o-2", "s-2", "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki"),
];
const row = (name: string, scryfallId: string | null = null, line = 2): CollectionRow =>
  ({ name, setCode: "x", collectorNumber: "1", quantity: 1, scryfallId, finish: "nonfoil", condition: null, line });

describe("matchRows", () => {
  it("uses scryfall id when it matches the seeded printing (opportunistic fast path)", () => {
    const { matched } = matchRows([row("Wrong Name", "s-1")], catalog);
    expect(matched[0].oracleId).toBe("o-1");
  });
  it("falls back to case-insensitive exact name", () => {
    const { matched } = matchRows([row("sol ring")], catalog);
    expect(matched[0].oracleId).toBe("o-1");
  });
  it("matches a front-face name against a double-faced catalog name", () => {
    const { matched } = matchRows([row("Fable of the Mirror-Breaker")], catalog);
    expect(matched[0].oracleId).toBe("o-2");
  });
  it("matches a multi-faced card written with a single slash", () => {
    const { matched } = matchRows(
      [row("Fable of the Mirror-Breaker / Reflection of Kiki-Jiki")],
      catalog,
    );
    expect(matched[0].oracleId).toBe("o-2");
  });
  it("matches a multi-faced card written with no spaces around the slash", () => {
    const { matched } = matchRows(
      [row("Fable of the Mirror-Breaker/Reflection of Kiki-Jiki")],
      catalog,
    );
    expect(matched[0].oracleId).toBe("o-2");
  });
  it("matches a multi-faced card whose catalog name is itself single-slashed", () => {
    // Defensive: the catalog is Scryfall's and always double-slashes, but the index
    // key and the incoming name must normalise identically or the symmetry breaks.
    const { matched } = matchRows([row("Fire // Ice")], [
      card("o-3", "s-3", "Fire / Ice"),
    ]);
    expect(matched[0].oracleId).toBe("o-3");
  });
  it("keeps a many-faced name matchable by its full spelling", () => {
    // "Who // What // When // Where // Why" is a real five-face card. Normalising
    // slashes must not disturb the full-name key, whatever the alias does with the
    // first face.
    const many = [
      card("o-4", "s-4", "Who // What // When // Where // Why"),
    ];
    expect(matchRows([row("Who / What / When / Where / Why")], many).matched[0].oracleId).toBe("o-4");
    expect(matchRows([row("What")], many).unmatched).toHaveLength(1);
  });
  it("reports unmatched rows with their original line number", () => {
    const { matched, unmatched } = matchRows([row("Not A Card", null, 7)], catalog);
    expect(matched).toHaveLength(0);
    expect(unmatched[0].line).toBe(7);
  });

  it("resolves printing-level ids the oracle catalog does not carry (§3.6)", () => {
    // "p-99" is a real printing of o-1 but is not the arbitrary printing the oracle catalog
    // happens to hold, so before printings existed this row could only match by name.
    const { matched } = matchRows([row("Renamed By The User", "p-99")], catalog, {
      printings: [{ scryfallId: "p-99", oracleId: "o-1" }],
    });
    expect(matched[0].oracleId).toBe("o-1");
  });

  it("classifies a known token id as skipped-by-design, not unmatched (§9.1)", () => {
    const { matched, skipped, unmatched } = matchRows([row("Treasure", "t-1")], catalog, {
      skippedScryfallIds: ["t-1"],
    });
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(0);
    expect(skipped.map((r) => r.name)).toEqual(["Treasure"]);
  });

  it("prefers the skipped ledger over a same-named real card", () => {
    // A token named "Sol Ring" must not import as the artifact.
    const { matched, skipped } = matchRows([row("Sol Ring", "t-2")], catalog, {
      skippedScryfallIds: ["t-2"],
    });
    expect(matched).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it("keeps genuinely unknown ids unmatched even when a skipped ledger is present", () => {
    const { skipped, unmatched } = matchRows([row("Who Knows", "z-9")], catalog, {
      skippedScryfallIds: ["t-1"],
      printings: [{ scryfallId: "p-99", oracleId: "o-1" }],
    });
    expect(skipped).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it("matches a Secret Lair flavor name to the oracle card it renames (#467)", () => {
    const { matched } = matchRows([row("Freya, Queen of the Valkyries")], catalog, {
      flavorNames: [{ flavorName: "Freya, Queen of the Valkyries", oracleId: "o-1" }],
    });
    expect(matched[0].oracleId).toBe("o-1");
  });

  it("matches a flavor name case-insensitively", () => {
    const { matched } = matchRows([row("battle of olympus")], catalog, {
      flavorNames: [{ flavorName: "Battle of Olympus", oracleId: "o-2" }],
    });
    expect(matched[0].oracleId).toBe("o-2");
  });

  it("lets an oracle name win a key a flavor name also claims", () => {
    // A flavor name printed on one card and borne as the real name by another must
    // resolve to the real card: the oracle name is what the rest of the app is keyed on.
    const { matched } = matchRows([row("Sol Ring")], catalog, {
      flavorNames: [{ flavorName: "Sol Ring", oracleId: "o-2" }],
    });
    expect(matched[0].oracleId).toBe("o-1");
  });

  it("drops a flavor name two different oracle cards share", () => {
    // Guessing between them would import a card the player does not own; being asked
    // to resolve the line is the lesser failure.
    const { matched, unmatched } = matchRows([row("Twinned")], catalog, {
      flavorNames: [
        { flavorName: "Twinned", oracleId: "o-1" },
        { flavorName: "Twinned", oracleId: "o-2" },
      ],
    });
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it("keeps one oracle card's repeated flavor name matchable", () => {
    // The same flavor name appears on every printing of that Secret Lair card —
    // foil, nonfoil, gallery variants — which is a repeat, not an ambiguity.
    const { matched } = matchRows([row("Freya, Queen of the Valkyries")], catalog, {
      flavorNames: [
        { flavorName: "Freya, Queen of the Valkyries", oracleId: "o-1" },
        { flavorName: "Freya, Queen of the Valkyries", oracleId: "o-1" },
      ],
    });
    expect(matched[0].oracleId).toBe("o-1");
  });

  it("normalises a multi-faced flavor name's slashes and front face", () => {
    const flavorNames = [{ flavorName: "Hidden Face // Hidden Back", oracleId: "o-2" }];
    expect(matchRows([row("Hidden Face / Hidden Back")], catalog, { flavorNames })
      .matched[0].oracleId).toBe("o-2");
    expect(matchRows([row("Hidden Face")], catalog, { flavorNames })
      .matched[0].oracleId).toBe("o-2");
  });

  it("prefers a scryfall id over a flavor name that points elsewhere", () => {
    const { matched } = matchRows([row("Freya, Queen of the Valkyries", "s-2")], catalog, {
      flavorNames: [{ flavorName: "Freya, Queen of the Valkyries", oracleId: "o-1" }],
    });
    expect(matched[0].oracleId).toBe("o-2");
  });
});

// Scryfall's catalog holds cardboard that is not a card: a Jumpstart theme front named
// "Lands", a Planechase plane, the Experience counter (layout `normal`, type line `Card`).
// A pasted section header resolved to the first by exact name and sat in a deck as a card.
describe("matchRows and cardboard that is not a card", () => {
  const withFronts = [
    ...catalog,
    card("o-lands", "s-lands", "Lands", { layout: "front_card", typeLine: "Card" }),
    card("o-plane", "s-plane", "Tazeem", { layout: "planar", typeLine: "Plane — Zendikar" }),
    card("o-exp", "s-exp", "Experience", { layout: "normal", typeLine: "Card" }),
  ];

  it("leaves a line naming one unmatched, by name", () => {
    const { matched, unmatched } = matchRows([row("Lands"), row("Tazeem"), row("Experience"), row("Sol Ring")], withFronts);
    expect(matched.map((m) => m.oracleId)).toEqual(["o-1"]);
    expect(unmatched.map((u) => u.name)).toEqual(["Lands", "Tazeem", "Experience"]);
  });

  it("leaves it unmatched by Scryfall id too, from the catalog and from printings", () => {
    const { matched, unmatched } = matchRows([row("x", "s-lands"), row("y", "p-exp")], withFronts, {
      printings: [{ scryfallId: "p-exp", oracleId: "o-exp" }],
    });
    expect(matched).toEqual([]);
    expect(unmatched).toHaveLength(2);
  });

  it("does not let a flavor name reach one either", () => {
    const { matched } = matchRows([row("Basic Lands")], withFronts, {
      flavorNames: [{ flavorName: "Basic Lands", oracleId: "o-lands" }],
    });
    expect(matched).toEqual([]);
  });
});
