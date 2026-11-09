import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { landingCopy } from "../../../lib/copy/landing";
import type { Projected } from "../../../lib/demo/projected";
import { useCardDetail } from "../../cards/card-detail-context";

const loaded = vi.hoisted(() => ({ run: null as null | (() => unknown), stepsFail: false, opens: false }));
// The data module and the steps are the Start press's two dynamic imports: stood in for, so the test sets what the data returns
// or throws and whether the steps' chunk fails.
vi.mock("../../../lib/demo/projected", () => ({ projected: () => loaded.run?.() }));

// The frame is under test, not the drawing halves or the launch form: each is stood in for. The steps module is read once the
// press's imports land (`steps.StepBody`), so a getter that throws stands in for a chunk that failed to load. The rings' selectors
// (`demo-rings`) name controls inside the real steps, so the stand-in draws no ring. The body's press asks the card details
// context to open a card as a step's row does, and the host stands in for the dialog: it names the card, its list and its deck.
vi.mock("./demo-steps", () => ({
  get StepBody() {
    if (loaded.stepsFail) throw new Error("steps chunk failed");
    const Body = ({ index }: { index: number }) => {
      const { open, openOracleId, sessionActive } = useCardDetail();
      return (
        <div>
          <p data-testid="body">body {index + 1}</p>
          <button type="button" data-testid="press-o1" onClick={(e) => open("o1", [{ oracleId: "o1" }, { oracleId: "o2" }], undefined, { opener: e.currentTarget })}>press o1</button>
          <button type="button" data-testid="press-o9" onClick={() => open("o9")}>press o9</button>
          <p data-testid="context-state">{String(openOracleId)} {String(sessionActive)}</p>
        </div>
      );
    };
    return Body;
  },
  get DemoCardHost() {
    const Host = ({ opened, onPage, onClose }: { opened: { oracleId: string; siblings: readonly { oracleId: string }[]; opener: HTMLElement | null; role: string | null }; onPage: (id: string) => void; onClose: () => void }) => (
      <div role="dialog" data-testid="host" data-id={opened.oracleId} data-siblings={opened.siblings.map((x) => x.oracleId).join(",")} data-opener={opened.opener?.getAttribute("data-testid") ?? ""} data-role={opened.role ?? ""}>
        <button type="button" data-testid="host-page" onClick={() => onPage("o2")}>page</button>
        <button type="button" data-testid="host-close" onClick={onClose}>close</button>
      </div>
    );
    return Host;
  },
}));
vi.mock("./demo-rings", () => ({ ringTarget: () => null, ringPlace: () => "top", stepOpensCards: () => loaded.opens }));
vi.mock("../launch-panel", () => ({ LaunchPanel: () => <p data-testid="launch-panel">launch form</p> }));

const { Demo } = await import("./demo");
const c = landingCopy.demo;
const art = [1, 2, 3, 4, 5, 6].map((n) => ({ src: `https://cards.example/${n}.jpg`, name: `Card ${n}` }));
const data = { collection: { totalCards: 2140, cards: [] } } as unknown as Projected;
/** The data with details for two cards: a press on `o1` or `o2` opens, any other card opens nothing. */
const withDetails = { ...data, cardDetails: { o1: { oracleId: "o1" }, o2: { oracleId: "o2" } } } as unknown as Projected;

beforeEach(() => {
  loaded.run = () => data;
  loaded.stepsFail = false;
  loaded.opens = false;
});
afterEach(cleanup);

/** Press Start and wait for step 1: the data arrives through a promise. */
const start = async () => {
  fireEvent.click(screen.getByTestId("demo-start"));
  await screen.findByTestId("demo-step");
};
const next = () => fireEvent.click(screen.getByTestId("demo-next"));

