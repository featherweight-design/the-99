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
const { IntakeForm } = await import("../../../../components/intake/intake-form");

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

  it("ignores the retired card answer on a results address: no chip read, no card in the search (F1)", async () => {
    stub.themes.mockResolvedValue([]);
    stub.chip.mockClear();
    await ChoosePage({ searchParams: Promise.resolve({ v: "results", t: "dinosaurs", a: CARD }) });
    expect(stub.chip).not.toHaveBeenCalled();
  });

  it("draws no Look deeper panel on the results: the read starts at the submit now (rework plan PR 3)", async () => {
    stub.themes.mockResolvedValue([]);
    stub.chip.mockResolvedValue(null);
    const page = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary horrors" }) });
    expect(find(page, DeeperLook)).toBeNull();
  });

  it("hands the form the player's credit standing, and none when that read fails (F7)", async () => {
    stub.themes.mockResolvedValue([]);
    const form = find(await ChoosePage({ searchParams: Promise.resolve({ w: "scary" }) }), IntakeForm)!;
    expect(form.props.standing).toMatchObject({ used: 0, limit: 3, paused: null, ownerShare: false });
    stub.allowance.mockRejectedValue(new Error("ledger down"));
    const plain = find(await ChoosePage({ searchParams: Promise.resolve({ w: "scary" }) }), IntakeForm)!;
    expect(plain.props.standing).toBeNull();
  });

  it("sends an old GET submit to the form with its answers, never starting a read", async () => {
    await expect(ChoosePage({ searchParams: Promise.resolve({ v: "submit", w: "scary", t: "horrors" }) }))
      .rejects.toThrow(/NEXT_REDIRECT/);
    try {
      await ChoosePage({ searchParams: Promise.resolve({ v: "submit", w: "scary", t: "horrors" }) });
    } catch (e) {
      const digest = String((e as { digest?: string }).digest);
      expect(digest).toContain("/decks/new/choose?");
      expect(digest).not.toContain("v=results");
    }
  });

  it("still fails the form, which cannot draw its picker without the vocabulary", async () => {
    stub.themes.mockRejectedValue(new Error("catalog down"));
    await expect(ChoosePage({ searchParams: Promise.resolve({}) })).rejects.toThrow("catalog down");
  });
});
