// A dropped download of the card details modal's code is not final: the next press fetches it again,
// and the modal draws when that attempt lands (card-detail-provider.tsx, `onDemand`). In its own file
// because it needs the modal's module unloaded, and a module a test file has loaded once stays loaded.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

// The modal's real code is imported and transformed on the first ask: 0.8 to 2s on an idle machine, so
// the 1s default wait fails on a loaded CI runner and passes on a re-run.
const COLD_IMPORT_MS = 15_000;
// The test's own limit must outlast that wait, or it fails first with a 5s timeout.
vi.setConfig({ testTimeout: COLD_IMPORT_MS + 5000 });

const settle = () => new Promise((r) => setTimeout(r, 50));

describe("a failed download of the card details modal", () => {
  it("retries a failed download on the next press of the same card", async () => {
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    // The press's own fetch fails, and so does the retry the modal makes as it mounts.
    failures = 2;
    const { CardDetailProvider, useCardDetail, cardDetailCopy } = await import("./card-detail-provider");
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
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(cardDetailCopy.loading)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    await screen.findByRole("dialog", undefined, { timeout: COLD_IMPORT_MS });
  });
});
