import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { landingCopy } from "../../../lib/copy/landing";
import type { Projected } from "../../../lib/demo/projected";

// The frame is under test, not the drawing halves or the launch form: each is stood in for.
vi.mock("./demo-steps", () => ({
  StepBody: ({ index }: { index: number }) => <p data-testid="body">body {index + 1}</p>,
  ringTarget: () => null,
}));
vi.mock("../launch-panel", () => ({ LaunchPanel: () => <p data-testid="launch-panel">launch form</p> }));

const { Demo } = await import("./demo");
const c = landingCopy.demo;
const art = (n: number) => `https://cards.example/${n}.jpg`;
const data = {
  collection: { totalCards: 2140, cards: [1, 2, 3, 4, 5, 6].map((n) => ({ oracleId: `o${n}`, imageUri: art(n) })) },
} as unknown as Projected;

afterEach(cleanup);

const start = () => fireEvent.click(screen.getByTestId("demo-start"));
const next = () => fireEvent.click(screen.getByTestId("demo-next"));

describe("Try it's frame", () => {
  it("keeps the section header through every phase and draws the start inside one bordered card, a fan of the binder's own art beside the words", () => {
    render(<Demo data={data} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(c.title);
    expect(screen.getByText(c.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(c.lead)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.startTitle("Wren"));
    expect(screen.getByText(c.startBody("Wren"))).toBeInTheDocument();
    expect(screen.getByTestId("demo-fan").querySelectorAll("img")).toHaveLength(3);
    expect(screen.queryByTestId("demo-app")).toBeNull();
    start();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(c.title);
  });

  it("Start opens step 1 in place: Step N of 8, its heading and no Back", () => {
    render(<Demo data={data} />);
    start();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8));
    expect(screen.getByTestId("demo-step")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.steps[0].title("Wren"));
    expect(screen.getByTestId("body")).toHaveTextContent("body 1");
    expect(screen.queryByRole("button", { name: c.back })).toBeNull();
    expect(screen.getByTestId("demo-app")).toBeInTheDocument();
  });

  it("names the collection's real count in step 1 and each step's own chips", () => {
    render(<Demo data={data} />);
    start();
    expect(screen.getByText(/2,140 cards/)).toBeInTheDocument();
    next();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(2, 8));
    next();
    expect(screen.getAllByTestId("demo-tag").map((t) => t.textContent)).toEqual(c.steps[2].tags.map((t) => t.label));
    next();
    next();
    expect(screen.getAllByTestId("demo-tag").map((t) => t.textContent)).toEqual(c.steps[4].tags.map((t) => t.label));
  });

  it("moves focus to the step's heading on every press that changes the card", () => {
    render(<Demo data={data} />);
    expect(screen.getByRole("heading", { level: 3 })).not.toHaveFocus();
    start();
    expect(screen.getByRole("heading", { level: 3 })).toHaveFocus();
    next();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.steps[1].title("Wren"));
    expect(screen.getByRole("heading", { level: 3 })).toHaveFocus();
  });

  it("draws the bar from the copy's step count, lit through the step", () => {
    render(<Demo data={data} />);
    start();
    next();
    const segments = screen.getByTestId("demo-step").parentElement!.querySelectorAll("[data-on], span.block");
    expect(segments).toHaveLength(c.steps.length);
    expect([...segments].filter((s) => s.hasAttribute("data-on"))).toHaveLength(2);
  });

  it("Back goes to the step before; step 1 has none", () => {
    render(<Demo data={data} />);
    start();
    next();
    fireEvent.click(screen.getByRole("button", { name: c.back }));
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8));
    expect(screen.queryByRole("button", { name: c.back })).toBeNull();
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

  it("the foot's Tell me at launch goes to the end like Skip does", () => {
    render(<Demo data={data} />);
    start();
    next();
    expect(screen.getByText(c.foot)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: c.footLink }));
    expect(screen.getByTestId("demo-skipped")).toHaveTextContent(c.end.skipped(2, 8));
  });

  it("the end card has no heading above the launch panel of its own: its title, the fan, the panel and Start over", () => {
    render(<Demo data={data} />);
    start();
    fireEvent.click(screen.getByRole("button", { name: c.skip }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.end.title("Wren"));
    expect(screen.getByTestId("demo-fan").querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByText(c.end.label)).toBeInTheDocument();
  });

  it("step 8 says See the end and ends with no skipped line; Start over returns to the start card", () => {
    render(<Demo data={data} />);
    start();
    for (let i = 0; i < 7; i++) next();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(8, 8));
    expect(screen.getByTestId("demo-next")).toHaveTextContent(c.seeEnd);
    next();
    expect(screen.queryByTestId("demo-skipped")).toBeNull();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.end.title("Wren"));
    fireEvent.click(screen.getByRole("button", { name: c.end.startOver }));
    expect(screen.getByTestId("demo-start")).toBeInTheDocument();
  });

  it("Skip from step 8 skips nothing", () => {
    render(<Demo data={data} />);
    start();
    for (let i = 0; i < 7; i++) next();
    fireEvent.click(screen.getByRole("button", { name: c.skip }));
    expect(screen.queryByTestId("demo-skipped")).toBeNull();
  });
});
