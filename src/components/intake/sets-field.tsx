"use client";

// The Sets answer's control (three-answers addendum §2): the Set trigger's count treatment (#1050),
// `Set 0` / `Set 1` / `Sets 2`, width reserved for `Sets 9`, over the shipped searchable
// `FilterPanel` of every set that printed a commander. The chosen sets are chips beside it, each a
// mono code then the name, with a ✕. Several sets are always "or", so there is no join control.

import { collectionFilterCopy, type FilterPanelCopy } from "../../lib/copy/collection";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import { printedInPanelCopy } from "../../lib/copy/lanes";
import type { PrintedInSet } from "../../lib/sets/printed-in";
import { FilterPanel } from "../ui/filter-panel";

const copy = helpMeChooseCopy.intake;

/** The lanes' Printed in panel, under the Set trigger's count. */
const PANEL_COPY: FilterPanelCopy = {
  ...printedInPanelCopy,
  triggerLabel: copy.sets,
  triggerCount: collectionFilterCopy.set.triggerCount,
  // The phone's sheet is titled as the field is, not as the lanes' control.
  sheetTitle: copy.sets,
  // No counts here (`showCounts={false}`), so none is spoken: the lanes' own reads "0 commanders".
  optionAria: (setName: string) => setName,
};

export function SetsField({
  sets,
  value,
  onChange,
  wide,
  copy: copyOverride,
}: {
  /** Every set that printed a commander, newest first. */
  sets: readonly PrintedInSet[];
  /** Lower-case codes. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  wide: boolean;
  /**
   * Overrides the trigger's label/count/sheet-title and the chip's remove aria, for a caller
   * whose box names itself differently (H35 PR 2's "Kept for this deck": "Set: Any" rather than
   * "Set 0"). Everything else — search, groups, the panel's own aria strings — stays the shared
   * `printedInPanelCopy`/intake copy, so the two callers' panels behave identically past the
   * trigger.
   */
  copy?: { triggerLabel: string; triggerCount: (n: number) => string; sheetTitle: string; removeSet: (name: string) => string };
}) {
  const panelCopy: FilterPanelCopy = copyOverride
    ? { ...PANEL_COPY, triggerLabel: copyOverride.triggerLabel, triggerCount: copyOverride.triggerCount, sheetTitle: copyOverride.sheetTitle }
    : PANEL_COPY;
  const removeSet = copyOverride?.removeSet ?? copy.removeSet;
  const options = sets.map((s) => ({ code: s.code, label: s.name, hint: s.code.toUpperCase(), count: 0, disabled: false }));
  const nameOf = (code: string) => sets.find((s) => s.code === code)?.name ?? code.toUpperCase();
  return (
    <div data-testid="sets-field" className="flex flex-wrap items-center gap-[6px]">
      <FilterPanel
        // Keyed on the form, as every chassis panel is: it holds its own `open`.
        key={wide ? "wide" : "compact"}
        compact={!wide}
        copy={panelCopy}
        options={options}
        selected={[...value]}
        searchable
        showCounts={false}
        desktopRowMinPx={44}
        onToggle={(code) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code])}
        onClear={() => onChange([])}
      />
      {value.map((code) => (
        <span
          key={code}
          data-testid="set-chip"
          className="inline-flex items-center gap-[6px] h-[26px] pl-[9px] pr-[4px] rounded-[6px] bg-[color:var(--elevated)] text-[12.5px] text-[color:var(--fg-body)]"
        >
          <span className="font-mono text-[11px] font-semibold text-[color:var(--fg)]">{code.toUpperCase()}</span>
          <span>{nameOf(code)}</span>
          <button
            type="button"
            aria-label={removeSet(nameOf(code))}
            onClick={() => onChange(value.filter((c) => c !== code))}
            className="relative flex items-center justify-center w-[18px] h-[18px] border-0 bg-transparent text-[color:var(--fg-faint)] cursor-pointer after:absolute after:inset-[-13px] after:content-['']"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
