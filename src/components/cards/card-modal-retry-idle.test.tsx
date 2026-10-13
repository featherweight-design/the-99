// A mounted on-demand view retries its own failed download, with no press to prompt it: the fits views
// are switched to inside the modal, and no control there would fetch them again
// (card-detail-provider.tsx, `onDemand`). Shown on the modal, which loads through the same wrapper. In
// its own file because it needs the modal's module unloaded, and a module a file has loaded stays loaded.
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

describe("a mounted view whose download failed", () => {
  it("tries again on its own and draws when an attempt lands", async () => {
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    // The press's own fetch fails, and so does the attempt the wrapper makes as it mounts.
    failures = 2;
    const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");
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
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(failures).toBe(0);
    await screen.findByRole("dialog", undefined, { timeout: 2500 });
  });
});
