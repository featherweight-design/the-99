"use client";
// The copy editor's overlay: the rows load once, the page is scanned for known text, each hit is outlined, and the
// mode's bar says what is going on. While the mode is on a click targets text instead of following links or pressing
// buttons; Done gives the page back. The editor opens from a targeted line; the tray holds the edits and submits them.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { copyEditorCopy } from "../../lib/copy/copy-editor";
import { keyLabel } from "../../lib/copy-editor/key-label";
import { indexRows, type RowIndex } from "../../lib/copy-editor/match";
import type { EditorRow } from "../../lib/copy-editor/rows";
import { Editor } from "./editor";
import { Tray } from "./tray";
import type { EditSession } from "./use-edit-session";
import type { Edit } from "../../lib/copy-editor/edits";
import { entryAt, OVERLAY_ATTR, place, scanPage, type Entry, type Placed } from "./scan";

type Load = { state: "loading" } | { state: "ready"; index: RowIndex; rows: EditorRow[] } | { state: "error"; notBuilt: boolean };

/** The rows are the same for every page of a session; a reload fetches them again. */
let loaded: { index: RowIndex; rows: EditorRow[] } | null = null;

async function loadRows(): Promise<Load> {
  if (loaded) return { state: "ready", ...loaded };
  try {
    const res = await fetch("/api/copy-edit/rows", { cache: "no-store" });
    if (!res.ok) return { state: "error", notBuilt: res.status === 503 };
    const body = (await res.json()) as { rows?: EditorRow[] };
    if (!Array.isArray(body.rows)) return { state: "error", notBuilt: false };
    loaded = { index: indexRows(body.rows), rows: body.rows };
    return { state: "ready", ...loaded };
  } catch {
    return { state: "error", notBuilt: false };
  }
}

const inOverlay = (t: EventTarget | null) => t instanceof Element && t.closest(`[${OVERLAY_ATTR}]`) !== null;
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Bottom of the phone header as it is on screen now (it scrolls away and slides back), so the bar pins under it. */
function headerBottom(): number {
  const header = document.querySelector("header[data-shell-nav]");
  return header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
}

