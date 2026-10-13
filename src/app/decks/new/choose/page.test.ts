// The results page's decorations fail soft: a failed vocabulary read or card-chip read above the
// results' own recovery boundary draws the page (themes by their slugs, no card chip), never a
// route error that would bypass *Search failed* and its Retry. The form still needs its vocabulary.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const stub = vi.hoisted(() => ({ themes: vi.fn(), chip: vi.fn(), allowance: vi.fn(), read: vi.fn(), decks: vi.fn(), page: vi.fn(), env: null as NodeJS.ProcessEnv | null }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
// The reader's resolved switches: the environment, so `vi.stubEnv` still sets them.
vi.mock("../../../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: async () => stub.env ?? ENV_VIEW };
});
vi.mock("../../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => true }));
vi.mock("../../../../lib/intake/search", () => ({ loadIntakeThemes: stub.themes, loadIntakeCatalog: vi.fn() }));
vi.mock("../../../../lib/intake/rows", () => ({ loadCardChip: stub.chip, loadResultsPage: stub.page }));
vi.mock("../../../../lib/model/allowance", () => ({ readAllowance: stub.allowance }));
vi.mock("../../../../lib/intake/run-store", async (actual) => ({
  ...(await actual<typeof import("../../../../lib/intake/run-store")>()),
  loadTheRead: stub.read,
}));
vi.mock("../../../../lib/intake/the-read-load", () => ({ loadReadDecks: stub.decks }));

const { default: ChoosePage } = await import("./page");
const { ReadPanel, ReadScope } = await import("../../../../components/intake/read-panel");
const { ReadAsBar } = await import("../../../../components/intake/read-as-bar");
const { DimWhileReading } = await import("../../../../components/intake/read-panel");
const { Suspense } = await import("react");
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
    stub.read.mockResolvedValue({ kind: "none" });
    stub.decks.mockResolvedValue([]);
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

  it("mounts the read's panel only with words, unread with no r, and quotes the words under You wrote", async () => {
    stub.themes.mockResolvedValue([]);
    const none = await ChoosePage({ searchParams: Promise.resolve({ v: "results", t: "horrors" }) });
    expect(find(none, ReadAsBar)!.props.offer).toBeNull();
    expect(find(none, ReadScope)!.props.initial).toBeNull();
    const page = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: " scary horrors " }) });
    const bar = find(page, ReadAsBar)!;
    expect(bar.props.words).toBe("scary horrors");
    const panel = find(bar.props.offer, ReadPanel)!;
    expect(panel.props).toMatchObject({ readId: null, served: null, repeat: false });
    expect(panel.props.standing).toMatchObject({ used: 0, limit: 3 });
    expect(find(page, ReadScope)!.props.initial).toBe("unread");
    expect(stub.read).not.toHaveBeenCalled();
  });

  it("hands the panel the read r names, the repeat mark, and whether the player has decks once it is done", async () => {
    stub.themes.mockResolvedValue([]);
    const R = "0000cccc-0000-4000-8000-000000000001";
    stub.read.mockResolvedValue({ kind: "done", result: { picks: [], pool: 9, weighed: 3 } });
    stub.decks.mockResolvedValue([{ commanderOracleId: "x", commander: "Omnath, Locus of Creation", partner: null, themes: [] }]);
    const page = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", r: R, rr: "1" }) });
    const panel = find(find(page, ReadAsBar)!.props.offer, ReadPanel)!;
    expect(panel.props).toMatchObject({ readId: R, served: { kind: "done" }, repeat: true, hasDecks: true });
    expect(find(page, ReadScope)!.props.initial).toBe("done");
    // A failed read of the state draws it as running: the panel asks again itself.
    stub.read.mockRejectedValue(new Error("db down"));
    const pending = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", r: R }) });
    expect(find(find(pending, ReadAsBar)!.props.offer, ReadPanel)!.props.served).toEqual({ kind: "pending", phase: null });
  });

  it("keys the results' Suspense on the answers, not on the read, so a retry keeps the list on screen", async () => {
    stub.themes.mockResolvedValue([]);
    stub.read.mockResolvedValue({ kind: "pending", phase: "shortlist" });
    const keyOf = (page: unknown) => (find(page, Suspense) as unknown as { key: string }).key;
    const unread = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", t: "horrors" }) });
    const reading = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", t: "horrors", r: "0000cccc-0000-4000-8000-000000000003" }) });
    const other = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", t: "dinosaurs" }) });
    expect(keyOf(reading)).toBe(keyOf(unread));
    expect(keyOf(other)).not.toBe(keyOf(unread));
  });

  it("hands the results' search the reader's resolved env, not the environment", async () => {
    // The search's claim reads decide NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from it: a dropped
    // argument reads the environment, which has both the other way.
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    stub.env = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
    try {
      stub.themes.mockResolvedValue([]);
      stub.page.mockReset().mockResolvedValue({ order: "fit", tooNarrow: false, card: null, rows: [], hasMore: false, total: 0 });
      const page = await ChoosePage({ searchParams: Promise.resolve({ v: "results", t: "dinosaurs" }) });
      // The streamed search under the Suspense, run as React would run it.
      const results = find(page, Suspense)!.props.children as { type: (p: unknown) => Promise<unknown>; props: unknown };
      await results.type(results.props);
      expect(stub.page.mock.calls[0][4] === stub.env).toBe(true);
    } finally {
      stub.env = null;
      vi.unstubAllEnvs();
    }
  });

  describe("the list while a read is pending (entry path)", () => {
    const R = "0000cccc-0000-4000-8000-000000000002";
    // Whether the search under the results' Suspense is told to hold its rows back for the loading state.
    const held = (page: unknown) => (find(page, Suspense)!.props.children as { props: { hold: unknown } }).props.hold !== null;

    it("holds the loading state, undimmed, when the form started the read", async () => {
      stub.themes.mockResolvedValue([]);
      stub.read.mockResolvedValue({ kind: "pending", phase: "shortlist" });
      const page = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", r: R, rf: "1" }) });
      expect(held(page)).toBe(true);
      expect(find(page, DimWhileReading)!.props.hold).toBe(true);
    });

    it("keeps the dimmed free list under the panel when the read was started from the results", async () => {
      stub.themes.mockResolvedValue([]);
      stub.read.mockResolvedValue({ kind: "pending", phase: "shortlist" });
      const page = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", r: R }) });
      expect(held(page)).toBe(false);
      expect(find(page, DimWhileReading)!.props.hold).toBe(false);
    });

    it("draws the list once the form's read is no longer pending", async () => {
      stub.themes.mockResolvedValue([]);
      for (const settled of [{ kind: "failed" }, { kind: "stopped" }, { kind: "nothing", result: null }, { kind: "done", result: { picks: [], pool: 3, weighed: 3 } }]) {
        stub.read.mockResolvedValue(settled);
        const page = await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", r: R, rf: "1" }) });
        expect(held(page), settled.kind).toBe(false);
      }
    });
  });

  it("reads the credit standing only after the read's state, which can reap and refund an abandoned read", async () => {
    stub.themes.mockResolvedValue([]);
    const order: string[] = [];
    stub.read.mockImplementation(async () => { await new Promise((r) => setTimeout(r, 5)); order.push("read"); return { kind: "failed" }; });
    stub.allowance.mockImplementation(async () => { order.push("allowance"); return STANDING; });
    await ChoosePage({ searchParams: Promise.resolve({ v: "results", w: "scary", r: "0000aaaa-0000-4000-8000-0000000000aa" }) });
    expect(order).toEqual(["read", "allowance"]);
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
