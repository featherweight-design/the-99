"use client";
// The editor's text field. `{name}` fill-ins are chips: they drag to move and can't be deleted, so a field built from
// a textarea would not do. The value is the plain string the copy sheet takes (`Last active {ago}`); the DOM is rebuilt
// from it on mount and whenever a deletion tries to take a chip.
import { useCallback, useEffect, useRef } from "react";

const CHIP = "data-fill";

function build(host: HTMLElement, value: string) {
  host.replaceChildren();
  for (const part of value.split(/(\{[^{}]+\})/)) {
    if (!part) continue;
    const hole = /^\{([^{}]+)\}$/.exec(part);
    if (!hole) {
      host.append(document.createTextNode(part));
      continue;
    }
    const chip = document.createElement("span");
    chip.setAttribute(CHIP, hole[1]);
    chip.contentEditable = "false";
    chip.draggable = true;
    chip.textContent = `⠿ ${hole[1]}`;
    chip.className =
      "mx-[1px] inline-block cursor-grab rounded-[6px] border border-[color:color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] px-[6px] font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--accent-text)]";
    host.append(chip);
  }
}

function serialize(host: HTMLElement): string {
  let out = "";
  host.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += (n as Text).data;
    else if (n instanceof HTMLElement && n.hasAttribute(CHIP)) out += `{${n.getAttribute(CHIP)}}`;
  });
  return out.replace(/ /g, " ");
}

const chipCount = (host: HTMLElement) => host.querySelectorAll(`[${CHIP}]`).length;

export function FillField({ value, onChange, invalid, label, autoFocus }: { value: string; onChange: (next: string) => void; invalid: boolean; label: string; autoFocus?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const last = useRef(value);
  const chips = useRef(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    build(el, value);
    last.current = value;
    chips.current = chipCount(el);
    if (autoFocus) el.focus();
    // Mounted once per field: the parent keys it by row, and later values come from this field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onInput = useCallback(() => {
    const el = host.current;
    if (!el) return;
    if (chipCount(el) < chips.current) {
      // A deletion took a chip: put the text back as it was.
      build(el, last.current);
      const end = window.getSelection();
      end?.selectAllChildren(el);
      end?.collapseToEnd();
      return;
    }
    const next = serialize(el);
    last.current = next;
    chips.current = chipCount(el);
    onChange(next);
  }, [onChange]);

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
      onInput={onInput}
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
