"use client";
// The editor's text field. `{name}` fill-ins are chips: they drag to move, and Backspace, Delete or the chip's ✕ removes
// one, so a field built from a textarea would not do. The value is the plain string the copy sheet takes
// (`Last active {ago}`); the DOM is built from it on mount and edited in place after that.
import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";

const CHIP = "data-fill";
const REMOVE = "data-fill-remove";

/** The field's insert engine, for a control that lists a line's unused fill-ins (`unusedFills`). */
export type FillFieldHandle = { insertFill: (name: string) => void };

function chip(name: string, removeLabel: (name: string) => string): HTMLSpanElement {
  const el = document.createElement("span");
  el.setAttribute(CHIP, name);
  el.contentEditable = "false";
  el.draggable = true;
  el.textContent = `⠿ ${name}`;
  el.className =
    "mx-[1px] inline-flex items-center gap-[2px] cursor-grab rounded-[6px] border border-[color:color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] pl-[6px] font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--accent-text)]";
  const x = document.createElement("button");
  x.type = "button";
  x.setAttribute(REMOVE, "");
  x.setAttribute("aria-label", removeLabel(name));
  x.tabIndex = -1;
  x.textContent = "✕";
  x.className = "flex h-[20px] min-w-[20px] items-center justify-center rounded-[6px] px-[3px] text-[10px] leading-none text-[color:var(--accent-text)]";
  el.append(x);
  return el;
}

function build(host: HTMLElement, value: string, removeLabel: (name: string) => string) {
  host.replaceChildren();
  for (const part of value.split(/(\{[^{}]+\})/)) {
    if (!part) continue;
    const hole = /^\{([^{}]+)\}$/.exec(part);
    host.append(hole ? chip(hole[1], removeLabel) : document.createTextNode(part));
  }
}

export function serialize(host: HTMLElement): string {
  let out = "";
  host.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += (n as Text).data;
    else if (n instanceof HTMLElement && n.hasAttribute(CHIP)) out += `{${n.getAttribute(CHIP)}}`;
  });
  return out.replace(/ /g, " ");
}

/** The chip right before (Backspace) or after (Delete) a collapsed caret in the field, or null. */
export function chipAtCaret(host: HTMLElement, dir: "back" | "forward"): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const { startContainer: c, startOffset: o } = sel.getRangeAt(0);
  if (!host.contains(c)) return null;
  let node: Node | null;
  if (c === host) node = host.childNodes[dir === "back" ? o - 1 : o] ?? null;
  else if (c.nodeType === Node.TEXT_NODE && c.parentNode === host) {
    const len = (c as Text).data.length;
    if (dir === "back" ? o > 0 : o < len) return null;
    node = dir === "back" ? c.previousSibling : c.nextSibling;
  } else return null;
  return node instanceof HTMLElement && node.hasAttribute(CHIP) ? node : null;
}

/** Puts a chip for `name` at the caret when the caret is in the field, else at the end, and leaves the caret after it. */
export function insertChip(host: HTMLElement, name: string, removeLabel: (name: string) => string) {
  const el = chip(name, removeLabel);
  const sel = window.getSelection();
  const range = sel && sel.rangeCount > 0 && host.contains(sel.getRangeAt(0).startContainer) ? sel.getRangeAt(0) : null;
  if (range) {
    range.deleteContents();
    range.insertNode(el);
  } else host.append(el);
  const after = document.createRange();
  after.setStartAfter(el);
  after.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(after);
}

export function FillField({
  value,
  onChange,
  invalid,
  label,
  removeLabel,
  autoFocus,
  handle,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid: boolean;
  label: string;
  removeLabel: (name: string) => string;
  autoFocus?: boolean;
  handle?: Ref<FillFieldHandle>;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    build(el, value, removeLabel);
    if (autoFocus) el.focus();
    // Mounted once per field: the parent keys it by row, and later values come from this field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = useCallback(() => {
    if (host.current) onChange(serialize(host.current));
  }, [onChange]);

  const remove = useCallback(
    (c: HTMLElement) => {
      const el = host.current;
      if (!el) return;
      const range = document.createRange();
      range.setStartBefore(c);
      range.collapse(true);
      c.remove();
      el.focus();
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      commit();
    },
    [commit],
  );

  useImperativeHandle(
    handle,
    () => ({
      insertFill: (name: string) => {
        if (!host.current) return;
        insertChip(host.current, name, removeLabel);
        commit();
      },
    }),
    [commit, removeLabel],
  );

  return (
    <div
      ref={host}
      role="textbox"
      aria-multiline="false"
      aria-label={label}
      aria-invalid={invalid}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onInput={commit}
      onKeyDown={(e) => {
        if (e.key !== "Backspace" && e.key !== "Delete") return;
        const c = host.current && chipAtCaret(host.current, e.key === "Backspace" ? "back" : "forward");
        if (!c) return;
        e.preventDefault();
        remove(c);
      }}
      onMouseDown={(e) => {
        // The ✕ acts on press, before the browser moves the caret into the chip or starts a drag.
        const x = (e.target as HTMLElement).closest(`[${REMOVE}]`);
        const c = x?.closest(`[${CHIP}]`);
        if (!(c instanceof HTMLElement)) return;
        e.preventDefault();
        remove(c);
      }}
      onBeforeInput={(e) => {
        if ((e.nativeEvent as InputEvent).inputType === "insertParagraph" || (e.nativeEvent as InputEvent).inputType === "insertLineBreak") e.preventDefault();
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " "));
      }}
      className={`min-h-[44px] w-full whitespace-pre-wrap break-words rounded-[10px] border bg-[color:var(--surface)] px-3 py-[10px] text-[15px] leading-[1.45] text-[color:var(--fg)] outline-none focus:ring-2 ${
        invalid ? "border-[color:var(--danger)] focus:ring-[color:var(--danger)]" : "border-[color:var(--border-strong)] focus:ring-[color:var(--accent)]"
      }`}
    />
  );
}
