"use client";

// `/decks/precons` (design table: Route /decks/precons). Filters, order and view live in the URL
// (`q`, `colour`, `sort=owned`, `view=rows`), mirrored through `mirrorUrl` as `/decks` does, and the
// order and view are also remembered per browser. Everything here is a view over rows the server
// summarised. Tiles are the default view (R4 §1); rows stay one press away.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { acknowledgeArrivals } from "../../home/arrivals-seen";
import { preconsCopy } from "../../../lib/copy/precons";
import { colorNames } from "../../../lib/copy/color-labels";
import { PIP_ORDER, type PipCode } from "../../../lib/copy/filter-chassis";
import {
  filterPrecons, groupByYear, isPreconOrder, isPreconView, orderPrecons, parsePreconParams, PRECON_ORDERS,
  type PreconOrder, type PreconRow as Row, type PreconView,
} from "../../../lib/precons/list";
import { viewToggleCopy } from "../../../lib/copy/card-surfaces";
import { mirrorUrl } from "../../../lib/url/mirror";
import { useLiveQuery } from "../../../lib/commanders/live-query";
import { ColourPips } from "../../ui/colour-pips";
import { FilterChassis, type FilterChip } from "../../ui/filter-chassis";
import { useMinWidth } from "../../ui/use-min-width";
import { useStoredView } from "../../ui/use-stored-view";
import { ViewToggle, type ViewToggleOption } from "../../ui/view-toggle";
import { PRECONS_VIEW_COOKIE } from "../../ui/view-cookie";
import { GRID_EAGER_TILES } from "../../collection/grid-view";
import { DeckSearchField } from "../deck-filter-column";
import { OrderMenu } from "../deck-sort-menu";
import { PendingReporter } from "../../shell/pending-reporter";
import { PreconRow } from "./precon-row";
import { PreconTile } from "./precon-tile";
import { EmptyCollectionBand } from "./empty-collection-band";
import { AnnouncedGroup, useAnnouncedVisit } from "./announced-group";
import type { ListedJump } from "./announced-parts";
import { filterAnnounced } from "../../../lib/precons/arrivals";
import type { AnnouncedProps } from "../../../lib/precons/announced";
import { ArrivalOrder } from "@/components/ui/arrival-queue";

const copy = preconsCopy;
export const PRECON_ORDER_KEY = "the99:precons:order";
export const PRECON_VIEW_KEY = "the99:precons:view";

const VIEWS: readonly [ViewToggleOption<PreconView>, ViewToggleOption<PreconView>] = [
  { value: "rows", glyph: "≣", label: viewToggleCopy.precons.rows },
  { value: "tiles", glyph: "▦", label: viewToggleCopy.precons.tiles },
];

export type PreconListViewProps = {
  /** The page's query string, as the server read it. */
  query: string;
  /** From `parsePreconParams`. */
  rows: Row[];
  hasCollection: boolean;
  fromNew: boolean;
  initial: { q: string; colours: string[]; order: PreconOrder | null; view: PreconView | null };
  /** The view this browser stored, as the page read it from `PRECONS_VIEW_COOKIE`, so the server
   *  draws the view the reader will see (audit finding 2). */
  storedView?: PreconView | null;
  /** The Announced group's data (upcoming precons), or null: the switch is off or the read failed (T1, T9). */
  announced?: AnnouncedProps | null;
  /** The Announced head's last press, as the page read it from `PRECONS_ANNOUNCED_COOKIE`. */
  storedAnnounced?: "open" | "closed" | null;
  /** The precons that read `new ·` on their tile, decided by the server against its own clock (L2, L3). */
  newFileNames?: readonly string[];
  /**
   * This visit writes the arrivals' seen keys (the page's `after()`, rule 6): the list drew, the switch is on and the
   * key set is not empty. The view then tells Home's banner, whose payload the router may restore on Back.
   */
  acknowledgesArrivals?: boolean;
};

const isOrder = (v: string): v is PreconOrder => isPreconOrder(v);
const isView = (v: string): v is PreconView => isPreconView(v);

