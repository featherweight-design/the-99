// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { indexRows } from "../../lib/copy-editor/match";
import type { EditorRow } from "../../lib/copy-editor/rows";
import { entryAt, OVERLAY_ATTR, scanPage, type Placed } from "./scan";

const row = (key: string, text: string, readOnly = ""): EditorRow => ({ key, kind: readOnly ? "edit in code" : "text", text, placeholders: [], context: "", readOnly });
const index = indexRows([row("a#title", "Zzyzx gadget heading"), row("a#count", "{n} picks"), row("a#locked", "Fixed words", "edit in code: built by x")]);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanPage", () => {
  it("finds a known line, a template across text nodes, and leaves unknown text alone", () => {
    document.body.innerHTML = `<h1>Zzyzx gadget heading</h1><p><span>3</span> picks</p><p>Thrasios, Triton Hero</p>`;
    const found = scanPage(index).map((e) => e.matches[0].row.key);
    expect(found).toEqual(["a#title", "a#count"]);
  });

  it("marks a read-only row", () => {
    document.body.innerHTML = `<p>Fixed words</p>`;
    expect(scanPage(index)[0].readOnly).toBe("edit in code: built by x");
  });

  it("never scans the overlay's own nodes, scripts or fields", () => {
    document.body.innerHTML = `<div ${OVERLAY_ATTR}><p>Zzyzx gadget heading</p></div><script>Zzyzx gadget heading</script><textarea>Zzyzx gadget heading</textarea>`;
    expect(scanPage(index)).toEqual([]);
  });
});

describe("entryAt", () => {
  const at = (id: number, x: number, y: number, w: number, h: number) => ({ entry: { id } as never, box: { x, y, w, h }, clipped: false }) as Placed;
  it("takes the smallest box that holds the point, so a word inside a paragraph wins", () => {
    const list = [at(1, 0, 0, 400, 200), at(2, 10, 10, 50, 20)];
    expect(entryAt(list, 20, 15)?.entry.id).toBe(2);
    expect(entryAt(list, 300, 150)?.entry.id).toBe(1);
    expect(entryAt(list, 900, 900)).toBeNull();
  });
});
