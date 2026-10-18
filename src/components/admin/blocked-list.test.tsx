// Buying paused (admin plan A3): Let them buy opens the pending bar with the open disputes it leaves standing, and each
// answer is worded.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClearBlockResult } from "../../lib/payments/clear-block";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const clear = vi.fn<(id: string) => Promise<ClearBlockResult>>();
vi.mock("../../app/admin/payments/actions", () => ({ clearBlock: (id: string) => clear(id) }));

const { BlockedList } = await import("./blocked-list");
const ROWS = [
  { userId: "u_mara", name: "Mara K.", since: "Oct 15", openDisputes: 1 },
  { userId: "u_jun", name: "Jun", since: "Oct 2", openDisputes: 0 },
];
const pending = () => screen.queryByTestId("clear-pending");

beforeEach(() => {
  clear.mockReset();
  refresh.mockReset();
});

describe("BlockedList", () => {
  it("names the open disputes a clear leaves standing, and says nothing of them when none are open", () => {
    render(<BlockedList rows={ROWS} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Let them buy" })[0]);
    expect(pending()).toHaveTextContent("Saving lets Mara K. buy again. 1 dispute is still open, and nothing pauses buying again until a new one.");
    fireEvent.click(within(pending()!).getByRole("button", { name: "Undo" }));
    expect(pending()).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Let them buy" })[1]);
    expect(pending()).toHaveTextContent("Saving lets Jun buy again.");
  });

  it("clears the account it names, and words a clear, a repeat and a failure", async () => {
    clear.mockResolvedValueOnce({ ok: false, error: "failed" }).mockResolvedValueOnce({ ok: true, cleared: true });
    render(<BlockedList rows={ROWS} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Let them buy" })[0]);
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Let them buy" })));
    expect(within(pending()!).getByRole("alert")).toHaveTextContent("Couldn't clear the pause, so nothing changed.");
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Let them buy" })));
    expect(clear).toHaveBeenLastCalledWith("u_mara");
    expect(screen.getByRole("status")).toHaveTextContent("Mara K. can buy again.");
    expect(pending()).toBeNull();
  });

  it("says a lost reply may have cleared, and refreshes", async () => {
    clear.mockRejectedValueOnce(new Error("lost"));
    render(<BlockedList rows={ROWS} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Let them buy" })[1]);
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Let them buy" })));
    expect(within(pending()!).getByRole("alert")).toHaveTextContent("Lost touch with the server, so it may have cleared.");
    expect(refresh).toHaveBeenCalled();
  });
});
