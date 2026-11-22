// Spares search (account 1, 2026-11-22), PROPOSAL: a friend's Spares tab gains the Collection's filter frame.
// Static for the boards: every state comes in as props. Built only from shipped parts (FilterChassis, SearchField,
// ColourControl, FilterPanel, FiltersBoxTrigger, ResultLine, FilterChipPill, SheetChip, Sheet, ZeroState).
import { FilterChassis, FilterChipPill, type FilterChip } from "../src/components/ui/filter-chassis";
import { SearchField } from "../src/components/ui/text-field";
import { ColourControl } from "../src/components/commanders/rack/colour-control";
import { FilterPanel } from "../src/components/ui/filter-panel";
import { FiltersBoxTrigger } from "../src/components/ui/filters-box-trigger";
import { ResultLine } from "../src/components/ui/result-line";
import { SheetChip } from "../src/components/ui/set-list-sheet";
import { Sheet } from "../src/components/ui/sheet";
import { GhostButton, PrimaryButton } from "../src/components/ui/button";
import { ZERO_PRIMARY, ZERO_SECONDARY, ZeroState } from "../src/components/ui/zero-state";
import { collectionChassisCopy, collectionFilterCopy } from "../src/lib/copy/collection";
import { chassisCopy } from "../src/lib/copy/filter-chassis";
import { filterCopy } from "../src/lib/copy/lanes";
import { HydratedImg } from "../src/components/ui/hydrated-art";

const noop = () => {};

/** The proposal's strings, DRAFT for /copy-review (mirrored in `copy strings.ts`). */
export const sparesSearchCopy = {
  searchWide: "Search by name or type…",
  searchCompact: "Name or type…",
  searchAria: (friend: string) => `Search ${friend}'s spares by name or type`,
  result: (shown: number, total: number) => (shown === total ? `${total} spares` : `${shown} of ${total} spares`),
  wanted: {
    label: "Wanted",
    wishlist: "On your wishlist",
    deck: "A deck needs it",
  },
  sort: { forYou: "Wanted first", name: "Name", most: "Most spares" },
  tile: { deck: (n: number) => (n === 1 ? "a deck needs it" : `${n} decks need it`) },
  none: {
    heading: (q: string) => (q ? `No spares match “${q}”.` : "No spares match those filters."),
    body: (friend: string) => `Search looks at each card's name and type line, so “wizard” or “saga” works. ${friend} may still have it in a deck.`,
    keepSearch: "Keep only search",
    clear: "Clear all filters",
  },
};
const c = sparesSearchCopy;

export type SpareTile = { oracleId: string; name: string; img: string; spare: number; wish?: boolean; decks?: number };

const wantedCopy = {
  ...collectionFilterCopy.availability,
  triggerLabel: c.wanted.label,
  triggerCount: (n: number) => `${c.wanted.label} ${n}`,
  triggerAriaCollapsed: "Filter by what you want, collapsed",
  triggerAriaWithSelection: (n: number) => `Filter by what you want, ${n} selected, collapsed`,
  panelAriaLabel: "Filter by what you want",
  sheetTitle: c.wanted.label,
};
const sortCopy = { ...collectionFilterCopy.sort, panelAriaLabel: "Sort spares", triggerAriaCollapsed: "Sort spares, collapsed" };

export function Bookmark() {
  return (
    <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
    </svg>
  );
}
/** The deck page's missing-row dot (hollow, dashed), the mark the Shopping key already explains. */
export function NeedDot() {
  return <span aria-hidden className="inline-block h-[7px] w-[7px] flex-none rounded-full" style={{ border: "1px dashed var(--fg-muted)" }} />;
}

const wantedOptions = (wish: number, deck: number) => [
  { code: "wishlist", label: c.wanted.wishlist, count: wish, disabled: wish === 0, leadingGlyph: <span className="text-[color:var(--accent-text)]"><Bookmark /></span> },
  { code: "deck", label: c.wanted.deck, count: deck, disabled: deck === 0, leadingGlyph: <NeedDot /> },
];
const typeOptions = (counts: Record<string, number>) =>
  ["Artifact", "Creature", "Enchantment", "Instant", "Land", "Planeswalker", "Sorcery"].map((t) => ({ code: t, label: t, count: counts[t] ?? 0, disabled: !counts[t] }));
const sortOptions = (sel: string) =>
  [["forYou", c.sort.forYou], ["name", c.sort.name], ["most", c.sort.most]].map(([code, label]) => ({ code, label, count: 0, disabled: false, hint: code === sel ? undefined : undefined }));

export type BrowseState = {
  friend: string;
  query: string;
  colors?: string[];
  types?: string[];
  wanted?: string[];
  sort?: string;
  shown: number;
  total: number;
  typeCounts: Record<string, number>;
  wish: number;
  deck: number;
};

