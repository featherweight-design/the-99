import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

const create = vi.hoisted(() => vi.fn());
const add = vi.hoisted(() => vi.fn());
vi.mock("../../../app/decks/precon-actions", () => ({ createDeckFromPrecon: create, addPreconToCollection: add }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), unstable_rethrow: (e: unknown) => { if (String((e as Error)?.message).startsWith("NEXT_REDIRECT")) throw e; } }));
let reverted: () => void = () => {};
vi.mock("../../collection/revert-confirm", () => ({ RevertConfirm: (p: { onReverted: () => void }) => { reverted = p.onReverted; return <div data-testid="revert" />; } }));
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
  render(<StartPrecon row={row} cards={100} body={99} illegal={[]} addedOn={addedOn} canOwn />);
  fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
};
const own = () => screen.getByRole("checkbox", { name: /I own this precon/ });

beforeEach(() => { create.mockReset(); add.mockReset(); window.sessionStorage.clear(); });

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
    open("2026-10-13T12:00:00.000Z");
    // A real date, not "Invalid Date": the note is given a timestamp, not a bare day.
    expect(screen.getByText(/^You added this precon on Oct 1[23], 2026$/)).toBeInTheDocument();
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

  it("reopened after a failed start, notes the add and repeats it under the same action id (never a second add)", async () => {
    add.mockResolvedValue(added);
    create.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByText("100 copies added")).toBeInTheDocument());
    // Close the receipt, then open the dialog again from the same page.
    fireEvent.click(screen.getByRole("button", { name: "Dismiss the receipt" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    expect(screen.getByText(/You added this precon on /)).toBeInTheDocument();
    expect(own()).not.toBeChecked();
    // The reader ticks it again anyway: it is the same write, so the ledger answers from the entry it already holds.
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[0][1]).toBe(add.mock.calls[1][1]);
  });

  it("offers no box when collection editing is off for the reader", () => {
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} addedOn="2026-10-13T09:00:00.000Z" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/You added this precon on /)).toBeNull();
    expect(screen.getByText("picked from the copies you hold")).toBeInTheDocument();
  });

  it("does not claim a rollback when the add THROWS, and retries it under the same id", async () => {
    add.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(added);
    create.mockResolvedValueOnce(undefined);
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t confirm the cards were added. Try again and they won’t be added twice."));
    expect(screen.getByRole("alert")).not.toHaveTextContent("Nothing was saved");
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(add.mock.calls[0][1]).toBe(add.mock.calls[1][1]);
  });

  it("forgets the add once the fallback receipt's Undo has reverted it, so a new tick is a new add", async () => {
    add.mockResolvedValue(added);
    create.mockRejectedValueOnce(new Error("boom"));
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByText("100 copies added")).toBeInTheDocument());
    const firstId = add.mock.calls[0][1];
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    act(() => reverted());
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    expect(screen.queryByText(/You added this precon on /)).toBeNull();
    create.mockResolvedValueOnce(undefined);
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(add.mock.calls[1][1]).not.toBe(firstId);
  });

  it("takes focus into the dialog when it becomes the receipt", async () => {
    add.mockResolvedValueOnce(added);
    create.mockRejectedValueOnce(new Error("boom"));
    open();
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByText("100 copies added")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("keeps the add's id across a reload when the add threw, and drops it once the outcome is known", async () => {
    add.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(added);
    create.mockResolvedValue(undefined);
    const first = render(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    const sent = add.mock.calls[0][1];
    expect(window.sessionStorage.getItem("the99:precon-add-attempt:Multiverse_FRC")).toBe(sent);
    // A reload: the page is gone, a new one mounts, and the retry carries the same id.
    first.unmount();
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(add.mock.calls[1][1]).toBe(sent);
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(window.sessionStorage.getItem("the99:precon-add-attempt:Multiverse_FRC")).toBeNull();
  });
});
