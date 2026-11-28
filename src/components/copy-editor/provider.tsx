"use client";
// The copy editor's door and its mode switch. Mounted by the shell for an admin on staging only (`copyEditorOpen`);
// everyone else gets none of it, not even this file. The overlay itself (rows, outlines, bar) is a lazy chunk loaded
// the first time the mode turns on.
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { copyEditorCopy } from "../../lib/copy/copy-editor";
import { focusDoor } from "./chrome";
import { OVERLAY_ATTR } from "./scan";
import { useEditSession } from "./use-edit-session";

const Overlay = dynamic(() => import("./overlay"), { ssr: false });

type Mode = { on: boolean; start: () => void; stop: () => void; waiting: number };
const ModeContext = createContext<Mode | null>(null);

/** The mode, or null where the shell did not mount the editor (a player, production). */
export const useCopyEditor = () => useContext(ModeContext);

const Pencil = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" />
    <path d="M13.5 7.5l3 3" />
  </svg>
);

const StagingDot = () => <span aria-hidden className="inline-block h-2 w-2 flex-none rounded-full bg-[color:var(--warning)]" />;

export function CopyEditorProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const start = useCallback(() => {
    setLoaded(true);
    setOn(true);
  }, []);
  const stop = useCallback(() => {
    setOn(false);
    // Done gives the focus back to the door.
    focusDoor();
  }, []);
  const session = useEditSession();
  const waiting = session.edits.length;
  const mode = useMemo(() => ({ on, start, stop, waiting }), [on, start, stop, waiting]);
  return (
    <ModeContext.Provider value={mode}>
      {children}
      {/* Desktop door: a pill, bottom right. On, the bar takes its place. */}
      {!on && (
        <button
          type="button"
          {...{ [OVERLAY_ATTR]: "", "data-copy-door": "" }}
          onClick={start}
          className="fixed bottom-6 right-6 z-[60] hidden h-10 items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-4 text-[13px] text-[color:var(--fg)] shadow-[var(--modal-shadow)] md:flex"
        >
          <Pencil size={16} />
          {copyEditorCopy.door}
          <StagingDot />
          {waiting > 0 && (
            <span className="flex h-6 items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-[10px] text-[12px] font-medium text-[color:var(--accent-text)]">
              {copyEditorCopy.doorWaiting(waiting)}
            </span>
          )}
        </button>
      )}
      {loaded && <Overlay on={on} stop={stop} session={session} />}
    </ModeContext.Provider>
  );
}

/** The phone's door: a pencil in the mobile header, left of search. Nothing without the provider. */
export function CopyEditorDoor() {
  const mode = useCopyEditor();
  if (!mode) return null;
  return (
    <button
      type="button"
      aria-label={copyEditorCopy.doorLabel(mode.waiting)}
      aria-pressed={mode.on}
      data-copy-door=""
      onClick={() => (mode.on ? mode.stop() : mode.start())}
      className={`relative mr-[2px] flex h-10 w-10 flex-none items-center justify-center rounded-[12px] ${
        mode.on ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"
      }`}
    >
      <Pencil size={20} />
      {mode.waiting > 0 && (
        <span aria-hidden className="absolute -right-[4px] -top-[4px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[11px] font-semibold text-[color:var(--bg)] ring-2 ring-[color:var(--bg)]">
          {mode.waiting}
        </span>
      )}
      <span className={`absolute right-[7px] ${mode.waiting > 0 ? "bottom-[7px] rounded-full ring-2 ring-[color:var(--bg)]" : "top-[7px]"}`}>
        <StagingDot />
      </span>
    </button>
  );
}
