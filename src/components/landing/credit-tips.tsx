"use client";

import { useEffect, useId, useRef, useState } from "react";
import { landingCopy } from "../../lib/copy/landing";
import { Icon } from "./icons";

const c = landingCopy;

type Tool = (typeof landingCopy.tools)[number];

const LEAD_INK: Record<string, string> = { "+": "text-[color:var(--success)]", "−": "text-[color:var(--danger)]" };

/** What you get: a small made-up result of the tool, drawn from stored example words (`landingCopy.tools`). No model is called. */
function Preview({ tool }: { tool: Tool }) {
  return (
    <div className="relative flex flex-col gap-[7px] border-t border-solid border-t-[color:var(--border)] bg-[color:var(--surface-inset)] px-[12px] pb-[12px] pt-[10px]">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.tip.youGet}</span>
      <span className="absolute right-[10px] top-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.tip.example}</span>
      {tool.example.ask && <span className="text-[11.5px] leading-[1.45] text-[color:var(--fg-muted)]">{tool.example.ask}</span>}
      <div className="flex flex-col text-[11.5px] leading-[1.45] text-[color:var(--fg-body)]">
        {tool.example.rows.map(([lead, name, note]) => (
          <div key={`${lead}${name}${note}`} className="flex items-baseline gap-[8px] border-t border-solid border-t-[color:var(--border)] py-[3px] first:border-t-0">
            {lead && <span className={`min-w-[14px] flex-none font-mono text-[11px] font-semibold ${LEAD_INK[lead] ?? "text-[color:var(--accent-text)]"}`}>{lead}</span>}
            {name && <b className="font-semibold text-[color:var(--fg)]">{name}</b>}
            <span className="text-[color:var(--fg-muted)]">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The paid tools, each with an ⓘ (public landing PR 4b). ONE tooltip is open at a time, held here: opening another closes the first.
 * A mouse hovering or the keyboard focusing the ⓘ shows it; a press (touch, pen or mouse) pins it; Escape and a press outside
 * close it. The ⓘ is a 44px target on the phone. The tip stays out of the document while closed.
 */
export function CreditTips({ suggestedTwo }: { suggestedTwo: boolean }) {
  const [open, setOpen] = useState<{ id: string; pinned: boolean } | null>(null);
  const root = useRef<HTMLUListElement>(null);
  const base = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <ul ref={root} className="m-0 mt-[14px] flex list-none flex-col p-0">
      {c.tools.map((tool) => {
        const shown = open?.id === tool.id;
        const tipId = `${base}-${tool.id}`;
        const cut = tool.name.lastIndexOf(" ") + 1;
        const [head, last] = [tool.name.slice(0, cut), tool.name.slice(cut)];
        const cost = tool.id === "suggested" && suggestedTwo ? c.credits.suggestedV2 : c.credits.one;
        return (
          <li
            key={tool.id}
            className="relative flex items-start justify-between gap-[12px] border-t border-solid border-t-[color:var(--border)] py-[9px] text-[14px] leading-[1.45] text-[color:var(--fg-body)] first:border-t-0"
          >
            <span className="min-w-0">
              {head}
              <span className="whitespace-nowrap">
              {last}
              <button
                onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen((o) => (o?.pinned ? o : { id: tool.id, pinned: false })); }}
                onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen((o) => (o?.id === tool.id && !o.pinned ? null : o)); }}
                type="button"
                aria-label={c.tip.open(tool.name)}
                aria-expanded={shown}
                aria-describedby={shown ? tipId : undefined}
                onClick={() => setOpen((o) => (o?.id === tool.id && o.pinned ? null : { id: tool.id, pinned: true }))}
                onFocus={(e) => {
                  try { if (e.currentTarget.matches(":focus-visible")) setOpen((o) => (o?.pinned ? o : { id: tool.id, pinned: false })); } catch { /* no :focus-visible */ }
                }}
                // A pinned tip survives a blur: a press inside the tip blurs the button, and a pin closes by a second press, Escape or a press outside.
                onBlur={() => setOpen((o) => (o?.id === tool.id && !o.pinned ? null : o))}
                className={`-my-[10px] ml-[2px] inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center border-0 bg-transparent align-middle focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-[color:var(--accent)] md:-my-[8px] md:h-[28px] md:w-[28px] ${shown ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.3" />
                  <path d="M8 7.2v4" strokeLinecap="round" />
                  <circle cx="8" cy="4.9" r=".55" fill="currentColor" stroke="none" />
                </svg>
              </button>
              </span>
            </span>
            <span className="flex-none whitespace-nowrap font-mono text-[11.5px] text-[color:var(--accent-text)]">{cost}</span>
            {shown && (
              <span
                id={tipId}
                role="tooltip"
                className={`absolute inset-x-[-4px] top-[calc(100%-4px)] z-30 flex flex-col ${shown && open?.pinned ? "" : "pointer-events-none"} overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] text-left shadow-[0_14px_34px_rgba(0,0,0,0.5)] md:inset-x-auto md:left-[-8px] md:top-[calc(100%-2px)] md:w-[330px]`}
              >
                <span className="flex gap-[10px] px-[14px] pb-[10px] pt-[12px] text-[13px] leading-[1.55] text-[color:var(--fg-body)]">
                  <span aria-hidden="true" className="mt-[1px] flex-none text-[color:var(--accent-text)]"><Icon name={tool.icon} size={18} /></span>
                  <span>
                    <b className="mb-[3px] block text-[13.5px] font-semibold text-[color:var(--fg)]">{tool.name}</b>
                    {tool.tip}
                  </span>
                </span>
                <Preview tool={tool} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
