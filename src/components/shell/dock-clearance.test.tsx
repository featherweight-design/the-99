import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { DOCK_CLEARANCE_VAR, useDockClearance } from "./dock-clearance";

function Dock({ position, enabled = true }: { position: "fixed" | "static"; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDockClearance(ref, enabled);
  return <div ref={ref} style={{ position }} />;
}

const read = () => document.documentElement.style.getPropertyValue(DOCK_CLEARANCE_VAR);

describe("useDockClearance", () => {
  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty(DOCK_CLEARANCE_VAR);
  });

  it("publishes a fixed dock's height on the root and takes it back on unmount", () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () => ({ height: 67.4 }) as DOMRect;
    try {
      const { unmount } = render(<Dock position="fixed" />);
      expect(read()).toBe("67px");
      unmount();
      expect(read()).toBe("");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  });

  it("publishes nothing for a static bar, which is already in flow, or a disabled dock", () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () => ({ height: 67 }) as DOMRect;
    try {
      render(<Dock position="static" />);
      expect(read()).toBe("0px");
      cleanup();
      render(<Dock position="fixed" enabled={false} />);
      expect(read()).toBe("");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  });
});
