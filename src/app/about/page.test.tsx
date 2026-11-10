import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";

// /about (About visual PR 6a): the index of the six pages. The route takes no query: the Reference (`?tab=reference`), the
// Tools tab and the legacy gate's `?next=` are retired, so an old bookmark to any of them lands on the index.
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/flags/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestFlags: async () => ENV_VIEW };
});
vi.mock("../../lib/theme/server", () => ({ resolveTheme: async () => "amonkhet" }));

import AboutRoute from "./page";
import { LegalLinks } from "../../components/legal/legal-links";
import { AboutIndex, type IndexTile } from "../../components/about/pages/about-index";
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

const draw = async () => (await AboutRoute()) as El;
const tiles = async () => find(await draw(), AboutIndex)!.props.tiles as IndexTile[];

const DECK_SWITCHES = ["TUNING_ENABLED", "SOCIAL_FRIENDS_ENABLED", "ANALYSIS_TAB_ENABLED"];

beforeEach(() => {
  for (const s of DECK_SWITCHES) vi.stubEnv(s, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("/about, the legal links (launch A2)", () => {
  it("draws the Terms and Privacy line after the index", async () => {
    const root = await draw();
    expect(find(root, LegalLinks)).not.toBeNull();
    const kids = root.props.children as ReactNode[];
    const order = kids.filter(isValidElement).map((k) => (k as El).type);
    expect(order.indexOf(LegalLinks)).toBeGreaterThan(order.indexOf(AboutIndex));
  });
});

describe("/about, its captures follow a theme picked on the page (Copilot round 2)", () => {
  it("mounts ThemeRefresh with the drawn theme beside the index", async () => {
    const refresh = find(await draw(), ThemeRefresh);
    expect(refresh).not.toBeNull();
    expect(refresh!.props.drawnIn).toBe("amonkhet");
  });
});

describe("/about, the index (call 3)", () => {
  it("hands the index the reader's Report a problem switch", async () => {
    vi.stubEnv("FEEDBACK_ENABLED", "true");
    expect(find(await draw(), AboutIndex)!.props.reportable).toBe(true);
    vi.stubEnv("FEEDBACK_ENABLED", "false");
    expect(find(await draw(), AboutIndex)!.props.reportable).toBe(false);
    vi.unstubAllEnvs();
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
    // SOCIAL_FRIENDS_ENABLED is retired: unset, Friends still counts its three rules.
    vi.stubEnv("SOCIAL_FRIENDS_ENABLED", "");
    const counts = Object.fromEntries((await tiles()).map((x) => [x.area, x.count]));
    expect(counts.home).toBe("2 screens");
    expect(counts.friends).toBe("1 screen · 3 good to know");
  });
});
