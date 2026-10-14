import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

const create = vi.hoisted(() => vi.fn());
const add = vi.hoisted(() => vi.fn());
vi.mock("../../../app/decks/precon-actions", () => ({ createDeckFromPrecon: create, addPreconToCollection: add }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), unstable_rethrow: (e: unknown) => { if (String((e as Error)?.message).startsWith("NEXT_REDIRECT")) throw e; } }));
vi.mock("../../collection/revert-confirm", () => ({ RevertConfirm: () => <div data-testid="revert" /> }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../../shell/pending-reporter", () => ({ PendingReporter: () => null }));
import { StartPrecon } from "./start-precon";

const row: PreconRow = {
  fileName: "Multiverse_FRC", name: "Multiverse Reforged", setCode: "FRC", releaseDate: "2026-01-01", twinName: null,
  commanders: [{ oracleId: "c", name: "Jace", imageUri: null, colorIdentity: ["U"] }],
  identity: ["U"], owned: 0, of: 80, unmapped: 0, built: [],
};
const ID = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";
const added = { ok: true, entryId: ID, cards: 99, copies: 100, foil: 2, placed: [], tokens: { marked: 9, names: ["Soldier"] } };

const open = (addedOn: string | null = null) => {
  render(<StartPrecon row={row} cards={100} body={99} illegal={[]} addedOn={addedOn} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
};
const own = () => screen.getByRole("checkbox", { name: /I own this precon/ });

beforeEach(() => { create.mockReset(); add.mockReset(); });

describe("Start dialog: I own this precon", () => {
  it("draws the box unticked, and starts the deck without touching the collection", async () => {
    create.mockResolvedValueOnce(undefined);
    open();
    expect(own()).not.toBeChecked();
    expect(screen.getByText("picked from the copies you hold")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith("Multiverse_FRC", "Multiverse Reforged", undefined));
    expect(add).not.toHaveBeenCalled();
  });

  it("names a previous add and stays unticked", () => {
    open("2026-10-13T09:00:00.000Z");
    expect(screen.getByText(/You added this precon on /)).toBeInTheDocument();
    expect(own()).not.toBeChecked();
  });

  it("says the printings come from the added copies once ticked", () => {
    open();
    fireEvent.click(own());
    expect(screen.getByText("the box’s own, from the copies you add")).toBeInTheDocument();
  });

  it("adds first, then creates the deck carrying the add's entry", async () => {
    const order: string[] = [];
    add.mockImplementationOnce(async () => { order.push("add"); return added; });
    create.mockImplementationOnce(async () => { order.push("create"); });
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(order).toEqual(["add", "create"]);
    expect(add).toHaveBeenCalledWith("Multiverse_FRC", expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(create).toHaveBeenCalledWith("Multiverse_FRC", "Multiverse Reforged", ID);
  });

  it("starts no deck when the add is refused, and says nothing was saved", async () => {
    add.mockResolvedValueOnce({ ok: false, reason: "failed" });
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t add the cards. Nothing was saved."));
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps the add and shows its receipt when the deck fails to start after it", async () => {
    add.mockResolvedValueOnce(added);
    create.mockRejectedValueOnce(new Error("boom"));
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByText("The cards are in your collection, but we couldn’t start the deck.")).toBeInTheDocument());
    expect(screen.getByText("100 copies added")).toBeInTheDocument();
    expect(screen.getByText("9 tokens marked owned")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing was saved/)).toBeNull();
  });

  it("reuses one action id when a refused add is retried", async () => {
    add.mockResolvedValueOnce({ ok: false, reason: "failed" }).mockResolvedValueOnce(added);
    create.mockResolvedValueOnce(undefined);
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(add.mock.calls[0][1]).toBe(add.mock.calls[1][1]);
  });
});
