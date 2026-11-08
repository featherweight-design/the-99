// The first import's commanders line (landing PR 7b): the count from the ranked list's one definition, singular and plural, a
// secondary 44px press to the Commanders place, and nothing for a failed read or a zero.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ranked = vi.hoisted(() => vi.fn(async (): Promise<unknown> => ({ items: [{}, {}, {}] })));
vi.mock("../../lib/flags/request", () => ({ requestFlags: async () => ({}) }));
vi.mock("../../lib/recs/ranked-list", () => ({ getRankedList: ranked }));

const { CommandersLine, CommandersLineView } = await import("./commanders-line");

beforeEach(() => ranked.mockClear());

describe("CommandersLine", () => {
  it("states the count read from the ranked list, and links to the commanders at 44px", async () => {
    render(await CommandersLine({ userId: "u1" }));
    expect(screen.getByText("3 commanders you can build from your cards")).toBeTruthy();
    const link = screen.getByRole("link", { name: "See your commanders" });
    expect(link).toHaveAttribute("href", "/commanders");
    expect(link.className).toContain("min-h-[44px]");
  });
  it("says one commander, singular", () => {
    render(<CommandersLineView count={1} />);
    expect(screen.getByText("1 commander you can build from your cards")).toBeTruthy();
  });
  it("draws nothing when the ranking cannot be read, or holds none, rather than a zero", async () => {
    ranked.mockRejectedValueOnce(new Error("down"));
    expect(await CommandersLine({ userId: "u1" })).toBeNull();
    ranked.mockResolvedValueOnce({ items: [] });
    expect(await CommandersLine({ userId: "u1" })).toBeNull();
  });
});
