import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getRankedList = vi.fn();
vi.mock("../../lib/recs/ranked-list", () => ({
  getRankedList: (userId: string) => getRankedList(userId),
}));

const { CommanderCount, CommanderCountFallback } = await import("./commander-count");

/** Async server component: await it, then render what it returned. */
async function renderCount(candidateCount: number) {
  getRankedList.mockResolvedValue({
    items: [],
    degraded: false,
    uniqueCardsRead: 0,
    candidateCount,
  });
  render(await CommanderCount({ userId: "user_1" }));
}

describe("CommanderCount", () => {
  it("reports the ranked list's candidate count", async () => {
    await renderCount(24);
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  // The stat sits next to "1,284 cards" in the same mono line, so an unseparated
  // four-figure count would be the only number on the row not grouped.
  it("groups thousands", async () => {
    await renderCount(1284);
    expect(screen.getByText("1,284")).toBeInTheDocument();
  });

  // An empty collection is a real answer, not a missing one — it must render the
  // zero rather than fall through to the streaming placeholder.
  it("renders zero rather than nothing when no commander is playable", async () => {
    await renderCount(0);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("holds an em dash while the count streams", () => {
    render(<CommanderCountFallback />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
