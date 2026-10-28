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
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../lib/theme/server", () => ({ resolveTheme: async () => m.theme }));
vi.mock("next/navigation", () => ({ notFound: m.notFound, usePathname: () => "/about/decks", useRouter: () => ({ refresh: () => {} }) }));

import AboutAreaRoute from "./page";
import { AreaPage, type AreaSection } from "../../../components/about/pages/area-page";

type El = ReactElement<{ area: string; sections: AreaSection[] }>;
const draw = async (area: string) => (await AboutAreaRoute({ params: Promise.resolve({ area }) })) as El;

beforeEach(() => {
  vi.clearAllMocks();
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
});
