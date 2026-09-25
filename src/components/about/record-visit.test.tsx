import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const recordAboutVisit = vi.fn(async () => {});
vi.mock("../../app/about/actions", () => ({ recordAboutVisit }));

const { RecordVisit } = await import("./record-visit");

beforeEach(() => recordAboutVisit.mockClear());

describe("RecordVisit (R6 §O4, audit E2)", () => {
  it("records once after mount when the reader is behind", () => {
    render(<RecordVisit behind />);
    expect(recordAboutVisit).toHaveBeenCalledOnce();
  });

  it("records once under StrictMode's double effect", () => {
    render(
      <StrictMode>
        <RecordVisit behind />
      </StrictMode>,
    );
    expect(recordAboutVisit).toHaveBeenCalledOnce();
  });

  it("records nothing for a reader who is current", () => {
    render(<RecordVisit behind={false} />);
    expect(recordAboutVisit).not.toHaveBeenCalled();
  });

  it("records nothing during a server render, which is all a prefetch is", () => {
    renderToString(<RecordVisit behind />);
    expect(recordAboutVisit).not.toHaveBeenCalled();
  });
});
