import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialogA11y } from "./dialog";

afterEach(() => {
  document.body.style.overflow = "";
});

// The hook takes a ref, so each case drives it through a tiny harness that
// creates one and mounts a real element for the trap to look at.
function renderDialog(options?: Parameters<typeof useDialogA11y>[2]) {
  return renderHook(
    ({ opts }: { opts?: Parameters<typeof useDialogA11y>[2] }) => {
      const ref = useRef<HTMLDivElement | null>(null);
      useDialogA11y(ref, vi.fn(), opts);
      return ref;
    },
    { initialProps: { opts: options } },
  );
}

describe("useDialogA11y scroll lock", () => {
  it("leaves body scroll alone by default", () => {
    renderDialog();
    expect(document.body.style.overflow).toBe("");
  });

  it("locks body scroll when asked", () => {
    renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores the previous overflow on unmount", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  // ExportDialog stays mounted while closed and passes lockScroll={open}, so
  // toggling the flag has to release and re-take the lock.
  it("releases the lock when the flag goes false without unmounting", () => {
    const { rerender } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    rerender({ opts: { lockScroll: false } });
    expect(document.body.style.overflow).toBe("");
    rerender({ opts: { lockScroll: true } });
    expect(document.body.style.overflow).toBe("hidden");
  });
});
