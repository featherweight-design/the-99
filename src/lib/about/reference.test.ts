import { describe, expect, it } from "vitest";
import { aboutEntries } from "../copy/about-entries";
import { DECK_VIEWS, REFERENCE_SCREEN_IDS, type AboutEntry } from "../copy/about";
import { entryRow } from "../copy/how-it-works-links";
import { showcaseCopy } from "../copy/discovery";
import { showcaseGroups, type ShowcaseInput } from "../discovery/showcase";
import { TOOLS } from "../discovery/tools";
import { REFERENCE_SCREENS, firstSentence, frameWindow, referenceScreens, screenKey } from "./reference";

const tools = (over: Partial<ShowcaseInput> = {}) =>
  showcaseGroups({
    isOn: () => true,
    visibleEntryIds: new Set(aboutEntries.map((e) => e.id)),
    fits: {
      "top-off": { decks: [] },
      "proposed-cuts": { decks: [{ id: "d1", name: "HD - Kratos" }] },
      "mana-balance": { decks: [] },
      "friend-spares": { decks: [] },
    },
    deckCount: 1,
    hasSyncBase: true,
    place: false,
    ...over,
  });

describe("the Reference's screens", () => {
  it("are the 23 screens in the order a reader meets them, a deck's seven views each one", () => {
    expect(REFERENCE_SCREENS).toHaveLength(23);
    expect(REFERENCE_SCREENS.map(screenKey)).toEqual(
      REFERENCE_SCREEN_IDS.flatMap((s) => (s === "deck" ? DECK_VIEWS.map((v) => `deck-${v}`) : [s])),
    );
    expect(REFERENCE_SCREENS.map(screenKey).slice(0, 2)).toEqual(["home", "collection"]);
  });

  it("files every entry under its own screen, a deck entry under its view, in About's order", () => {
    const screens = referenceScreens(aboutEntries, [], undefined);
    const filed = screens.flatMap((s) => s.entries.map((e) => e.id));
    expect([...filed].sort()).toEqual(aboutEntries.map((e) => e.id).sort());
    for (const s of screens) {
      const ids = s.entries.map((e) => e.id);
      const source = aboutEntries.filter((e) => ids.includes(e.id)).map((e) => e.id);
      expect(ids, s.key).toEqual(source);
      for (const id of ids) {
        const e = aboutEntries.find((x) => x.id === id)!;
        expect(screenKey({ screen: e.screen, view: e.view }), id).toBe(s.key);
      }
    }
  });

  it("draws no screen with no visible entry", () => {
    const only = aboutEntries.filter((e) => e.screen === "home");
    const screens = referenceScreens(only, [], undefined);
    expect(screens.map((s) => s.key)).toEqual(["home"]);
  });

  it("names a deck view's screen for the view and prints where each screen lives", () => {
    const fake: AboutEntry = { ...aboutEntries[0], id: "x", screen: "deck", view: "shopping" };
    const [s] = referenceScreens([fake], [], undefined);
    expect(s.key).toBe("deck-shopping");
    expect(s.where).toBe("a deck");
    expect(s.entries[0].screen).toBe(s.name);
    expect(s.name).toContain("Shopping");
  });
});

describe("an entry's marks", () => {
  it("marks `in Tools` and offers Try it from the same cards the Tools tab draws", () => {
    const entries = referenceScreens(aboutEntries, tools(), undefined).flatMap((s) => s.entries);
    const byId = new Map(entries.map((e) => [e.id, e]));
    const cuts = byId.get(TOOLS.find((t) => t.id === "proposed-cuts")!.entry)!;
    expect(cuts.inTools).toBe(true);
    expect(cuts.tryIt).toEqual({ label: showcaseCopy.tryOn("HD - Kratos"), href: "/decks/d1?tool=proposed-cuts" });
    // A tool with nothing that fits is still in Tools, with no Try it.
    const topOff = byId.get(TOOLS.find((t) => t.id === "top-off")!.entry)!;
    expect(topOff.inTools).toBe(true);
    expect(topOff.tryIt).toBeNull();
    // A tool with a page of its own: Try it opens the page.
    const choose = byId.get("help-me-choose")!;
    expect(choose.tryIt?.href).toBe("/decks/new/choose?tool=help-me-choose");
    // An entry no card covers.
    const plain = entries.find((e) => !TOOLS.some((t) => t.entry === e.id))!;
    expect(plain.inTools).toBe(false);
    expect(plain.tryIt).toBeNull();
  });

  it("follows the Tools tab: a tool not in Tools carries no Try it", () => {
    // No tool has a switch left (the Analysis tab's, behind Proposed cuts, retired): its card is gone only when its
    // entry is not drawn.
    const off = tools({ visibleEntryIds: new Set(aboutEntries.map((x) => x.id).filter((id) => id !== "proposed-cuts")) });
    const e = referenceScreens(aboutEntries, off, undefined).flatMap((s) => s.entries).find((x) => x.id === "proposed-cuts")!;
    expect(e.inTools).toBe(false);
    expect(e.tryIt).toBeNull();
    // Every switch off takes no card.
    const allOff = referenceScreens(aboutEntries, tools({ isOn: () => false }), undefined).flatMap((s) => s.entries).find((x) => x.id === "proposed-cuts")!;
    expect(allOff.inTools).toBe(true);
  });

  it("points at the How it works row that explains it, when one does", () => {
    const entries = referenceScreens(aboutEntries, [], undefined).flatMap((s) => s.entries);
    const [id, row] = Object.entries(entryRow).find(([k]) => entries.some((e) => e.id === k))!;
    expect(entries.find((e) => e.id === id)!.row).toBe(row);
    const without = entries.find((e) => !(e.id in entryRow))!;
    expect(without.row).toBeNull();
  });
});

