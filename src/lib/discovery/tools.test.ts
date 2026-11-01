import { describe, expect, it } from "vitest";
import { aboutEntries } from "../copy/about-entries";
import { tuningHubCopy } from "../copy/tuning-hub";
import { isMomentId } from "../moments/registry";
import { SWITCHES } from "../switches/registry";
import { isTargetId } from "./targets";
import { TOOLS, deckToolLanding, isToolId, toolLanding } from "./tools";

const allOn = () => true;

describe("the tool registry", () => {
  it("holds C2's fourteen tools in its five groups, in order", () => {
    expect(TOOLS.map((t) => `${t.group}:${t.id}`)).toEqual([
      "start:help-me-choose",
      "start:precons",
      "tune:top-off",
      "tune:proposed-cuts",
      "tune:suggested-changes",
      "tune:mana-balance",
      "buy:stand-ins",
      "buy:friend-spares",
      "own:find-a-deck",
      "own:wishlist",
      "own:collection-sync",
      "play:matchups",
      "play:lineup",
      "play:friends",
    ]);
  });

  it("names a tool by its moment's id where it has one, and its target by the same id", () => {
    for (const t of TOOLS) {
      expect(isTargetId(t.target)).toBe(true);
      expect(t.target).toBe(t.id);
    }
    expect(TOOLS.filter((t) => !isMomentId(t.id)).map((t) => t.id)).toEqual(["friends"]);
  });

  // Collection Sync's own switch (R2 gap 8) is retired, and so is its parent's, collection editing: Sync has none. The
  // Analysis tab's is retired too (2026-11-01), so the Tuning tools have none either: no tool is behind a switch.
  it("names only switches the switch registry has, and puts every tool behind none", () => {
    const names = new Set<string>(SWITCHES.map((s) => s.name));
    for (const t of TOOLS) if (t.switch !== null) expect(names.has(t.switch)).toBe(true);
    expect(TOOLS.find((t) => t.id === "collection-sync")?.switch).toBeNull();
    expect(TOOLS.filter((t) => t.switch === null).map((t) => t.id)).toEqual(TOOLS.map((t) => t.id));
  });

  it("opens an About entry that exists for every tool", () => {
    const ids = new Set(aboutEntries.map((e) => e.id));
    for (const t of TOOLS) expect(ids.has(t.entry)).toBe(true);
  });

  it("carries the chip the Tuning hub already draws, verbatim, and no other (ruling 5)", () => {
    const credit = Object.fromEntries(TOOLS.filter((t) => t.credit !== null).map((t) => [t.id, t.credit]));
    expect(credit).toEqual({
      "proposed-cuts": tuningHubCopy.tools.cuts.cost,
      "suggested-changes": tuningHubCopy.tools.suggested.cost,
      "mana-balance": tuningHubCopy.tools.mana.cost,
    });
  });

  it("lands the deck tools on their tab and view, and the rest on their own page", () => {
    const deck = Object.fromEntries(TOOLS.flatMap((t) => (t.lands.kind === "deck" ? [[t.id, t.lands]] : [])));
    expect(deck).toEqual({
      "top-off": { kind: "deck", tab: "deck" },
      "proposed-cuts": { kind: "deck", tab: "analysis" },
      "suggested-changes": { kind: "deck", tab: "analysis" },
      "mana-balance": { kind: "deck", tab: "analysis" },
      "stand-ins": { kind: "deck", tab: "deck", view: "shopping" },
      "friend-spares": { kind: "deck", tab: "deck", view: "shopping" },
      matchups: { kind: "deck", tab: "games" },
    });
    for (const t of TOOLS) if (t.lands.kind === "deck") expect(t.needsDeck).toBe(true);
    expect(TOOLS.filter((t) => !t.needsDeck).map((t) => t.id)).toEqual([
      "help-me-choose", "precons", "wishlist", "collection-sync", "friends",
    ]);
  });
});

describe("toolLanding", () => {
  it("lands a known tool whose switch is on, spending its moment", () => {
    expect(toolLanding("mana-balance", allOn)).toEqual({
      tool: "mana-balance",
      target: "mana-balance",
      moment: "mana-balance",
      lands: { kind: "deck", tab: "analysis" },
    });
    expect(toolLanding("friends", allOn)?.moment).toBeNull();
  });

  it("lands a tool with no switch whatever the switches say", () => {
    expect(toolLanding("top-off", () => false)?.tool).toBe("top-off");
    expect(toolLanding("matchups", () => false)?.tool).toBe("matchups");
    // The swap tools' switch is retired: Stand-ins and Find a deck have none.
    expect(toolLanding("stand-ins", () => false)?.tool).toBe("stand-ins");
    expect(toolLanding("find-a-deck", () => false)?.tool).toBe("find-a-deck");
    // Help me choose's switch is retired: it has none.
    expect(toolLanding("help-me-choose", () => false)?.tool).toBe("help-me-choose");
    // The Analysis tab's switch is retired: its three Tuning tools have none.
    for (const id of ["proposed-cuts", "suggested-changes", "mana-balance"]) expect(toolLanding(id, () => false)?.tool).toBe(id);
  });

  it("is null for an unknown id, a repeated parameter and an absent one", () => {
    expect(toolLanding("nope", allOn)).toBeNull();
    expect(toolLanding(["top-off", "top-off"], allOn)).toBeNull();
    expect(toolLanding(undefined, allOn)).toBeNull();
    expect(toolLanding("tour:banner", allOn)).toBeNull();
    expect(isToolId("nope")).toBe(false);
  });
});

describe("deckToolLanding", () => {
  it("lands only a deck tool on a deck", () => {
    expect(deckToolLanding("matchups", allOn)?.lands).toEqual({ kind: "deck", tab: "games" });
    expect(deckToolLanding("wishlist", allOn)).toBeNull();
    expect(deckToolLanding("find-a-deck", allOn)).toBeNull();
  });

  it("lands a Tuning tool on the Analysis tab, which always draws", () => {
    expect(deckToolLanding("suggested-changes", () => false)?.lands).toEqual({ kind: "deck", tab: "analysis" });
    expect(deckToolLanding("top-off", () => false)?.tool).toBe("top-off");
  });
});
