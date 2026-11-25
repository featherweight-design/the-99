"use client";
// The tray: every edit made so far (across pages and reloads), one Open pull request, and what happened after it.
// A panel over the bar's corner on desktop, a bottom sheet on a phone.
import { useEffect, useRef } from "react";
import { copyEditorCopy } from "../../lib/copy/copy-editor";
import type { Edit } from "../../lib/copy-editor/edits";
import { keyLabel } from "../../lib/copy-editor/key-label";
import type { EditorRow } from "../../lib/copy-editor/rows";
import { REPO } from "../../lib/copy-editor/github";
import { OVERLAY_ATTR } from "./scan";
import type { Sub } from "./use-submission";

const t = copyEditorCopy.tray;
const RUNS_URL = `https://github.com/${REPO}/actions/workflows/copy-edit.yml`;

export type TrayProps = {
  edits: readonly Edit[];
  rows: readonly EditorRow[] | null;
  sub: Sub;
  onEdit: (key: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onClose: () => void;
};

const Spinner = () => (
  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
    <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
  </svg>
);

const linkClass = "rounded-full border border-[color:var(--border-strong)] px-4 py-[6px] text-[13px] text-[color:var(--fg)]";
const primaryClass = "rounded-full bg-[color:var(--accent)] px-4 py-[6px] text-[13px] font-medium text-[color:var(--bg)] disabled:opacity-40";

export function Tray({ edits, rows, sub, onEdit, onRemove, onClear, onSubmit, onClose }: TrayProps) {
  const panel = useRef<HTMLDivElement>(null);
  // Focus goes in on open and back to what had it on close.
  useEffect(() => {
    const opener = document.activeElement;
    panel.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  // Esc closes the tray wherever the focus is (a button that just went disabled drops it). An editor opened over the
  // tray handles its own Esc first and marks the event, so this one lets it be.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sentView = sub.phase === "sent" && edits.length === 0;
  const submitting = sub.phase === "submitting";
  const failed = sub.phase === "failed" ? sub : null;
  const byKey = new Map((rows ?? []).map((r) => [r.key, r]));
  const staleKeys = new Set(failed?.kind === "stale" ? failed.keys : []);
  const ruleKeys = new Set(failed?.kind === "rule" ? failed.keys : []);

  return (
    <div {...{ [OVERLAY_ATTR]: "" }}>
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-[62] bg-[rgba(8,6,4,0.55)] md:bg-transparent" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-label={t.region}
        className="fixed inset-x-0 bottom-0 z-[63] max-h-[85dvh] overflow-y-auto rounded-t-[20px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-4 shadow-[var(--modal-shadow)] outline-none md:inset-x-auto md:bottom-[84px] md:right-6 md:max-h-[70dvh] md:w-[420px] md:rounded-[14px]"
      >
        {sentView ? (
          <Sent sub={sub} onClose={onClose} />
        ) : (
          <>
            <div className="mb-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-[color:var(--fg)]">{t.title(edits.length)}</div>
                <p className="text-[12px] text-[color:var(--fg-muted)]">{t.sub}</p>
              </div>
              <button type="button" aria-label={t.close} onClick={onClose} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[color:var(--fg-muted)]">
                ✕
              </button>
            </div>
            {failed && (
              <div role="alert" className="mb-3 rounded-[10px] border border-[color:var(--danger)] px-3 py-2 text-[13px] text-[color:var(--danger)]">
                {failed.kind === "stale" ? t.failed.stale(failed.keys.length) : t.failed[failed.kind]}
                {failed.runUrl && (
                  <>
                    {" "}
                    <a href={failed.runUrl} target="_blank" rel="noreferrer" className="underline">
                      {t.run}
                    </a>
                  </>
                )}
              </div>
            )}
            {edits.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-[color:var(--fg-muted)]">{t.empty}</p>
            ) : (
              <ul className={`flex flex-col gap-2 ${submitting ? "pointer-events-none opacity-55" : ""}`} aria-busy={submitting}>
                {edits.map((e) => {
                  const { file, path } = keyLabel(e.key);
                  const row = byKey.get(e.key);
                  const stale = staleKeys.has(e.key);
                  const reason = stale ? (row ? t.stale : t.unknown) : ruleKeys.has(e.key) ? (row && !row.readOnly ? t.rule : t.unknown) : null;
                  return (
                    <li key={e.key} className={`rounded-[10px] border px-3 py-2 ${reason ? "border-[color:var(--danger)]" : "border-[color:var(--border-strong)]"}`}>
                      <div className="truncate font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--fg-faint)]">
                        {file} · {path}
                      </div>
                      <div className="text-[13px] text-[color:var(--fg-faint)] line-through">{e.from}</div>
                      <div className="text-[14px] text-[color:var(--fg)]">{e.to}</div>
                      {reason && <div className="mt-1 text-[12px] text-[color:var(--danger)]">{reason}</div>}
                      <div className="mt-1 flex gap-3 text-[12px]">
                        {row && !row.readOnly && (
                          <button type="button" onClick={() => onEdit(e.key)} className="text-[color:var(--accent-text)] underline">
                            {t.edit}
                          </button>
                        )}
                        <button type="button" onClick={() => onRemove(e.key)} className="text-[color:var(--fg-muted)] underline">
                          {t.remove}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-4 flex items-center gap-2">
              {submitting ? (
                <span role="status" className="mr-auto text-[12px] text-[color:var(--fg-muted)]">
                  {t.working}
                </span>
              ) : (
                <button type="button" disabled={edits.length === 0} onClick={onClear} className="mr-auto text-[13px] text-[color:var(--fg-muted)] underline disabled:opacity-40">
                  {t.clear}
                </button>
              )}
              <button type="button" disabled={edits.length === 0 || submitting} onClick={onSubmit} className={`${primaryClass} flex items-center gap-2`}>
                {submitting && <Spinner />}
                {submitting ? t.submitting : failed ? t.retry : t.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Sent({ sub, onClose }: { sub: Sub; onClose: () => void }) {
  if (sub.phase !== "sent") return null;
  const { pr, branch, count, lagging } = sub;
  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--success)] text-[13px] text-[color:var(--bg)]">
          ✓
        </span>
        <div className="text-[15px] font-medium text-[color:var(--fg)]">{pr ? t.opened(pr.number) : t.onItsWay}</div>
      </div>
      <p className="mb-1 break-words font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--fg-faint)]">{branch}</p>
      <p role="status" className="mb-4 text-[13px] text-[color:var(--fg-muted)]">
        {pr ? t.openedBody(count, branch) : lagging ? t.noPr : t.onItsWayBody(count, branch)}
      </p>
      <div className="flex justify-end gap-2">
        {pr ? (
          <a href={pr.url} target="_blank" rel="noreferrer" className={linkClass}>
            {t.github}
          </a>
        ) : (
          lagging && (
            <a href={RUNS_URL} target="_blank" rel="noreferrer" className={linkClass}>
              {t.run}
            </a>
          )
        )}
        <button type="button" onClick={onClose} className={primaryClass}>
          {t.done}
        </button>
      </div>
    </>
  );
}
