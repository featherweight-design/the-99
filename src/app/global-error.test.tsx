// The root crash screen (small items 8, board 6: C1, C2): the wordmark, the notice, and the error code line only when the
// server gave a digest. No shell, no router. Its Report a problem link is a plain anchor to /report, which decides the
// feedback switch itself (FEEDBACK_ENABLED is on app-wide); this screen cannot read the switch.
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
});

const err = (digest?: string) => Object.assign(new Error("x"), digest === undefined ? {} : { digest });
const mount = (e: Error) => render(<GlobalError error={e} retry={() => {}} />, { container: document.body.appendChild(document.createElement("div")) });

describe("GlobalError", () => {
  it("names the code and links to /report with it", () => {
    mount(err("7f3a91c2"));
    expect(screen.getByTestId("wordmark")).toBeTruthy();
    expect(screen.getByTestId("crash-code").textContent).toBe(reportCopy.codeLine("7f3a91c2"));
    const link = screen.getByRole("link", { name: reportCopy.aboutPress });
    expect(link.getAttribute("href")).toBe("/report?ref=7f3a91c2");
  });

  it("links to /report with no code when the error carried no digest", () => {
    mount(err());
    expect(screen.getByRole("link", { name: reportCopy.aboutPress }).getAttribute("href")).toBe("/report");
  });

  it("draws no code line when the error carried no digest", () => {
    mount(err());
    expect(screen.queryByTestId("crash-code")).toBeNull();
  });
});
