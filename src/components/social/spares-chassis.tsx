"use client";

// A friend's Spares tab frame (handoff `design_handoff_the99_spares_search`): the app's one filter frame
// (`ui/filter-chassis`) over the tab, built as the cart's is. 1000px and up: search, colour pips (Any / Exactly),
// `Type ▾` and `Wanted ▾`, then Sort past the hairline; below it: search, the 44px Filters box (badge = dimensions on,
// never the search) opening a Spares variant of the Collection sheet, then Sort. Row 2 holds a chip per dimension on
// and the result line says cards (`3 of 25 spares`), never copies.

import { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { chassisCopy } from "../../lib/copy/filter-chassis";
import { collectionFilterCopy } from "../../lib/copy/collection";
import { cartPanel } from "../../lib/copy/all-decks-cart";
import { sparesSearchCopy as copy } from "../../lib/copy/social";
import {
  NO_SPARE_FILTERS, SPARE_SORTS, activeSpareDimensions, buildSpareColorOptions, buildSpareTypeOptions,
  buildWantedOptions, type SpareBrowseLine, type SpareFilters, type SpareSort, type SpareWanted,
} from "../../lib/social/spare-browse";
import { ColourControl } from "../commanders/rack/colour-control";
import { FiltersTrigger } from "../collection/filter-bar";
import { DeckSearchField } from "../decks/deck-filter-column";
import { OrderMenu } from "../decks/deck-sort-menu";
import { CHASSIS_WIDE_MIN_PX, FilterChassis, type FilterChip } from "../ui/filter-chassis";
import { FilterPanel } from "../ui/filter-panel";
import { Sheet } from "../ui/sheet";
import { SheetChip } from "../ui/set-list-sheet";
import { useMinWidth } from "../ui/use-min-width";

const CHIP_TERM_MAX = 24;
const WANTED_LABEL: Record<SpareWanted, string> = { wishlist: copy.wanted.wishlist, deck: copy.wanted.deck };
const SORT_LABEL: Record<SpareSort, string> = { wanted: copy.sort.wantedFirst, name: copy.sort.name, most: copy.sort.most };
const WANTED_PANEL = cartPanel(copy.wanted.label);

const toggle = <T extends string>(list: readonly T[], code: T): T[] => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

export function SparesChassis({ lines, shown, filters, onFilters, sort, onSort }: {
  /** Every spare the friend offers: option counts read these under the other filters. */
  lines: readonly SpareBrowseLine[];
  /** How many the filters leave. */
  shown: number;
  filters: SpareFilters;
  onFilters: (next: SpareFilters) => void;
  sort: SpareSort;
  onSort: (next: SpareSort) => void;
}) {
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);
  const [sheet, setSheet] = useState(false);
  // The sheet belongs to the compact form: crossing into the wide one closes it.
  if (wide && sheet) setSheet(false);
  const term = filters.search.trim();
  const shortTerm = term.length > CHIP_TERM_MAX ? `${term.slice(0, CHIP_TERM_MAX)}…` : term;
  const typeOptions = useMemo(() => buildSpareTypeOptions(lines, filters), [lines, filters]);
  const colorOptions = useMemo(() => buildSpareColorOptions(lines, filters), [lines, filters]);
  const wantedOptions = useMemo(() => buildWantedOptions(lines, filters, WANTED_LABEL), [lines, filters]);
  const total = lines.length;
  const nameOf = (options: readonly { code: string; label: string }[], code: string) => options.find((o) => o.code === code)?.label ?? code;
  const chips: FilterChip[] = [
    ...(filters.colors.length > 0 ? [{
      key: "colors", label: copy.chip.colours(filters.colors.length), spoken: filters.colors.map((c) => nameOf(colorOptions, c)).join(", "),
      onRemove: () => onFilters({ ...filters, colors: [], match: "contains" }),
    }] : []),
    ...(filters.colors.length > 0 && filters.match === "exactly" ? [{
      key: "match", label: "Exactly", onRemove: () => onFilters({ ...filters, match: "contains" }),
    }] : []),
    ...(filters.types.length > 0 ? [{
      key: "types", label: copy.chip.types(filters.types.length, filters.types[0]), spoken: filters.types.length > 1 ? filters.types.join(", ") : undefined,
      onRemove: () => onFilters({ ...filters, types: [] }),
    }] : []),
    ...(filters.wanted.length > 0 ? [{
      key: "wanted", label: copy.chip.wanted(filters.wanted.length, WANTED_LABEL[filters.wanted[0]]),
      spoken: filters.wanted.length > 1 ? filters.wanted.map((w) => WANTED_LABEL[w]).join(", ") : undefined,
      onRemove: () => onFilters({ ...filters, wanted: [] }),
    }] : []),
    ...(term ? [{
      key: "q", label: copy.chip.search(shortTerm), spoken: shortTerm === term ? undefined : copy.chip.search(term),
      onRemove: () => onFilters({ ...filters, search: "" }),
    }] : []),
  ];
  const search = (
    <div className="min-w-0 flex-auto">
      <DeckSearchField
        value={filters.search}
        onChange={(search) => onFilters({ ...filters, search })}
        size={wide ? "column" : "sheet"}
        active={term !== ""}
        placeholder={wide ? copy.search.placeholderWide : copy.search.placeholderCompact}
        label={copy.search.aria}
        narrow={!wide}
      />
    </div>
  );
  const clearAll = () => onFilters({ ...NO_SPARE_FILTERS });
  return (
    <FilterChassis
      form={wide ? "wide" : "compact"}
      controls={
        wide ? (
          <>
            {search}
            <ColourControl
              wide
              colors={filters.colors.map((c) => c.toLowerCase())}
              match={filters.match}
              onColorsChange={(c) => onFilters({ ...filters, colors: c.map((v) => v.toUpperCase()) })}
              onMatchChange={(match) => onFilters({ ...filters, match })}
              unavailable={colorOptions.filter((o) => o.disabled).map((o) => o.code)}
            />
            <FilterPanel
              desktopRowMinPx={44}
              compact={false}
              copy={collectionFilterCopy.type}
              options={typeOptions}
              selected={filters.types}
              onToggle={(code) => onFilters({ ...filters, types: toggle(filters.types, code) })}
              onClear={() => onFilters({ ...filters, types: [] })}
              searchable={false}
              widthPx={300}
            />
            <FilterPanel
              desktopRowMinPx={44}
              compact={false}
              copy={WANTED_PANEL}
              options={wantedOptions}
              selected={filters.wanted}
              onToggle={(code) => onFilters({ ...filters, wanted: toggle(filters.wanted, code as SpareWanted) })}
              onClear={() => onFilters({ ...filters, wanted: [] })}
              widthPx={280}
              footerStatus={false}
            />
          </>
        ) : (
          <>
            {search}
            <FiltersTrigger active={activeSpareDimensions(filters)} expanded={sheet} onClick={() => setSheet(true)} />
          </>
        )
      }
      sort={
        <OrderMenu value={sort} order={SPARE_SORTS} labels={SORT_LABEL} triggerLabel={copy.sort.trigger} heading={copy.sort.panelAria} onChange={onSort} />
      }
      chips={chips}
      onClearAll={clearAll}
      resultLine={copy.result(shown, total)}
      silentResult={!wide && sheet}
      after={
        wide || !sheet ? null : (
          <SparesFilterSheet
            onDismiss={() => setSheet(false)}
            shown={shown}
            total={total}
            filters={filters}
            onFilters={onFilters}
            typeOptions={typeOptions}
            colorOptions={colorOptions}
            wantedOptions={wantedOptions}
          />
        )
      }
    />
  );
}

