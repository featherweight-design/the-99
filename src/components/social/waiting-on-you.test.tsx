// Waiting on you (menu and Home PR 7, board `Friends` 2a to 2c): absent when empty, a head counting every row, and a
// trade match drawn as its title, detail, time and a link to the friend's Spares tab; only an unseen row is marked.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WaitingOnYou } from "./waiting-on-you";
import { socialCopy } from "../../lib/copy/social";
import type { WaitingRow } from "../../lib/social/waiting";

const w = socialCopy.waiting;
const NOW = new Date("2026-10-22T12:00:00Z");
const ROW: WaitingRow = {
  key: "item:1", kind: "trade-match", createdAt: new Date(NOW.getTime() - 5 * 3_600_000), unseen: true,
  card: { oracleId: "ghalta", name: "Ghalta, Primal Hunger", imageUri: null },
  friend: { publicId: "pub-colin", displayName: "Colin", commander: null },
  pods: ["Thursday pod"],
};

afterEach(cleanup);

describe("WaitingOnYou", () => {
  it("is absent when nothing waits", () => {
    const { container } = render(<WaitingOnYou rows={[]} now={NOW} />);
    expect(container.innerHTML).toBe("");
  });

  it("heads the section with every row it shows, seen or not", () => {
    render(<WaitingOnYou rows={[ROW, { ...ROW, key: "item:2", unseen: false }]} now={NOW} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(w.head(2));
    expect(screen.getAllByTestId("waiting-row")).toHaveLength(2);
  });

  it("draws a trade match: title, detail with the pods, time, and a link to the friend's Spares tab", () => {
    render(<WaitingOnYou rows={[ROW]} now={NOW} />);
    const row = screen.getByTestId("waiting-row");
    expect(within(row).getByText(w.tradeTitle("Colin", "Ghalta, Primal Hunger"))).toBeTruthy();
    expect(within(row).getByText(w.tradeDetail("Colin", ["Thursday pod"]))).toBeTruthy();
    expect(within(row).getByText("5h ago")).toBeTruthy();
    const links = within(row).getAllByRole("link", { name: w.seeSpares("Colin") });
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l.getAttribute("href")).toBe("/friends/pub-colin");
  });

  it("marks an unseen row, and only that one", () => {
    render(<WaitingOnYou rows={[ROW, { ...ROW, key: "item:2", unseen: false }]} now={NOW} />);
    const [unseen, seen] = screen.getAllByTestId("waiting-row");
    expect(unseen.hasAttribute("data-unseen")).toBe(true);
    expect(within(unseen).getByText(w.unseen)).toBeTruthy();
    expect(seen.hasAttribute("data-unseen")).toBe(false);
    expect(within(seen).queryByText(w.unseen)).toBeNull();
  });
});
