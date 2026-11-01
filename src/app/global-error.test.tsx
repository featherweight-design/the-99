// The root crash screen (small items 8, board 6: C1, C2): the wordmark, the notice, and the error code line only when the
// server gave a digest. No shell, no router. The drawn link to /report is not here: this screen cannot read the feedback
// switch, and a link to a page that answers 404 while it is off is worse than none.
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
  it("names the code and draws no link to /report", () => {
    mount(err("7f3a91c2"));
    expect(screen.getByTestId("wordmark")).toBeTruthy();
    expect(screen.getByTestId("crash-code").textContent).toBe(reportCopy.codeLine("7f3a91c2"));
    expect(document.body.querySelector('a[href^="/report"]')).toBeNull();
  });

  it("draws no code line when the error carried no digest", () => {
    mount(err());
    expect(screen.queryByTestId("crash-code")).toBeNull();
  });
});
