// The overview check's *See which →* in the credit note's slot (deck notices HANDOFF §6). The note
// is the press's `aria-describedby` target, so the description must read the note's words alone
// and never the control after them; and a blocked press (F13) draws neither.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalysisEmpty } from "./analysis-empty";

const NOTE = "Reads the bracket only. The overview waits until every card is legal in this deck.";

describe("AnalysisEmpty's check note", () => {
  it("describes the press by the note's text alone, and See which opens Notices", () => {
    const onSee = vi.fn();
    render(<AnalysisEmpty phase="idle" onRequest={() => {}} note={NOTE} see={{ label: "See which", onPress: onSee }} />);
    const press = screen.getByRole("button", { name: "Analyze" });
    const id = press.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toBe(NOTE);
    fireEvent.click(screen.getByRole("button", { name: /See which/ }));
    expect(onSee).toHaveBeenCalledOnce();
  });

  it("draws no note and no See which over a blocked press (F13)", () => {
    render(<AnalysisEmpty phase="idle" onRequest={() => {}} blocked="Add 3 cards to analyze this deck." note={NOTE} see={{ label: "See which", onPress: () => {} }} />);
    expect(screen.queryByTestId("press-note")).toBeNull();
    expect(screen.queryByRole("button", { name: /See which/ })).toBeNull();
  });
});

describe("AnalysisEmpty's description field (H35, STATES §1)", () => {
  it("draws the field only while idle, never during loading", () => {
    const { rerender } = render(<AnalysisEmpty phase="idle" onRequest={() => {}} description={null} />);
    expect(screen.getByLabelText("Deck description")).toBeInTheDocument();
    rerender(<AnalysisEmpty phase="loading" onRequest={() => {}} description={null} />);
    expect(screen.queryByLabelText("Deck description")).toBeNull();
  });

  it("awaits the save before the press reads", async () => {
    const order: string[] = [];
    let resolveSave!: (r: { ok: true }) => void;
    const onSaveDescription = vi.fn(() => new Promise<{ ok: true }>((r) => { resolveSave = r; }));
    const onRequest = vi.fn(() => { order.push("request"); });
    render(<AnalysisEmpty phase="idle" onRequest={onRequest} description={null} onSaveDescription={onSaveDescription} />);
    fireEvent.change(screen.getByLabelText("Deck description"), { target: { value: "Grind it out." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    expect(onRequest).not.toHaveBeenCalled();
    order.push("save-called");
    resolveSave({ ok: true });
    await Promise.resolve();
    await Promise.resolve();
    expect(onSaveDescription).toHaveBeenCalledWith("Grind it out.");
    expect(onRequest).toHaveBeenCalledOnce();
    expect(order).toEqual(["save-called", "request"]);
  });

  it("saves nothing when the text is unchanged", () => {
    const onSaveDescription = vi.fn();
    render(<AnalysisEmpty phase="idle" onRequest={() => {}} description="Same." onSaveDescription={onSaveDescription} />);
    fireEvent.blur(screen.getByLabelText("Deck description"));
    expect(onSaveDescription).not.toHaveBeenCalled();
  });
});