describe("Try it's frame", () => {
  it("keeps the section header through every phase and draws the start inside one bordered card, a fan of the binder's own art beside the words", async () => {
    render(<Demo art={art} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(c.title);
    expect(screen.getByText(c.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(c.lead)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.startTitle("Wren"));
    expect(screen.getByText(c.startBody("Wren"))).toBeInTheDocument();
    expect(screen.getByTestId("demo-fan").querySelectorAll("img")).toHaveLength(3);
    expect(screen.queryByTestId("demo-app")).toBeNull();
    await start();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(c.title);
  });

  it("Start opens step 1 in place: Step N of 8, its heading and no Back", async () => {
    render(<Demo art={art} />);
    await start();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8));
    expect(screen.getByTestId("demo-step")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.steps[0].title("Wren"));
    expect(screen.getByTestId("body")).toHaveTextContent("body 1");
    expect(screen.queryByRole("button", { name: c.back })).toBeNull();
    expect(screen.getByTestId("demo-app")).toBeInTheDocument();
  });

  it("names the collection's real count in step 1 and each step's own chips", async () => {
    render(<Demo art={art} />);
    await start();
    expect(screen.getByText(/2,140 cards/)).toBeInTheDocument();
    next();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(2, 8));
    next();
    expect(screen.getAllByTestId("demo-tag").map((t) => t.textContent)).toEqual(c.steps[2].tags.map((t) => t.label));
    next();
    next();
    expect(screen.getAllByTestId("demo-tag").map((t) => t.textContent)).toEqual(c.steps[4].tags.map((t) => t.label));
  });

  it("moves focus to the step's heading on every press that changes the card", async () => {
    render(<Demo art={art} />);
    expect(screen.getByRole("heading", { level: 3 })).not.toHaveFocus();
    await start();
    expect(screen.getByRole("heading", { level: 3 })).toHaveFocus();
    next();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.steps[1].title("Wren"));
    expect(screen.getByRole("heading", { level: 3 })).toHaveFocus();
  });

  it("draws the bar from the copy's step count, lit through the step", async () => {
    render(<Demo art={art} />);
    await start();
    next();
    const segments = screen.getByTestId("demo-step").parentElement!.querySelectorAll("[data-on], span.block");
    expect(segments).toHaveLength(c.steps.length);
    expect([...segments].filter((s) => s.hasAttribute("data-on"))).toHaveLength(2);
  });

  it("Back goes to the step before; step 1 has none", async () => {
    render(<Demo art={art} />);
    await start();
    next();
    fireEvent.click(screen.getByRole("button", { name: c.back }));
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8));
    expect(screen.queryByRole("button", { name: c.back })).toBeNull();
  });

  it("Skip lands on the end and says what was skipped; Go back returns to the first skipped step", async () => {
    render(<Demo art={art} />);
    await start();
    next();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: c.skip }));
    expect(screen.getByTestId("demo-skipped")).toHaveTextContent(c.end.skipped(4, 8));
    expect(screen.getByTestId("launch-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: c.end.goBack(4) }));
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(4, 8));
  });

  it("the foot's Tell me at launch goes to the end like Skip does", async () => {
    render(<Demo art={art} />);
    await start();
    next();
    expect(screen.getByText(c.foot)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: c.footLink }));
    expect(screen.getByTestId("demo-skipped")).toHaveTextContent(c.end.skipped(2, 8));
  });

  it("the end card has no heading above the launch panel of its own: its title, the fan, the panel and Start over", async () => {
    render(<Demo art={art} />);
    await start();
    fireEvent.click(screen.getByRole("button", { name: c.skip }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.end.title("Wren"));
    expect(screen.getByTestId("demo-fan").querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByText(c.end.label)).toBeInTheDocument();
  });

  it("step 8 says See the end and ends with no skipped line; Start over returns to the start card", async () => {
    render(<Demo art={art} />);
    await start();
    for (let i = 0; i < 7; i++) next();
    expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(8, 8));
    expect(screen.getByTestId("demo-next")).toHaveTextContent(c.seeEnd);
    next();
    expect(screen.queryByTestId("demo-skipped")).toBeNull();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(c.end.title("Wren"));
    fireEvent.click(screen.getByRole("button", { name: c.end.startOver }));
    expect(screen.getByTestId("demo-start")).toBeInTheDocument();
  });

  it("Skip from step 8 skips nothing", async () => {
    render(<Demo art={art} />);
    await start();
    for (let i = 0; i < 7; i++) next();
    fireEvent.click(screen.getByRole("button", { name: c.skip }));
    expect(screen.queryByTestId("demo-skipped")).toBeNull();
  });

  it("loads the data on Start, not before: the button is busy while it loads, then step 1 opens", async () => {
    const load = vi.fn(() => data);
    loaded.run = load;
    render(<Demo art={art} />);
    expect(load).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("demo-start"));
    expect(screen.getByTestId("demo-start")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("demo-start")).toHaveTextContent(c.loading);
    await screen.findByTestId("demo-step");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("says the load failed and lets Start try again, then opens step 1", async () => {
    loaded.run = () => {
      throw new Error("chunk failed");
    };
    render(<Demo art={art} />);
    fireEvent.click(screen.getByTestId("demo-start"));
    expect(await screen.findByTestId("demo-load-failed")).toHaveTextContent(c.loadFailed);
    expect(screen.getByTestId("demo-start")).toHaveTextContent(c.start);
    expect(screen.getByTestId("demo-start")).not.toHaveAttribute("aria-busy");
    loaded.run = () => data;
    fireEvent.click(screen.getByTestId("demo-start"));
    await waitFor(() => expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8)));
    expect(screen.queryByTestId("demo-load-failed")).toBeNull();
  });

  it("says the load failed when the steps' chunk fails though the data came, and Start tries again", async () => {
    loaded.stepsFail = true;
    render(<Demo art={art} />);
    fireEvent.click(screen.getByTestId("demo-start"));
    expect(await screen.findByTestId("demo-load-failed")).toHaveTextContent(c.loadFailed);
    expect(screen.queryByTestId("demo-step")).toBeNull();
    loaded.stepsFail = false;
    fireEvent.click(screen.getByTestId("demo-start"));
    await waitFor(() => expect(screen.getByTestId("demo-step")).toHaveTextContent(c.step(1, 8)));
    expect(screen.getByTestId("body")).toHaveTextContent("body 1");
  });

  it("treats a file with no data as a failed load", async () => {
    loaded.run = () => null;
    render(<Demo art={art} />);
    fireEvent.click(screen.getByTestId("demo-start"));
    expect(await screen.findByTestId("demo-load-failed")).toBeInTheDocument();
  });

  it("says Press any card to open it in step 1 only where a press opens a card", async () => {
    render(<Demo art={art} />);
    await start();
    expect(screen.getByTestId("demo-app").closest("[data-testid='demo']")).not.toHaveTextContent("Press any card to open it.");
    cleanup();
    loaded.opens = true;
    render(<Demo art={art} />);
    await start();
    expect(screen.getByText(/Press any card to open it\./)).toBeInTheDocument();
  });
});

