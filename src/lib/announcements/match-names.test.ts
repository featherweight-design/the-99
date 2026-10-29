import { describe, expect, it } from "vitest";
import { buildNameIndex, matchCardName, matchCardNames, nameKey } from "./match-names";
import { parseDecklists } from "./decklists";
import { parsePost } from "./post";
import { fixture, postUrl } from "./__fixtures__/load";

const index = buildNameIndex<string>([
  ["Sol Ring", "sol"],
  ["Ambassador K'Ehleyr", "kehleyr"],
  ["Dandân", "dandan"],
  ["Éowyn, Shieldmaiden", "eowyn"],
  ["Find // Finality", "find"],
  ["Brightclimb Pathway // Grimclimb Pathway", "pathway"],
  ["Æther Vial", "vial"],
  ["Ransom Note", "ransom"],
  ["B.F.M. (Big Furry Monster)", "bfm-left"],
  ["B.F.M. (Big Furry Monster, Right Side)", "bfm-right"],
  // a front face that collides with a full name: the full name wins
  ["Fire // Ice", "fire-ice"],
  ["Fire", "fire"],
]);

describe("matchCardName", () => {
  it.each([
    ["Sol Ring", "sol"],
    ["sol ring", "sol"],
    ["  Sol   Ring ", "sol"],
    ["Ambassador K’Ehleyr", "kehleyr"], // curly apostrophe
    ["Dandan", "dandan"], // diacritics folded either way
    ["Eowyn, Shieldmaiden", "eowyn"],
    ["Aether Vial", "vial"],
    ["Find//Finality", "find"], // every separator spelling
    ["Find /// Finality", "find"],
    ["Find / Finality", "find"],
    ["Brightclimb Pathway", "pathway"], // front face only
    ["Brightclimb Pathway // Something Else", "pathway"], // the post's own front face
    ["Sol Ring (Villains)", "sol"], // a printing tag
    ["Ransom Note (Clues)", "ransom"],
    ["B.F.M. (Big Furry Monster)", "bfm-left"], // a real name ending in parentheses matches whole
    ["Fire", "fire"],
    ["Fire // Ice", "fire-ice"],
  ])("%s → %s", (name, id) => expect(matchCardName(name, index)).toBe(id));

  it.each([["Dandân art 2", "dandan"], ["Dandan Art 12", "dandan"]])("%s → %s: an art-variant tag is stripped", (name, id) => {
    expect(matchCardName(name, index)).toBe(id);
  });

  it.each([["Grimclimb Pathway"], ["Finality"], ["Sol"], ["Sol Ring art"], ["Art 2"], [""]])("%s does not match (no back faces, no prefixes)", (name) => {
    expect(matchCardName(name, index)).toBeNull();
  });
});

describe("nameKey", () => {
  it("reuses the repo's separator and quote normalizers", () => {
    expect(nameKey("  Wear/Tear ")).toBe("wear // tear");
    expect(nameKey("“Ain’t”")).toBe('"ain\'t"');
  });
});

describe("matchCardNames", () => {
  it("keeps order, and reports each unmatched name once, as written", () => {
    expect(matchCardNames(["Sol Ring", "Nope", "Dandân", "Nope", "Also Nope"], index)).toEqual({
      matched: [{ name: "Sol Ring", id: "sol" }, { name: "Dandân", id: "dandan" }],
      unmatched: ["Nope", "Also Nope"],
    });
  });

  it("matches a real list end to end: every Star Trek Federation Fleet name the index holds", () => {
    const r = parsePost(fixture("star-trek-commander-decklists.html"), postUrl("star-trek-commander-decklists"));
    if (!r.ok) throw new Error("parse");
    const names = parseDecklists(r.post.bodyHtml).decks[0].cards.map((c) => c.name);
    const catalog = buildNameIndex(names.filter((n) => n !== "Spot, Felis catus").map((n, i) => [n.toUpperCase(), i] as const));
    const result = matchCardNames(names, catalog);
    expect(result.unmatched).toEqual(["Spot, Felis catus"]);
    expect(result.matched).toHaveLength(names.length - 1);
  });
});
