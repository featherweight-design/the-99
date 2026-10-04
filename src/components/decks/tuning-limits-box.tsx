"use client";

// "Kept for this deck" (H35, STATES-deck-description.md §3 states 1/3, PR 2): the per-card cap,
// the set and owned-only Suggested changes' own swaps stay inside — held per deck, never seeded,
// drawn above the action row whether or not a reading has ever run.

import { useId, useRef, useState } from "react";
import { MAX_BUDGET_DOLLARS } from "../../lib/intake/answers";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import type { PrintedInSet } from "../../lib/sets/printed-in";
import { SetsField } from "../intake/sets-field";
import { useIsDesktop } from "../ui/use-is-desktop";

const copy = deckDescriptionCopy.limits;

/** The box's own cap field: whole dollars, the same bound `lookDeeper`'s budget control checks
 *  server-side. Mirrors `parseBudget` (intake-form.tsx) rather than importing it — that one is
 *  scoped to the intake form's own module and not exported. */
export function parseCapDollars(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  if (!/^\d{1,6}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_BUDGET_DOLLARS ? n : null;
}

const SETS_PANEL_COPY = {
  triggerLabel: "Set",
  // Same `Set 0 / Set 1 / Sets n` shape as `collectionFilterCopy.set.triggerCount`
  // (sets-field.tsx's own default): `FilterPanel`'s trigger sizer is fixed to this
  // function's own widest digit form (`Sets 9`), so a differently-worded zero case
  // would be wider than the sizer and visibly narrow the moment a set is picked.
  triggerCount: (n: number) => (n <= 1 ? `Set ${n}` : `Sets ${n}`),
  sheetTitle: "Set",
  removeSet: copy.removeSet,
};

export function TuningLimitsBox({
  sets,
  capDollars,
  onCapChange,
  selectedSets,
  onSetsChange,
  ownedOnly,
  onOwnedOnlyChange,
}: {
  /** Every set that printed a commander, newest first — the same list `SetsField`'s other
   *  caller (help-me-choose's intake form) reads. */
  sets: readonly PrintedInSet[];
  /** Whole dollars, or null for no cap. The field's own text input, not cents — the caller
   *  converts only at the save boundary (`saveDeckLimits`). */
  capDollars: number | null;
  onCapChange: (next: number | null) => void;
  /** Lower-case codes. */
  selectedSets: readonly string[];
  onSetsChange: (next: string[]) => void;
  ownedOnly: boolean;
  onOwnedOnlyChange: (next: boolean) => void;
}) {
  const [capDraft, setCapDraft] = useState(capDollars === null ? "" : String(capDollars));
  // A revalidated `capDollars` (another tab's save, or the page's own "unedited" sync in
  // `TuningPanel`) only reaches the mount-time `useState` above once, at mount — a later change
  // from outside this field had nothing to redraw it (pre-open review round 1).
  const [seenCapDollars, setSeenCapDollars] = useState(capDollars);
  if (seenCapDollars !== capDollars) {
    setSeenCapDollars(capDollars);
    setCapDraft(capDollars === null ? "" : String(capDollars));
  }
  const capId = useId();
  const wide = useIsDesktop();
  return (
    <div
      data-testid="tuning-limits-box"
      className="flex flex-col gap-[14px] rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[14px]"
    >
      <h3 className="m-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
        {copy.heading}
      </h3>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor={capId} className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
          {copy.capLabel}
        </label>
        <div className="flex h-[40px] items-center gap-[6px] rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[10px]">
          <span aria-hidden className="font-mono text-[14px] text-[color:var(--fg-faint)]">$</span>
          <input
            id={capId}
            inputMode="numeric"
            autoComplete="off"
            value={capDraft}
            placeholder={copy.capPlaceholder}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
              setCapDraft(digits);
              if (digits === "") {
                // An explicit clear — the only case that is allowed to save "no cap".
                onCapChange(null);
                return;
              }
              const parsed = parseCapDollars(digits);
              // A non-empty value outside the bound (`0`, over `MAX_BUDGET_DOLLARS`) is a draft
              // still being typed, not a request to clear the cap — nothing saves until it is
              // either fixed or emptied (pre-open review round 1).
              if (parsed !== null) onCapChange(parsed);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[16px] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-faint)] md:text-[14px]"
          />
        </div>
      </div>

      {/* No label row of its own — SetsField's trigger already reads "Set: Any" / "Set n". */}
      <SetsField sets={sets} value={selectedSets} onChange={onSetsChange} wide={wide} copy={SETS_PANEL_COPY} />

      <div className="flex flex-col gap-[6px]">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
          {copy.ownLabel}
        </span>
        <OwnedOnlyToggle value={ownedOnly} onChange={onOwnedOnlyChange} />
      </div>
    </div>
  );
}

/** Any card / Only cards I own — the same two-way toggle shape as help-me-choose's `PoolRadios`,
 *  built fresh rather than imported: that one is private to `intake-form.tsx` and reads its own
 *  `Pool` union and copy, neither of which this box shares. */
function OwnedOnlyToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  const options: readonly boolean[] = [false, true];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.indexOf(value);
  return (
    <div role="radiogroup" aria-label={copy.ownLabel} className="flex gap-[6px]">
      {options.map((o, i) => {
        const selected = o === value;
        return (
          <button
            key={String(o)}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
              e.preventDefault();
              // Same shape as `PoolRadios` (intake-form.tsx): focus follows the new choice, so
              // a second arrow press or a Space lands on the option that is now checked, not the
              // one that was (pre-open review round 1).
              const next = (current + 1) % options.length;
              refs.current[next]?.focus();
              onChange(options[next]);
            }}
            className={[
              "flex h-[40px] flex-[1_1_0] min-w-0 items-center justify-center rounded-[7px] border border-solid text-[13px] cursor-pointer",
              selected
                ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border-[color:var(--accent)]"
                : "text-[color:var(--fg-muted)] bg-[color:var(--surface-sunken)] border-[color:var(--border)]",
            ].join(" ")}
          >
            {o ? copy.ownOnly : copy.ownAny}
          </button>
        );
      })}
    </div>
  );
}
