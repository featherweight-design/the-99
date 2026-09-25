// The form mounts where the platform lacks ResizeObserver (older WebViews): the dock is measured
// once and on resize instead, and the form renders rather than throwing on mount.

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { IntakeForm } = await import("./intake-form");
const { emptyParams } = await import("../../lib/intake/params");

const saved = globalThis.ResizeObserver;
afterEach(() => {
  globalThis.ResizeObserver = saved;
});

describe("the intake form", () => {
  it("renders with no ResizeObserver, and listens for resizes instead", () => {
    // @ts-expect-error: the platform this guards has none.
    delete globalThis.ResizeObserver;
    const listen = vi.spyOn(window, "addEventListener");
    render(<IntakeForm themes={[]} initial={emptyParams()} />);
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
    expect(listen.mock.calls.some(([type]) => type === "resize")).toBe(true);
    listen.mockRestore();
  });
});
