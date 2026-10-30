import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutoGrow } from "./use-auto-grow";

function Box({ text }: { text: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(ref, text);
  return <textarea ref={ref} value={text} readOnly aria-label="box" />;
}

function Editor({ text, open }: { text: string; open: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(ref, text, open);
  return open ? <textarea ref={ref} value={text} readOnly aria-label="box" /> : null;
}

const realObserver = globalThis.ResizeObserver;
afterEach(() => { globalThis.ResizeObserver = realObserver; vi.restoreAllMocks(); });

describe("useAutoGrow", () => {
  it("sets the height to the field's own scrollHeight, and again when the words change", () => {
    let content = 86;
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(() => content);
    const { getByLabelText, rerender } = render(<Box text="one line" />);
    expect((getByLabelText("box") as HTMLTextAreaElement).style.height).toBe("86px");
    content = 120;
    rerender(<Box text={"one line and then a good many more words that wrap onto a third line"} />);
    expect((getByLabelText("box") as HTMLTextAreaElement).style.height).toBe("120px");
  });

  it("writes no inline height at all where layout reports none (jsdom, display:none), so the CSS size stands", () => {
    const { getByLabelText } = render(<Box text="words" />);
    expect((getByLabelText("box") as HTMLTextAreaElement).style.height).toBe("");
  });

  it("leaves a CSS-sized field untouched while it measures 0 (hidden), not stuck at auto", () => {
    function Sized({ text }: { text: string }) {
      const ref = useRef<HTMLTextAreaElement>(null);
      useAutoGrow(ref, text);
      return <textarea ref={ref} value={text} readOnly aria-label="box" style={{ height: 40 }} />;
    }
    const { getByLabelText, rerender } = render(<Sized text="words" />);
    rerender(<Sized text="more words" />);
    expect((getByLabelText("box") as HTMLTextAreaElement).style.height).toBe("40px");
  });

  it("sizes a field that mounts later on the same words (an editor opened in place)", () => {
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockReturnValue(80);
    const { getByLabelText, rerender } = render(<Editor text="same words" open={false} />);
    rerender(<Editor text="same words" open />);
    expect((getByLabelText("box") as HTMLTextAreaElement).style.height).toBe("80px");
  });

  it("measures again when a late web font finishes loading, and stops listening on unmount", async () => {
    const listeners = new Set<() => void>();
    let ready: () => void = () => {};
    const fonts = {
      ready: new Promise<void>((resolve) => { ready = resolve; }),
      addEventListener: (type: string, fn: () => void) => { if (type === "loadingdone") listeners.add(fn); },
      removeEventListener: (type: string, fn: () => void) => { if (type === "loadingdone") listeners.delete(fn); },
    };
    const own = Object.getOwnPropertyDescriptor(document, "fonts");
    Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
    try {
      let content = 72;
      vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(() => content);
      const { getByLabelText, unmount } = render(<Box text="words" />);
      const box = getByLabelText("box") as HTMLTextAreaElement;
      expect(box.style.height).toBe("72px");
      // The swapped-in font wraps the same words onto another line: the box is unchanged, so only the font says so.
      content = 96;
      for (const fn of listeners) fn();
      expect(box.style.height).toBe("96px");
      content = 120;
      ready();
      await Promise.resolve();
      await Promise.resolve();
      expect(box.style.height).toBe("120px");
      unmount();
      expect(listeners.size).toBe(0);
    } finally {
      if (own) Object.defineProperty(document, "fonts", own);
      else delete (document as { fonts?: unknown }).fonts;
    }
  });

  it("re-measures on a resize of the field, and disconnects on unmount", () => {
    const observed: Element[] = [];
    const disconnect = vi.fn();
    const observer: { fire?: () => void } = {};
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) { observer.fire = callback; }
      observe(el: Element) { observed.push(el); }
      unobserve() {}
      disconnect = disconnect;
    } as unknown as typeof ResizeObserver;
    let content = 72;
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(() => content);
    const { getByLabelText, unmount } = render(<Box text="words" />);
    const box = getByLabelText("box") as HTMLTextAreaElement;
    expect(observed).toContain(box);
    expect(box.style.height).toBe("72px");
    // A narrower box (a rotation): the same words wrap onto more lines, and only the observer says so.
    content = 118;
    expect(observer.fire).toBeDefined();
    observer.fire?.();
    expect(box.style.height).toBe("118px");
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
