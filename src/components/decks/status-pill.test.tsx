import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPillBadge } from "./status-pill";
import { refreshCopy } from "../../lib/copy/refresh";
import type { StatusPill } from "../../lib/decks/status";

const ALL: StatusPill[] = ["Draft", "Building", "Over", "Unresolved", "To buy", "Complete"];

describe("StatusPillBadge", () => {
  it("labels every status from the shipped copy file", () => {
    for (const status of ALL) {
      const { unmount } = render(<StatusPillBadge status={status} />);
      expect(screen.getByText(status)).toBeTruthy();
      unmount();
    }
    expect(Object.values(refreshCopy.status)).toEqual(ALL);
  });

  it("renders one element per pill, with the phone and desktop sizes on it", () => {
    const { container } = render(<StatusPillBadge status="Complete" />);
    const pills = container.querySelectorAll("span");
    expect(pills.length).toBe(1);
    const cls = pills[0].className;
    // Phone first, desktop behind `sm:` — one element, never two subtrees.
    expect(cls).toContain("h-[24px]");
    expect(cls).toContain("sm:h-[22px]");
    expect(cls).toContain("text-[11px]");
    expect(cls).toContain("sm:text-[10.5px]");
    expect(cls).toContain("rounded-[6px]");
    expect(cls).toContain("font-mono");
  });

  it("writes no colour of its own — the style comes from the token file", () => {
    const { container } = render(<StatusPillBadge status="Over" />);
    const pill = container.querySelector("span")!;
    expect(pill.className).not.toMatch(/text-\[color:|bg-\[|border-\[color:/);
    expect(pill.getAttribute("style")).toContain("--danger");
  });

  // The dashed/solid split itself is pinned in status-style.test.ts; this only
  // checks the token file's border reaches the DOM at all.
  it("carries Building's dashed hairline through to the rendered style", () => {
    const { container } = render(<StatusPillBadge status="Building" />);
    expect(container.querySelector("span")!.getAttribute("style")).toContain("dashed");
  });

  // `text-shadow` is inherited, and this pill is drawn inside blocks that put a
  // cover shadow on their ink — so without refusing it the plated exception
  // picked up the shadow it exists to avoid. Refused centrally, so no surface
  // has to remember.
  it("carries no text shadow, whatever block it sits in", () => {
    render(<StatusPillBadge status="Building" />);
    expect(screen.getByText("Building").style.textShadow).toBe("none");
  });
});
