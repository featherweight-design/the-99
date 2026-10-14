import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorNotice } from "./error-notice";
import { shellCopy } from "../../lib/copy/shell";

const copy = shellCopy.errorBoundary;

function thrown(message: string, digest?: string): Error & { digest?: string } {
  return Object.assign(new Error(message), digest === undefined ? {} : { digest });
}

afterEach(() => vi.restoreAllMocks());

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
});
