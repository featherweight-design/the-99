import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SWITCH_NAMES } from "../../../lib/switches/registry";
import { ABOUT_AREA_IDS, ABOUT_SECTIONS } from "../../../lib/copy/about-pages";

// /about/[area] (About visual PR 3): an unknown area is a 404; a known one draws its sections in order, each at its own
// id, from the reader's switches (Review Focus 2: a label switched off is gone from the list and the pins, and the
// numbers close up) and in the reader's theme.
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));

const m = vi.hoisted(() => ({
  env: {} as NodeJS.ProcessEnv,
  theme: "amonkhet",
  requestSwitchEnv: vi.fn<(userId: string) => Promise<NodeJS.ProcessEnv>>(async () => ({}) as NodeJS.ProcessEnv),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  seen: { version: 16, ids: [] as string[] },
  asked: [] as (readonly string[] | undefined)[],
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../lib/theme/server", () => ({ resolveTheme: async () => m.theme }));
vi.mock("../../../lib/about/read", () => ({ aboutSeen: async () => m.seen }));
// The card input reads the database; a reader with one deck that fits every deck tool stands in for it.
vi.mock("../../../lib/discovery/showcase-input", async () => {
  const { SWITCH_FLAGS } = await import("../../../lib/switches/flags");
  const { DECK_TOOLS } = await import("../../../lib/discovery/fits");
  return {
    switchesOn: (e: NodeJS.ProcessEnv) => (n: keyof typeof SWITCH_FLAGS) => SWITCH_FLAGS[n](e),
    loadCardInput: async (_userId: string, e: NodeJS.ProcessEnv, _perf?: unknown, only?: readonly string[]) => (m.asked.push(only), {
      isOn: (n: keyof typeof SWITCH_FLAGS) => SWITCH_FLAGS[n](e),
      fits: Object.fromEntries(DECK_TOOLS.map((t) => [t, { decks: [{ id: "d1", name: "Ghalta" }] }])),
      deckCount: 1,
      hasSyncBase: true,
      place: true,
    }),
  };
});
vi.mock("../../../lib/about/back-read", () => ({
  ownDeckName: vi.fn(async (_userId: string, deckId: string | null) => (deckId === "0b6c2f4e-1111-4222-8333-444455556666" ? "Sai" : null)),
}));
vi.mock("next/navigation", () => ({ notFound: m.notFound, usePathname: () => "/about/decks", useRouter: () => ({ refresh: () => {} }) }));

import AboutAreaRoute from "./page";
import { AreaPage, type AreaSection } from "../../../components/about/pages/area-page";
import type { Landable } from "../../../lib/discovery/page-tools";

type El = ReactElement<{
  area: string;
  sections: AreaSection[];
  landable: Landable;
  initialLit: string | null;
  back: { from: string; screen: string } | null;
}>;
const draw = async (area: string, query: Record<string, string | string[]> = {}) =>
  (await AboutAreaRoute({ params: Promise.resolve({ area }), searchParams: Promise.resolve(query) })) as El;

beforeEach(() => {
  vi.clearAllMocks();
  m.seen = { version: 16, ids: [] };
  m.env = ALL_ON;
  m.theme = "amonkhet";
  m.requestSwitchEnv.mockImplementation(async () => m.env);
});

describe("/about/[area]", () => {
  it("404s an area that is not one of the six", async () => {
    for (const area of ["nope", "Decks", "toString", ""]) {
      await expect(draw(area)).rejects.toThrow("NEXT_NOT_FOUND");
    }
    expect(m.notFound).toHaveBeenCalledTimes(4);
  });

  it("draws each of the six areas' sections, in order, decided from the reader's own switches", async () => {
    for (const area of ABOUT_AREA_IDS) {
      const el = await draw(area);
      expect(isValidElement(el) && el.type).toBe(AreaPage);
      expect(el.props.area).toBe(area);
      expect(el.props.sections.map((s) => s.id)).toEqual(ABOUT_SECTIONS.filter((s) => s.area === area).map((s) => s.id));
    }
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("u1");
  });

  it("gives each section its id, and the On this page chips jump to them", async () => {
    const html = renderToStaticMarkup(await draw("decks"));
    for (const s of ABOUT_SECTIONS.filter((x) => x.area === "decks")) {
      expect(html).toContain(`id="${s.id}"`);
      expect(html).toContain(`href="#${s.id}"`);
    }
    expect(html).toContain("On this page");
  });

  it("a label switched off for the reader has no line and no pin, and the numbers close up (Review Focus 2)", async () => {
    const yourDeck = async () => (await draw("decks")).props.sections.find((s) => s.id === "your-deck")!;
    expect(renderToStaticMarkup(await draw("decks"))).toContain("Lock cards");
    const on = await yourDeck();
    m.env = env({ ...(ALL_ON as Record<string, string>), NEVER_CUT_ENABLED: "off" });
    const off = await yourDeck();
    for (const width of ["phone", "desktop"] as const) {
      expect(on[width].labels.map((l) => l.key)).toContain("decks/your-deck/lock");
      expect(off[width].labels.map((l) => l.key)).not.toContain("decks/your-deck/lock");
      expect(off[width].shots.flatMap((s) => s.pins).map((p) => p.key)).not.toContain("decks/your-deck/lock");
      expect(off[width].labels.map((l) => l.n)).toEqual(off[width].labels.map((_, i) => i + 1));
      expect(off[width].labels).toHaveLength(on[width].labels.length - 1);
    }
    // Nothing of it reaches the page, at either width.
    const html = renderToStaticMarkup(await draw("decks"));
    expect(html).not.toContain("decks/your-deck/lock");
    expect(html).not.toContain("Lock cards");
  });

  it("draws the reader's theme's captures, phone and desktop, never one width's in the other's place", async () => {
    m.theme = "kamigawa";
    const el = await draw("decks");
    // The page is told the theme it was drawn in, so a theme picked later asks the server again (ThemeRefresh).
    expect((el.props as { theme?: string }).theme).toBe("kamigawa");
    const [s] = el.props.sections;
    expect(s.phone.shots[0].shot.src).toMatch(/^\/about\/pages\/kamigawa\/phone\//);
    expect(s.desktop.shots[0].shot.src).toMatch(/^\/about\/pages\/kamigawa\/desktop\//);
  });

  it("draws each section's Try it from the tools whose labels it draws, Show me aimed at the label (call 6)", async () => {
    const analysis = (await draw("decks")).props.sections.find((s) => s.id === "analysis")!;
    expect(analysis.tools.map((c) => c.card.id)).toEqual(["suggested-changes", "proposed-cuts", "mana-balance"]);
    const cuts = analysis.tools.find((c) => c.card.id === "proposed-cuts")!;
    expect(cuts.card.showMe).toBe("/about/decks?lit=decks%2Fanalysis%2Fcuts#analysis");
    // The press is still Try it, unchanged.
    expect(cuts.card.state).toMatchObject({ kind: "deck", href: "/decks/d1?tool=proposed-cuts" });
    // Each width's own picture: the 390 crop on a phone, the tool's desktop crop from md.
    expect(cuts.phone?.src).toMatch(/^\/about\/shots\//);
    expect(cuts.desktop?.src).toBe("/about/pages/amonkhet/desktop/tools/proposed-cuts.webp");
    const html = renderToStaticMarkup(await draw("decks"));
    expect(html).toContain('href="/about/decks?lit=decks%2Fanalysis%2Fcuts#analysis"');
    expect(html).toContain("Show me ›");
    expect(html).not.toContain("How it works ›");
  });

  it("reads fits only for the tools the area draws, and none for an area that draws none", async () => {
    m.requestSwitchEnv.mockResolvedValue(ALL_ON);
    m.asked.length = 0;
    const decks = await draw("decks");
    const drawn = decks.props.sections.flatMap((s) => s.tools.map((t) => t.card.id)).sort();
    expect(m.asked).toHaveLength(1);
    expect([...(m.asked[0] ?? [])].sort()).toEqual(drawn);
    for (const area of ["home", "collection", "commanders", "shopping", "friends"]) {
      m.asked.length = 0;
      const page = await draw(area);
      const ids = page.props.sections.flatMap((s) => s.tools.map((t) => t.card.id));
      if (ids.length === 0) expect(m.asked).toEqual([]);
      else expect([...(m.asked[0] ?? [])].sort()).toEqual([...ids].sort());
    }
  });

  it("a switch off for the reader takes the tool card with its label (Review Focus 2)", async () => {
    const cards = async () => (await draw("decks")).props.sections.flatMap((s) => s.tools.map((c) => c.card.id));
    expect(await cards()).toContain("proposed-cuts");
    m.env = env({ ...(ALL_ON as Record<string, string>), PROPOSED_CUTS_ENABLED: "off" });
    expect(await cards()).not.toContain("proposed-cuts");
    expect(renderToStaticMarkup(await draw("decks"))).not.toContain('data-tool-card="proposed-cuts"');
  });

  it("hands over the labels this page can land on, New only while the reader has not been told, and lands `?lit=` on first paint", async () => {
    const lit = "decks/analysis/cuts";
    const fresh = await draw("decks", { lit });
    expect(fresh.props.initialLit).toBe(lit);
    expect(fresh.props.landable[lit]).toEqual({ isNew: true, section: "analysis" });
    const drawn = fresh.props.sections.flatMap((s) => [...s.desktop.labels, ...s.phone.labels, ...s.rules].map((l) => l.key));
    expect(Object.keys(fresh.props.landable).sort()).toEqual([...new Set(drawn)].sort());
    const freshHtml = renderToStaticMarkup(fresh);
    expect(freshHtml).toContain("data-about-new");
    expect(freshHtml).toContain('data-about-landing-card="proposed-cuts"');
    m.seen = { version: 16, ids: [lit] };
    const told = await draw("decks", { lit });
    expect(told.props.landable[lit]).toEqual({ isNew: false, section: "analysis" });
    const html = renderToStaticMarkup(told);
    expect(html).not.toContain("data-about-new");
    expect(html).not.toContain("data-about-landing-card");
  });

  it("lights nothing on first paint for a label this page does not draw", async () => {
    for (const lit of ["friends/friends/add", "decks/analysis/nope", "toString", ["decks/analysis/cuts", "decks/analysis/cuts"]]) {
      const el = await draw("decks", { lit });
      expect(el.props.initialLit).toBeNull();
    }
    m.env = env({ ...(ALL_ON as Record<string, string>), PROPOSED_CUTS_ENABLED: "off" });
    const off = await draw("decks", { lit: "decks/analysis/cuts" });
    expect(off.props.initialLit).toBeNull();
    expect(off.props.landable).not.toHaveProperty(["decks/analysis/cuts"]);
    expect((await draw("decks")).props.initialLit).toBeNull();
  });
});

describe("/about/[area], reached by the ? (PR 6a)", () => {
  it("draws the back bar for a validated from, named for its screen", async () => {
    expect((await draw("collection", { from: "/collection/replace" })).props.back).toEqual({ from: "/collection/replace", screen: "Upload a file" });
    expect((await draw("decks", { from: "/credits", lit: "rule/credits" })).props.back).toEqual({ from: "/credits", screen: "Credits" });
    expect((await draw("decks")).props.back).toBeNull();
  });

  it("names a deck by the reader's own deck's name, else by its section", async () => {
    const own = "/decks/0b6c2f4e-1111-4222-8333-444455556666";
    expect((await draw("decks", { from: own })).props.back).toEqual({ from: own, screen: "Sai" });
    const other = "/decks/7a0e0000-0000-4000-8000-000000000001";
    expect((await draw("decks", { from: other })).props.back).toEqual({ from: other, screen: "Your deck" });
  });

  it("draws no bar for a from that could leave the app, or names nothing", async () => {
    for (const from of ["//evil.example", "https://evil.example/x", "/\\evil", "javascript:alert(1)", "/admin", ["/a", "/b"]]) {
      expect((await draw("collection", { from })).props.back, JSON.stringify(from)).toBeNull();
    }
  });

  it("lands a rule the ? names, lit, with no New tag", async () => {
    const el = await draw("decks", { from: "/credits", lit: "rule/credits" });
    expect(el.props.initialLit).toBe("rule/credits");
    expect(el.props.landable["rule/credits"]).toEqual({ isNew: false, section: "analysis" });
    const html = renderToStaticMarkup(el);
    expect(html).toMatch(/data-rule="rule\/credits" data-lit=""/);
    expect(html).not.toContain("data-about-new");
  });

  it("a label the ? names that the reader is not told about draws no New tag and no card under it (A1)", async () => {
    const html = renderToStaticMarkup(await draw("decks", { from: "/decks/new", lit: "decks/your-decks/new-deck" }));
    expect(html).toContain('data-about-label="decks/your-decks/new-deck"');
    expect(html).not.toContain("data-about-new");
    expect(html).not.toContain("data-about-landing-card");
  });

  it("a unit switched off for the reader lands on its section with nothing lit (Review Focus 2)", async () => {
    m.env = env({ ...ALL_ON, HOME_FEED_ENABLED: "" });
    const el = await draw("home", { from: "/settings", lit: "home/whats-new/lead" });
    expect(el.props.initialLit).toBeNull();
    expect(el.props.landable).not.toHaveProperty(["home/whats-new/lead"]);
    expect(el.props.sections.map((s) => s.id)).toContain("whats-new");
    expect(el.props.back).toEqual({ from: "/settings", screen: "Settings" });
  });
});
