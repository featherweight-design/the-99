// The overview check's *See which →* in the credit note's slot (deck notices HANDOFF §6). The note
// is the press's `aria-describedby` target, so the description must read the note's words alone
// and never the control after them; and a blocked press (F13) draws neither.
import { act, fireEvent, render, screen } from "@testing-library/react";
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
  // Round 6: giving this span `role="status"` unconditionally planted a second, always-present
  // status region beside `AnalysisPanel`'s own (for the reading-settled announcement) on every
  // render, not only the one right after a description save — breaking any caller that queries
  // by role rather than by this component's own `screen` instance.
  it("carries no status role until there is something to announce", () => {
    render(<AnalysisEmpty phase="loading" onRequest={() => {}} description={null} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("draws the field only while idle, never during loading", () => {
    const { rerender } = render(<AnalysisEmpty phase="idle" onRequest={() => {}} description={null} />);
    expect(screen.getByLabelText("Describe your deck")).toBeInTheDocument();
    rerender(<AnalysisEmpty phase="loading" onRequest={() => {}} description={null} />);
    expect(screen.queryByLabelText("Describe your deck")).toBeNull();
  });

  it("awaits the save before the press reads", async () => {
    const order: string[] = [];
    let resolveSave!: (r: { ok: true }) => void;
    const onSaveDescription = vi.fn(() => new Promise<{ ok: true }>((r) => { resolveSave = r; }));
    const onRequest = vi.fn(() => { order.push("request"); });
    render(<AnalysisEmpty phase="idle" onRequest={onRequest} description={null} onSaveDescription={onSaveDescription} />);
    fireEvent.change(screen.getByLabelText("Describe your deck"), { target: { value: "Grind it out." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    expect(onRequest).not.toHaveBeenCalled();
    // The callback is deferred through one microtask (round 5: a callback that throws
    // synchronously must still suspend at `await`), so it has not run yet at this point.
    await act(async () => { await Promise.resolve(); });
    order.push("save-called");
    resolveSave({ ok: true });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onSaveDescription).toHaveBeenCalledWith("Grind it out.");
    expect(onRequest).toHaveBeenCalledOnce();
    expect(order).toEqual(["save-called", "request"]);
  });

  it("saves nothing when the text is unchanged", () => {
    const onSaveDescription = vi.fn();
    render(<AnalysisEmpty phase="idle" onRequest={() => {}} description="Same." onSaveDescription={onSaveDescription} />);
    fireEvent.blur(screen.getByLabelText("Describe your deck"));
    expect(onSaveDescription).not.toHaveBeenCalled();
  });

  // Pre-open review: a refused or thrown save must never read, and must not leave the field
  // stuck looking busy.
  it("does not read, and shows the refusal, when the save is refused", async () => {
    const onSaveDescription = vi.fn(async () => ({ ok: false as const, message: "That did not save. Try again." }));
    const onRequest = vi.fn();
    render(<AnalysisEmpty phase="idle" onRequest={onRequest} description={null} onSaveDescription={onSaveDescription} />);
    fireEvent.change(screen.getByLabelText("Describe your deck"), { target: { value: "Grind it out." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByText("That did not save. Try again.")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe your deck")).not.toHaveAttribute("readonly");
  });

  it("does not read, and resets the saving state, when the save rejects", async () => {
    const onSaveDescription = vi.fn(async () => { throw new Error("network"); });
    const onRequest = vi.fn();
    render(<AnalysisEmpty phase="idle" onRequest={onRequest} description={null} onSaveDescription={onSaveDescription} />);
    fireEvent.change(screen.getByLabelText("Describe your deck"), { target: { value: "Grind it out." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Describe your deck")).not.toHaveAttribute("readonly");
  });

  // A callback that THROWS SYNCHRONOUSLY rather than returning a rejected promise — the shape
  // a careless caller is more likely to write than an async rejection. Without deferring it
  // through a microtask, the in-flight-promise guard's own `finally` ran before the ref was
  // ever set to the promise, leaving it stuck and every later save a silent no-op.
  it("can retry after a save callback that throws synchronously, not just one that rejects", async () => {
    let calls = 0;
    const onSaveDescription = vi.fn(() => {
      calls += 1;
      if (calls === 1) throw new Error("sync boom");
      return Promise.resolve({ ok: true as const });
    });
    const onRequest = vi.fn();
    render(<AnalysisEmpty phase="idle" onRequest={onRequest} description={null} onSaveDescription={onSaveDescription} />);
    const field = screen.getByLabelText("Describe your deck");
    fireEvent.change(field, { target: { value: "Grind it out." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(onRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(onSaveDescription).toHaveBeenCalledTimes(2);
    expect(onRequest).toHaveBeenCalledOnce();
  });

  // Pre-open review: a revalidated description must not clobber an unsaved, in-progress edit.
  it("keeps an unsaved edit across a revalidation that brings a different description", () => {
    const { rerender } = render(<AnalysisEmpty phase="idle" onRequest={() => {}} description={null} />);
    fireEvent.change(screen.getByLabelText("Describe your deck"), { target: { value: "Still typing…" } });
    rerender(<AnalysisEmpty phase="idle" onRequest={() => {}} description="Saved from the header." />);
    expect(screen.getByLabelText("Describe your deck")).toHaveValue("Still typing…");
  });

  // Pre-open review round 2: a successful save on blur announces itself through a status region.
  it("announces a successful save", async () => {
    const onSaveDescription = vi.fn(async () => ({ ok: true as const }));
    render(<AnalysisEmpty phase="idle" onRequest={() => {}} description={null} onSaveDescription={onSaveDescription} />);
    fireEvent.change(screen.getByLabelText("Describe your deck"), { target: { value: "Grind it out." } });
    await act(async () => {
      fireEvent.blur(screen.getByLabelText("Describe your deck"));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Saved the description.");
  });

  // Round 6: Analyze's own success callback calls `onRequest`, which can flip the panel to
  // `loading` immediately — and the status region used to live only inside the idle-only
  // block, so it unmounted (taking the announcement with it) before a screen reader read it.
  it("keeps the save announcement live even once Analyze switches the panel to loading", async () => {
    const onSaveDescription = vi.fn(async () => ({ ok: true as const }));
    const onRequest = vi.fn();
    const { rerender } = render(
      <AnalysisEmpty phase="idle" onRequest={onRequest} description={null} onSaveDescription={onSaveDescription} />,
    );
    fireEvent.change(screen.getByLabelText("Describe your deck"), { target: { value: "Grind it out." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(onRequest).toHaveBeenCalledOnce();
    // The caller's real `onRequest` would switch `phase` to "loading" about now.
    rerender(<AnalysisEmpty phase="loading" onRequest={onRequest} description="Grind it out." onSaveDescription={onSaveDescription} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved the description.");
  });

  // Pre-open review round 2: blur starts a save, then an Analyze click a moment later must join
  // that SAME save rather than firing a second one that could race it.
  it("joins a save already started by blur rather than starting a second one", async () => {
    let calls = 0;
    const onSaveDescription = vi.fn(async () => {
      calls += 1;
      await Promise.resolve();
      return { ok: true as const };
    });
    const onRequest = vi.fn();
    render(<AnalysisEmpty phase="idle" onRequest={onRequest} description={null} onSaveDescription={onSaveDescription} />);
    const field = screen.getByLabelText("Describe your deck");
    fireEvent.change(field, { target: { value: "Grind it out." } });
    fireEvent.blur(field);
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(calls).toBe(1);
    expect(onRequest).toHaveBeenCalledOnce();
  });
});
