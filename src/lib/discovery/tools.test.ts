import { describe, expect, it } from "vitest";
import { aboutEntries } from "../copy/about-entries";
import { tuningHubCopy } from "../copy/tuning-hub";
import { isMomentId } from "../moments/registry";
import { SWITCHES, type SwitchName } from "../switches/registry";
import { isTargetId } from "./targets";
import { TOOLS, deckToolLanding, isToolId, toolLanding } from "./tools";

const allOn = () => true;
const offFor = (...names: SwitchName[]) => (name: SwitchName) => !names.includes(name);

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

  it("names only switches the switch registry has, and gives Collection Sync its own (R2 gap 8)", () => {
    const names = new Set<string>(SWITCHES.map((s) => s.name));
    for (const t of TOOLS) if (t.switch !== null) expect(names.has(t.switch)).toBe(true);
    expect(TOOLS.find((t) => t.id === "collection-sync")?.switch).toBe("COLLECTION_SYNC_ENABLED");
    expect(TOOLS.filter((t) => t.switch === null).map((t) => t.id)).toEqual(["precons", "top-off", "wishlist", "lineup"]);
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
  });

  it("is null for an unknown id, a repeated parameter, an absent one, and a tool whose switch is off", () => {
    expect(toolLanding("nope", allOn)).toBeNull();
    expect(toolLanding(["top-off", "top-off"], allOn)).toBeNull();
    expect(toolLanding(undefined, allOn)).toBeNull();
    expect(toolLanding("tour:banner", allOn)).toBeNull();
    expect(toolLanding("stand-ins", offFor("SWAP_TOOLS_ENABLED"))).toBeNull();
    expect(toolLanding("matchups", offFor("SOCIAL_FRIENDS_ENABLED"))).toBeNull();
    expect(isToolId("nope")).toBe(false);
  });
});

describe("deckToolLanding", () => {
  it("lands only a deck tool on a deck", () => {
    expect(deckToolLanding("matchups", allOn, true)?.lands).toEqual({ kind: "deck", tab: "games" });
    expect(deckToolLanding("wishlist", allOn, true)).toBeNull();
    expect(deckToolLanding("find-a-deck", allOn, true)).toBeNull();
  });

  it("lands nothing on an Analysis tab this deployment does not draw", () => {
    expect(deckToolLanding("suggested-changes", allOn, false)).toBeNull();
    expect(deckToolLanding("top-off", allOn, false)?.tool).toBe("top-off");
  });
});