export default function Overlay({ on, stop, session }: { on: boolean; stop: () => void; session: EditSession }) {
  const { edits, replaceEdits, saveEdits: saveToSession, sub, submit, dismiss, trayOpen, setTrayOpen } = session;
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [touch, setTouch] = useState(false);
  const [barTop, setBarTop] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  // An edit reopened from the tray: its line may be on another page, so the editor opens without a target box.
  const [editRow, setEditRow] = useState<EditorRow | null>(null);
  const trayRef = useRef(false);
  useEffect(() => {
    trayRef.current = trayOpen;
  }, [trayOpen]);
  const editingRef = useRef<number | null>(null);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);
  const saveEdits = useCallback(
    (upsert: Edit[], drop: string[]) => {
      saveToSession(upsert, drop);
      setEditing(null);
      setEditRow(null);
    },
    [saveToSession],
  );
  const entries = useRef<Entry[]>([]);
  const placedRef = useRef<Placed[]>([]);
  const frame = useRef(0);
  const targetRef = useRef<number | null>(null);
  useEffect(() => {
    targetRef.current = targetId;
  }, [targetId]);
  const index = load.state === "ready" ? load.index : null;
  const rows = load.state === "ready" ? load.rows : null;

  useEffect(() => {
    if (!on) return;
    let live = true;
    void loadRows().then((next) => live && setLoad(next));
    return () => {
      live = false;
    };
  }, [on, attempt]);

  const measure = useCallback(() => {
    frame.current = 0;
    const next: Placed[] = [];
    for (const entry of entries.current) {
      const p = place(entry);
      if (p && p.box.y < window.innerHeight && p.box.y + p.box.h > 0 && p.box.x < window.innerWidth && p.box.x + p.box.w > 0) next.push(p);
    }
    placedRef.current = next;
    setPlaced(next);
    setBarTop(headerBottom());
  }, []);
  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(measure);
  }, [measure]);

  // Scan when the rows arrive and again when the page changes under us (a navigation, a sheet, a list that filled in).
  useEffect(() => {
    if (!on || !index) return;
    let timer = 0;
    const rescan = () => {
      entries.current = scanPage(index);
      measure();
    };
    rescan();
    const watch = new MutationObserver((records) => {
      if (records.every((r) => inOverlay(r.target))) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(rescan, 200);
    });
    watch.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      watch.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      entries.current = [];
      placedRef.current = [];
      setPlaced([]);
      setTargetId(null);
    };
  }, [on, index, measure, schedule]);

  // The mode's grip on the page: a click targets text, a mouse hover targets it, the keyboard walks the lines.
  useEffect(() => {
    if (!on) return;
    const onClick = (e: MouseEvent) => {
      if (inOverlay(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const isTouch = (e as PointerEvent).pointerType === "touch";
      setTouch(isTouch);
      if (editingRef.current !== null) return;
      const hit = entryAt(placedRef.current, e.clientX, e.clientY);
      // Desktop: the line is already targeted by hover, so a click opens it. Phone: the first tap targets, the second opens.
      if (hit && hit.entry.id === targetRef.current) {
        setEditing(hit.entry.id);
        return;
      }
      setTargetId(hit ? hit.entry.id : null);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || editingRef.current !== null) return;
      setTouch(false);
      if (inOverlay(e.target)) return;
      const hit = entryAt(placedRef.current, e.clientX, e.clientY);
      setTargetId(hit ? hit.entry.id : null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // The first Esc lets go of the targeted line; the next one ends the mode.
        if (e.defaultPrevented || editingRef.current !== null || trayRef.current) return;
        if (targetRef.current === null) stop();
        else setTargetId(null);
        return;
      }
      if (editingRef.current !== null || trayRef.current) return;
      if (!e.altKey || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      e.preventDefault();
      const list = [...placedRef.current].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
      if (list.length === 0) return;
      setTouch(false);
      setTargetId((cur) => {
        const at = list.findIndex((p) => p.entry.id === cur);
        const next = list[(at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length];
        return next.entry.id;
      });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [on, stop]);

  const target = useMemo(() => placed.find((p) => p.entry.id === targetId) ?? null, [placed, targetId]);
  const opened = editing === null ? null : (placed.find((p) => p.entry.id === editing) ?? null);
  const editedKeys = useMemo(() => new Set(edits.map((e) => e.key)), [edits]);

  if (!on) return null;
  const hint = touch ? copyEditorCopy.bar.hintPhone : copyEditorCopy.bar.hintDesktop;
  const status =
    load.state === "loading" ? copyEditorCopy.bar.loading : load.state === "error" ? (load.notBuilt ? copyEditorCopy.bar.notBuilt : copyEditorCopy.bar.loadFailed) : hint;

  return (
    <div {...{ [OVERLAY_ATTR]: "" }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[35]">
        {placed.map((p) => {
          const hit = target?.entry.id === p.entry.id;
          const ro = p.entry.readOnly !== "";
          const edited = !ro && p.entry.matches.some((m) => editedKeys.has(m.row.key));
          const ring = edited ? "1px solid var(--accent)" : hit ? "2px solid var(--accent)" : ro ? "1px dotted var(--fg-faint)" : "1px dashed color-mix(in srgb, var(--accent) 60%, transparent)";
          return (
            <div
              key={p.entry.id}
              data-copy-outline={ro ? "read-only" : "editable"}
              data-copy-target={hit ? "" : undefined}
              style={{
                position: "absolute",
                left: p.box.x,
                top: p.box.y,
                width: p.box.w,
                height: p.box.h,
                borderRadius: 3,
                outline: p.clipped ? undefined : ring,
                outlineOffset: p.clipped ? undefined : hit ? 3 : 2,
                boxShadow: p.clipped ? `inset 0 0 0 ${hit ? 2 : 1}px ${hit ? "var(--accent)" : ro ? "var(--fg-faint)" : "color-mix(in srgb, var(--accent) 60%, transparent)"}` : undefined,
                background: edited ? "color-mix(in srgb, var(--accent) 12%, transparent)" : hit && !ro ? "color-mix(in srgb, var(--accent) 14%, transparent)" : undefined,
              }}
            />
          );
        })}
        {target && <Tag placed={target} touch={touch} />}
      </div>
      <div
        role="region"
        aria-label={copyEditorCopy.bar.region}
        aria-keyshortcuts={copyEditorCopy.bar.shortcuts}
        style={{ "--bar-top": `${barTop}px` } as CSSProperties}
        className="fixed inset-x-0 top-[var(--bar-top)] z-[60] flex h-[46px] items-center gap-3 border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-4 text-[13px] text-[color:var(--fg)] md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:h-10 md:rounded-full md:shadow-[var(--modal-shadow)]"
      >
        <span aria-hidden className="inline-block h-2 w-2 flex-none rounded-full bg-[color:var(--warning)]" />
        <span className="font-medium">{copyEditorCopy.bar.title}</span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--fg-muted)]">{copyEditorCopy.bar.env}</span>
        {load.state === "ready" && (edits.length > 0 || sub.phase === "sent") ? (
          <button type="button" aria-haspopup="dialog" aria-expanded={trayOpen} onClick={() => setTrayOpen(true)} className="min-w-0 flex-1 truncate text-left text-[color:var(--accent-text)] md:flex-none">
            {edits.length > 0 ? copyEditorCopy.barTray.edits(edits.length) : sub.phase === "sent" && sub.pr ? copyEditorCopy.barTray.open(sub.pr.number) : copyEditorCopy.barTray.sent}
          </button>
        ) : (
          <span role="status" className="min-w-0 flex-1 truncate text-[color:var(--fg-muted)] md:flex-none">
            {status}
          </span>
        )}
        {load.state === "error" && (
          <button type="button" onClick={() => {
              setLoad({ state: "loading" });
              setAttempt((n) => n + 1);
            }} className="text-[color:var(--accent-text)] underline">
            {copyEditorCopy.bar.retry}
          </button>
        )}
        <button
          type="button"
          onClick={stop}
          className="ml-auto flex-none rounded-full bg-[color:var(--accent)] px-3 py-1 text-[12px] font-medium text-[color:var(--bg)] md:ml-2"
        >
          {copyEditorCopy.bar.done}
        </button>
      </div>
      {opened && rows && <Editor rows={rows} matches={opened.entry.matches} visible={opened.entry.range.toString()} box={opened.box} edits={edits} onSave={saveEdits} onClose={() => setEditing(null)} />}
      {editRow && rows && (
        <Editor rows={rows} matches={[{ row: editRow, how: "exact" }]} box={{ x: 8, y: window.innerHeight, w: 0, h: 0 }} edits={edits} onSave={saveEdits} onClose={() => setEditRow(null)} />
      )}
      {trayOpen && (
        <Tray
          edits={edits}
          rows={rows}
          sub={sub}
          onEdit={(key) => setEditRow(rows?.find((r) => r.key === key) ?? null)}
          onRemove={(key) => replaceEdits(edits.filter((e) => e.key !== key))}
          onClear={() => {
            replaceEdits([]);
            dismiss();
          }}
          onSubmit={submit}
          onClose={() => setTrayOpen(false)}
        />
      )}
    </div>
  );
}

/** The line above a targeted text: `file · key` in mono, then what a press does (or why it can't). */
function Tag({ placed, touch }: { placed: Placed; touch: boolean }) {
  const { entry, box } = placed;
  const first = entry.matches[0].row;
  const { file, path } = keyLabel(first.key);
  const more = entry.matches.length - 1;
  const readOnly = entry.readOnly !== "";
  // Below the line by default, so it never covers the text above; above only when the bottom edge has no room.
  const above = box.y + box.h + 36 > window.innerHeight && box.y > 56;
  const left = Math.max(8, Math.min(box.x, window.innerWidth - 8 - 280));
  return (
    <div
      data-copy-tag=""
      style={{ position: "absolute", left, top: above ? box.y - 30 : box.y + box.h + 8, maxWidth: window.innerWidth - 16 }}
      className="pointer-events-none flex max-w-full items-center gap-2 rounded-[6px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-2 py-[3px] text-[11px] shadow-[var(--modal-shadow)]"
    >
      <span className="truncate font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--fg-muted)]">
        {file} · {path}
        {more > 0 && ` ${copyEditorCopy.tag.more(more)}`}
      </span>
      <span className={`flex-none ${readOnly ? "text-[color:var(--fg-faint)]" : "text-[color:var(--accent-text)]"}`}>
        {readOnly ? sentence(entry.readOnly) : touch ? copyEditorCopy.tag.phone : copyEditorCopy.tag.desktop}
      </span>
    </div>
  );
}
