// The results page's decorations fail soft: a failed vocabulary read or card-chip read above the
// results' own recovery boundary draws the page (themes by their slugs, no card chip), never a
// route error that would bypass *Search failed* and its Retry. The form still needs its vocabulary.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ themes: vi.fn(), chip: vi.fn(), allowance: vi.fn(), read: vi.fn() }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => true }));
vi.mock("../../../../lib/intake/search", () => ({ loadIntakeThemes: stub.themes, loadIntakeCatalog: vi.fn() }));
vi.mock("../../../../lib/intake/rows", () => ({ loadCardChip: stub.chip, loadResultsPage: vi.fn() }));
vi.mock("../../../../lib/model/allowance", () => ({ readAllowance: stub.allowance }));
vi.mock("../../../../lib/intake/run-store", async (actual) => ({
  ...(await actual<typeof import("../../../../lib/intake/run-store")>()),
  loadOwnRead: stub.read,
}));

const { default: ChoosePage } = await import("./page");
const { DeeperLook } = await import("../../../../components/intake/deeper-look");

/** The first element of `type` anywhere in a rendered tree, props included (the look is a prop). */
function find(node: unknown, type: unknown): { props: Record<string, unknown> } | null {
  if (Array.isArray(node)) {
    for (const n of node) { const hit = find(n, type); if (hit) return hit; }
    return null;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return null;
  const el = node as { type: unknown; props: Record<string, unknown> };
  if (el.type === type) return el;
  for (const v of Object.values(el.props ?? {})) { const hit = find(v, type); if (hit) return hit; }
  return null;
}
const CARD = "0000aaaa-0000-4000-8000-000000000001";

const STANDING = { used: 0, limit: 3, nextAt: null, reopensAt: null, paused: null, ownerShare: false };

describe("the choose page", () => {
  beforeEach(() => {
    stub.allowance.mockResolvedValue(STANDING);
    stub.read.mockResolvedValue(null);
  });

  it("draws the results when the vocabulary and the card chip both fail to read", async () => {
    stub.themes.mockRejectedValue(new Error("catalog down"));
    stub.chip.mockRejectedValue(new Error("prices down"));
    await expect(ChoosePage({ searchParams: Promise.resolve({ v: "results", t: "dinosaurs", a: CARD }) })).resolves.toBeTruthy();
  });

  it("hands the look only a card the search applied, so a stale a never sets aside the card a read finds", async () => {
    stub.themes.mockResolvedValue([]);
    stub.chip.mockResolvedValue(null);
    const stale = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "big lizards", a: CARD }) });
    expect((find(stale, DeeperLook)!.props.params as { card: string | null }).card).toBeNull();
    // A chip read that FAILED says nothing about the card, which stays the answer.
    stub.chip.mockRejectedValue(new Error("prices down"));
    const unknown = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "big lizards", a: CARD }) });
    expect((find(unknown, DeeperLook)!.props.params as { card: string | null }).card).toBe(CARD);
  });

  it("draws a settled look when the credit read fails, closing only its press", async () => {
    const { wordsHash } = await import("../../../../lib/intake/run-store");
    stub.themes.mockResolvedValue([]);
    stub.chip.mockResolvedValue(null);
    stub.allowance.mockRejectedValue(new Error("ledger down"));
    const words = "big lizards";
    stub.read.mockResolvedValue({
      kind: "read",
      read: { chips: [], notUsed: [], notUnderstood: [] },
      wordsHash: wordsHash(words, { budgetDollars: null, bracket: null }),
    });
    const done = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: words, r: "00000000-0000-4000-8000-000000000002" }) });
    const look = find(done, DeeperLook)!;
    expect(look.props.settled).toBe("read");
    expect(look.props.standing).toBeNull();
    // Nothing settled: with no standing there is no press to offer, so no panel.
    const fresh = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: words }) });
    expect(find(fresh, DeeperLook)).toBeNull();
  });

  it("still fails the form, which cannot draw its picker without the vocabulary", async () => {
    stub.themes.mockRejectedValue(new Error("catalog down"));
    await expect(ChoosePage({ searchParams: Promise.resolve({}) })).rejects.toThrow("catalog down");
  });
});
