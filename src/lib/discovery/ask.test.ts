import { describe, expect, it } from "vitest";
import { askCopy } from "../copy/card-search";
import { ASK_PHRASES, matchTools, startersFor } from "./ask";
import { TOOLS } from "./tools";

const all = () => true;

describe("ask matching", () => {
  it("has phrases for every tool in the registry", () => {
    for (const t of TOOLS) expect(ASK_PHRASES[t.id as keyof typeof ASK_PHRASES]).toBeDefined();
  });

  it("answers a question of two or more words", () => {
    expect(matchTools("where can my spare cards go?", all)).toContain("find-a-deck");
    expect(matchTools("how do I make my deck better", all)[0]).toBe("suggested-changes");
  });

  it("answers one word only when it is a tool's own name", () => {
    expect(matchTools("precons", all)).toEqual(["precons"]);
    expect(matchTools("wishlist", all)).toEqual(["wishlist"]);
    // The query is stemmed before the name check, so a plural name is listed in both forms.
    expect(matchTools("friends", all)).toEqual(["friends"]);
    expect(matchTools("stats", all)).toEqual(["lineup"]);
    expect(matchTools("spare", all)).toEqual([]);
    expect(matchTools("sol", all)).toEqual([]);
  });

  it("never answers with a tool whose switch is off", () => {
    expect(matchTools("precons", (id) => id !== "precons")).toEqual([]);
  });

  it("returns at most three tools", () => {
    expect(matchTools("what should I buy next to make my deck better with cheaper cards", all).length).toBeLessThanOrEqual(3);
  });

  it("matches nothing for a card name", () => {
    expect(matchTools("Sol Ring", all)).toEqual([]);
  });
});

describe("starters", () => {
  it("every shipped starter has an answer", () => {
    expect(startersFor(all, null)).toEqual([...askCopy.starters.questions]);
  });

  it("leaves out a starter whose only answer is Find a deck when the reader has no deck", () => {
    const kept = startersFor(all, false);
    expect(kept).not.toContain(askCopy.starters.questions[0]);
    expect(startersFor(all, true)).toContain(askCopy.starters.questions[0]);
  });
});
