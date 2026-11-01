import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorNotice } from "./error-notice";
import { FeedbackProvider } from "../feedback/feedback-provider";
import { reportCopy } from "../../lib/copy/report";
import { shellCopy } from "../../lib/copy/shell";

const sentry = vi.hoisted(() => ({ captureException: vi.fn(() => "evt123") }));
vi.mock("@sentry/nextjs", () => sentry);
const send = vi.hoisted(() => vi.fn());
vi.mock("../../app/feedback-actions", () => ({ sendProblemReport: send }));

const copy = shellCopy.errorBoundary;

function thrown(message: string, digest?: string): Error & { digest?: string } {
  return Object.assign(new Error(message), digest === undefined ? {} : { digest });
}

afterEach(() => {
  vi.restoreAllMocks();
  sentry.captureException.mockClear();
  send.mockReset();
});

describe("ErrorNotice", () => {
  it("draws the heading, the body, a retry and a way home", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorNotice boundary="page" error={thrown("x")} retry={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: copy.heading })).toBeTruthy();
    expect(screen.getByText(copy.body)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.retry })).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.home }).getAttribute("href")).toBe("/");
  });

  it("retries on a press", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<ErrorNotice boundary="page" error={thrown("x")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("logs the digest and never the message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorNotice boundary="root" error={thrown("deck Atraxa Superfriends for player 42", "abc123")} retry={() => {}} />,
    );
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]).toEqual(["[error-boundary] boundary=root digest=abc123"]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("Atraxa");
  });

  it("logs a client error, which carries no digest, as none", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorNotice boundary="page" error={thrown("secret")} retry={() => {}} />);
    expect(log.mock.calls).toEqual([["[error-boundary] boundary=page digest=none"]]);
  });

  it("says the shipped quieter body", () => {
    expect(copy.body).toBe("Something broke on our end. Try again.");
  });

  it("draws no Tell us what happened link outside a reader with Report a problem on", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<ErrorNotice boundary="page" error={thrown("x")} retry={() => {}} />);
    expect(screen.queryByText(reportCopy.errorLink)).toBeNull();
    unmount();
    render(
      <FeedbackProvider on={false}>
        <ErrorNotice boundary="page" error={thrown("x")} retry={() => {}} />
      </FeedbackProvider>,
    );
    expect(screen.queryByText(reportCopy.errorLink)).toBeNull();
  });

  it("opens the form from the link and carries the Sentry event id of a browser-side throw", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({ ok: true });
    render(
      <FeedbackProvider on>
        <ErrorNotice boundary="page" error={thrown("x")} retry={() => {}} />
      </FeedbackProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: reportCopy.errorLink }));
    fireEvent.change(screen.getByTestId("report-what"), { target: { value: "It broke" } });
    fireEvent.click(screen.getByTestId("report-send"));
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ what: "It broke", source: "error", digest: null, sentryEventId: "evt123" }));
  });

  it("carries a server error's digest and no event id (it was reported where it happened)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({ ok: true });
    render(
      <FeedbackProvider on>
        <ErrorNotice boundary="page" error={thrown("x", "dig42")} retry={() => {}} />
      </FeedbackProvider>,
    );
    expect(sentry.captureException).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: reportCopy.errorLink }));
    fireEvent.change(screen.getByTestId("report-what"), { target: { value: "It broke" } });
    fireEvent.click(screen.getByTestId("report-send"));
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ digest: "dig42", sentryEventId: null }));
  });

  it("with a reportHref draws Report a problem as a plain link to it, with no shell and no sheet", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorNotice boundary="root" error={thrown("x", "dig42")} retry={() => {}} reportHref="/report?ref=dig42&from=%2Fdecks" />);
    const link = screen.getByRole("link", { name: reportCopy.title });
    expect(link.getAttribute("href")).toBe("/report?ref=dig42&from=%2Fdecks");
    expect(screen.queryByText(reportCopy.errorLink)).toBeNull();
  });

  it("draws no Report a problem link without a reportHref and outside a reader with the feature on", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorNotice boundary="root" error={thrown("x")} retry={() => {}} />);
    expect(screen.queryByRole("link", { name: reportCopy.title })).toBeNull();
  });
});