function chipsFor(s: BrowseState): FilterChip[] {
  const out: FilterChip[] = [];
  for (const w of s.wanted ?? []) out.push({ key: `w-${w}`, label: `${c.wanted.label} · ${w === "wishlist" ? c.wanted.wishlist : c.wanted.deck}`, onRemove: noop });
  for (const t of s.types ?? []) out.push({ key: `t-${t}`, label: `Type · ${t}`, onRemove: noop });
  return out;
}

function Panel({ kind, s, compact }: { kind: "type" | "wanted" | "sort"; s: BrowseState; compact: boolean }) {
  if (kind === "sort")
    return (
      <FilterPanel key="sort" portalSheet={false} compact={compact} desktopRowMinPx={44} copy={sortCopy} options={sortOptions(s.sort ?? "forYou")}
        selected={[s.sort ?? "forYou"]} selectionMode="single" selectionOrnament={false} showCounts={false} searchable={false} widthPx={240}
        footerStatus={false} onToggle={noop} onClear={noop} onAnnounce={noop} />
    );
  if (kind === "type")
    return (
      <FilterPanel key="type" compact={compact} desktopRowMinPx={44} copy={collectionFilterCopy.type} options={typeOptions(s.typeCounts)}
        selected={s.types ?? []} searchable={false} widthPx={300} footerStatus={false} onToggle={noop} onClear={noop} onAnnounce={noop} />
    );
  return (
    <FilterPanel key="wanted" compact={compact} desktopRowMinPx={44} copy={wantedCopy} options={wantedOptions(s.wish, s.deck)}
      selected={s.wanted ?? []} searchable={false} widthPx={280} footerStatus={false} onToggle={noop} onClear={noop} onAnnounce={noop} />
  );
}

/** ≥1000: the shipped wide chassis, full-bleed under the friend strip. */
export function SparesChassisWide({ s }: { s: BrowseState }) {
  return (
    <div data-dz="chassis" className="-mx-[34px] mt-[14px]">
      <FilterChassis
        form="wide"
        chips={chipsFor(s)}
        onClearAll={noop}
        resultLine={c.result(s.shown, s.total)}
        sort={<Panel kind="sort" s={s} compact={false} />}
        controls={
          <>
            <SearchField
              containerClassName="gap-[10px] flex-1 px-[14px] py-[10px]"
              className="text-[16px] [@media(pointer:fine)]:text-[14px]"
              value={s.query}
              onChange={noop}
              onClear={noop}
              placeholder={c.searchWide}
              aria-label={c.searchAria(s.friend)}
              clearLabel={filterCopy.search.clear}
            />
            <ColourControl wide colors={(s.colors ?? []).map((x) => x.toLowerCase())} match="contains" onColorsChange={noop} onMatchChange={noop} unavailable={[]} />
            <Panel kind="type" s={s} compact={false} />
            <Panel kind="wanted" s={s} compact={false} />
          </>
        }
      />
    </div>
  );
}

/** <1000: the Collection's compact head, two rows (search; Filters · Sort · count), and the chip shelf while a filter is on. */
export function SparesChassisCompact({ s }: { s: BrowseState }) {
  const chips = chipsFor(s);
  const active = (s.colors?.length ? 1 : 0) + (s.types?.length ? 1 : 0) + (s.wanted?.length ? 1 : 0);
  return (
    <div data-dz="chassis" className="-mx-[14px] mt-[10px]">
      <div className="flex flex-col gap-[6px] border-0 border-b border-solid border-b-[color:var(--border)] px-[16px] pt-[8px] pb-[7px]" style={{ background: "var(--bg)" }}>
        <div className="flex min-h-[50px] items-center gap-[8px]">
          <SearchField
            containerClassName="gap-[8px] px-[12px] py-[9px] min-h-[44px] min-w-0 flex-1 rounded-[10px]"
            className="text-[16px]"
            value={s.query}
            onChange={noop}
            placeholder={c.searchCompact}
            aria-label={c.searchAria(s.friend)}
            clearLabel={filterCopy.search.clear}
            onClear={noop}
          />
        </div>
        <div className="flex items-center gap-[8px]">
          <FiltersBoxTrigger label={collectionChassisCopy.sheet.trigger} ariaLabel={collectionChassisCopy.sheet.triggerAria(active)} badge={active} expanded={false} onClick={noop} />
          <div aria-hidden className="h-[20px] w-px flex-none bg-[color:var(--border)]" />
          <Panel kind="sort" s={s} compact />
          <div className="min-w-0 flex-1">
            <ResultLine line={c.result(s.shown, s.total)} />
          </div>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex h-[44px] items-center gap-[6px] overflow-x-auto whitespace-nowrap px-[16px]">
          {chips.map((chip) => <FilterChipPill key={chip.key} chip={chip} />)}
          <button type="button" className="relative ml-auto shrink-0 cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] leading-[14px] text-[color:var(--fg-muted)] underline">
            {chassisCopy.chips.clearAll}
          </button>
        </div>
      )}
    </div>
  );
}

