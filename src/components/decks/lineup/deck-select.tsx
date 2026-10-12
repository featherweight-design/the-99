"use client";

// The deck select (handoff R2 AmongCard, CollectionCard): a native select, so the platform owns its list and
// its keyboard, with the chosen deck's identity mark drawn beside it. Full width on a phone, content width
// from md.

import type { LineupDeck } from "../../../lib/lineup/types";
import { IdentityMark } from "./identity-mark";

export function DeckSelect({ decks, value, onChange, label }: { decks: readonly LineupDeck[]; value: string; onChange: (id: string) => void; label: string }) {
  const chosen = decks.find((d) => d.id === value);
  return (
    <label className="relative flex min-h-[44px] w-full max-w-full items-center gap-[8px] rounded-[9px] border border-[color:var(--border-strong)] bg-[var(--surface)] px-[12px] text-[13.5px] text-[color:var(--fg)] md:min-h-[36px] md:w-auto md:self-start">
      {chosen ? <IdentityMark identity={chosen.identity} /> : null}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent pr-[16px] text-[13.5px] text-[color:var(--fg)] outline-none"
      >
        {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-[12px] text-[10px] text-[color:var(--fg-muted)]">▾</span>
    </label>
  );
}
