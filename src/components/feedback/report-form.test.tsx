// The Report a problem form (flyer trial PR 5; Report-Phone R3 to R6, Report-Desktop D3 and D4): Send dim until the first
// box has text, Sending holds the dialog, Sent replaces the form, a failure is the toast with Try again and keeps the text.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("../../app/feedback-actions", () => ({ sendProblemReport: (...a: unknown[]) => send(...a) }));

import { reportCopy as copy } from "../../lib/copy/report";
import { ReportForm } from "./report-form";

beforeEach(() => {
  send.mockReset();
  window.history.replaceState(null, "", "/decks/abc");
});

const sendButton = () => screen.getByTestId("report-send") as HTMLButtonElement;
const type = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });

describe("ReportForm", () => {
  it("draws the intro, both boxes, the attach line and a dim Send", () => {
    render(<ReportForm source="about" onClose={() => {}} />);
    expect(screen.getByText(copy.intro)).toBeTruthy();
    expect(screen.getByText(copy.what)).toBeTruthy();
    expect(screen.getByText(copy.optional)).toBeTruthy();
    expect(screen.getByText(copy.attach)).toBeTruthy();
    expect(sendButton().disabled).toBe(true);
    type("report-doing", "Pressing Apply");
    expect(sendButton().disabled).toBe(true);
    type("report-what", "   ");
    expect(sendButton().disabled).toBe(true);
    type("report-what", "Blank page");
    expect(sendButton().disabled).toBe(false);
  });

  it("sends the text, the page's path, its door and the error's ids, then shows the thanks and closes on Close", async () => {
    send.mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<ReportForm source="error" digest="d1" eventId="e1" onClose={onClose} />);
    type("report-what", "Blank page");
    fireEvent.click(sendButton());
    await waitFor(() => expect(screen.getByTestId("report-sent")).toBeTruthy());
    expect(send).toHaveBeenCalledWith({ what: "Blank page", doing: "", page: "/decks/abc", source: "error", digest: "d1", sentryEventId: "e1" });
    expect(screen.getByText(copy.sentTitle)).toBeTruthy();
    expect(screen.getByText(copy.sentBody)).toBeTruthy();
    expect(screen.queryByTestId("report-what")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: copy.close }).find((b) => b.textContent === copy.close)!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says Sending… and cannot be closed mid-send", async () => {
    let resolve!: (v: { ok: true }) => void;
    send.mockReturnValue(new Promise((r) => (resolve = r)));
    const onClose = vi.fn();
    render(<ReportForm source="about" onClose={onClose} />);
    type("report-what", "Blank page");
    fireEvent.click(sendButton());
    await waitFor(() => expect(sendButton().textContent).toBe(copy.sending));
    expect(sendButton().disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: copy.cancel, hidden: true }));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => resolve({ ok: true }));
    await waitFor(() => expect(screen.getByTestId("report-sent")).toBeTruthy());
  });

  it("a failed send is the toast with Try again, the typed text kept, and Try again sends it again", async () => {
    send.mockResolvedValueOnce({ ok: false, reason: "invalid" }).mockResolvedValueOnce({ ok: true });
    render(<ReportForm source="about" onClose={() => {}} />);
    type("report-what", "Blank page");
    type("report-doing", "Pressing Apply");
    fireEvent.click(sendButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.failed);
    expect((screen.getByTestId("report-what") as HTMLTextAreaElement).value).toBe("Blank page");
    expect((screen.getByTestId("report-doing") as HTMLTextAreaElement).value).toBe("Pressing Apply");
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    await waitFor(() => expect(screen.getByTestId("report-sent")).toBeTruthy());
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("a send that throws reads as failed too", async () => {
    send.mockRejectedValue(new Error("network"));
    render(<ReportForm source="about" onClose={() => {}} />);
    type("report-what", "Blank page");
    fireEvent.click(sendButton());
    expect((await screen.findByRole("alert")).textContent).toContain(copy.failed);
    expect(sendButton().disabled).toBe(false);
  });
});
