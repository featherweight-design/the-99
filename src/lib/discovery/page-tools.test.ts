import { describe, expect, it } from "vitest";
import { visibleSections, type VisibleSection } from "../about/pages-visible";
import { NEVER_SEEN } from "../about/visible";
import { SWITCH_FLAGS } from "../switches/flags";
import { SWITCH_NAMES, type SwitchName } from "../switches/registry";
import { landingFor, pageTools, showMeHref, type PageCard } from "./page-tools";
import type { CardInput } from "./showcase";
import { TOOLS } from "./tools";

// Try it on the About pages (About visual PR 5, call 6, Review Focus 2): a tool is on a page only while its switch is on
// and its label is drawn, in the section of that label, and its Show me lights that label.
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));
const without = (...names: SwitchName[]) =>
  env({ ...(ALL_ON as Record<string, string>), ...Object.fromEntries(names.map((n) => [n, "off"])) });

const input = (e: NodeJS.ProcessEnv): CardInput => ({
  isOn: (n) => SWITCH_FLAGS[n](e),
  fits: {},
  deckCount: 1,
  hasSyncBase: true,
  place: true,
});
const placed = (e: NodeJS.ProcessEnv, visible: readonly VisibleSection[] = visibleSections(e)) =>
  new Map([...pageTools(visible, input(e))].map(([k, cards]) => [k, cards.map((c) => c.id)]));

describe("pageTools", () => {
  it("places every tool, with every switch on, in the section of its first label, in the section's own order", () => {
    const got = placed(ALL_ON);
    expect([...got.values()].flat().sort()).toEqual(TOOLS.map((t) => t.id).sort());
    expect(got.get("decks/analysis")).toEqual(["suggested-changes", "proposed-cuts", "mana-balance"]);
    expect(got.get("decks/your-decks")).toEqual(["lineup", "precons"]);
    expect(got.get("commanders/for-you")).toEqual(["help-me-choose"]);
    for (const t of TOOLS) {
      const [area, section] = t.labels[0].split("/");
      expect(got.get(`${area}/${section}`)).toContain(t.id);
    }
  });

  it("keeps a tool only while its label is drawn: a label switched off takes the card (Review Focus 2)", () => {
    const all = visibleSections(ALL_ON);
    // The label alone gone, the tool's own switch still on: the card goes with it.
    const noCuts = all.map((s) => ({ ...s, labels: s.labels.filter((l) => l.key !== "decks/analysis/cuts") }));
    expect(placed(ALL_ON, noCuts).get("decks/analysis")).toEqual(["suggested-changes", "mana-balance"]);
    // The switch off: both the label and the card.
    expect(placed(without("PROPOSED_CUTS_ENABLED")).get("decks/analysis")).toEqual(["suggested-changes", "mana-balance"]);
    // A section left with no card is absent.
    expect(placed(without("SOCIAL_GAMES_ENABLED")).has("decks/games")).toBe(false);
  });

  it("falls back to a later label: Help me choose with the Commanders place off sits under New deck", () => {
    const got = placed(without("COMMANDERS_PLACE_ENABLED"));
    expect(got.has("commanders/for-you")).toBe(false);
    expect(got.get("decks/your-decks")).toEqual(["lineup", "precons", "help-me-choose"]);
  });

  it("aims each card's Show me at its label: the label's page, lit, at its section", () => {
    for (const cards of pageTools(visibleSections(ALL_ON), input(ALL_ON)).values()) {
      for (const c of cards) {
        const [area, section] = c.label.split("/");
        expect(c.showMe).toBe(`/about/${area}?lit=${encodeURIComponent(c.label)}#${section}`);
      }
    }
  });
});

describe("showMeHref", () => {
  it("is /about/<area>?lit=<label key>#<section> for every tool's every label", () => {
    for (const t of TOOLS) {
      for (const label of t.labels) {
        const [area, section] = label.split("/");
        const url = new URL(showMeHref(label), "https://x.test");
        expect(url.pathname).toBe(`/about/${area}`);
        expect(url.searchParams.get("lit")).toBe(label);
        expect([...url.searchParams.keys()]).toEqual(["lit"]);
        expect(url.hash).toBe(`#${section}`);
      }
    }
  });
});

describe("landingFor", () => {
  const visible = visibleSections(ALL_ON);
  const cards: PageCard[] = [...pageTools(visible, input(ALL_ON)).values()].flat().map((card) => ({ card, phone: null, desktop: null }));
  const cuts = "decks/analysis/cuts";

  it("marks a label the reader has not been told about New, with its tool's card", () => {
    const l = landingFor(cuts, "decks", visible, { version: 16, ids: [] }, cards);
    expect(l).toMatchObject({ key: cuts, isNew: true });
    expect(l?.card?.card.id).toBe("proposed-cuts");
  });

  it("lights a label the reader has been told about with no New mark", () => {
    expect(landingFor(cuts, "decks", visible, { version: 16, ids: [cuts] }, cards)).toMatchObject({ key: cuts, isNew: false });
    // A first-run reader is introduced to the pages: nothing is new to them.
    expect(landingFor(cuts, "decks", visible, NEVER_SEEN, cards)).toMatchObject({ isNew: false });
  });

  it("lands nowhere for another page's label, an unknown key, a repeated parameter or a label switched off", () => {
    const seen = { version: 16, ids: [] };
    expect(landingFor("friends/friends/add", "decks", visible, seen, cards)).toBeNull();
    expect(landingFor("decks/analysis/nope", "decks", visible, seen, cards)).toBeNull();
    expect(landingFor([cuts, cuts], "decks", visible, seen, cards)).toBeNull();
    expect(landingFor(undefined, "decks", visible, seen, cards)).toBeNull();
    expect(landingFor(cuts, "decks", visibleSections(without("PROPOSED_CUTS_ENABLED")), seen, cards)).toBeNull();
  });

  it("carries no card for a label no tool aims at", () => {
    const visibleLabel = visible.find((s) => s.id === "analysis")!.labels.find((l) => !TOOLS.some((t) => (t.labels as readonly string[]).includes(l.key)))!;
    expect(landingFor(visibleLabel.key, "decks", visible, { version: 16, ids: [] }, cards)?.card).toBeNull();
  });
});
