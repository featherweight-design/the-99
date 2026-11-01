// /report's client: the form on a page of its own (small items 8 board 6). Back home, the code line only with a ref,
// the signed-out thanks, a failed send as the toast with the text kept, Close going home.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const push = vi.fn();
vi.mock("../../app/feedback-actions", () => ({ sendProblemReport: (...a: unknown[]) => send(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { reportCopy as copy } from "../../lib/copy/report";
import { ReportPage } from "./report-page";

beforeEach(() => {
  send.mockReset();
  push.mockReset();
  window.history.replaceState(null, "", "/report");
});

const type = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });

describe("ReportPage", () => {
  it("draws Back home to /, the title, the form and no Cancel", () => {
    render(<ReportPage source="report" signedOut digest={null} page={null} />);
    expect(screen.getByRole("link", { name: /Back home/ }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeTruthy();
    expect(screen.getByText(copy.intro)).toBeTruthy();
    expect(screen.queryByText(copy.cancel)).toBeNull();
    expect((screen.getByTestId("report-send") as HTMLButtonElement).disabled).toBe(true);
  });

  it("names the error code under the form only when there is one", () => {
    const { unmount } = render(<ReportPage source="error" signedOut digest="7f3a91c2" page={null} />);
    expect(screen.getByTestId("report-code").textContent).toBe(copy.sentWithCode("7f3a91c2"));
    unmount();
    render(<ReportPage source="report" signedOut digest={null} page={null} />);
    expect(screen.queryByTestId("report-code")).toBeNull();
  });

  it("sends the code and the from path, then thanks a signed-out reader without a promise and closes home", async () => {
    send.mockResolvedValue({ ok: true });
    render(<ReportPage source="report" signedOut digest="7f3a91c2" page="/decks/abc" />);
    type("report-what", "Blank page");
    fireEvent.click(screen.getByTestId("report-send"));
    await waitFor(() => expect(screen.getByTestId("report-sent")).toBeTruthy());
    expect(send).toHaveBeenCalledWith({ what: "Blank page", doing: "", page: "/decks/abc", source: "report", digest: "7f3a91c2", sentryEventId: null });
    expect(screen.getByText(copy.sentSignedOut)).toBeTruthy();
    expect(screen.queryByText(copy.sentBody)).toBeNull();
    expect(screen.queryByTestId("report-code")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("keeps the shipped thanks for a signed-in reader and sends this page's path when there is no from", async () => {
    send.mockResolvedValue({ ok: true });
    render(<ReportPage source="about" signedOut={false} digest={null} page={null} />);
    type("report-what", "Blank page");
    fireEvent.click(screen.getByTestId("report-send"));
    await waitFor(() => expect(screen.getByText(copy.sentBody)).toBeTruthy());
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ page: "/report", source: "about" }));
  });

  it.each([{ ok: false, reason: "invalid" }, { ok: false, reason: "limited" }, { ok: false, reason: "off" }])(
    "a %j outcome is the failed toast with Try again, the text kept",
    async (outcome) => {
      send.mockResolvedValueOnce(outcome).mockResolvedValueOnce({ ok: true });
      render(<ReportPage source="report" signedOut digest="d1" page={null} />);
      type("report-what", "Blank page");
      type("report-doing", "Pressing Apply");
      fireEvent.click(screen.getByTestId("report-send"));
      expect((await screen.findByRole("alert")).textContent).toContain(copy.failed);
      expect((screen.getByTestId("report-what") as HTMLTextAreaElement).value).toBe("Blank page");
      expect((screen.getByTestId("report-doing") as HTMLTextAreaElement).value).toBe("Pressing Apply");
      expect(screen.getByTestId("report-code")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: copy.retry }));
      await waitFor(() => expect(screen.getByTestId("report-sent")).toBeTruthy());
    },
  );

  it("a send that throws reads as failed too", async () => {
    send.mockRejectedValue(new Error("network"));
    render(<ReportPage source="report" signedOut digest={null} page={null} />);
    type("report-what", "Blank page");
    fireEvent.click(screen.getByTestId("report-send"));
    expect((await screen.findByRole("alert")).textContent).toContain(copy.failed);
  });
});