const HEADING = "m-0 mb-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]";

/** The Collection's Filters sheet with Wanted, Color identity and Type: no Set, no Availability. Absent until opened. */
function SparesFilterSheet({ onDismiss, shown, total, filters, onFilters, typeOptions, colorOptions, wantedOptions }: {
  onDismiss: () => void;
  shown: number;
  total: number;
  filters: SpareFilters;
  onFilters: (next: SpareFilters) => void;
  typeOptions: ReturnType<typeof buildSpareTypeOptions>;
  colorOptions: ReturnType<typeof buildSpareColorOptions>;
  wantedOptions: ReturnType<typeof buildWantedOptions>;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  // The sheet is modal, so the result line behind it goes quiet and this region says the count once, debounced.
  const [said, setSaid] = useState("");
  const last = useRef(shown);
  useEffect(() => {
    if (last.current === shown) return;
    last.current = shown;
    const t = setTimeout(() => setSaid(copy.sheet.match(shown, total)), 300);
    return () => clearTimeout(t);
  }, [shown, total]);
  useDialogA11y(dialog, onDismiss, { initialFocusRef: dialog });
  return (
    <Sheet
      open
      onDismiss={onDismiss}
      ariaLabel={copy.sheet.title}
      panelRef={dialog}
      portal
      frameClassName="fixed inset-0 z-50 flex flex-col justify-end min-[1000px]:hidden bottom-auto top-[var(--vv-top,0px)] h-[var(--vv-h,100%)]"
      scrimClassName="absolute inset-0 bg-[rgba(8,6,4,0.62)]"
      handleClassName="flex touch-none justify-center pt-[10px] pb-0"
      handleBarClassName="h-[4px] w-[38px] rounded-[2px] bg-[color:var(--border-dashed)]"
      panelClassName="relative z-10 flex max-h-[86dvh] flex-col rounded-t-[18px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]"
    >
      <div className="flex flex-col gap-[14px] overflow-y-auto px-[18px] pt-[14px] pb-[26px]">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)]">{copy.sheet.title}</h2>
          <small data-sheet-match className="font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.sheet.match(shown, total)}</small>
        </div>
        <section className="shrink-0">
          <h3 className={HEADING}>{copy.sheet.wantedHeading}</h3>
          <div className="grid grid-cols-1 gap-[8px] min-[360px]:grid-cols-2">
            {wantedOptions.map((o) => (
              <SheetChip
                fill key={o.code} label={o.label} count={o.count} on={filters.wanted.includes(o.code as SpareWanted)} disabled={o.disabled}
                unavailableAria={WANTED_PANEL.optionAriaUnavailable(o.label)}
                onClick={() => onFilters({ ...filters, wanted: toggle(filters.wanted, o.code as SpareWanted) })}
              />
            ))}
          </div>
        </section>
        <section className="shrink-0">
          <h3 className={HEADING}>{copy.sheet.colourHeading}</h3>
          <ColourControl
            wide={false}
            hideColourCaption
            colors={filters.colors.map((c) => c.toLowerCase())}
            match={filters.match}
            onColorsChange={(c) => onFilters({ ...filters, colors: c.map((v) => v.toUpperCase()) })}
            onMatchChange={(match) => onFilters({ ...filters, match })}
            unavailable={colorOptions.filter((o) => o.disabled).map((o) => o.code)}
          />
        </section>
        <section className="shrink-0">
          <h3 className={HEADING}>{copy.sheet.typeHeading}</h3>
          <div data-type-grid className="grid grid-cols-1 gap-[8px] min-[360px]:grid-cols-2">
            {typeOptions.map((o) => (
              <SheetChip
                fill key={o.code} label={o.label} count={o.count} on={filters.types.includes(o.code)} disabled={o.disabled}
                unavailableAria={collectionFilterCopy.type.optionAriaUnavailable(o.label)}
                onClick={() => onFilters({ ...filters, types: toggle(filters.types, o.code) })}
              />
            ))}
          </div>
        </section>
        <div className="mt-[4px] flex items-center gap-[14px]">
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-[44px] flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] border-0 bg-[color:var(--fg)] px-[16px] font-sans text-[14px] font-semibold text-[color:var(--bg)]"
          >
            {copy.sheet.show(shown)}
          </button>
          <button
            type="button"
            onClick={() => onFilters({ ...NO_SPARE_FILTERS })}
            aria-label={chassisCopy.chips.clearAllAria}
            className="flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent p-0 font-sans text-[13.5px] font-medium text-[color:var(--accent-text)]"
          >
            {chassisCopy.chips.clearAll}
          </button>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{said}</span>
    </Sheet>
  );
}
