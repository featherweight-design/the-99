// The overview check's *See which →* in the credit note's slot (deck notices HANDOFF §6). The note
// is the press's `aria-describedby` target, so the description must read the note's words alone
// and never the control after them; and a blocked press (F13) draws neither.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalysisBanner } from "./analysis-banner";

const NOTE = "Reads the bracket only. The overview waits until every card is legal in this deck.";

describe("AnalysisBanner's check note", () => {
  it("describes the press by the note's text alone, and See which opens Notices", () => {
    const onSee = vi.fn();
    render(<AnalysisBanner mode="stale" busy={false} blocked={null} onRequest={() => {}} note={NOTE} see={{ label: "See which", onPress: onSee }} />);
    const press = screen.getByRole("button", { name: "Re-analyze" });
    const id = press.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toBe(NOTE);
    fireEvent.click(screen.getByRole("button", { name: /See which/ }));
    expect(onSee).toHaveBeenCalledOnce();
  });

  it("draws no note and no See which over a blocked press (F13)", () => {
    render(<AnalysisBanner mode="stale" busy={false} onRequest={() => {}} blocked="Add 3 cards to analyze this deck." note={NOTE} see={{ label: "See which", onPress: () => {} }} />);
    expect(screen.queryByTestId("press-note")).toBeNull();
    expect(screen.queryByRole("button", { name: /See which/ })).toBeNull();
  });
});
