// The check-in sheet (flyer trial PR 6; Survey-Phone S1 to S4, Survey-Desktop S5 and S6): Send dim until a rating, uses
// pick any, the pod answer single and clearable, Send writes the answers, Sent replaces the form, a failure is the toast
// with Try again and keeps the answers, Not now snoozes, the ✕ ends.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const dismiss = vi.fn();
vi.mock("../../app/check-in-actions", () => ({
  sendCheckIn: (...a: unknown[]) => send(...a),
  dismissCheckIn: (...a: unknown[]) => dismiss(...a),
}));

import { checkInCopy as copy, reportCopy } from "../../lib/copy/report";
import { CheckInForm } from "./check-in-form";

beforeEach(() => {
  send.mockReset();
  dismiss.mockReset();
  dismiss.mockResolvedValue({ ok: true });
});

const sendButton = () => screen.getByTestId("check-in-send") as HTMLButtonElement;

describe("CheckInForm", () => {
  it("draws the intro, the three questions and the note, with a dim Send", () => {
    render(<CheckInForm onClose={() => {}} />);
    expect(screen.getByText(copy.intro)).toBeTruthy();
    expect(screen.getByText(copy.rating)).toBeTruthy();
    for (const label of [...copy.ratingEnds, ...copy.useOptions, ...copy.podOptions]) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(copy.pickAny)).toBeTruthy();
    expect(screen.getByText(copy.hint)).toBeTruthy();
    expect(screen.getByPlaceholderText(copy.morePlaceholder)).toBeTruthy();
    expect(sendButton().disabled).toBe(true);
  });

  it("enables Send on the rating alone", () => {
    render(<CheckInForm onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("check-in-rating-4"));
    expect(sendButton().disabled).toBe(false);
    expect(screen.getByTestId("check-in-rating-4").getAttribute("aria-checked")).toBe("true");
  });

  it("sends the rating, the uses picked, the pod answer and the note, then shows the thanks", async () => {
    send.mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<CheckInForm onClose={onClose} />);
    fireEvent.click(screen.getByTestId("check-in-rating-4"));
    fireEvent.click(screen.getByRole("button", { name: "Shopping" }));
    fireEvent.click(screen.getByRole("button", { name: "Decks" }));
    fireEvent.click(screen.getByRole("button", { name: "Already have" }));
    fireEvent.change(screen.getByTestId("check-in-note"), { target: { value: "Love it" } });
    fireEvent.click(sendButton());
    await waitFor(() => expect(screen.getByTestId("check-in-sent")).toBeTruthy());
    expect(send).toHaveBeenCalledWith({ rating: 4, uses: ["Shopping", "Decks"], pod: "Already have", note: "Love it" });
    expect(screen.getByText(copy.sentTitle)).toBeTruthy();
    expect(screen.getByText(copy.sentBody)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: reportCopy.close }).find((b) => b.textContent === reportCopy.close)!);
    expect(onClose).toHaveBeenCalledTimes(1);
    // The answers ended it already: closing the thanks writes nothing more.
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("takes a use off on a second press and the pod answer off on a second press", async () => {
    send.mockResolvedValue({ ok: true });
    render(<CheckInForm onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("check-in-rating-2"));
    fireEvent.click(screen.getByRole("button", { name: "Friends" }));
    fireEvent.click(screen.getByRole("button", { name: "Friends" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.click(sendButton());
    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send).toHaveBeenCalledWith({ rating: 2, uses: [], pod: null, note: "" });
  });

  it("keeps the answers on a failure and draws the toast with Try again, which sends them again", async () => {
    send.mockResolvedValueOnce({ ok: false, reason: "invalid" }).mockResolvedValueOnce({ ok: true });
    render(<CheckInForm onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("check-in-rating-3"));
    fireEvent.change(screen.getByTestId("check-in-note"), { target: { value: "Kept" } });
    fireEvent.click(sendButton());
    await waitFor(() => expect(screen.getByText(copy.failed)).toBeTruthy());
    expect((screen.getByTestId("check-in-note") as HTMLTextAreaElement).value).toBe("Kept");
    fireEvent.click(screen.getByRole("button", { name: reportCopy.retry }));
    await waitFor(() => expect(screen.getByTestId("check-in-sent")).toBeTruthy());
    expect(send).toHaveBeenLastCalledWith({ rating: 3, uses: [], pod: null, note: "Kept" });
  });

  it("treats a thrown send as a failure", async () => {
    send.mockRejectedValue(new Error("network"));
    render(<CheckInForm onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("check-in-rating-5"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(screen.getByText(copy.failed)).toBeTruthy());
  });

  it("snoozes on Not now and closes", () => {
    const onClose = vi.fn();
    render(<CheckInForm onClose={onClose} />);
    fireEvent.click(screen.getByTestId("check-in-not-now"));
    expect(dismiss).toHaveBeenCalledWith("snooze");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ends on the ✕ and closes", () => {
    const onClose = vi.fn();
    render(<CheckInForm onClose={onClose} />);
    fireEvent.click(screen.getAllByRole("button", { name: reportCopy.close })[0]);
    expect(dismiss).toHaveBeenCalledWith("end");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cannot be closed mid-send", async () => {
    let resolve!: (v: { ok: true }) => void;
    send.mockReturnValue(new Promise((r) => (resolve = r)));
    const onClose = vi.fn();
    render(<CheckInForm onClose={onClose} />);
    fireEvent.click(screen.getByTestId("check-in-rating-4"));
    fireEvent.click(sendButton());
    await waitFor(() => expect(sendButton().disabled).toBe(true));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    resolve({ ok: true });
    await waitFor(() => expect(screen.getByTestId("check-in-sent")).toBeTruthy());
  });
});
