import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { indexRows } from "../lib/copy-editor/match";
import type { EditorRow } from "../lib/copy-editor/rows";
import { scanPage } from "./copy-editor/scan";
import { CopyLines } from "./copy-lines";

const row = (key: string, text: string): EditorRow => ({ key, kind: "text", text, placeholders: [], context: "", readOnly: "" });
const FIRST = "Prices are a day old.";
const SECOND = "Cart totals use these prices.";
const index = indexRows([row("t#first", FIRST), row("t#second", SECOND)]);

describe("CopyLines", () => {
  it("draws exactly the text the joined string drew, for a space and for a dot separator", () => {
    const { container, rerender } = render(<p>{[FIRST, SECOND].join(" ")}</p>);
    const joined = container.textContent;
    rerender(<p><CopyLines lines={[FIRST, SECOND]} /></p>);
    expect(container.textContent).toBe(joined);
    rerender(<p>{[FIRST, SECOND].join(" · ")}</p>);
    const dotted = container.textContent;
    rerender(<p><CopyLines lines={[FIRST, SECOND]} sep=" · " /></p>);
    expect(container.textContent).toBe(dotted);
  });

  it("drops empty entries the way filter(Boolean).join did", () => {
    const { container } = render(<p><CopyLines lines={[null, FIRST, "", false, undefined, SECOND]} sep=" · " /></p>);
    expect(container.textContent).toBe(`${FIRST} · ${SECOND}`);
  });

  it("lets the copy editor find each row, which the joined string does not", () => {
    const { container, rerender } = render(<p><CopyLines lines={[FIRST, SECOND]} sep=" · " /></p>);
    expect(scanPage(index, container).map((e) => e.matches[0].row.key)).toEqual(["t#first", "t#second"]);
    rerender(<p>{[FIRST, SECOND].join(" · ")}</p>);
    expect(scanPage(index, container)).toEqual([]);
  });
});
