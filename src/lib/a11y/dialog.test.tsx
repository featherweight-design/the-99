import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialogA11y } from "./dialog";

// The trap roots below are appended by hand rather than rendered, so Testing
// Library's automatic cleanup does not know about them.
const appended: HTMLElement[] = [];

afterEach(() => {
  document.body.style.overflow = "";
  while (appended.length) appended.pop()?.remove();
});

// Scroll locking only. The hook takes a ref, so the harness supplies an empty
// one — nothing is attached, which leaves the focus trap inert and keeps these
// cases isolated to the lock.
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

// Escape is wired to a window listener but no-ops unless the ref holds an
// element, so these cases attach a real one.
describe("useDialogA11y closeOnEscape", () => {
  function renderWithElement(options?: Parameters<typeof useDialogA11y>[2]) {
    const onClose = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, onClose, options);
    });
    return { onClose };
  }

  function pressEscape() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  }

  it("closes on Escape by default", () => {
    const { onClose } = renderWithElement();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when closeOnEscape is false", () => {
    const { onClose } = renderWithElement({ closeOnEscape: false });
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useDialogA11y scroll lock", () => {
  it("locks body scroll by default", () => {
    renderDialog();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("locks body scroll when asked", () => {
    renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("leaves body scroll alone when a consumer opts out", () => {
    renderDialog({ lockScroll: false });
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the previous overflow on unmount", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  // lockScroll is a plain option, so a caller may flip it on a mounted dialog
  // rather than unmounting. The lock has to follow the flag either way.
  it("releases the lock when the flag goes false without unmounting", () => {
    const { rerender } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    rerender({ opts: { lockScroll: false } });
    expect(document.body.style.overflow).toBe("");
    rerender({ opts: { lockScroll: true } });
    expect(document.body.style.overflow).toBe("hidden");
  });

  // The deck builder's add sheet and export dialog are independent flags, so
  // both can be up at once and either may close first.
  it("holds the lock until the last of two dialogs releases it", () => {
    document.body.style.overflow = "scroll";
    const first = renderDialog({ lockScroll: true });
    const second = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");

    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    second.unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });
});
