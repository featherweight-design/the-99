import { describe, expect, it } from "vitest";
import { ABOUT_SCREENS, DECK_VIEWS, type AboutScreen, type DeckView } from "../copy/about";
import { ABOUT_RULES, ABOUT_SECTIONS } from "../copy/about-pages";
import { labelKey, ruleKey } from "./pages-visible";
import { ABOUT_Q_LANDINGS, SCREEN_SECTIONS, landingRowKey, questionHref, questionLanding } from "./question-landing";

const DECK = "/decks/0b6c2f4e-1111-4222-8333-444455556666";
const at = (path: string, search = "", deckView: DeckView | null = null, desktop = true) =>
  questionLanding(path, search, { deckView, desktop });

describe("the light tables match the page copy", () => {
  it("lands each sectioned screen on the first section listing it, a deck by its view", () => {
    const derived: Record<string, string> = {};
    for (const s of ABOUT_SECTIONS) {
      for (const r of s.screens) {
        const key = r.screen === "deck" ? `deck:${r.view}` : r.screen;
        derived[key] ??= `${s.area}/${s.id}`;
      }
    }
    expect(SCREEN_SECTIONS).toEqual(derived);
  });

  it("every A1 row lands on a section that exists, lighting a label or rule that section draws", () => {
    for (const [id, row] of Object.entries(ABOUT_Q_LANDINGS)) {
      const [area, sid] = row.lands.split("/");
      const section = ABOUT_SECTIONS.find((s) => s.area === area && s.id === sid);
      expect(section, id).toBeDefined();
      const key = landingRowKey(row);
      if ("rule" in row.lit) {
        expect(section!.rules, id).toContain(row.lit.rule);
        expect(Object.hasOwn(ABOUT_RULES, row.lit.rule), id).toBe(true);
        expect(key).toBe(ruleKey(row.lit.rule as keyof typeof ABOUT_RULES));
      } else {
        const label = section!.labels.find((l) => l.id === (row.lit as { label: string }).label);
        expect(label, id).toBeDefined();
        expect(key).toBe(labelKey(section!, label!));
      }
    }
  });

  it("a screen with a section has no A1 row, and every screen but account answers somewhere", () => {
    for (const screen of ABOUT_SCREENS) {
      const sectioned = Object.hasOwn(SCREEN_SECTIONS, screen) || screen === "deck";
      const a1 = Object.hasOwn(ABOUT_Q_LANDINGS, screen);
      if (screen === "account") expect(sectioned || a1).toBe(false);
      else expect(sectioned !== a1, screen).toBe(true);
    }
  });
});

describe("questionLanding", () => {
  it("lands a sectioned screen on its section with nothing lit", () => {
    expect(at("/")).toEqual({ area: "home", section: "home", lit: null });
    expect(at("/collection")).toEqual({ area: "collection", section: "cards", lit: null });
    expect(at("/collection/replace")).toEqual({ area: "collection", section: "upload", lit: null });
    expect(at("/commanders")).toEqual({ area: "commanders", section: "for-you", lit: null });
    expect(at("/commanders/discover")).toEqual({ area: "commanders", section: "discover", lit: null });
    expect(at("/decks")).toEqual({ area: "decks", section: "your-decks", lit: null });
    expect(at("/friends")).toEqual({ area: "friends", section: "friends", lit: null });
  });

  it("lands a deck on the section of the view the reader is on, Your deck when none is published", () => {
    const where: Record<DeckView, string> = {
      "your-deck": "decks/your-deck",
      analysis: "decks/analysis",
      versions: "decks/versions",
      games: "decks/games",
      stats: "decks/stats",
      notes: "decks/notes",
      shopping: "shopping/deck-shopping",
    };
    for (const view of DECK_VIEWS) {
      const l = at(DECK, "", view)!;
      expect(`${l.area}/${l.section}`, view).toBe(where[view]);
      expect(l.lit).toBeNull();
    }
    expect(at(DECK)).toEqual({ area: "decks", section: "your-deck", lit: null });
  });

  it("lands each A1 screen on its row, with that unit lit", () => {
    const rows: [string, string, string, string][] = [
      ["/collection/sets", "collection", "cards", "collection/cards/tabs"],
      ["/collection/sets/mh3", "collection", "cards", "collection/cards/tabs"],
      ["/collection/proxies", "shopping", "deck-shopping", "rule/proxy"],
      ["/collection/history", "collection", "upload", "rule/replace"],
      ["/collection/wishlist", "collection", "cards", "collection/cards/tabs"],
      ["/settings", "home", "whats-new", "home/whats-new/lead"],
      ["/credits", "decks", "analysis", "rule/credits"],
      ["/decks/shopping", "shopping", "all-decks", "shopping/all-decks/total"],
      ["/decks/shopping?view=friend", "shopping", "all-decks", "shopping/all-decks/total"],
    ];
    for (const [href, area, section, lit] of rows) {
      const [path, search = ""] = href.split("?");
      expect(at(path, search), href).toEqual({ area, section, lit });
    }
  });

  it("splits New deck by path", () => {
    const yours = { area: "decks", section: "your-decks" };
    expect(at("/decks/new")).toEqual({ ...yours, lit: "decks/your-decks/new-deck" });
    expect(at("/decks/import")).toEqual({ ...yours, lit: "decks/your-decks/new-deck" });
    expect(at("/decks/precons")).toEqual({ ...yours, lit: "decks/your-decks/precons" });
    expect(at("/decks/precons/some-precon-file")).toEqual({ ...yours, lit: "decks/your-decks/precons" });
    expect(at("/commanders/choose")).toEqual({ area: "commanders", section: "for-you", lit: "commanders/for-you/places" });
  });

  it("answers card details only at desktop width; on a phone, for the list under it", () => {
    expect(at("/collection", "?card=abc", null, true)).toEqual({ area: "collection", section: "cards", lit: "collection/cards/key" });
    expect(at("/collection", "?card=abc", null, false)).toEqual({ area: "collection", section: "cards", lit: null });
    expect(at("/collection/wishlist", "?card=abc", null, false)).toEqual({
      area: "collection", section: "cards", lit: "collection/cards/tabs",
    });
  });

  it("has no landing for About itself, admin or an unknown path (account is never a path)", () => {
    for (const path of ["/about", "/about/decks", "/admin", "/nowhere"]) expect(at(path), path).toBeNull();
    const screens: readonly AboutScreen[] = ABOUT_SCREENS;
    expect(screens).toContain("account");
  });
});

describe("questionHref", () => {
  it("writes from, then lit when there is one, then the section", () => {
    expect(questionHref(at("/collection/replace"), "/collection/replace")).toBe("/about/collection?from=%2Fcollection%2Freplace#upload");
    expect(questionHref(at("/credits"), "/credits")).toBe("/about/decks?from=%2Fcredits&lit=rule%2Fcredits#analysis");
  });

  it("goes to the index with no landing", () => {
    expect(questionHref(null, "/admin")).toBe("/about");
  });
});
