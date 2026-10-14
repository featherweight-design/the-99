import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

const create = vi.hoisted(() => vi.fn());
const start = vi.hoisted(() => vi.fn());
vi.mock("../../../app/decks/precon-actions", () => ({ createDeckFromPrecon: create, startPreconOwned: start }));
const account = vi.hoisted(() => ({ id: "user_A" as string | null }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: account.id }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), unstable_rethrow: (e: unknown) => { if (String((e as Error)?.message).startsWith("NEXT_REDIRECT")) throw e; } }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../../shell/pending-reporter", () => ({ PendingReporter: () => null }));
import { StartPrecon } from "./start-precon";

const row: PreconRow = {
  fileName: "Multiverse_FRC", name: "Multiverse Reforged", setCode: "FRC", releaseDate: "2026-01-01", twinName: null,
  commanders: [{ oracleId: "c", name: "Jace", imageUri: null, colorIdentity: ["U"] }],
  identity: ["U"], owned: 0, of: 80, unmapped: 0, built: [],
};
// A started deck answers with the redirect, which the dialog rethrows for the router; there is no router here, so the
// page simply stays put, as it does while the navigation is under way.
const redirect = () => new Promise(() => {});
const KEY = "the99:precon-add-attempt:user_A:Multiverse_FRC";

const open = (addedOn: string | null = null) => {
  render(<StartPrecon row={row} cards={100} body={99} illegal={[]} addedOn={addedOn} canOwn />);
  fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
};
const own = () => screen.getByRole("checkbox", { name: /I own this precon/ });
const press = () => fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));

beforeEach(() => { create.mockReset(); start.mockReset(); window.sessionStorage.clear(); account.id = "user_A"; });

describe("Start dialog: I own this precon", () => {
  it("draws the box unticked, and starts the deck without touching the collection", async () => {
    create.mockResolvedValueOnce(undefined);
    open();
    expect(own()).not.toBeChecked();
    expect(screen.getByText("this precon’s copies")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start the deck" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith("Multiverse_FRC", "Multiverse Reforged"));
    expect(start).not.toHaveBeenCalled();
  });

  it("names a previous add and stays unticked", () => {
    open("2026-10-13T12:00:00.000Z");
    // A real date, not "Invalid Date": the note is given a timestamp, not a bare day.
    expect(screen.getByText(/^You added this precon on Oct 1[23], 2026$/)).toBeInTheDocument();
    expect(own()).not.toBeChecked();
  });

  it("says the same printings fact ticked or not: the deck takes the precon's own copies either way", () => {
    open();
    fireEvent.click(own());
    expect(screen.getByText("this precon’s copies")).toBeInTheDocument();
  });


  it("adds the box and starts the deck as ONE action, never the plain create", async () => {
    start.mockImplementationOnce(redirect);
    open();
    fireEvent.click(own());
    press();
    await waitFor(() => expect(start).toHaveBeenCalledWith("Multiverse_FRC", "Multiverse Reforged", expect.stringMatching(/^[0-9a-f-]{36}$/)));
    expect(create).not.toHaveBeenCalled();
  });

  it("says nothing was saved when the start is refused, and a retry is a new action", async () => {
    start.mockResolvedValueOnce({ ok: false, reason: "failed" }).mockImplementationOnce(redirect);
    open();
    fireEvent.click(own());
    press();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t add the cards. Nothing was saved."));
    expect(create).not.toHaveBeenCalled();
    press();
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1][2]).not.toBe(start.mock.calls[0][2]);
  });

  it("does not claim a rollback when the start THROWS, and retries it under the same id", async () => {
    start.mockRejectedValueOnce(new Error("network")).mockImplementationOnce(redirect);
    open();
    fireEvent.click(own());
    press();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Try again and they won’t be added twice."));
    press();
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[0][2]).toBe(start.mock.calls[1][2]);
  });

  it("repeats a lost start under the same id after the dialog is closed and reopened", async () => {
    start.mockRejectedValueOnce(new Error("network")).mockImplementationOnce(redirect);
    open();
    fireEvent.click(own());
    press();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    press();
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[0][2]).toBe(start.mock.calls[1][2]);
  });

  it("offers no box when collection editing is off for the reader", () => {
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} addedOn="2026-10-13T09:00:00.000Z" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/You added this precon on /)).toBeNull();
    expect(screen.getByText("this precon’s copies")).toBeInTheDocument();
  });


  it("keeps a lost start's id across a reload", async () => {
    start.mockRejectedValueOnce(new Error("network")).mockImplementationOnce(redirect);
    const first = render(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    press();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    const sent = start.mock.calls[0][2];
    expect(window.sessionStorage.getItem(KEY)).toBe(sent);
    // A reload: the page is gone, a new one mounts, and the retry carries the same id.
    first.unmount();
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    press();
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1][2]).toBe(sent);
  });

  it("never lends one account's unresolved id to another account signing in on the same tab", async () => {
    start.mockRejectedValueOnce(new Error("network")).mockImplementationOnce(redirect);
    const first = render(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    press();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    const aId = start.mock.calls[0][2];
    first.unmount();
    account.id = "user_B";
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    press();
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1][2]).not.toBe(aId);
  });

  it("starts the chosen edition's own box, under its own id", async () => {
    start.mockRejectedValueOnce(new Error("network")).mockImplementation(redirect);
    const view = render(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn addFileName="MultiverseCE_FRC" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    press();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(start.mock.calls[0][0]).toBe("MultiverseCE_FRC");
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    // The reader switches to Regular: its box is its own entry, so the start is a new action.
    view.rerender(<StartPrecon row={row} cards={100} body={99} illegal={[]} canOwn addFileName={row.fileName} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Start with this precon" })[0]);
    fireEvent.click(own());
    press();
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1][0]).toBe(row.fileName);
    expect(start.mock.calls[1][2]).not.toBe(start.mock.calls[0][2]);
  });
});