describe("Try it's card details", () => {
  it("opens the card a press names, from the data's details, with the list it pages and the control that opened it", async () => {
    loaded.run = () => withDetails;
    render(<Demo art={art} />);
    await start();
    expect(screen.queryByTestId("host")).toBeNull();
    fireEvent.click(screen.getByTestId("press-o1"));
    const host = screen.getByTestId("host");
    expect(host).toHaveAttribute("data-id", "o1");
    expect(host).toHaveAttribute("data-siblings", "o1,o2");
    expect(host).toHaveAttribute("data-opener", "press-o1");
    // The context says the same: the open card, and a session while it is up.
    expect(screen.getByTestId("context-state")).toHaveTextContent("o1 true");
  });

  it("opens nothing for a card with no details, and nothing at all from a file with none", async () => {
    loaded.run = () => withDetails;
    render(<Demo art={art} />);
    await start();
    fireEvent.click(screen.getByTestId("press-o9"));
    expect(screen.queryByTestId("host")).toBeNull();
    expect(screen.getByTestId("context-state")).toHaveTextContent("null false");
    cleanup();
    loaded.run = () => data;
    render(<Demo art={art} />);
    await start();
    fireEvent.click(screen.getByTestId("press-o1"));
    expect(screen.queryByTestId("host")).toBeNull();
  });

  it("follows the dialog's page into the context and drops the card on close and on a step change", async () => {
    loaded.run = () => withDetails;
    render(<Demo art={art} />);
    await start();
    fireEvent.click(screen.getByTestId("press-o1"));
    fireEvent.click(screen.getByTestId("host-page"));
    expect(screen.getByTestId("host")).toHaveAttribute("data-id", "o2");
    expect(screen.getByTestId("context-state")).toHaveTextContent("o2 true");
    fireEvent.click(screen.getByTestId("host-close"));
    expect(screen.queryByTestId("host")).toBeNull();
    expect(screen.getByTestId("context-state")).toHaveTextContent("null false");
    fireEvent.click(screen.getByTestId("press-o1"));
    expect(screen.getByTestId("host")).toBeInTheDocument();
    next();
    expect(screen.queryByTestId("host")).toBeNull();
  });
});
