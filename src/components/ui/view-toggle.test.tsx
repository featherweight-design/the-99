import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewToggle, type ViewToggleOption } from "./view-toggle";

type View = "a" | "b";

const OPTIONS: readonly [ViewToggleOption<View>, ViewToggleOption<View>] = [
  { value: "a", glyph: "≣", label: "A view" },
  { value: "b", glyph: "▦", label: "B view" },
];

describe("ViewToggle", () => {
  it("names each segment by its label, never its glyph", () => {
    render(<ViewToggle options={OPTIONS} value="a" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "A view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "B view" })).toBeInTheDocument();
    expect(screen.queryByText("≣")).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the selected segment pressed", () => {
    render(<ViewToggle options={OPTIONS} value="b" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "B view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  // `null` is the pre-hydration state (no hint, the view split by CSS): neither segment may
  // claim a view the page is not actually showing.
  it("presses neither segment when the real view is unresolved", () => {
    render(<ViewToggle options={OPTIONS} value={null} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "A view" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "B view" })).toHaveAttribute("aria-pressed", "false");
  });

  // Unresolved is painted, not blank: the app's own dual-render split draws the
  // first option below `md` and the second from `md` (collection surfaces,
  // readiness E6), so the well's look follows that split rather than showing
  // neither segment lit over a view the page is visibly drawing. `aria-pressed`
  // stays false either way (the test above) — this is paint only.
  it("paints the first option active below md and the second from md when unresolved", () => {
    render(<ViewToggle options={OPTIONS} value={null} onChange={() => {}} />);
    const a = screen.getByRole("button", { name: "A view" });
    const b = screen.getByRole("button", { name: "B view" });
    expect(a.className).toContain("bg-[color:var(--elevated)]");
    expect(a.className).toContain("md:bg-transparent");
    expect(b.className).toContain("bg-transparent");
    expect(b.className).toContain("md:bg-[color:var(--elevated)]");
    // The `md:` step has to reset weight and shadow too, not only colour — both are part of
    // the active skin, and literal classes (not a runtime-assembled `variant:` prefix, which
    // Tailwind's static scanner cannot discover) are what let this reset exist at all.
    expect(a.className).toContain("font-semibold");
    expect(a.className).toContain("md:font-normal");
    expect(a.className).toContain("md:[box-shadow:none]");
    expect(b.className).toContain("font-normal");
    expect(b.className).toContain("md:font-semibold");
    expect(b.className).toContain("md:[box-shadow:inset_0_0_0_1px_var(--border-strong)]");
  });

  it("reports the segment pressed", () => {
    const picked: string[] = [];
    render(<ViewToggle options={OPTIONS} value="a" onChange={(v) => picked.push(v)} />);
    fireEvent.click(screen.getByRole("button", { name: "B view" }));
    expect(picked).toEqual(["b"]);
  });

  // The two surfaces are one control, so the metrics are asserted here and
  // nowhere else — a second surface hand-typing them is the drift this
  // component exists to prevent.
  it("draws 44px segments on the phone and 32px on the desktop", () => {
    render(<ViewToggle options={OPTIONS} value="a" onChange={() => {}} />);
    for (const name of ["A view", "B view"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "w-[44px]",
        "h-[44px]",
        "md:w-[32px]",
        "md:h-[32px]",
      );
    }
  });

  // Accent is spent elsewhere in the builder's bar; selected reads as bone on
  // `--elevated` with a ring, the same skin the grouping pills already draw.
  it("never fills the selected segment with accent", () => {
    const { container } = render(
      <ViewToggle options={OPTIONS} value="a" onChange={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--accent");
  });

  // The chassis switches form at 1000px and `md:` is 768, so a chassis-mounted
  // toggle tells this component which form it is in rather than asking Tailwind.
  // Both overrides are asserted: emitting the desktop size for `compact` would
  // drop /collection below its 44px target, and leaving the responsive classes
  // on for `compact={false}` would put the phone size on a desktop bar.
  it("takes the compact size when told it is compact", () => {
    render(<ViewToggle options={OPTIONS} value="a" onChange={() => {}} compact />);
    const button = screen.getByRole("button", { name: "A view" });
    expect(button).toHaveClass("w-[44px]", "h-[44px]");
    expect(button.className).not.toMatch(/\bmd:w-\[32px\]/);
  });

  it("takes the wide size when told it is not", () => {
    render(<ViewToggle options={OPTIONS} value="a" onChange={() => {}} compact={false} />);
    const button = screen.getByRole("button", { name: "A view" });
    expect(button).toHaveClass("w-[32px]", "h-[32px]");
    expect(button.className).not.toMatch(/\bw-\[44px\]/);
  });

});
