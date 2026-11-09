// The two vi.mock factories #2693 fixed, VERBATIM as they stood before it (`git show 7648ae09f^:<path>`): each read
// test-mutable state as it ran, so after Vitest 5 cached the first result every later case saw the first value and
// passed without testing what it claimed. `check:mock-factories` must report both, with the right variable.

/** src/components/cards/card-modal-warm.test.tsx: the factory counted `loads` and awaited `gate`. */
export const CARD_MODAL_WARM_BEFORE_2693 = `// The card details modal is loaded on demand (card-detail-provider.tsx), and its code is WARMED so a
// press never waits on it: at idle once the provider has mounted, and on intent. Each case counts
// how often the modal's module is evaluated, which is once, the first time anything asks for it.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let loads = 0;
// Holds the modal's code back until a case lets it through; open unless a case closes it.
let gate: Promise<void> = Promise.resolve();
vi.mock("./card-modal", async (importOriginal) => {
  loads += 1;
  await gate;
  return importOriginal();
});
vi.mock("../../app/collection/actions", () => ({}));

beforeEach(() => {
  vi.resetModules();
  loads = 0;
  gate = Promise.resolve();
});
// Unmounted before the stubs go: the provider cancels its idle callback on unmount.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The modal's real code is imported and transformed on the first ask: 0.8 to 2s on an idle machine, so
// the 1s default wait fails on a loaded CI runner and passes on a re-run.
const COLD_IMPORT_MS = 15_000;
// The test's own limit must outlast that wait, or it fails first with a 5s timeout.
vi.setConfig({ testTimeout: COLD_IMPORT_MS + 5000 });

const settle = () => new Promise((r) => setTimeout(r, 50));

describe("warming the card details modal", () => {
  it("loads nothing until the provider mounts", async () => {
    await import("./card-detail-provider");
    await settle();
    expect(loads).toBe(0);
  });

  it("loads it at idle once the provider has mounted", async () => {
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal("cancelIdleCallback", (id: number) => clearTimeout(id));
    const { CardDetailProvider } = await import("./card-detail-provider");
    render(<CardDetailProvider fetchCard={async () => null}><p>page</p></CardDetailProvider>);
    await vi.waitFor(() => expect(loads).toBe(1));
  });

  it("loads it on intent, before any idle time", async () => {
    // An idle callback that never comes: only the intent can load it here.
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");
    function Intent() {
      const { prefetch } = useCardDetail();
      useEffect(() => { prefetch("oracle-1"); }, [prefetch]);
      return null;
    }
    render(<CardDetailProvider fetchCard={async () => null} prefetchCard={async () => null}><Intent /></CardDetailProvider>);
    await vi.waitFor(() => expect(loads).toBe(1));
  });

  it("shows a press that lands before the code as pending, until the modal draws", async () => {
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    let release!: () => void;
    gate = new Promise((r) => { release = r; });
    const { CardDetailProvider, useCardDetail, cardDetailCopy } = await import("./card-detail-provider");
    const card = {
      oracleId: "oracle-1", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null,
      keywords: [], rarity: "uncommon", colorIdentity: [], imageUri: null, printings: [], preferredPrinting: null,
      owned: [], proxiedBy: [],
    } as unknown as BrowseCard;
    let pending: string | null = null;
    function Press() {
      const { open, pendingOracleId } = useCardDetail();
      pending = pendingOracleId;
      return <button type="button" onClick={() => open("oracle-1")}>open</button>;
    }
    render(<CardDetailProvider fetchCard={async () => card}><Press /></CardDetailProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    await settle();
    expect(pending).toBe("oracle-1");
    expect(screen.getByText(cardDetailCopy.loading)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    release();
    await screen.findByRole("dialog", undefined, { timeout: COLD_IMPORT_MS });
    expect(pending).toBeNull();
  });
});
`;

/** src/lib/health/check.test.ts: the factory read `stub.initThrows`, which one case flips. */
export const HEALTH_CHECK_BEFORE_2693 = `import { describe, expect, it, vi } from "vitest";

// The db client throws at module init without DATABASE_URL.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown>, initThrows: false }));
vi.mock("../../db", () => {
  if (stub.initThrows) throw new Error("DATABASE_URL is not set");
  return { db: stub.db };
});
vi.mock("./migration-journal", () => ({ shippedMigrationTags: ["0000_a", "0001_b"] }));

import { checkHealth } from "./check";

describe("checkHealth", () => {
  it("reports ok when the ledger matches the shipped tags", async () => {
    stub.db.execute = async () => ({ rows: [{ applied: 2 }] });
    expect(await checkHealth()).toEqual({
      status: "ok",
      applied: 2,
      expected: 2,
      latestApplied: "0001_b",
      pending: [],
    });
  });

  it("reports the pending tag when the database is behind", async () => {
    stub.db.execute = async () => ({ rows: [{ applied: 1 }] });
    expect(await checkHealth()).toMatchObject({ status: "behind", pending: ["0001_b"] });
  });

  it("treats an empty result as nothing applied rather than throwing", async () => {
    stub.db.execute = async () => ({ rows: [] });
    expect(await checkHealth()).toMatchObject({ status: "behind", applied: 0 });
  });

  it("reports error without echoing the database error", async () => {
    // A connection failure message can carry host and database name, and this
    // endpoint is unauthenticated — the payload must not grow a details field.
    stub.db.execute = async () => {
      throw new Error("connect ECONNREFUSED db.internal:5432 password=hunter2");
    };
    const report = await checkHealth();
    expect(report).toEqual({ status: "error" });
    expect(JSON.stringify(report)).not.toContain("hunter2");
  });

  it("reports error when the db client cannot initialize", async () => {
    stub.initThrows = true;
    vi.resetModules();
    try {
      expect(await checkHealth()).toEqual({ status: "error" });
    } finally {
      stub.initThrows = false;
      vi.resetModules();
    }
  });
});
`;
