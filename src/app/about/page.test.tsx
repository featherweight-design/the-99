import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";

// /about in its discovery shape (R2·6b): Tools by default, the Reference at `?tab=reference`, `loadToolFits` asked only
// for the deck tools this reader's switches draw, the visit mounted on the Reference only, and the legacy gate's way
// back kept for a reader it sent.
const m = vi.hoisted(() => ({
  loadToolFits: vi.fn<(userId: string, env: NodeJS.ProcessEnv, tools: readonly string[]) => Promise<object>>(async () => ({})),
  hasSyncAnchor: vi.fn(async () => false),
  seen: { version: 14, ids: [] as string[] },
  everyEntry: false,
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: async () => ENV_VIEW };
});
vi.mock("../../lib/about/read", () => ({ aboutSeen: async () => m.seen, markAboutVisited: async () => {} }));
vi.mock("../../lib/model/allowance", () => ({ dailyLimitFor: async () => 5 }));
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
import { GateDismiss } from "../../components/about/gate-dismiss";
import { TOOLS } from "../../lib/discovery/tools";

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
const tabs = async (query: Record<string, string | string[]> = {}) => find(await draw(query), AboutTabs)!.props;

const DECK_SWITCHES = [
  "PROPOSED_CUTS_ENABLED", "TUNING_ENABLED", "MANA_BALANCE_ENABLED", "SWAP_TOOLS_ENABLED", "SOCIAL_FRIENDS_ENABLED",
  "SOCIAL_GAMES_ENABLED", "ANALYSIS_TAB_ENABLED",
];

beforeEach(() => {
  vi.clearAllMocks();
  m.seen = { version: 14, ids: [] };
  m.everyEntry = false;
  vi.stubEnv("ABOUT_SHEET_ENABLED", "true");
  for (const s of DECK_SWITCHES) vi.stubEnv(s, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("/about, the tab", () => {
  it("opens on Tools with no ?tab, and on anything but reference", async () => {
    expect((await tabs()).initial).toBe("tools");
    expect((await tabs({ tab: "settings" })).initial).toBe("tools");
    expect((await tabs({ tab: ["reference", "reference"] })).initial).toBe("tools");
  });

  it("opens on the Reference at ?tab=reference", async () => {
    expect((await tabs({ tab: "reference" })).initial).toBe("reference");
  });

  it("hands AboutTabs both panels, counting the cards and the entries they draw", async () => {
    const props = await tabs();
    const panels = props.panels as Record<string, El>;
    const groups = panels.tools.props.groups as { cards: unknown[] }[];
    const screens = panels.reference.props.screens as { entries: unknown[] }[];
    expect(props.counts).toEqual({
      tools: groups.reduce((n, g) => n + g.cards.length, 0),
      reference: screens.reduce((n, s) => n + s.entries.length, 0),
    });
    expect((props.counts as { reference: number }).reference).toBeGreaterThan(0);
  });
});

describe("/about, the fits (E10)", () => {
  it("asks loadToolFits for the deck tools whose switches are on, and no other", async () => {
    vi.stubEnv("ANALYSIS_TAB_ENABLED", "true");
    vi.stubEnv("TUNING_ENABLED", "true");
    await draw();
    expect(m.loadToolFits).toHaveBeenCalledTimes(1);
    expect(m.loadToolFits.mock.calls[0]![2]).toEqual(["top-off", "suggested-changes"]);
  });

  it("with every deck tool's switch off, asks only for Top off, which has none", async () => {
    await draw();
    expect(m.loadToolFits.mock.calls[0]![2]).toEqual(["top-off"]);
  });

  it("decides by the tool's own switch, even where its entry is drawn", async () => {
    m.everyEntry = true;
    await draw();
    expect(m.loadToolFits.mock.calls[0]![2]).toEqual(["top-off"]);
  });

  it("hands the fits to the showcase, so a fitting deck is the card's Try it", async () => {
    m.loadToolFits.mockResolvedValueOnce({ "top-off": { decks: [{ id: "d1", name: "Gishath" }] } } as never);
    const panels = (await tabs()).panels as Record<string, El>;
    const cards = (panels.tools.props.groups as { cards: { id: string; state: { kind: string; href?: string } }[] }[]).flatMap((g) => g.cards);
    expect(cards.find((c) => c.id === "top-off")!.state).toMatchObject({ kind: "deck", href: "/decks/d1?tool=top-off" });
  });

  it("reads the sync base only with Collection Sync on", async () => {
    vi.stubEnv("COLLECTION_SYNC_ENABLED", "");
    await draw();
    expect(m.hasSyncAnchor).not.toHaveBeenCalled();
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    vi.stubEnv("COLLECTION_SYNC_ENABLED", "true");
    await draw();
    expect(m.hasSyncAnchor).toHaveBeenCalledWith("u1");
  });

  it("every tool it asks for is a deck tool", async () => {
    for (const s of DECK_SWITCHES) vi.stubEnv(s, "true");
    await draw();
    const asked = m.loadToolFits.mock.calls[0]![2] as string[];
    expect(asked.length).toBeGreaterThan(1);
    for (const id of asked) expect(TOOLS.find((t) => t.id === id)!.lands.kind).toBe("deck");
  });
});

describe("/about, the visit (R2 gap 10)", () => {
  it("records the visit on the Reference only, never mounted with Tools", async () => {
    const props = await tabs();
    const once = props.onceShown as Record<string, El>;
    expect(Object.keys(once)).toEqual(["reference"]);
    expect(once.reference.type).toBe(RecordVisit);
    // Each panel as the page builds it, not the `{tools, reference}` record, which is no element and would always miss.
    const panels = Object.values(props.panels as Record<string, El>);
    expect(panels).toHaveLength(2);
    for (const panel of panels) expect(find(panel, RecordVisit)).toBeNull();
  });

  it("acknowledges a behind reader's visit, and lists what's new for the Reference", async () => {
    m.seen = { version: 1, ids: [] };
    const props = await tabs({ tab: "reference" });
    expect(((props.onceShown as Record<string, El>).reference.props as { behind: boolean }).behind).toBe(true);
    const whatsNew = (props.panels as Record<string, El>).reference.props.whatsNew as { id: string }[];
    expect(whatsNew.length).toBeGreaterThan(0);
  });

  it("lists nothing new for a first-run reader", async () => {
    m.seen = { version: 0, ids: [] };
    const props = await tabs();
    expect((props.panels as Record<string, El>).reference.props.whatsNew).toEqual([]);
  });
});

describe("/about, the legacy gate's way back", () => {
  it("with the sheet switch off, a behind reader sent with ?next= gets Got it, on the Reference", async () => {
    vi.stubEnv("ABOUT_SHEET_ENABLED", "");
    m.seen = { version: 1, ids: [] };
    const page = await draw({ next: "/decks" });
    expect(find(page, GateDismiss)!.props.destination).toBe("/decks");
    expect(find(page, AboutTabs)!.props.initial).toBe("reference");
    expect(find(page, AboutTabs)!.props.onceShown).toBeUndefined();
  });

  it("draws no dismiss with the sheet switch on, with no ?next=, or with a repeated one", async () => {
    m.seen = { version: 1, ids: [] };
    expect(find(await draw({ next: "/decks" }), GateDismiss)).toBeNull();
    vi.stubEnv("ABOUT_SHEET_ENABLED", "");
    expect(find(await draw(), GateDismiss)).toBeNull();
    expect(find(await draw({ next: ["/a", "/b"] }), GateDismiss)).toBeNull();
  });
});
