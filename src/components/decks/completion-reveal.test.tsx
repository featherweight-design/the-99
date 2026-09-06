import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompletionReveal } from "./completion-reveal";

function renderReveal(overrides: Partial<Parameters<typeof CompletionReveal>[0]> = {}) {
  const onDismiss = vi.fn();
  const onExport = vi.fn();
  render(
    <CompletionReveal
      commanderShortName="Korvold"
      onDismiss={onDismiss}
      onExport={onExport}
      {...overrides}
    />,
  );
  return { onDismiss, onExport };
}

describe("CompletionReveal", () => {
  it("renders the mock's heading and caption naming the commander", () => {
    renderReveal();
    expect(screen.getByRole("heading", { name: "Ninety-nine." })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Korvold has a full deck. Sleeve it up before you change your mind.",
      ),
    ).toBeInTheDocument();
  });

  it("offers both CTAs and fires the matching callback", () => {
    const { onDismiss, onExport } = renderReveal();

    fireEvent.click(screen.getByRole("button", { name: "Export decklist" }));
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Back to the deck" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has no auto-dismiss timer — the band is dismissible only", () => {
    vi.useFakeTimers();
    try {
      const { onDismiss } = renderReveal();
      vi.advanceTimersByTime(10_000);
      expect(onDismiss).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("is a band, not a full-surface overlay — no fixed positioning", () => {
    renderReveal();
    const band = screen.getByRole("heading", { name: "Ninety-nine." }).closest("section");
    expect(band).not.toBeNull();
    expect(band!.className).toContain("h-[420px]");
    expect(band!.className).toContain("md:h-[380px]");
    expect(band!.className).not.toContain("fixed");
    expect(band!.className).not.toContain("inset-0");
  });

  it("carries the app's one loud crown and no illustration", () => {
    const { container } = render(
      <CompletionReveal commanderShortName="Korvold" onDismiss={vi.fn()} onExport={vi.fn()} />,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    const diamonds = Array.from(svgs[0].querySelectorAll("rect"));
    expect(diamonds).toHaveLength(3);
    for (const d of diamonds) {
      expect(d.getAttribute("fill")).toBe("var(--accent)");
    }
    // Loud is the enlarged geometry — 15/20/15 against the quiet 8/11/8.
    expect(diamonds.map((d) => d.getAttribute("width"))).toEqual(["15", "20", "15"]);
  });

  // Reduced motion is handled entirely in globals.css, which zeroes the
  // animation on .anim-rise. What this asserts is that the reveal uses exactly
  // that class — nothing here sets opacity or a transform of its own, so with
  // `animation: none` the frame still reads as a win: text at opacity 1.
  it("uses only the shared motion classes, so the reduced-motion frame is complete", () => {
    const { container } = render(
      <CompletionReveal commanderShortName="Korvold" onDismiss={vi.fn()} onExport={vi.fn()} />,
    );
    const rise = container.querySelector(".anim-rise");
    expect(rise).not.toBeNull();
    expect((rise as HTMLElement).style.opacity).toBe("");
    expect((rise as HTMLElement).style.transform).toBe("");
  });
});
