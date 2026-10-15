import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { helpMeChooseHistoryCopy } from "../../lib/copy/help-me-choose-history";
import type { GonePick } from "../../lib/intake/past-run";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { GonePicks, PastRunMeta, PastRunNote, PastWontOpen } from "./past-run";

afterEach(cleanup);
const copy = helpMeChooseHistoryCopy.past;

const gone = (id: string, over: Partial<GonePick> = {}): GonePick => ({
  oracleId: id, name: `Card ${id}`, imageUri: null, artCropUri: null, deck: null, ...over,
});

describe("PastRunMeta", () => {
  it("names the run as past in the title's accessible name, focuses the title, and draws the date line", () => {
    render(
      <>
        <h1 id="t">Dinosaurs</h1>
        <PastRunMeta at="2026-10-13T21:40:00.000Z" titleId="t" />
      </>,
    );
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.getAttribute("aria-label")).toMatch(/^Dinosaurs, a past run from [A-Z][a-z]+ \d+, read-only$/);
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(title);
    expect(screen.getByTestId("past-run-meta").textContent).toContain("a past run");
  });

  it("draws the server's date in UTC, so a hydrating client has one text to match and then moves to its own zone", () => {
    expect(renderToString(<PastRunMeta at="2026-10-13T21:40:00.000Z" titleId="t" />)).toContain("Oct 13 · 9:40 PM");
  });

  it("leaves the heading as it found it when the meta goes, as on a move to live results", () => {
    const { rerender } = render(
      <>
        <h1 id="t">Dinosaurs</h1>
        <PastRunMeta at="2026-10-13T21:40:00.000Z" titleId="t" />
      </>,
    );
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.getAttribute("aria-label")).toContain("a past run");
    rerender(<h1 id="t">Dinosaurs</h1>);
    expect(title.hasAttribute("aria-label")).toBe(false);
    expect(title.hasAttribute("tabindex")).toBe(false);
  });

  it("does nothing to a title that is not there", () => {
    expect(() => render(<PastRunMeta at="2026-10-13T21:40:00.000Z" titleId="missing" />)).not.toThrow();
  });
});

describe("PastRunNote", () => {
  it("says the ruled sentence, and nothing about a credit having been spent", () => {
    render(<PastRunNote nothing={false} aged={null} />);
    expect(screen.getByTestId("past-run-note").textContent).toBe("A past run, read-only. Opening it again uses no credit.");
  });

  it("says a run that found nothing used no credit", () => {
    render(<PastRunNote nothing aged={null} />);
    expect(screen.getByTestId("past-run-note").textContent).toBe(copy.noteNothing);
  });

  it("adds the aged count after the note, for some picks and for none", () => {
    const { unmount } = render(<PastRunNote nothing={false} aged={{ open: 6, picks: 9 }} />);
    expect(screen.getByTestId("past-run-note").textContent).toBe(`${copy.note} 6 of its 9 picks are still open to you.`);
    unmount();
    render(<PastRunNote nothing={false} aged={{ open: 0, picks: 9 }} />);
    expect(screen.getByTestId("past-run-note").textContent).toContain("None of its 9 picks are open to you now.");
  });
});

describe("GonePicks", () => {
  const draw = (picks: GonePick[]) => render(
    <CardDetailProvider fetchCard={vi.fn()}>
      <GonePicks picks={picks} />
    </CardDetailProvider>,
  );

  it("draws nothing when no pick went", () => {
    draw([]);
    expect(screen.queryByTestId("gone-picks")).toBeNull();
  });

  it("heads the group with its count and says why each pick went", () => {
    draw([gone("a", { deck: { id: "d1", name: "Dino Deck" } }), gone("b")]);
    expect(screen.getByRole("region", { name: copy.goneLabel })).toBeTruthy();
    expect(screen.getByText("Not open to you now · 2")).toBeTruthy();
    expect(screen.getByText("you built it since · Dino Deck")).toBeTruthy();
    expect(screen.getByText(copy.goneIndex)).toBeTruthy();
  });

  it("links Open deck only for a pick the player has since built", () => {
    draw([gone("a", { deck: { id: "d1", name: "Dino Deck" } }), gone("b")]);
    const links = screen.getAllByRole("link", { name: copy.openDeck });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/decks/d1");
  });
});

describe("PastWontOpen", () => {
  it("says the run did not load and links back to History", () => {
    render(<PastWontOpen historyHref="/decks/new/choose?v=history" />);
    expect(screen.getByTestId("past-wont-open").textContent).toContain(copy.failed);
    expect(screen.getByRole("link", { name: copy.failedBack }).getAttribute("href")).toBe("/decks/new/choose?v=history");
  });
});
