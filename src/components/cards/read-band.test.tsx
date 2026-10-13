import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FailedBand, OfferBand, RunningBand } from "./read-band";

// The sweep (`.ai-sweep`, globals.css) rides a read's band only while the read runs. The browser half is
// `pnpm probe:ai-sweep`; this holds the class to the running band and the stylesheet to its fallbacks.
describe("the read band's border sweep", () => {
  it("is on the running band", () => {
    render(<RunningBand title="Reading" elapsed="0:04" />);
    expect(screen.getByTestId("read-band-running")).toHaveClass("ai-sweep");
  });

  it("is off the offer and the failure, so it never runs behind an answer or an error", () => {
    const { rerender } = render(<OfferBand lead="l" cardName="C" blocked={false} spent={false} standing="s" onPress={() => {}} />);
    expect(screen.getByTestId("read-band-offer")).not.toHaveClass("ai-sweep");
    rerender(<FailedBand blocked={false} spent={false} standing="s" onRetry={() => {}} />);
    expect(screen.getByTestId("read-band-failed")).not.toHaveClass("ai-sweep");
  });
});

describe("the .ai-sweep stylesheet", () => {
  const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  const rule = css.slice(css.indexOf(".ai-sweep { position: relative; }"));

  it("animates only under no-preference, over a static accent ring", () => {
    expect(css).toContain('@property --ai-sweep-angle { syntax: "<angle>"');
    const staticRing = rule.slice(0, rule.indexOf("@media"));
    expect(staticRing).toContain("background: var(--accent);");
    expect(staticRing).not.toContain("animation");
    const motion = rule.slice(rule.indexOf("@media (prefers-reduced-motion: no-preference)"), rule.indexOf("@keyframes ai-sweep"));
    expect(motion).toContain("animation: ai-sweep var(--motion-loop) var(--motion-ease) var(--motion-delay) infinite");
  });
});
