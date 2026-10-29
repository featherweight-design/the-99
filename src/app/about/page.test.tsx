import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";

// /about (About visual PR 6a): the index of the six pages by default and at `?tab=tools`, the Reference still at
// `?tab=reference` with `loadToolFits` asked only for the deck tools this reader's switches draw and the visit mounted
// on it, and the legacy gate's way back kept for a reader it sent.
const m = vi.hoisted(() => ({
  loadToolFits: vi.fn<(userId: string, env: NodeJS.ProcessEnv, tools: readonly string[]) => Promise<object>>(async () => ({})),
  hasSyncAnchor: vi.fn(async () => false),
  dailyLimitFor: vi.fn(async () => 5),
  seen: { version: 14, ids: [] as string[] },
  everyEntry: false,
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: async () => ENV_VIEW };
});
vi.mock("../../lib/about/read", () => ({ aboutSeen: async () => m.seen, markAboutVisited: async () => {} }));
vi.mock("../../lib/model/allowance", () => ({ dailyLimitFor: m.dailyLimitFor }));
vi.mock("../../lib/theme/server", () => ({ resolveTheme: async () => "amonkhet" }));
vi.mock("../../lib/collection/sync-base", () => ({ hasSyncAnchor: m.hasSyncAnchor }));
vi.mock("../../lib/discovery/fits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/discovery/fits")>()),
  loadToolFits: m.loadToolFits,
}));
// `everyEntry` draws every entry whatever its switch, so a test can tell the tool's own switch from its entry's.
vi.mock("../../lib/about/visible", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/about/visible")>();
  const { aboutEntries } = await import("../../lib/copy/about-entries");
  return {
    ...real,
    visibleEntries: (env: NodeJS.ProcessEnv) => (m.everyEntry ? aboutEntries.map((e) => real.resolveEntry(e, env)) : real.visibleEntries(env)),
  };
});
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: async () => [{ n: 2 }] }) }) } }));

import AboutRoute from "./page";
import { AboutTabs } from "../../components/about/tools/about-tabs";
import { RecordVisit } from "../../components/about/record-visit";
import { LegalLinks } from "../../components/legal/legal-links";
import { AboutIndex, type IndexTile } from "../../components/about/pages/about-index";
import { TOOLS } from "../../lib/discovery/tools";
import { ThemeRefresh } from "../../components/about/pages/theme-refresh";

type El = ReactElement<Record<string, unknown>>;

function find(node: ReactNode, type: unknown): El | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = find(n, type);
      if (hit) return hit;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  const el = node as El;
  if (el.type === type) return el;
  return find(el.props.children as ReactNode, type);
}

const draw = async (query: Record<string, string | string[]> = {}) =>
  (await AboutRoute({ searchParams: Promise.resolve(query) })) as El;
const tabs = async (query: Record<string, string | string[]> = { tab: "reference" }) => find(await draw(query), AboutTabs)!.props;
const tiles = async (query: Record<string, string | string[]> = {}) => find(await draw(query), AboutIndex)!.props.tiles as IndexTile[];

const DECK_SWITCHES = [
  "PROPOSED_CUTS_ENABLED", "TUNING_ENABLED", "MANA_BALANCE_ENABLED", "SWAP_TOOLS_ENABLED", "SOCIAL_FRIENDS_ENABLED",
  "SOCIAL_GAMES_ENABLED", "ANALYSIS_TAB_ENABLED",
];

