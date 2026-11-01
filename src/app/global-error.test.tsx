// The root crash screen (small items 8, board 6: C1, C2): the wordmark, the notice, a plain link to /report carrying the
// digest and the path, and the error code line only when the server gave a digest. No shell, no router.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: () => "evt" }));
vi.mock("../components/feedback/crash-wordmark", () => ({ CrashWordmark: () => <div data-testid="wordmark" /> }));
vi.mock("./fonts", () => ({ FONT_VARIABLES: "" }));
vi.mock("./globals.css", () => ({}));

import GlobalError from "./global-error";
import { reportCopy } from "../lib/copy/report";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.history.replaceState(null, "", "/decks/abc?x=1");
});

const err = (digest?: string) => Object.assign(new Error("x"), digest === undefined ? {} : { digest });

describe("GlobalError", () => {
  it("links Report a problem to /report with the digest and the path, both encoded, and names the code", () => {
    render(<GlobalError error={err("7f3a91c2")} retry={() => {}} />, { container: document.body.appendChild(document.createElement("div")) });
    const link = screen.getByRole("link", { name: reportCopy.title });
    expect(link.getAttribute("href")).toBe("/report?ref=7f3a91c2&from=%2Fdecks%2Fabc");
    expect(screen.getByTestId("wordmark")).toBeTruthy();
    expect(screen.getByTestId("crash-code").textContent).toBe(reportCopy.codeLine("7f3a91c2"));
  });

  it("links without a ref and draws no code line when the error carried no digest", () => {
    render(<GlobalError error={err()} retry={() => {}} />, { container: document.body.appendChild(document.createElement("div")) });
    expect(screen.getByRole("link", { name: reportCopy.title }).getAttribute("href")).toBe("/report?from=%2Fdecks%2Fabc");
    expect(screen.queryByTestId("crash-code")).toBeNull();
  });
});
