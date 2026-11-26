"use client";
// The editor for one targeted line: a popover under the line on desktop, a bottom sheet on a phone. Now above New,
// a field per variation, the copy sheet's rules as you type, and Add to edits. A read-only line gets a lock and the
// reason instead of a field.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { copyEditorCopy } from "../../lib/copy/copy-editor";
import { baseKey, check, unusedFills, usedFills, variationLabel, variationsOf, type Edit } from "../../lib/copy-editor/edits";
import { keyLabel } from "../../lib/copy-editor/key-label";
import { fillValues, type Match } from "../../lib/copy-editor/match";
import type { EditorRow } from "../../lib/copy-editor/rows";
import { FillField, type FillFieldHandle } from "./fill-field";
import { OVERLAY_ATTR, type Box } from "./scan";

const t = copyEditorCopy.editor;
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const leafOf = (key: string) => keyLabel(key).path.split(/[.\[#]/).filter(Boolean).filter((s) => !/^t\d+$/.test(s)).pop() ?? "";

export type EditorProps = {
  rows: readonly EditorRow[];
  matches: Match[];
  /** The line's text as the page shows it, which says what each fill-in reads here. */
  visible?: string;
  box: Box;
  edits: readonly Edit[];
  onSave: (upsert: Edit[], drop: string[]) => void;
  onClose: () => void;
};

export function Editor({ rows, matches, visible, box, edits, onSave, onClose }: EditorProps) {
  const choices = useMemo(() => {
    const seen = new Map<string, EditorRow>();
    for (const m of matches) if (!seen.has(baseKey(m.row.key))) seen.set(baseKey(m.row.key), m.row);
    return [...seen.values()];
  }, [matches]);
  const [row, setRow] = useState<EditorRow | null>(choices.length === 1 ? choices[0] : null);
  // Captured while rendering, before the field's own autofocus effect takes the focus.
  const [opener] = useState<Element | null>(() => (typeof document === "undefined" ? null : document.activeElement));
  const dialog = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(box.y + box.h + 14);

  // Focus goes in on open and back to what had it on close.
  useEffect(() => {
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

  // Desktop: 14px under the line, flipped above it when the popover would run off the bottom.
  useLayoutEffect(() => {
    const h = dialog.current?.offsetHeight ?? 0;
    const below = box.y + box.h + 14;
    setTop(below + h > window.innerHeight - 8 ? Math.max(8, box.y - 14 - h) : below);
  }, [box, row]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [contenteditable="true"]') ?? [])];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const left = Math.max(8, Math.min(box.x, window.innerWidth - 8 - 420));
  return (
    <div {...{ [OVERLAY_ATTR]: "" }} onKeyDown={onKeyDown}>
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-[70] bg-[rgba(8,6,4,0.55)] md:bg-transparent" />
      <div
        ref={dialog}
        role="dialog"
        aria-label={row ? keyLabel(row.key).path : t.whichKey}
        style={{ "--pop-top": `${top}px`, "--pop-left": `${left}px` } as React.CSSProperties}
        className="fixed inset-x-0 bottom-0 z-[71] max-h-[85dvh] overflow-y-auto rounded-t-[20px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-4 shadow-[var(--modal-shadow)] md:inset-x-auto md:bottom-auto md:left-[var(--pop-left)] md:top-[var(--pop-top)] md:max-h-[70dvh] md:w-[420px] md:rounded-[14px]"
      >
        {row === null ? <Which choices={choices} onPick={setRow} onClose={onClose} /> : <Body key={row.key} rows={rows} row={row} visible={visible} edits={edits} onSave={onSave} onClose={onClose} />}
      </div>
    </div>
  );
}

function Head({ row, kind, onClose }: { row: EditorRow; kind: string; onClose: () => void }) {
  const { file, path } = keyLabel(row.key);
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--fg-muted)]">
          {file} · {path}
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wide text-[color:var(--fg-faint)]">{kind}</div>
      </div>
      <button type="button" aria-label={t.close} onClick={onClose} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[color:var(--fg-muted)]">
        ✕
      </button>
    </div>
  );
}

/** Q1: the same words live under two keys; the editor lists both and asks which. */
function Which({ choices, onPick, onClose }: { choices: EditorRow[]; onPick: (r: EditorRow) => void; onClose: () => void }) {
  return (
    <>
      <div className="mb-3 flex items-start gap-3">
        <p className="min-w-0 flex-1 text-[14px] text-[color:var(--fg)]">{t.whichKey}</p>
        <button type="button" aria-label={t.close} onClick={onClose} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[color:var(--fg-muted)]">
          ✕
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {choices.map((c) => (
          <li key={c.key}>
            <button type="button" onClick={() => onPick(c)} className="w-full rounded-[10px] border border-[color:var(--border-strong)] px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--fg)]">
              {keyLabel(c.key).file} · {keyLabel(c.key).path}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Body({
  rows,
  row,
  visible,
  edits,
  onSave,
  onClose,
}: {
  rows: readonly EditorRow[];
  row: EditorRow;
  visible: string | undefined;
  edits: readonly Edit[];
  onSave: EditorProps["onSave"];
  onClose: () => void;
}) {
  const set = useMemo(() => variationsOf(rows, row), [rows, row]);
  // What each fill-in reads on this page, per variation: only the variation the page shows fits the visible text.
  const shown = useMemo(() => Object.fromEntries(set.map((r) => [r.key, fillValues(r, visible)])), [set, visible]);
  const fields = useRef<Record<string, FillFieldHandle | null>>({});
  const [said, setSaid] = useState("");
  const announce = useCallback((name: string, how: "removed" | "inserted") => setSaid(how === "removed" ? t.removed(name) : t.inserted(name)), []);
  const made = (key: string) => edits.find((e) => e.key === key);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(set.map((r) => [r.key, made(r.key)?.to ?? r.text])));
  const [copied, setCopied] = useState(false);
  const checks = set.map((r) => check(r, values[r.key]));
  const bad = checks.some((c) => c.problems.length > 0);
  const dirty = set.some((r) => values[r.key] !== r.text);
  const reopened = set.some((r) => made(r.key));

  const save = useCallback(() => {
    const upsert = set.filter((r) => values[r.key] !== r.text).map((r) => ({ key: r.key, from: r.text, to: values[r.key] }));
    const drop = set.filter((r) => values[r.key] === r.text && made(r.key)).map((r) => r.key);
    onSave(upsert, drop);
    // `made` reads the edits prop; saving is a click, so the latest render's closure is the one used.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, values, onSave]);

  if (row.readOnly) {
    return (
      <>
        <Head row={row} kind={`🔒 ${copyEditorCopy.readOnly.kind}`} onClose={onClose} />
        <p className="mb-3 text-[14px] text-[color:var(--fg-muted)]">{row.text}</p>
        <p className="mb-4 rounded-[10px] border border-[color:var(--border-strong)] px-3 py-2 text-[13px] text-[color:var(--fg-muted)]">{sentence(row.readOnly)}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(row.key).then(() => setCopied(true));
            }}
            className="rounded-full border border-[color:var(--border-strong)] px-4 py-[6px] text-[13px] text-[color:var(--fg)]"
          >
            {copied ? copyEditorCopy.readOnly.copied : copyEditorCopy.readOnly.copyKey}
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-[color:var(--accent)] px-4 py-[6px] text-[13px] font-medium text-[color:var(--bg)]">
            {t.close}
          </button>
        </div>
      </>
    );
  }

  const multi = set.length > 1;
  const cap = checks[0]?.cap;
  return (
    <>
      <Head row={row} kind={multi ? `${t.variations(set.length)} · ${leafOf(row.key)}` : t.kind(leafOf(row.key), cap)} onClose={onClose} />
      {set.map((r, i) => {
        const c = checks[i];
        const label = multi ? variationLabel(r.context, i, copyEditorCopy.editor.when, t.otherwise, t.variationN) : null;
        return (
          <div key={r.key} className="mb-3">
            {label && (
              <div className="mb-1 text-[12px] text-[color:var(--fg-muted)]">
                {label} · {t.nowIs(r.text)}
              </div>
            )}
            {!multi && (
              <>
                <div className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase text-[color:var(--fg-faint)]">{t.now}</div>
                <p className="mb-2 text-[14px] text-[color:var(--fg-muted)]">{r.text}</p>
                <div className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase text-[color:var(--fg-faint)]">{t.new}</div>
              </>
            )}
            <FillField
              label={t.fieldLabel}
              removeLabel={t.removeFill}
              value={values[r.key]}
              invalid={c.problems.length > 0}
              autoFocus={i === 0}
              handle={(h) => {
                fields.current[r.key] = h;
              }}
              onFillChange={announce}
              onChange={(next) => setValues((v) => ({ ...v, [r.key]: next }))}
            />
            <InsertRow names={unusedFills(r, values[r.key])} values={shown[r.key]} onInsert={(name) => fields.current[r.key]?.insertFill(name)} />
            <div role="status" className="mt-1 text-[12px]">
              <div className="text-[color:var(--fg-muted)]">{t.words(c.words, c.cap)}</div>
              {usedFills(r, values[r.key]).map((name) => (
                <div key={name} className="text-[color:var(--fg-muted)]">
                  {t.fill(name, shown[r.key][name])}
                </div>
              ))}
              {c.problems.map((p) => (
                <div key={p} className="text-[color:var(--danger)]">
                  {sentence(p)}.
                </div>
              ))}
              {values[r.key] !== r.text && c.problems.length === 0 && <div className="text-[color:var(--fg-muted)]">{t.preview(values[r.key])}</div>}
            </div>
          </div>
        );
      })}
      <div aria-live="polite" className="sr-only">
        {said}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        {reopened && (
          <button type="button" onClick={() => onSave([], set.filter((r) => made(r.key)).map((r) => r.key))} className="mr-auto text-[13px] text-[color:var(--danger)] underline">
            {t.remove}
          </button>
        )}
        <button type="button" onClick={onClose} className="rounded-full border border-[color:var(--border-strong)] px-4 py-[6px] text-[13px] text-[color:var(--fg)]">
          {t.cancel}
        </button>
        <button
          type="button"
          disabled={bad || !dirty}
          onClick={save}
          className="rounded-full bg-[color:var(--accent)] px-4 py-[6px] text-[13px] font-medium text-[color:var(--bg)] disabled:opacity-40"
        >
          {reopened ? t.update : t.add}
        </button>
      </div>
    </>
  );
}

/**
 * The fill-ins this line supplies that its text no longer uses, one button each, under the field. A press keeps the
 * field's focus and caret, and the chip lands there (or at the end when no caret was placed). No row when none is left.
 */
function InsertRow({ names, values, onInsert }: { names: string[]; values: Record<string, string>; onInsert: (name: string) => void }) {
  if (names.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase text-[color:var(--fg-faint)]">{t.insert}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            aria-label={t.insertLabel(name)}
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(name)}
            className="flex h-10 min-w-0 max-w-full items-center gap-[6px] rounded-[8px] border border-dashed border-[color:color-mix(in_srgb,var(--accent)_55%,transparent)] px-[10px] hover:border-solid hover:bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] active:border-solid active:bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] md:h-8"
          >
            <span aria-hidden className="flex-none text-[13px] text-[color:var(--accent-text)]">
              +
            </span>
            <span className="flex-none font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--accent-text)]">{name}</span>
            {values[name] !== undefined && <span className="min-w-0 truncate text-[13px] text-[color:var(--fg-muted)]">{values[name]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
