// A mounted on-demand view retries its own failed download, with no press to prompt it: the fits views
// are switched to inside the modal, and no control there would fetch them again
// (card-detail-provider.tsx, `onDemand`). Shown on the modal, which loads through the same wrapper. In
// its own file because it needs the modal's module unloaded, and a module a file has loaded stays loaded.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";

// How many of the next loads fail, as a dropped chunk download would.
let failures = 0;
vi.mock("./card-modal", async (importOriginal) => {
  if (failures > 0) {
    failures -= 1;
    throw new Error("chunk failed");
  }
  return importOriginal();
});
vi.mock("../../app/collection/actions", () => ({}));

describe("a mounted view whose download failed", () => {
  // The real modal module, loaded once before the test and outside its clock, so the attempt that lands resolves it
  // from the module cache. Loaded inside the test, it is a cold import of the whole modal: about 5.5s on a busy
  // machine, past the test's own timeout, which is why this failed locally every run while CI passed it.
  beforeAll(async () => {
    await vi.importActual("./card-modal");
  }, 60_000);

  it("tries again on its own and draws when an attempt lands", async () => {
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");
    // Two loads fail, as dropped chunk downloads would; whichever attempt comes after them lands.
    failures = 2;
    const card = {
      oracleId: "oracle-1", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null,
      keywords: [], rarity: "uncommon", colorIdentity: [], imageUri: null, printings: [], preferredPrinting: null,
      owned: [], proxiedBy: [],
    } as unknown as BrowseCard;
    function Press() {
      const { open } = useCardDetail();
      return <button type="button" onClick={() => open("oracle-1")}>open</button>;
    }
    render(<CardDetailProvider fetchCard={async () => card}><Press /></CardDetailProvider>);
    // The wrapper's backoff (1s, then 2s) runs on a fake clock. A load settles on the event loop, which the fake
    // clock does not step, so each step also yields a real tick. No press follows the first: only the wrapper's own
    // retries can reach the attempt that lands.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "open" })));
      const step = async (ms: number) => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(ms);
          await new Promise((r) => setImmediate(r));
        });
      };
      await step(0);
      expect(document.querySelector("[role=dialog]")).toBeNull();
      // Through the backoff until the modal mounts: both failed loads are spent first.
      for (let i = 0; i < 60 && !document.querySelector("[role=dialog]"); i++) await step(250);
      expect(failures).toBe(0);
    } finally {
      vi.useRealTimers();
    }
    // Its arrival runs on real frames, so it is read on the real clock.
    await screen.findByRole("dialog");
  });
});
