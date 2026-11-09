import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { topOffCopy } from "../../lib/copy/top-off";
import { typeWord } from "../../lib/cards/facet";
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";
import {
  CandidateRowView,
  DeclinedRow,
  IllegalRow,
  RefusalPlate,
  rowLabel,
} from "./top-off-rows";

// No module mock on purpose: the rows draw from props alone (no server action, no card-detail provider, no hover preview).

const candidate = (over: Partial<TopOffCandidateWithFacts> = {}): TopOffCandidateWithFacts => ({
  oracleId: "o-1",
  name: "Arcane Signet",
  typeLine: "Artifact",
  facet: "spell",
  inclusionPct: 61,
  synergyPts: 12,
  imageUri: null,
  owned: true,
  committedTo: null,
  manaCost: "{2}",
  price: null,
  availability: null,
  facts: null,
  comboPartner: null,
  ...over,
});

const baseProps = {
  ticked: false,
  inert: false,
  inflight: false,
  capLineId: "cap",
  newestAsOf: null,
  declaredBracket: null,
  noteCounts: { gameChanger: 0, extraTurns: 0, tutor: 0 },
  nameTrigger: (className: string) => <button type="button" className={className} data-testid="top-off-name">Arcane Signet</button>,
};

afterEach(cleanup);

describe("the Top off rows draw from props alone", () => {
  it("draws a candidate row with the tick, the name it was handed and the decline, and reports both presses", () => {
    const onToggle = vi.fn();
    const onDecline = vi.fn();
    const c = candidate();
    render(<CandidateRowView {...baseProps} candidate={c} isDesktop onToggle={onToggle} onDecline={onDecline} />);
    expect(document.querySelector("[data-top-off-row]")).not.toBeNull();
    expect(screen.getByTestId("top-off-name").textContent).toBe("Arcane Signet");
    expect(document.querySelector("[data-top-off-type]")?.textContent).toBe(typeWord("Artifact"));
    fireEvent.click(screen.getByRole("checkbox", { name: rowLabel(c, null, null, baseProps.noteCounts) }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: topOffCopy.list.declineAria("Arcane Signet") }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("hands the row's own handlers to its shell, and draws the phone layout with no type column", () => {
    const onClick = vi.fn();
    render(<CandidateRowView {...baseProps} candidate={candidate()} isDesktop={false} rowHandlers={{ onClick }} onToggle={vi.fn()} onDecline={vi.fn()} />);
    expect(document.querySelector("[data-top-off-type]")).toBeNull();
    fireEvent.click(document.querySelector("[data-top-off-row]")!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("draws a declined row and an illegal row, each with its own word", () => {
    const onRestore = vi.fn();
    const { unmount } = render(<DeclinedRow name="Sol Ring" onRestore={onRestore} disabled={false} />);
    expect(screen.getByText(topOffCopy.list.declined)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: topOffCopy.list.restoreAria("Sol Ring") }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    unmount();
    render(<IllegalRow name="Sol Ring" inDeck={false} />);
    expect(screen.getByText(topOffCopy.list.illegalColour)).toBeTruthy();
    expect(screen.getByText(topOffCopy.list.illegalUntickable)).toBeTruthy();
  });

  it("draws the refusal plate with its label and message", () => {
    render(<RefusalPlate message="Nothing changed." />);
    expect(screen.getByTestId("top-off-refusal").textContent).toContain(topOffCopy.commit.refusedLabel);
    expect(screen.getByText("Nothing changed.")).toBeTruthy();
  });
});
