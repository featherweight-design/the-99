import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { landingCopy } from "../../../lib/copy/landing";
import type { Projected } from "../../../lib/demo/projected";

// The frame is under test, not the drawing halves or the launch form: each is stood in for.
vi.mock("./demo-steps", () => ({ StepBody: ({ index }: { index: number }) => <p data-testid="body">body {index + 1}</p> }));
vi.mock("../launch-panel", () => ({ LaunchPanel: () => <p data-testid="launch-panel">launch form</p> }));

const { Demo } = await import("./demo");
const c = landingCopy.demo;
const data = { collection: { totalCards: 2140 } } as unknown as Projected;

afterEach(cleanup);

const start = () => fireEvent.click(screen.getByTestId("demo-start"));
const next = () => fireEvent.click(screen.getByTestId("demo-next"));

describe("Try it's frame", () => {
  it("starts on the start card, which says nothing is saved, and Start opens step 1 in place", () => {
    render(<Demo data={data} />);
    expect(screen.getByText(c.lead("Wren"))).toBeInTheDocument();
    expect(screen.queryByTestId("demo-app")).toBeNull();
    start();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8));
    expect(screen.getByTestId("body")).toHaveTextContent("body 1");
  });

  it("names the collection's real count in step 1 and each step's own tag", () => {
    render(<Demo data={data} />);
    start();
    expect(screen.getByText(/2,140 cards/)).toBeInTheDocument();
    next();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(2, 8));
    next();
    expect(screen.getByText(c.steps[2].tag)).toBeInTheDocument();
  });

  it("Back from step 1 returns to the start card, and from later steps to the step before", () => {
    render(<Demo data={data} />);
    start();
    next();
    fireEvent.click(screen.getByRole("button", { name: c.back }));
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8));
    fireEvent.click(screen.getByRole("button", { name: c.back }));
    expect(screen.getByTestId("demo-start")).toBeInTheDocument();
  });

  it("Skip lands on the end and says what was skipped; Go back returns to the first skipped step", () => {
    render(<Demo data={data} />);
    start();
    next();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: c.skip }));
    expect(screen.getByTestId("demo-skipped")).toHaveTextContent(c.end.skipped(4, 8));
    expect(screen.getByTestId("launch-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: c.end.goBack(4) }));
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(4, 8));
  });

  it("step 8 says See the end, offers no Skip, and ends with no skipped line; Start over returns to the start card", () => {
    render(<Demo data={data} />);
    start();
    for (let i = 0; i < 7; i++) next();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(8, 8));
    expect(screen.queryByRole("button", { name: c.skip })).toBeNull();
    expect(screen.getByTestId("demo-next")).toHaveTextContent(c.seeEnd);
    next();
    expect(screen.queryByTestId("demo-skipped")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(c.end.title("Wren"));
    fireEvent.click(screen.getByRole("button", { name: c.end.startOver }));
    expect(screen.getByTestId("demo-start")).toBeInTheDocument();
  });
});