describe("firstSentence", () => {
  it("reads the first sentence of the first paragraph", () => {
    expect(firstSentence("One thing. Another thing.\n\nA second paragraph.")).toBe("One thing.");
    expect(firstSentence("Is it? Yes.")).toBe("Is it?");
  });

  it("joins a paragraph's wrapped lines and skips blank leading paragraphs", () => {
    expect(firstSentence("\n\nWrapped\nacross lines. Then more.")).toBe("Wrapped across lines.");
  });

  it("reads a list's first item when the caption opens with a list", () => {
    expect(firstSentence("- First item. More.\n- Second item.")).toBe("First item.");
  });

  it("keeps a period inside a word or number, and returns a caption with no stop whole", () => {
    expect(firstSentence("Costs 1.5 credits per run. Then.")).toBe("Costs 1.5 credits per run.");
    expect(firstSentence("No stop here")).toBe("No stop here");
    expect(firstSentence("")).toBe("");
  });

  it("gives every shipped entry a one-line first sentence", () => {
    for (const e of aboutEntries) expect(firstSentence(e.caption).length, e.id).toBeGreaterThan(0);
  });
});

describe("frameWindow", () => {
  // A 3:2 window over a frame twice as tall as it is wide: the window shows a third of the frame.
  const tall = { width: 1000, height: 2000 };

  it("with no control placed, shows the top of the screen and no halo", () => {
    const w = frameWindow({ ...tall, halo: null });
    expect(w.top).toBeCloseTo(0);
    expect(w.height).toBeCloseTo(300);
    expect(w.position).toBeCloseTo(0);
    expect(w.halo).toBeNull();
  });

  it("centres a control in the middle of the frame", () => {
    const w = frameWindow({ ...tall, halo: { x: 0.2, y: 0.45, w: 0.4, h: 0.1 } });
    // Centre at 0.5 of the frame = 1 unit; the window's 2/3 unit is centred on it.
    expect(w.top).toBeCloseTo(-((1 - 1 / 3) / (2 / 3)) * 100);
    expect(w.halo!.left).toBeCloseTo(20);
    expect(w.halo!.width).toBeCloseTo(40);
    const mid = w.halo!.top + w.halo!.height / 2;
    expect(mid).toBeCloseTo(50);
    // object-position agrees with the offset: the image's top sits where `top` says, with cover filling the width.
    expect(w.position).toBeCloseTo(50);
  });

  it("clamps at the top: a control near the top never pulls the frame down", () => {
    const w = frameWindow({ ...tall, halo: { x: 0, y: 0.01, w: 0.1, h: 0.02 } });
    expect(w.top).toBeCloseTo(0);
    expect(w.halo!.top).toBeGreaterThanOrEqual(0);
  });

  it("clamps at the bottom: a control at the foot shows the frame's foot", () => {
    const w = frameWindow({ ...tall, halo: { x: 0, y: 0.97, w: 0.1, h: 0.02 } });
    expect(w.top + w.height).toBeCloseTo(100);
    expect(w.position).toBeCloseTo(100);
    expect(w.halo!.top + w.halo!.height).toBeLessThanOrEqual(100.0001);
  });

  it("never offsets a frame shorter than the window", () => {
    const w = frameWindow({ width: 1200, height: 600, halo: { x: 0.5, y: 0.9, w: 0.1, h: 0.05 } });
    expect(w.top).toBeCloseTo(0);
    expect(w.height).toBeCloseTo(75);
  });
});
