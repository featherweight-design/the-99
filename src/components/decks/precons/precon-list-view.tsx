"use client";

// `/decks/precons` (design table: Route /decks/precons). Filters and order live in the URL (`q`,
// `colour`, `sort=owned`), mirrored through `mirrorUrl` as `/decks` does, and the order is also
// remembered per browser. Everything here is a view over rows the server summarised.

import Link from "next/link";
import { useMemo, useState } from "react";
import { preconsCopy } from "../../../lib/copy/precons";
import { colorNames } from "../../../lib/copy/color-labels";
import { PIP_ORDER, type PipCode } from "../../../lib/copy/filter-chassis";
import {
  filterPrecons, groupByYear, isPreconOrder, orderPrecons, parsePreconParams, PRECON_ORDERS,
  type PreconOrder, type PreconRow as Row,
} from "../../../lib/precons/list";
import { mirrorUrl } from "../../../lib/url/mirror";
import { useLiveQuery } from "../../../lib/commanders/live-query";
import { ColourPips } from "../../ui/colour-pips";
import { FilterChassis, type FilterChip } from "../../ui/filter-chassis";
import { useMinWidth } from "../../ui/use-min-width";
import { useStoredView } from "../../ui/use-stored-view";
import { SearchField } from "../deck-filter-column";
import { OrderMenu } from "../deck-sort-menu";
import { PendingReporter } from "../../shell/pending-reporter";
import { PreconRow } from "./precon-row";
import { EmptyCollectionBand } from "./empty-collection-band";

const copy = preconsCopy;
export const PRECON_ORDER_KEY = "the99:precons:order";

export type PreconListViewProps = {
  /** The page's query string, as the server read it. */
  query: string;
  /** From `parsePreconParams`. */
  rows: Row[];
  hasCollection: boolean;
  fromNew: boolean;
  initial: { q: string; colours: string[]; order: PreconOrder | null };
};

const isOrder = (v: string): v is PreconOrder => isPreconOrder(v);

export function PreconListView({ rows, hasCollection, fromNew, initial, query }: PreconListViewProps) {
  // `md`, not the chassis's 1000: the table draws the wide form at 900, and this chassis holds
  // three controls where `/decks`' holds six.
  const wide = useMinWidth("(min-width: 768px)");
  const [q, setQ] = useState(initial.q);
  const [colours, setColours] = useState<string[]>(initial.colours);
  const [urlOrder, setUrlOrder] = useState<PreconOrder | null>(initial.order);
  const [storedOrder, storeOrder] = useStoredView(PRECON_ORDER_KEY, isOrder);

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
  }
  const order: PreconOrder = urlOrder ?? storedOrder ?? "newest";

  function mirror(next: { q: string; colours: string[]; order: PreconOrder }) {
    const live = new URLSearchParams(window.location.search);
    for (const key of ["q", "colour", "sort"]) live.delete(key);
    if (next.q.trim()) live.set("q", next.q.trim());
    if (next.colours.length) live.set("colour", next.colours.join(","));
    if (next.order !== "newest") live.set("sort", next.order);
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
  const clearAll = () => { setQ(""); setColours([]); mirror({ q: "", colours: [], order }); };
  // The no-match state clears the one filter its button names: the search first, so a search and
  // colours that both narrow fall back to the colours' own no-match state rather than losing both.
  const clearSearch = () => { setQ(""); mirror({ q: "", colours, order }); };
  const clearColours = () => { setColours([]); mirror({ q, colours: [], order }); };

  const shown = useMemo(() => orderPrecons(filterPrecons(rows, q, colours), order), [rows, q, colours, order]);
  const dates = rows.map((r) => r.releaseDate).sort();
  const first = dates[0]?.slice(0, 4) ?? "";
  const last = dates[dates.length - 1]?.slice(0, 4) ?? "";
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
  const sort = (
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
          <div className="mb-[8px]">
            <SearchField value={q} onChange={onSearch} size="sheet" placeholder={copy.list.search} />
          </div>
        )}
        <FilterChassis
          form={wide ? "wide" : "compact"}
          controls={
            wide ? (
              <>
                <div className="min-w-0 flex-auto">
                  <SearchField value={q} onChange={onSearch} size="column" placeholder={copy.list.search} />
                </div>
                {pips}
              </>
            ) : pips
          }
          sort={sort}
          chips={chips}
          onClearAll={clearAll}
          resultLine={copy.list.result(shown.length, rows.length, order)}
        />
      </div>

      {!hasCollection && (
        <EmptyCollectionBand className="mx-[16px] mt-[12px] md:mx-[22px]" />
      )}

      {shown.length === 0 ? (
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
        <ul className="m-0 flex list-none flex-col gap-[8px] p-[16px_16px_24px] md:p-[18px_22px_8px]">
          {shown.map((r) => <PreconRow key={r.fileName} row={r} href={href(r)} />)}
        </ul>
      ) : (
        <div className="flex flex-col gap-[22px] p-[16px_16px_24px] md:p-[18px_22px_8px]">
          {groupByYear(shown).map((g) => (
            <section key={g.year} aria-labelledby={`precons-${g.year}`} className="flex flex-col gap-[8px]">
              <h2
                id={`precons-${g.year}`}
                className="m-0 flex items-baseline gap-[8px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] pb-[7px] font-display text-[17px] font-normal text-[color:var(--fg)]"
              >
                {g.year}
                <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.list.year(g.rows.length)}</span>
              </h2>
              <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
                {g.rows.map((r) => <PreconRow key={r.fileName} row={r} href={href(r)} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
