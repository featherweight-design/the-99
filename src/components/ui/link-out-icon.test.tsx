import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkOutIcon, LinkOutLabel } from "./link-out-icon";

describe("LinkOutIcon", () => {
  it("draws the board's box and arrow (R1b-3) in the text's colour, hidden from assistive tech", () => {
    const { container } = render(<LinkOutIcon />);
    const svg = container.querySelector("svg[data-link-out]")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("fill")).toBe("none");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("stroke-width")).toBe("2.4");
    expect(svg.getAttribute("stroke-linecap")).toBe("round");
    expect(svg.getAttribute("stroke-linejoin")).toBe("round");
    expect([...svg.querySelectorAll("path")].map((p) => p.getAttribute("d"))).toEqual([
      "M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5",
      "M15 3h6v6",
      "M10.5 13.5 21 3",
    ]);
  });

  it("sizes itself as the board does: a 0.72em square on the baseline, 0.3em after the word, never squeezed", () => {
    const { container } = render(<LinkOutIcon className="text-[color:var(--fg-muted)]" />);
    const cls = container.querySelector("svg")!.getAttribute("class")!.split(" ");
    expect(cls).toEqual(expect.arrayContaining(["inline-block", "w-[.72em]", "h-[.72em]", "align-[-.02em]", "ml-[.3em]", "flex-none", "text-[color:var(--fg-muted)]"]));
  });
});

describe("LinkOutLabel", () => {
  it("binds the icon to the last word in one no-wrap run, leaving the words exactly as written", () => {
    const { container } = render(<LinkOutLabel>Fan Content Policy</LinkOutLabel>);
    const label = container.firstElementChild!;
    expect(label.textContent).toBe("Fan Content Policy");
    const run = label.querySelector("svg[data-link-out]")!.parentElement!;
    expect(run.textContent).toBe("Policy");
    expect(run.className).toBe("whitespace-nowrap");
  });

  it("binds a one-word label whole", () => {
    const { container } = render(<LinkOutLabel>Receipt</LinkOutLabel>);
    const run = container.querySelector("svg[data-link-out]")!.parentElement!;
    expect(run.textContent).toBe("Receipt");
    expect(container.firstElementChild!.textContent).toBe("Receipt");
  });
});
