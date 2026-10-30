import { describe, expect, it } from "vitest";
import { SWITCH_NAMES } from "../switches/registry";
import { TOOLS } from "../discovery/tools";
import { ABOUT_SCREENS, DECK_VIEWS, type AboutLineSwitch } from "./about";
import { aboutEntries } from "./about-entries";
import {
  ABOUT_AREAS, ABOUT_AREA_IDS, ABOUT_PAGE_STRINGS, ABOUT_RULE_IDS, ABOUT_RULES, ABOUT_SECTIONS, diagramColumn,
  type AboutDiagramColumn, type AboutDiagramPart, type AboutRuleDiagram,
} from "./about-pages";

/** The nine screens with no section until Design places them (plan PR 9); they keep the ? panel. */
const UNSECTIONED = ["card-details", "sets", "proxies", "history", "wishlist", "new-deck", "account", "settings", "credits"];
const labels = ABOUT_SECTIONS.flatMap((s) => s.labels);
const switchesOf = (sw: AboutLineSwitch): string[] =>
  (Array.isArray(sw) ? sw : [sw]).map((one: string) => one.replace(/^!/, ""));
const ENTRY = new Map(aboutEntries.map((e) => [e.id, e]));
const diagramParts = (id: (typeof ABOUT_RULE_IDS)[number]): AboutDiagramPart[] => {
  const d = ABOUT_RULES[id].diagram;
  return [...(d.head ? diagramColumn(d.head).parts : []), ...d.columns.flatMap((c) => c.parts), ...(d.foot ? diagramColumn(d.foot).parts : [])];
};
/** The row width a diagram's rows need: one column of 250px or more, never one of several side by side (Small items 3,
 *  item 1). Names each column that breaks it, so a failure says which. */
const ROW_COLUMN_W = 250;
function narrowRowColumns(d: AboutRuleDiagram): string[] {
  const hasRow = (c: AboutDiagramColumn) => c.parts.some((p) => p.part === "row");
  const where: [string, AboutDiagramColumn][] = [
    ...(d.head ? [["head", diagramColumn(d.head)] as [string, AboutDiagramColumn]] : []),
    ...d.columns.map((c, i) => [`column ${i}`, c] as [string, AboutDiagramColumn]),
    ...(d.foot ? [["foot", diagramColumn(d.foot)] as [string, AboutDiagramColumn]] : []),
  ];
  return where.flatMap(([name, c]) => {
    if (!hasRow(c)) return [];
    if (name.startsWith("column") && d.columns.length > 1) return [`${name} sits beside another`];
    if ((c.w ?? 0) < ROW_COLUMN_W) return [`${name} is ${c.w === undefined ? "unsized" : `${c.w}px`}`];
    return [];
  });
}
/** Every word a diagram draws. */
const diagramStrings = (id: (typeof ABOUT_RULE_IDS)[number]): string[] =>
  diagramParts(id).flatMap((p) => {
    switch (p.part) {
      case "caption": return [p.text];
      case "row": return [p.name, ...(p.tag ? [p.tag.text] : [])];
      case "tile": return [p.name];
      case "void": return [p.text];
      case "buy": return [p.note];
      case "between": return [p.glyph, ...(p.label ? [p.label] : [])];
      case "cells": return p.cells.map((c) => c.label);
      case "split": return p.parts.map((x) => x.label);
      case "chips": return p.chips.map((c) => c.text);
      default: return [];
    }
  });

