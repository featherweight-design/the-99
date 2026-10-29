"use client";

import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import type { LineItem } from "../../lib/tuning/state";
import { ModalChrome } from "./receipt-modal";
import { Name, Thumb } from "./suggestion-line";

const copy = suggestedChangesV2Copy;

/**
 * Apply's confirmation (the handoff's Apply board, A and A2): the shipped `ModalChrome` with its eyebrow head at 560 on
 * desktop and the shipped sheet on a phone, capped at min(640px, 100dvh − 96px) and 88% (`cap`). Coming in and Going out
 * by name with the card, and the bracket outcome in the lead. The head and the one Apply stay; the lists scroll under a
 * bottom fade. ✕ is the only way out with nothing changed: no second cancel.
 */
export function SuggestedChangesConfirm({
  adds, cuts, bracket, busy, onApply, onClose,
}: {
  adds: readonly LineItem[];
  cuts: readonly LineItem[];
  /** The bracket outcome as a sentence ("Bracket stays 2 · Core."), or empty when the set's outcome is not known. */
  bracket: string;
  busy: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  const n = adds.length;
  return (
    <ModalChrome
      eyebrow={copy.confirm.eyebrow}
      title={copy.confirm.title(n)}
      lead={copy.confirm.lead(bracket).trimEnd()}
      closeLabel={copy.confirmClose}
      onClose={onClose}
      width={560}
      cap
      foot={
        <div className="flex flex-col items-stretch px-[18px] pb-[24px] pt-[12px] md:flex-row md:justify-end md:pb-[12px]" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={busy ? undefined : onApply}
            aria-disabled={busy || undefined}
            data-sc-confirm-apply=""
            className="h-[48px] w-full rounded-[8px] px-[18px] text-[13.5px] font-semibold md:h-[40px] md:w-auto bg-[color:var(--accent)] text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)] transition-colors"
          >
            {busy ? copy.applying : copy.confirm.apply(n * 2)}
          </button>
        </div>
      }
    >
      <div className="relative">
        <div className="grid grid-cols-1 gap-[16px] px-[18px] py-[14px] md:grid-cols-2 md:gap-[18px]">
          <Side label={copy.confirm.comingIn(adds.length)} sign="+" lines={adds} />
          <Side label={copy.confirm.goingOut(cuts.length)} sign="−" lines={cuts} />
        </div>
        {/* The lists scroll under the foot; the fade says there is more (Apply A2). */}
        <div
          aria-hidden
          className="pointer-events-none sticky bottom-0 -mt-[24px] h-[24px]"
          style={{ background: "linear-gradient(to bottom, transparent, var(--surface-raised))" }}
        />
      </div>
    </ModalChrome>
  );
}

function Side({ label, sign, lines }: { label: string; sign: "+" | "−"; lines: readonly LineItem[] }) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col">
      <h3 className="m-0 mb-[6px] font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{label}</h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {lines.map((l) => (
          <li key={l.id} className="flex min-h-[30px] items-center gap-[8px]">
            <span aria-hidden className="w-[10px] flex-none font-mono text-[13px] font-semibold" style={{ color: sign === "+" ? "var(--accent-text)" : "var(--fg-faint)" }}>
              {sign}
            </span>
            <Thumb item={l} small />
            {/* The thumbnail is pointer-only (`Thumb`): the name is the keyboard's way to the card, as on the line. */}
            <span className="min-w-0 truncate"><Name item={l} strike={false} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