const HEADING = "mx-0 mt-0 mb-[9px] p-0 font-mono text-[10px] tracking-[0.14em] uppercase text-[color:var(--fg-faint)]";
/** The phone's Filters sheet: the Collection sheet's groups, Wanted first, then Color identity and Type. No Set, no Availability. */
export function SparesFilterSheet({ s }: { s: BrowseState }) {
  const sh = collectionChassisCopy.sheet;
  return (
    <Sheet
      open
      onDismiss={noop}
      ariaLabel={sh.title}
      frameClassName="fixed inset-0 z-50 flex flex-col justify-end"
      scrimClassName="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      handleClassName="flex touch-none justify-center pt-[12px] pb-0"
      handleBarClassName="h-[4px] w-[38px] rounded-[2px] bg-[color:var(--border-strong)]"
      panelClassName="relative z-10 flex max-h-[86dvh] flex-col rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)]"
    >
      <div className="flex flex-col gap-[14px] px-[16px] pt-[14px] pb-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">{sh.title}</h2>
          <span className="ml-auto font-mono text-[11px] text-[color:var(--fg-faint)]">{sh.match(s.shown, s.total)}</span>
        </div>
        <section>
          <h3 className={HEADING}>{c.wanted.label}</h3>
          <div className="flex flex-wrap gap-[8px]">
            {wantedOptions(s.wish, s.deck).map((o) => (
              <SheetChip key={o.code} label={o.label} count={o.count} on={(s.wanted ?? []).includes(o.code)} disabled={o.disabled} glyph={o.leadingGlyph} unavailableAria={o.label} onClick={noop} />
            ))}
          </div>
        </section>
        <section>
          <h3 className={HEADING}>{sh.colourHeading}</h3>
          <ColourControl wide={false} colors={(s.colors ?? []).map((x) => x.toLowerCase())} match="contains" onColorsChange={noop} onMatchChange={noop} unavailable={[]} hideColourCaption />
        </section>
        <section>
          <h3 className={HEADING}>{sh.typeHeading}</h3>
          <div className="grid grid-cols-2 gap-[8px]">
            {typeOptions(s.typeCounts).map((o) => (
              <SheetChip fill key={o.code} label={o.label} count={o.count} on={(s.types ?? []).includes(o.code)} disabled={o.disabled} unavailableAria={o.label} onClick={noop} />
            ))}
          </div>
        </section>
        <button type="button" className="mt-[2px] h-[44px] shrink-0 cursor-pointer rounded-lg border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] font-sans text-[14px] font-medium text-[color:var(--fg)]">
          {sh.done}
        </button>
      </div>
    </Sheet>
  );
}

/** The shipped Ask tab's tile and caption, with one more caption line: `a deck needs it` beside the shipped wishlist mark. */
export function SparesGrid({ tiles }: { tiles: SpareTile[] }) {
  return (
    <ul className="m-0 mt-[12px] grid list-none grid-cols-2 gap-x-[8px] gap-y-[12px] p-0 md:grid-cols-4 md:gap-[20px] xl:grid-cols-6">
      {tiles.map((t) => (
        <li key={t.oracleId} data-testid="spare-tile" className="flex min-w-0 flex-col gap-[6px]">
          <button type="button" className="relative block w-full cursor-pointer overflow-hidden p-0 [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1px_solid_var(--border)] bg-[color:var(--surface-sunken)]">
            <HydratedImg eager src={t.img} alt="" className="absolute inset-0 block h-full w-full object-cover object-center" />
          </button>
          <span className="flex flex-col gap-[3px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
            <span>{t.spare === 1 ? "1 spare" : `${t.spare} spares`}</span>
            {t.wish && (
              <span className="inline-flex items-center gap-[4px] text-[color:var(--accent-text)]"><Bookmark />on your wishlist</span>
            )}
            {t.decks ? (
              <span className="inline-flex items-center gap-[5px] text-[color:var(--fg-body)]"><NeedDot />{c.tile.deck(t.decks)}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SparesNoResults({ s }: { s: BrowseState }) {
  return (
    <div className="flex flex-col">
      <ZeroState
        heading={c.none.heading(s.query)}
        body={c.none.body(s.friend)}
        primary={s.query && (s.colors?.length || s.types?.length || s.wanted?.length) ? <PrimaryButton type="button" className={ZERO_PRIMARY}>{c.none.keepSearch}</PrimaryButton> : undefined}
        secondary={<GhostButton type="button" className={ZERO_SECONDARY}>{c.none.clear}</GhostButton>}
      />
    </div>
  );
}
