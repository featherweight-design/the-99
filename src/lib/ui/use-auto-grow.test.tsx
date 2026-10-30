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

  it("writes no height where layout reports none (jsdom), so the CSS floor holds", () => {
    const { getByLabelText } = render(<Box text="words" />);
    expect((getByLabelText("box") as HTMLTextAreaElement).style.height).toBe("auto");
  });

  it("sizes a field that mounts later on the same words (an editor opened in place)", () => {
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockReturnValue(80);
    const { getByLabelText, rerender } = render(<Editor text="same words" open={false} />);
    rerender(<Editor text="same words" open />);
    expect((getByLabelText("box") as HTMLTextAreaElement).style.height).toBe("80px");
  });

  it("re-measures on a resize of the field, and disconnects on unmount", () => {
    const observed: Element[] = [];
    const disconnect = vi.fn();
    globalThis.ResizeObserver = class { observe(el: Element) { observed.push(el); } unobserve() {} disconnect = disconnect; } as unknown as typeof ResizeObserver;
    const { getByLabelText, unmount } = render(<Box text="words" />);
    expect(observed).toContain(getByLabelText("box"));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