describe("about pages copy model", () => {
  it("has the six areas in the handoff's order, every section in one of them", () => {
    expect(ABOUT_AREAS.map((a) => a.id)).toEqual([...ABOUT_AREA_IDS]);
    for (const s of ABOUT_SECTIONS) expect(ABOUT_AREA_IDS).toContain(s.area);
  });

  it("gives every label a unique region and every section a unique id", () => {
    const regions = labels.map((l) => l.region);
    expect(new Set(regions).size).toBe(regions.length);
    const ids = ABOUT_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists every rule in exactly one section", () => {
    const listed = ABOUT_SECTIONS.flatMap((s) => s.rules);
    expect([...listed].sort()).toEqual([...ABOUT_RULE_IDS].sort());
  });

  it("names only registered switches, on units and sentences", () => {
    const named = [
      ...labels.flatMap((l) => [l.switch, ...Object.values(l.sentences ?? {})]),
      ...Object.values(ABOUT_RULES).flatMap((r) => [r.switch, ...Object.values(r.sentences ?? {})]),
      ...ABOUT_SECTIONS.flatMap((s) => Object.values(s.subSentences ?? {})),
    ].filter((x): x is AboutLineSwitch => x != null).flatMap(switchesOf);
    // A retired switch stays the unit's historical identity: About's seen-state keys units and sentences by it, so
    // dropping the name would mark an unread announcement as seen. `visible.ts` maps each to always-on or its live parent.
    const RETIRED_IDENTITIES = ["HELP_PANEL_ENABLED", "CARD_SCAN_ENABLED", "FIRST_RUN_TOUR_ENABLED", "ADDED_COPY_ENABLED", "UPCOMING_PRECONS_ENABLED", "PRECONS_ENABLED", "DECK_TOKENS_ENABLED", "LINEUP_ENABLED", "FRIEND_DECKS_ENABLED", "COMMANDERS_PLACE_ENABLED", "HOME_FEED_ENABLED", "SIGNATURE_CARD_ENABLED", "RULE_ZERO_ENABLED", "SPARE_REQUESTS_ENABLED", "SOCIAL_GAMES_ENABLED", "SOCIAL_INVITES_ENABLED", "SOCIAL_WISHLIST_ENABLED", "COLLECTION_SYNC_ENABLED"];
    for (const n of named) expect([...SWITCH_NAMES, ...RETIRED_IDENTITIES], n).toContain(n);
  });

  it("keeps every gated sentence verbatim inside its unit's text", () => {
    for (const l of labels) for (const s of Object.keys(l.sentences ?? {})) expect(l.rest, l.id).toContain(s);
    for (const [id, r] of Object.entries(ABOUT_RULES)) for (const s of Object.keys(r.sentences ?? {})) expect(r.text, id).toContain(s);
    for (const sec of ABOUT_SECTIONS) for (const s of Object.keys(sec.subSentences ?? {})) expect(sec.sub, sec.id).toContain(s);
  });

  it("puts at most five labels on a capture (call 1)", () => {
    for (const s of ABOUT_SECTIONS) {
      const shots = Math.max(s.captures.phone.length, s.captures.desktop.length, 1);
      expect(s.labels.length, s.id).toBeLessThanOrEqual(5 * shots);
    }
  });

  it("covers every screen and deck view but the nine unsectioned screens", () => {
    const covered = new Set(ABOUT_SECTIONS.flatMap((s) => s.screens.map((r) => ("view" in r ? `deck:${r.view}` : r.screen))));
    for (const screen of ABOUT_SCREENS) {
      if (screen === "deck" || UNSECTIONED.includes(screen)) continue;
      expect(covered, screen).toContain(screen);
    }
    for (const view of DECK_VIEWS) expect(covered, view).toContain(`deck:${view}`);
    for (const screen of UNSECTIONED) expect(covered, screen).not.toContain(screen);
  });

  it("names only real entries as legacy sources", () => {
    const sources = [...labels.flatMap((l) => l.legacy), ...Object.values(ABOUT_RULES).flatMap((r) => r.legacy)];
    for (const id of sources) {
      const [base, sw] = id.split("@");
      expect(ENTRY.has(base), id).toBe(true);
      if (sw) expect(ENTRY.get(base)!.variant?.switch, id).toBe(sw);
    }
  });

  it("dates every unit by the newest unswitched entry it came from, or 16", () => {
    const sinceOf = (legacy: readonly string[]) => {
      const u = legacy.filter((id) => !id.includes("@") && !ENTRY.get(id)!.switch).map((id) => ENTRY.get(id)!.since);
      return u.length ? Math.max(...u) : 16;
    };
    for (const l of labels) expect(l.since, l.region).toBe(sinceOf(l.legacy));
    for (const [id, r] of Object.entries(ABOUT_RULES)) expect(r.since, id).toBe(sinceOf(r.legacy));
  });

  it("aims every tool's first Show me label at a section that lists the tool (the handoff's placement)", () => {
    for (const t of TOOLS) {
      const s = ABOUT_SECTIONS.find((x) => x.labels.some((l) => `${x.area}/${x.id}/${l.id}` === t.labels[0]));
      expect(s, t.id).toBeDefined();
      expect(s!.tools, t.id).toContain(t.id);
    }
  });

  it("lists only shipped tools", () => {
    const ids = new Set<string>(TOOLS.map((t) => t.id));
    for (const s of ABOUT_SECTIONS) for (const t of s.tools) expect(ids, t).toContain(t);
  });

  it("gives every rule the diagram the boards draw for it (call 2: Decks-Phone, Other-Pages)", () => {
    const kinds = Object.fromEntries(ABOUT_RULE_IDS.map((id) => [id, ABOUT_RULES[id].diagram.kind]));
    expect(kinds).toEqual({
      autofill: "split",
      lock: "card-row",
      targets: "role-cell",
      intent: "bracket-medal",
      credits: "card-row",
      commit: "card-row",
      "one-copy": "card-row",
      "never-decklist": "card-row",
      replace: "card-row",
      "own-it": "deck-tile",
      prices: "buy-tag",
      proxy: "card-row",
      "friends-see": "chips",
      "hidden-deck": "deck-tile",
      invites: "card-row",
    });
    for (const id of ABOUT_RULE_IDS) expect(ABOUT_RULES[id].diagram.columns.length, id).toBeGreaterThan(0);
  });

  it("shows the one-copy rule's two short decks, the committed one and the draft behind it (allocate.ts: a brew reads what committed decks leave)", () => {
    const short = diagramParts("one-copy").filter((p) => p.part === "row" && p.tag?.tone === "short");
    expect(ABOUT_RULES["one-copy"].text).toContain("two of them show it short");
    expect(short.map((p) => (p.part === "row" ? p.name : ""))).toEqual(["Sai", "Zimone"]);
  });

  it("puts every row in one column 250px wide or more, never beside another column (Small items 3, item 1)", () => {
    for (const id of ABOUT_RULE_IDS) expect(narrowRowColumns(ABOUT_RULES[id].diagram), id).toEqual([]);
  });

  it("fails a row in a narrow column, an unsized one or one of two side by side, and passes a full-width foot", () => {
    const row: AboutDiagramPart = { part: "row", name: "Ghalta, Ancient Behemoth", tag: { text: "held longest ✓", tone: "muted" } };
    const tile: AboutDiagramPart = { part: "tile", name: "Ghalta", status: "Complete", colors: ["G"] };
    expect(narrowRowColumns({ kind: "card-row", columns: [{ w: 150, parts: [row] }] })).toEqual(["column 0 is 150px"]);
    expect(narrowRowColumns({ kind: "card-row", columns: [{ parts: [row] }] })).toEqual(["column 0 is unsized"]);
    expect(narrowRowColumns({ kind: "card-row", columns: [{ parts: [tile] }, { w: 250, parts: [row] }] }))
      .toEqual(["column 1 sits beside another"]);
    expect(narrowRowColumns({ kind: "card-row", columns: [{ parts: [tile] }], foot: [row] })).toEqual(["foot is unsized"]);
    expect(narrowRowColumns({ kind: "deck-tile", columns: [{ parts: [tile] }, { parts: [tile] }], foot: { w: 250, parts: [row] } }))
      .toEqual([]);
  });

  it("gates diagram parts only on registered switches", () => {
    // Retired switches stay a part's historical identity; `visible.ts` maps each to always-on.
    const RETIRED_IDENTITIES = ["DECK_TOKENS_ENABLED", "LINEUP_ENABLED", "FRIEND_DECKS_ENABLED", "COMMANDERS_PLACE_ENABLED", "HOME_FEED_ENABLED", "SOCIAL_GAMES_ENABLED", "SOCIAL_INVITES_ENABLED", "SOCIAL_WISHLIST_ENABLED"];
    for (const id of ABOUT_RULE_IDS) {
      const named = diagramParts(id).flatMap((p) => [p.switch, ...(p.part === "chips" ? p.chips.map((c) => c.switch) : [])]);
      for (const sw of named.filter((x): x is AboutLineSwitch => x != null).flatMap(switchesOf)) expect([...SWITCH_NAMES, ...RETIRED_IDENTITIES], id).toContain(sw);
    }
  });

  it("carries no em dash in any string", () => {
    const strings = [
      ...ABOUT_AREAS.flatMap((a) => [a.name, a.line]),
      ...ABOUT_SECTIONS.flatMap((s) => [s.name, s.sub, ...s.labels.flatMap((l) => [l.lead, l.rest])]),
      ...Object.values(ABOUT_RULES).map((r) => r.text),
      ...ABOUT_RULE_IDS.flatMap(diagramStrings),
      ABOUT_PAGE_STRINGS.goodToKnowSub,
    ];
    for (const s of strings) expect(s).not.toContain("—");
  });
});
