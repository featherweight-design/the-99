"use client";

// Guided build R1 (proposal): the new-deck screen's one choice, three radio rows in the Upgrade flow's option shape
// (pick-steps.tsx OPTION + Radio), each led by a line icon on the intro's medallion (intro-step.tsx).
import type { ReactNode } from "react";
import { guidedBuildCopy } from "../../../lib/copy/guided-build";
import { GetMoreLink } from "../../ui/credits-text";

const copy = guidedBuildCopy.choice;
export type BuildKind = "free" | "guided" | "empty";

const ICONS: Record<BuildKind, ReactNode> = {
  // the intro's versions glyph: a stack of cards
  free: (<><rect x="4" y="5" width="12" height="14" rx="2" /><path d="M8 3h12v14" /></>),
  // the intro's picks glyph: three choices on three lines
  guided: (<><path d="M5 7h14M5 12h14M5 17h14" /><circle cx="8" cy="7" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="10" cy="17" r="1.6" /></>),
  // one card alone
  empty: (<><rect x="6.5" y="4" width="11" height="16" rx="2" /><path d="M10 9.5h4" /></>),
};

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)]" style={on ? { borderColor: "var(--accent)" } : undefined}>
      {on && <span className="h-[10px] w-[10px] rounded-full" style={{ background: "var(--accent)" }} />}
    </span>
  );
}

export function BuildChoice({ value, commander, short, compact = false }: {
  value: BuildKind;
  commander: string;
  /** Only more credits can fund a guided build: the row is off and says why (call 7). */
  short?: { have: number; payments: boolean };
  compact?: boolean;
}) {
  const rows: { kind: BuildKind; name: string; cost: string; line: string; back?: string }[] = [
    { kind: "free", ...copy.free },
    { kind: "guided", ...copy.guided },
    { kind: "empty", name: copy.empty.name, cost: copy.empty.cost, line: copy.empty.line(commander) },
  ];
  return (
    <div className={compact ? "mb-[20px]" : "mb-[24px] md:mb-[28px]"}>
      <p className="mb-[8px] font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:mb-[9px]">{copy.label}</p>
      <div role="radiogroup" aria-label={copy.label} className="flex flex-col gap-[8px]">
        {rows.map((r) => {
          const on = r.kind === value;
          const off = r.kind === "guided" && !!short;
          return (
            <div
              key={r.kind}
              role="radio"
              aria-checked={on}
              aria-disabled={off || undefined}
              className={`flex w-full gap-[12px] rounded-[10px] border border-solid p-[12px] text-left ${on ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))]" : "border-[color:var(--border)] bg-[color:var(--surface)]"}`}
            >
              <span className={`flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[color:var(--elevated)] ${off ? "text-[color:var(--fg-locked)]" : "text-[color:var(--accent-text)]"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[r.kind]}</svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
                <span className="flex items-baseline gap-[8px]">
                  <span className={`font-sans text-[14px] font-semibold ${off ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"}`}>{r.name}</span>
                  <span className={`ml-auto font-mono text-[10.5px] ${r.kind === "guided" && !off ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}`}>{r.cost}</span>
                </span>
                <span className={`text-[12.5px] leading-[1.5] ${off ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-body)]"}`}>{r.line}</span>
                {r.back && !off && <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{r.back}</span>}
                {off && short && (
                  <>
                    <span className="text-[12.5px] font-medium leading-[1.5] text-[color:var(--warning)]">{short.payments ? copy.shortMore(short.have) : copy.shortOff(short.have)}</span>
                    {short.payments && <GetMoreLink />}
                  </>
                )}
              </span>
              {!off && <Radio on={on} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
