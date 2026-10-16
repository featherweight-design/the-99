import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The real results' chunk is mounted here: its rows are a portal owned by the layer, so a key or a drag on a row
// reaches the sheet only through the DOM, and that is what these tests hold.
const row = { oracleId: "o-1", name: "Sol Ring", imageUri: null, flavorName: null, owned: 1, decks: [], wishlist: false };
vi.mock("../../app/card-search-actions", () => ({
  searchAllCardsAction: vi.fn(async () => [row]),
  cardSignalsAction: vi.fn(async () => ({})),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection" }));

const { CardSearchRoot, CardSearchIcon } = await import("./card-search");

afterEach(cleanup);

async function openWithResults() {
  render(
    <CardSearchRoot userId="u1">
      <CardSearchIcon />
    </CardSearchRoot>,
  );
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Search all cards" })));
  await act(async () => fireEvent.change(screen.getByRole("combobox"), { target: { value: "sol" } }));
  return waitFor(() => screen.getByRole("option"), { timeout: 3000 });
}

describe("the sheet hears its portalled results", () => {
  it("Escape with focus on a result row clears the query", async () => {
    const option = await openWithResults();
    option.focus();
    await act(async () => fireEvent.keyDown(option, { key: "Escape" }));
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("");
  });

  it("dragging the results lowers the keyboard", async () => {
    const option = await openWithResults();
    screen.getByRole("combobox").focus();
    await act(async () => fireEvent.touchMove(option));
    // Off the field and onto the sheet itself, never the page, so Escape and Tab still reach the sheet.
    expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "Search all cards" }));
  });

  it("Tab from a focused row stays inside the sheet", async () => {
    const option = await openWithResults();
    option.focus();
    await act(async () => fireEvent.keyDown(option, { key: "Tab" }));
    expect(screen.getByRole("dialog", { name: "Search all cards" }).contains(document.activeElement)).toBe(true);
  });
});

describe("a row focus came back to keeps the list's keys", () => {
  it("↵ on a focused row opens its card (the sheet gives way)", async () => {
    const option = await openWithResults();
    option.focus();
    await act(async () => fireEvent.keyDown(option, { key: "Enter" }));
    expect(screen.queryByRole("dialog", { name: "Search all cards" })).toBeNull();
  });
});
