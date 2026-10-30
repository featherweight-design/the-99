import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardTagList } from "./card-tag-picker";
import { TaggedBox } from "./tagged-box";
import { useTaggedField } from "./use-tagged-field";

function Harness() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("hello");
  const { field, picker } = useTaggedField({ value: body, onChange: setBody, search: async () => [], max: 240, maxTags: 5, field: ref });
  return (
    <div>
      <button type="button">elsewhere</button>
      <TaggedBox onInsert={picker.insertTag} open={picker.open} count={field.text.length} max={240}>
        <textarea
          ref={ref}
          aria-label="field"
          value={field.text}
          onChange={(e) => picker.typed(e.target.value, e.target.selectionStart)}
          {...picker.fieldProps}
        />
      </TaggedBox>
      <CardTagList {...picker.list} />
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the tag key with the field unfocused", () => {
  it("keeps the picker open and the caret between the brackets once the next frame has run", () => {
    vi.useFakeTimers();
    render(<Harness />);
    const field = screen.getByLabelText("field") as HTMLTextAreaElement;
    field.setSelectionRange(5, 5);
    screen.getByRole("button", { name: "elsewhere" }).focus();
    expect(document.activeElement).not.toBe(field);
    fireEvent.click(screen.getByRole("button", { name: "Insert a card tag" }));
    act(() => { vi.runAllTimers(); });
    expect(field.value).toBe("hello[[]]");
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(7);
    expect(screen.getByRole("button", { name: "Insert a card tag" }).className).toContain("bg-[color:var(--elevated)]");
  });
});
