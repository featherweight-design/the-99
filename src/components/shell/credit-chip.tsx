"use client";
// The account menu's credit chip (M1b, buying credits U2b): the offer art's diamond, the reader's count and a `›`, one
// link to /credits, under the email in the menu's identity block. No new menu row. What it says is `chipFor`'s
// (`lib/payments/chip-rule.ts`); this draws it. Four states: holding credits, never bought, out of credits (hollow
// diamond, `Get more credits`, payments on only) and a cancelled plan's credits expiring within three days (the chip and
// its figure in `--warning`, the words on a line under it, because in Low Sun `--warning` and the accent are close in
// hue and the line carries the meaning, not the colour). Phone: a 44px press inside the sheet. Desktop: a 30px pill.

import Link from "next/link";
import type { ChipState } from "../../lib/payments/chip-rule";

export function CreditChip({ chip, sheet, onGo }: { chip: ChipState; sheet: boolean; onGo: () => void }) {
  const warn = chip.kind === "expiring";
  const out = chip.kind === "out";
  const m = /^(\d+)(.*)$/.exec(chip.label);
  // Whole class names, so Tailwind finds them: the accent for every state but the expiring one.
  const tone = warn
    ? "border-[color:color-mix(in_srgb,var(--warning)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_14%,transparent)] text-[color:var(--fg)]"
    : out
      ? "border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] bg-transparent text-[color:var(--fg)]"
      : "border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] text-[color:var(--fg)]";
  const ink = warn ? "text-[color:var(--warning)]" : "text-[color:var(--accent-text)]";
  // Every word on the chip is TEXT that needs 4.5:1 in every theme. --accent falls short twice: on its own 16% tint (the
  // count; 3.4 in Phyrexia and Kaldheim, 4.48 in Low Sun) and straight on the menu (the out state's `Get more credits`;
  // 4.1 in Phyrexia, 4.3 in Kaldheim). --fg clears 8 everywhere; the diamond and the `›` keep the accent. The expiring
  // count keeps --warning, which clears 4.8 on its tint. Pinned by `credit-chip-contrast.test.ts`.
  const countInk = warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg)]";
  const fill = warn ? "bg-[color:var(--warning)]" : "bg-[color:var(--accent)]";
  const ring = warn ? "border-[color:var(--warning)]" : "border-[color:var(--accent)]";
  return (
    <>
      <Link
        href="/credits"
        data-testid="credit-chip"
        data-kind={chip.kind}
        onClick={(e) => {
          // A modified press opens a new tab and navigates nothing here, as the menu's own links.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onGo();
        }}
        className={`mt-[8px] inline-flex max-w-full items-center gap-[7px] self-start whitespace-nowrap rounded-full border border-solid pl-[10px] pr-[11px] text-[12px] ${out ? "font-semibold" : "font-medium"} ${tone} ${sheet ? "min-h-[44px]" : "min-h-[30px]"}`}
      >
        <span
          aria-hidden
          className={`block h-[9px] w-[9px] flex-none rotate-45 rounded-[1px] ${chip.hollow ? `border-[1.5px] border-solid ${ring}` : fill}`}
        />
        {m && !out ? (
          <span>
            <b data-chip-count className={`font-mono text-[13px] font-semibold ${countInk}`}>{m[1]}</b>
            {m[2]}
          </span>
        ) : (
          <span>{chip.label}</span>
        )}
        <em aria-hidden className={`ml-[1px] not-italic ${ink}`}>{"›"}</em>
      </Link>
      {chip.line ? (
        <div data-testid="credit-chip-line" className="mt-[5px] font-mono text-[11px] text-[color:var(--warning)]">{chip.line}</div>
      ) : null}
    </>
  );
}
