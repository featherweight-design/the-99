// The field's DOM helpers: which chip a Backspace or Delete takes, and where the insert engine puts a new one.
import { afterEach, describe, expect, it } from "vitest";
import { chipAtCaret, insertChip, serialize } from "./fill-field";

const label = (name: string) => `Remove ${name}`;
const field = (html: string) => {
  const host = document.createElement("div");
  host.contentEditable = "true";
  host.innerHTML = html;
  document.body.append(host);
  return host;
};
const caret = (node: Node, offset: number) => {
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(r);
};
afterEach(() => document.body.replaceChildren());

const HTML = 'Step <span data-fill="tools" contenteditable="false">⠿ tools</span> of them';

describe("chipAtCaret", () => {
  it("finds the chip right before the caret on Backspace and right after it on Delete", () => {
    const host = field(HTML);
    const [before, chip, after] = [...host.childNodes];
    caret(after, 0);
    expect(chipAtCaret(host, "back")).toBe(chip);
    expect(chipAtCaret(host, "forward")).toBeNull();
    caret(before, (before as Text).data.length);
    expect(chipAtCaret(host, "forward")).toBe(chip);
    expect(chipAtCaret(host, "back")).toBeNull();
  });
  it("looks past empty text nodes a remove or an insert leaves between the caret and the chip", () => {
    const host = field(HTML);
    const chip = host.childNodes[1];
    const empty = document.createTextNode("");
    chip.after(empty, document.createTextNode(""));
    caret(host.childNodes[3], 0);
    expect(chipAtCaret(host, "back")).toBe(chip);
    caret(host, 3);
    expect(chipAtCaret(host, "back")).toBe(chip);
    expect(empty.data).toBe("");
  });
  it("leaves the caret mid-text alone", () => {
    const host = field(HTML);
    caret(host.childNodes[2], 2);
    expect(chipAtCaret(host, "back")).toBeNull();
  });
  it("finds a chip between element offsets", () => {
    const host = field(HTML);
    caret(host, 2);
    expect(chipAtCaret(host, "back")).toBe(host.childNodes[1]);
  });
});

describe("insertChip", () => {
  it("puts the chip at the caret, with its remove label", () => {
    const host = field("Step through the tools");
    caret(host.childNodes[0], 13);
    insertChip(host, "toolCount", label);
    expect(serialize(host)).toBe("Step through {toolCount}the tools");
    expect(host.querySelector("[data-fill-remove]")?.getAttribute("aria-label")).toBe("Remove toolCount");
  });
  it("appends when the caret is outside the field", () => {
    const host = field("Hi ");
    window.getSelection()!.removeAllRanges();
    insertChip(host, "player", label);
    expect(serialize(host)).toBe("Hi {player}");
  });
});
