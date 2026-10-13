// The card details modal is loaded on demand (card-detail-provider.tsx), and its code is WARMED so a
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
    await screen.findByRole("dialog");
    expect(pending).toBeNull();
  });
});