beforeEach(() => {
  vi.clearAllMocks();
  m.seen = { version: 14, ids: [] };
  m.everyEntry = false;
  for (const s of DECK_SWITCHES) vi.stubEnv(s, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("/about, the legal links (launch A2)", () => {
  it("draws the Terms and Privacy line after the index and after the Reference", async () => {
    for (const [query, type] of [[{}, AboutIndex], [{ tab: "reference" }, AboutTabs]] as const) {
      const root = await draw(query);
      expect(find(root, LegalLinks)).not.toBeNull();
      const kids = root.props.children as ReactNode[];
      const order = kids.filter(isValidElement).map((k) => (k as El).type);
      expect(order.indexOf(LegalLinks)).toBeGreaterThan(order.indexOf(type));
    }
  });
});

describe("/about, its captures follow a theme picked on the page (Copilot round 2)", () => {
  it("mounts ThemeRefresh with the drawn theme beside the index and beside the Reference", async () => {
    for (const query of [{}, { tab: "reference" }] as Record<string, string>[]) {
      const refresh = find(await draw(query), ThemeRefresh);
      expect(refresh, JSON.stringify(query)).not.toBeNull();
      expect(refresh!.props.drawnIn).toBe("amonkhet");
    }
  });
});

describe("/about, the index (call 3)", () => {
  it("draws the index with no ?tab, at the retired ?tab=tools, and at anything but reference", async () => {
    for (const query of [{}, { tab: "tools" }, { tab: "settings" }, { tab: ["reference", "reference"] }] as Record<string, string | string[]>[]) {
      const page = await draw(query);
      expect(find(page, AboutIndex), JSON.stringify(query)).not.toBeNull();
      expect(find(page, AboutTabs)).toBeNull();
    }
  });

  it("reads no fits, no credit limit and no visit for the index", async () => {
    await draw();
    expect(m.loadToolFits).not.toHaveBeenCalled();
    expect(m.dailyLimitFor).not.toHaveBeenCalled();
    expect(find(await draw(), RecordVisit)).toBeNull();
  });

  it("draws six tiles in page order, each linking its page with a capture at each width", async () => {
    const t = await tiles();
    expect(t.map((x) => x.area)).toEqual(["home", "collection", "commanders", "decks", "shopping", "friends"]);
    for (const x of t) {
      expect(x.phone?.src, x.area).toMatch(/\/about\/pages\/[a-z-]+\/phone\//);
      expect(x.desktop?.src, x.area).toMatch(/\/about\/pages\/[a-z-]+\/desktop\//);
    }
  });

  it("counts the screens and the rules the reader is drawn (visibleSections)", async () => {
    vi.stubEnv("SOCIAL_FRIENDS_ENABLED", "");
    vi.stubEnv("FRIEND_DECKS_ENABLED", "");
    vi.stubEnv("SOCIAL_INVITES_ENABLED", "");
    const off = Object.fromEntries((await tiles()).map((x) => [x.area, x.count]));
    expect(off.home).toBe("2 screens");
    expect(off.friends).toBe("1 screen");
    vi.stubEnv("SOCIAL_FRIENDS_ENABLED", "true");
    vi.stubEnv("FRIEND_DECKS_ENABLED", "true");
    vi.stubEnv("SOCIAL_INVITES_ENABLED", "true");
    const on = Object.fromEntries((await tiles()).map((x) => [x.area, x.count]));
    expect(on.friends).toBe("1 screen · 3 good to know");
  });
});

describe("/about, the Reference (until PR 7b)", () => {
  it("draws the Reference at ?tab=reference, counting its entries", async () => {
    const props = await tabs();
    const panel = props.panel as El;
    const screens = panel.props.screens as { entries: unknown[] }[];
    expect(props.count).toBe(screens.reduce((n, s) => n + s.entries.length, 0));
    expect(props.count as number).toBeGreaterThan(0);
  });
});

describe("/about, the fits (E10)", () => {
  it("asks loadToolFits for the deck tools whose switches are on, and no other", async () => {
    vi.stubEnv("ANALYSIS_TAB_ENABLED", "true");
    vi.stubEnv("TUNING_ENABLED", "true");
    await tabs();
    expect(m.loadToolFits).toHaveBeenCalledTimes(1);
    expect(m.loadToolFits.mock.calls[0]![2]).toEqual(["top-off", "suggested-changes"]);
  });

  it("with every deck tool's switch off, asks only for Top off, which has none", async () => {
    await tabs();
    expect(m.loadToolFits.mock.calls[0]![2]).toEqual(["top-off"]);
  });

  it("decides by the tool's own switch, even where its entry is drawn", async () => {
    m.everyEntry = true;
    await tabs();
    expect(m.loadToolFits.mock.calls[0]![2]).toEqual(["top-off"]);
  });

  it("reads the sync base only with Collection Sync on", async () => {
    vi.stubEnv("COLLECTION_SYNC_ENABLED", "");
    await tabs();
    expect(m.hasSyncAnchor).not.toHaveBeenCalled();
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    vi.stubEnv("COLLECTION_SYNC_ENABLED", "true");
    await tabs();
    expect(m.hasSyncAnchor).toHaveBeenCalledWith("u1");
  });

  it("every tool it asks for is a deck tool", async () => {
    for (const s of DECK_SWITCHES) vi.stubEnv(s, "true");
    await tabs();
    const asked = m.loadToolFits.mock.calls[0]![2] as string[];
    expect(asked.length).toBeGreaterThan(1);
    for (const id of asked) expect(TOOLS.find((t) => t.id === id)!.lands.kind).toBe("deck");
  });
});

describe("/about, the visit (R2 gap 10)", () => {
  it("records the visit on the Reference, beside it rather than inside its panel", async () => {
    const page = await draw({ tab: "reference" });
    expect(find(page, RecordVisit)).not.toBeNull();
    expect(find(find(page, AboutTabs)!.props.panel as ReactNode, RecordVisit)).toBeNull();
  });

  it("acknowledges a behind reader's visit, and lists what's new for the Reference", async () => {
    m.seen = { version: 1, ids: [] };
    const page = await draw({ tab: "reference" });
    expect((find(page, RecordVisit)!.props as { behind: boolean }).behind).toBe(true);
    const whatsNew = (find(page, AboutTabs)!.props.panel as El).props.whatsNew as { id: string }[];
    expect(whatsNew.length).toBeGreaterThan(0);
  });

  it("lists nothing new for a first-run reader", async () => {
    m.seen = { version: 0, ids: [] };
    expect(((await tabs()).panel as El).props.whatsNew).toEqual([]);
  });

  // Review round 1: the Reference writes legacy ids (`locked-cards`); Home's banner checks unit keys
  // (`decks/your-deck/lock`), so the visit acknowledges the unit keys its write covers too.
  // A behind reader's visit acknowledges the write's own answer (pinned in actions.test.ts), so the page hands it no
  // forecast; a current reader's writes nothing and acknowledges the unit keys their state already covers.
  it("hands a behind reader's visit no forecast: what it acknowledges is the write's answer", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "true");
    m.seen = { version: 14, ids: [] };
    const props = find(await draw({ tab: "reference" }), RecordVisit)!.props as {
      behind: boolean; shown: string[]; drawn: string[]; answered: string[];
    };
    expect(props.behind).toBe(true);
    expect(props.shown).toContain("locked-cards");
    expect(props.answered).toEqual([]);
  });

  it("hands a current reader's visit the unit keys their state covers", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "true");
    m.seen = { version: 16, ids: ["locked-cards", "how-it-works"] };
    const props = find(await draw({ tab: "reference" }), RecordVisit)!.props as { behind: boolean; answered: string[] };
    expect(props.behind).toBe(false);
    expect(props.answered).toContain("decks/your-deck/lock");
  });
});

describe("/about, the legacy gate's way in (retired, About visual PR 6b)", () => {
  it("draws the index for a behind reader arriving with ?next=, with no Got it and no Reference", async () => {
    m.seen = { version: 1, ids: [] };
    for (const next of ["/decks", ["/a", "/b"]]) {
      const page = await draw({ next });
      expect(find(page, AboutIndex)).not.toBeNull();
      expect(find(page, AboutTabs)).toBeNull();
      expect(find(page, RecordVisit)).toBeNull();
    }
  });
});
