"use client";
// The tab row of the steps that hold more than one tool (steps 7 and 8), and the head line every tool draws under it. The
// active tab is the step's own local state: nothing here reads or writes anything else.

import { useId, type KeyboardEvent, type ReactNode } from "react";

import { landingCopy } from "../../../lib/copy/landing";
import { nextTab } from "./demo-tab-keys";

const CHIP =
  "inline-flex items-center rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[7px] py-[2px] font-mono text-[10.5px] text-[color:var(--fg-muted)]";

export function DemoTabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  const base = useId();
  const ids = tabs.map((t) => t.id);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextTab(ids, value, e.key);
    if (next === value) return;
    e.preventDefault();
    onChange(next);
    document.getElementById(`${base}-${next}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="mb-[14px] flex flex-wrap gap-[6px]">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            id={`${base}-${t.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            data-testid={`demo-tab-${t.id}`}
            onClick={() => onChange(t.id)}
            onKeyDown={onKey}
            className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-[8px] border border-solid px-[14px] text-[13px] font-medium md:min-h-[36px] ${on ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--bg)]" : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]"}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** The `read-only` chip, the demo's one word for a control that would be live in the signed-in app. */
export function ReadOnlyChip() {
  return <span className={CHIP}>{landingCopy.demo.readOnly}</span>;
}

/** What a tool is drawn on: the deck's name, and the read-only chip when its presses write nowhere. */
export function DemoHead({ deckName, readOnly = false, children }: { deckName: string; readOnly?: boolean; children?: ReactNode }) {
  return (
    <p className="m-0 mb-[8px] flex flex-wrap items-center gap-[8px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
      <span>{deckName}</span>
      {readOnly ? <ReadOnlyChip /> : null}
      {children}
    </p>
  );
}