export function PreconListView({
  rows, hasCollection, fromNew, initial, query, storedView: cookieView = null, announced = null, newFileNames = [],
  acknowledgesArrivals = false,
  storedAnnounced = null,
}: PreconListViewProps) {
  // After mount, so a prefetch or a server render never counts: the reader is on the page whose visit wrote the keys.
  useEffect(() => {
    if (acknowledgesArrivals) acknowledgeArrivals();
  }, [acknowledgesArrivals]);
  // `md`, not the chassis's 1000: the table draws the wide form at 900, and this chassis holds
  // three controls where `/decks`' holds six.
  const wide = useMinWidth("(min-width: 768px)");
  const [q, setQ] = useState(initial.q);
  const [colours, setColours] = useState<string[]>(initial.colours);
  const [urlOrder, setUrlOrder] = useState<PreconOrder | null>(initial.order);
  const [storedOrder, storeOrder] = useStoredView(PRECON_ORDER_KEY, isOrder);
  const [urlView, setUrlView] = useState<PreconView | null>(initial.view);
  const [storedView, storeView] = useStoredView(PRECON_VIEW_KEY, isView, { cookie: PRECONS_VIEW_COOKIE, serverValue: cookieView });

  // The URL owns `q`, `colour` and `sort`. A navigation to another /decks/precons URL keeps this
  // view mounted, so the live query is read on every render and a change re-parses all three,
  // during render as `/decks` does, before the stale list can paint or be mirrored back.
  const liveQuery = useLiveQuery(query);
  const [seenQuery, setSeenQuery] = useState(liveQuery);
  if (liveQuery !== seenQuery) {
    const next = parsePreconParams(new URLSearchParams(liveQuery));
    setSeenQuery(liveQuery);
    setQ(next.q);
    setColours(next.colours);
    setUrlOrder(next.order);
    setUrlView(next.view);
  }
  const order: PreconOrder = urlOrder ?? storedOrder ?? "newest";
  const view: PreconView = urlView ?? storedView ?? "tiles";

  function mirror(next: { q: string; colours: string[]; order: PreconOrder; view?: PreconView }) {
    const live = new URLSearchParams(window.location.search);
    // An address that names Newest (the banner's link, over an order this browser saved) keeps naming it while the
    // order stays Newest, or a later filter's mirror would reload as the saved order. Absence stays the default.
    const namedNewest = live.get("sort") === "newest";
    for (const key of ["q", "colour", "sort", "view"]) live.delete(key);
    if (next.q.trim()) live.set("q", next.q.trim());
    if (next.colours.length) live.set("colour", next.colours.join(","));
    if (next.order !== "newest") live.set("sort", next.order);
    else if (namedNewest) live.set("sort", "newest");
    // Tiles is the default, so only rows is written when the reader picks a view (R4 §2). A filter's
    // mirror keeps the view the address already names, an explicit `?view=tiles` included: dropping it
    // would leave a URL that reloads as this browser's stored rows while the page draws tiles.
    if (next.view !== undefined) {
      if (next.view === "rows") live.set("view", "rows");
    } else if (urlView !== null) live.set("view", urlView);
    else if (view === "rows") live.set("view", "rows");
    const written = live.toString();
    // Seen before it is written, so this view's own write never reads back as a navigation (which
    // would re-parse a search mid-word and drop its trailing space).
    setSeenQuery(written);
    mirrorUrl(written ? `?${written}` : window.location.pathname);
  }

  const onSearch = (next: string) => { setQ(next); mirror({ q: next, colours, order }); };
  const onColour = (code: PipCode) => {
    const on = colours.includes(code) ? colours.filter((c) => c !== code) : [...colours, code];
    const next = PIP_ORDER.filter((c) => on.includes(c));
    setColours(next);
    mirror({ q, colours: next, order });
  };
  const onOrder = (next: PreconOrder) => {
    setUrlOrder(next);
    storeOrder(next);
    mirror({ q, colours, order: next });
  };
  const onView = (next: PreconView) => {
    // Picking tiles stores it and leaves the address naming no view (the default), so no later
    // filter's mirror writes an explicit `view=tiles` the reader never asked for.
    setUrlView(next === "rows" ? "rows" : null);
    storeView(next);
    mirror({ q, colours, order, view: next });
  };
  const clearAll = () => { setQ(""); setColours([]); mirror({ q: "", colours: [], order }); };
  // The no-match state clears the one filter its button names: the search first, so a search and
  // colours that both narrow fall back to the colours' own no-match state rather than losing both.
  const clearSearch = () => { setQ(""); mirror({ q: "", colours, order }); };
  const clearColours = () => { setColours([]); mirror({ q, colours: [], order }); };

  const shown = useMemo(() => orderPrecons(filterPrecons(rows, q, colours), order), [rows, q, colours, order]);
  // The Announced group filters with the list, and Most owned hides it, as it drops the year heads (T6, T7).
  const announcedShown = useMemo(
    () => (announced && order === "newest" ? filterAnnounced(announced.sets, announced.commanders, { q, colours }) : []),
    [announced, order, q, colours],
  );
  const filtering = q.trim() !== "" || colours.length > 0;
  // L2: a set still on the way whose decklists are listed jumps to the year its first shown precon leads.
  const listed = useMemo(() => {
    const out: Record<string, ListedJump> = {};
    for (const r of shown) {
      const code = r.setCode.toLowerCase();
      const held = out[code];
      if (held) held.count += 1;
      else out[code] = { count: 1, year: r.releaseDate.slice(0, 4) };
    }
    return out;
  }, [shown]);
  const isNew = useMemo(() => new Set(newFileNames), [newFileNames]);
  // Held here, not in the group: the group unmounts while a filter empties it or Most owned hides it.
  const announcedVisit = useAnnouncedVisit();
  const dates = rows.map((r) => r.releaseDate).sort();
  const first = dates[0]?.slice(0, 4) ?? "";
  const last = dates[dates.length - 1]?.slice(0, 4) ?? "";
  // The first screen's art is eager, counted down the whole list rather than per year: 4 is one row
  // at 900 and two at 390 (`GRID_EAGER_TILES`, as /collection's grid). Rows take the same rule.
  const eagerIds = new Set(shown.slice(0, GRID_EAGER_TILES).map((r) => r.fileName));
  const href = (r: Row) => `/decks/precons/${encodeURIComponent(r.fileName)}${fromNew ? "?from=new" : ""}`;

  // The search is a chip too, labelled with the term itself, as `/decks` labels it: a searched list
  // is a filtered list, and the chassis's "No filters on" would otherwise say otherwise.
  const chips: FilterChip[] = [
    ...(q.trim() ? [{ key: "q", label: q.trim(), onRemove: clearSearch }] : []),
    ...colours.map((c) => ({
    key: `colour:${c}`,
    label: colorNames([c])[0],
    onRemove: () => onColour(c as PipCode),
    })),
  ];

  const pips = <ColourPips form="wide" value={colours} onToggle={onColour} />;
  const toggle = (
    <ViewToggle options={VIEWS} value={view} onChange={onView} compact={!wide} className={wide ? "ml-[2px]" : ""} />
  );
  const sortMenu = (
    <OrderMenu
      value={order}
      order={PRECON_ORDERS}
      labels={copy.list.sort}
      triggerLabel={copy.list.sortTrigger}
      heading={copy.list.sortHeading}
      onChange={onOrder}
      wideFrom="md"
    />
  );
  // 900: the well sits after sort in the chassis (search · pips · sort · well). 390: it sits on the
  // search row instead, so neither row overflows at 358px.
  const sort = wide ? <div className="flex items-center gap-[8px]">{sortMenu}{toggle}</div> : sortMenu;
  const item = (r: Row) => view === "tiles"
    ? <PreconTile key={r.fileName} row={r} href={href(r)} eager={eagerIds.has(r.fileName)} isNew={isNew.has(r.fileName)} />
    : <PreconRow key={r.fileName} row={r} href={href(r)} eager={eagerIds.has(r.fileName)} />;
  // Tiles: 2-up to 480px (174px at 390, gap 10); a 150px floor from 480 to `md`; from `md` a 178px
  // floor (the deck grid's and /collection's), 4-up at 900 (gap 12). The widest tile any width draws
  // is ~241px (three tracks just under 792px), where the shell's 10px radius and a partner card's 5px
  // (of ~159px) both clear the 3.1% matte rule; a fixed column count grew tiles past it (329px at 700). Each tile stretches to its
  // row so the art and the caption line up and only the foot differs (R4 §5).
  const listClass = view === "tiles"
    ? "m-0 grid list-none grid-cols-2 items-stretch gap-[10px] p-0 min-[480px]:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] md:gap-[12px]"
    : "m-0 flex list-none flex-col gap-[8px] p-0";

  return (
    <div className="pb-[96px]">
      <header className="flex flex-col gap-[4px] border-b-[1px] border-solid border-x-0 border-t-0 border-b-[color:var(--border)] p-[12px_16px_12px] md:p-[16px_22px_16px]">
        <Link href={fromNew ? "/decks/new" : "/decks"} className="font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
          {fromNew ? copy.list.backNew : copy.list.back}
          <PendingReporter href={fromNew ? "/decks/new" : "/decks"} />
        </Link>
        <h1 className="m-0 font-display text-[24px] font-normal text-[color:var(--fg)]">{copy.list.title}</h1>
        <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)] md:hidden">{copy.list.subPhone(rows.length, first, last)}</p>
        <p className="m-0 hidden font-mono text-[11px] text-[color:var(--fg-faint)] md:block">{copy.list.sub(rows.length, first, last)}</p>
      </header>

      <div className="px-[16px] pt-[12px] md:px-[22px]">
        {!wide && (
          <div className="mb-[8px] flex items-center gap-[8px]">
            <div className="min-w-0 flex-1">
              <DeckSearchField value={q} onChange={onSearch} size="sheet" placeholder={copy.list.search} />
            </div>
            {toggle}
          </div>
        )}
        <FilterChassis
          form={wide ? "wide" : "compact"}
          controls={
            wide ? (
              <>
                <div className="min-w-0 flex-auto">
                  <DeckSearchField value={q} onChange={onSearch} size="column" placeholder={copy.list.search} />
                </div>
                {pips}
              </>
            ) : pips
          }
          sort={sort}
          chips={chips}
          onClearAll={clearAll}
          resultLine={copy.list.result(shown.length, rows.length, order)
            + (filtering && announcedShown.length > 0 ? copy.upcoming.resultSets(announcedShown.length) : "")}
        />
      </div>

      {!hasCollection && (
        <EmptyCollectionBand className="mx-[16px] mt-[12px] md:mx-[22px]" />
      )}

      {shown.length === 0 && announcedShown.length === 0 ? (
        <div className="flex flex-col items-center gap-[8px] px-[16px] py-[48px] text-center">
          <p className="m-0 font-display text-[18px] text-[color:var(--fg)]">
            {q.trim() ? copy.none.head(q.trim()) : copy.none.headColours}
          </p>
          <p className="m-0 max-w-[360px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{copy.none.body}</p>
          <button
            type="button"
            onClick={q.trim() ? clearSearch : clearColours}
            className="min-h-[44px] cursor-pointer border-0 bg-transparent font-sans text-[13px] font-medium text-[color:var(--fg)] underline underline-offset-[3px]"
          >
            {q.trim() ? copy.none.clear : copy.none.clearColours}
          </button>
        </div>
      ) : order === "owned" ? (
        <ArrivalOrder>
          <div className="p-[16px_16px_24px] md:p-[18px_22px_8px]">
            <ul className={listClass}>{shown.map(item)}</ul>
          </div>
        </ArrivalOrder>
      ) : (
        <>
        {/* Above the newest year and outside its reading order: a closed group's art never loads, and the
            years' art must not wait on it. The bottom padding and the years' top padding make the 22px gap. */}
        {announced && announcedShown.length > 0 && (
          <div className="p-[16px_16px_6px] md:p-[18px_22px_4px]">
            <AnnouncedGroup
              visit={announcedVisit}
              matches={announcedShown}
              today={announced.today}
              newCodes={announced.newCodes}
              opensByItself={announced.opensByItself}
              view={view}
              listed={listed}
              filtering={filtering}
              serverPress={storedAnnounced}
            />
          </div>
        )}
        {/* One reading order across the years: a year's rows wait on the year above. */}
        <ArrivalOrder>
        <div className="flex flex-col gap-[22px] p-[16px_16px_24px] md:p-[18px_22px_8px]">
          {groupByYear(shown).map((g) => (
            <section key={g.year} aria-labelledby={`precons-${g.year}`} className={`flex flex-col ${view === "tiles" ? "gap-[10px]" : "gap-[8px]"}`}>
              <h2
                id={`precons-${g.year}`}
                className="m-0 flex items-baseline gap-[8px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] pb-[7px] font-display text-[17px] font-normal text-[color:var(--fg)]"
              >
                {g.year}
                <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.list.year(g.rows.length)}</span>
              </h2>
              <ul className={listClass}>{g.rows.map(item)}</ul>
            </section>
          ))}
        </div>
        </ArrivalOrder>
        </>
      )}
    </div>
  );
}
