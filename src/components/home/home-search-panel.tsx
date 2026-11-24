"use client";
// Home's search panel (tool discovery E1, R5): the page's first thing that is always there. A title, a line, the 52px
// field, a fan of the reader's own recent cards and the starters. It is one search with the rail's and the phone's sheet
// (`useCardSearch`): on a desktop its own field takes the typing and the answers open in place under it, in the same
// listbox; on a phone a press opens the sheet. The welcome credits, when the reader has them, are its foot (G15).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { SearchDropdown } from "../card-search/search-desktop";
import { SearchGlyph, useCardSearch } from "../card-search/card-search";
import { FadingImg } from "../ui/hydrated-art";
import { SearchField } from "../ui/text-field";
import { useMinWidth } from "../ui/use-min-width";
import { parseRecent, readRecentRaw } from "../../lib/card-search/recent";
import { askCopy } from "../../lib/copy/card-search";
import { homeSearchCopy } from "../../lib/copy/home";

const noop = () => () => {};

/** The reader's three most recent adds that have art (the Recent cards list's own source; no new query). Empty on the server. */
function useFanArt(userId: string): string[] {
  const raw = useSyncExternalStore(
    noop,
    () => readRecentRaw(userId),
    () => null,
  );
  return useMemo(
    () =>
      parseRecent(raw)
        .flatMap((r) => (r.imageUri ? [r.imageUri] : []))
        .slice(0, 3),
    [raw],
  );
}

// From `md` the fan leaves the title row for the panel's right edge (R13): one node, placed by CSS, so the phone keeps it beside the title.
// The fan's tilts by how many cards it draws: -14°, 0°, 14° for three; the ones there are, otherwise.
const TILTS: Record<number, readonly string[]> = { 1: [""], 2: ["-rotate-[10deg]", "rotate-[10deg]"], 3: ["-rotate-[14deg]", "", "rotate-[14deg]"] };

function Fan({ art }: { art: string[] }) {
  return (
    <div aria-hidden data-home-fan="" className="pointer-events-none relative h-[88px] w-[132px] flex-none md:absolute md:top-1/2 md:right-[28px] md:h-[120px] md:w-[180px] md:-translate-y-1/2">
      {art.map((src, i) => (
        <div
          key={src}
          className={`absolute bottom-0 h-[84px] w-[60px] overflow-hidden rounded-[5px] border border-solid border-[color:var(--border-strong)] md:h-[112px] md:w-[80px] ${TILTS[art.length]?.[i] ?? ""}`}
          style={{ left: `${i * 36 + (art.length === 1 ? 36 : 0)}px`, transformOrigin: "50% 100%" }}
        >
          <FadingImg src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      ))}
      {/* The lens over them. */}
      <span className="absolute top-1 right-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-solid border-[color:var(--accent)] bg-[color:var(--bg)] text-[color:var(--accent-text)] md:h-11 md:w-11">
        <SearchGlyph size={18} />
      </span>
    </div>
  );
}

export function HomeSearchPanel({ userId, foot }: { userId: string; foot?: ReactNode }) {
  const search = useCardSearch();
  const desktop = useMinWidth("(min-width: 768px)");
  const art = useFanArt(userId);
  const warmStarters = search?.warmStarters;
  useEffect(() => {
    warmStarters?.();
  }, [warmStarters]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<number | null>(null);

  const hosted = !!search && desktop && search.isOpen && search.anchor === "home";
  // Y5: the answers take the room under the field, no more than the rail's dropdown.
  useEffect(() => {
    if (!hosted) return;
    const measure = () => {
      const box = wrapRef.current?.getBoundingClientRect();
      if (box) setRoom(Math.max(240, Math.round(window.innerHeight - box.bottom - 24)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [hosted]);

  // No search mounted (its switch is off): the credits keep their place, in the box the strip drew alone.
  if (!search) {
    return foot ? <div className="rounded-[12px] border border-solid border-[color:var(--accent-dim)] bg-[color:var(--surface)]">{foot}</div> : null;
  }
  const { openSearch, openSearchWith, closeSearch, query, setQuery, onFieldKey, inputRef, listboxId, active, list, toolCount, starters, escape, warmSearch } = search;

  const open = (from: "home_field") => {
    if (search.isOpen && search.anchor === "home") return;
    warmSearch();
    openSearch(null, from);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!hosted) {
      if (desktop && (e.key === "ArrowDown" || e.key === "Enter")) {
        e.preventDefault();
        open("home_field");
      }
      return;
    }
    onFieldKey(e);
  };

  return (
    <section
      data-home-search-panel=""
      aria-labelledby="home-search-title"
      className="relative rounded-[12px] border border-solid border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_10%,var(--surface)),var(--surface)_60%)]"
    >
      <div className="flex items-start gap-4 px-4 pt-4 pb-4 md:px-5 md:pb-3">
        <div className="min-w-0 flex-1">
          <h2 id="home-search-title" className="font-display text-[19px] leading-tight text-[color:var(--fg)] md:text-[21px]">
            {homeSearchCopy.title}
          </h2>
        </div>
        {art.length > 0 ? <Fan art={art} /> : null}
      </div>
      <div className={`px-4 pb-4 md:px-5 ${art.length > 0 ? "md:pr-[240px]" : ""}`}>
        {hosted ? (
          // Press outside closes it back to the panel; the field and its answers stand above this.
          <div aria-hidden className="fixed inset-0 z-[39]" onPointerDown={closeSearch} />
        ) : null}
        <div
          ref={wrapRef}
          data-home-search-field=""
          className={`relative min-[1180px]:max-w-[720px] ${hosted ? "z-40" : ""}`}
          style={room === null ? undefined : ({ "--home-pop-room": `${room}px` } as CSSProperties)}
          onKeyDown={(e) => {
            if (hosted && e.key === "Escape" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              escape();
            }
          }}
        >
          <SearchField
            ref={hosted ? inputRef : undefined}
            containerClassName="h-[52px] min-w-0 gap-3 rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] pr-[10px] pl-4"
            className="text-[15px] whitespace-nowrap touch:text-base"
            leading={
              <span className="flex-none text-[color:var(--accent-text)]">
                <SearchGlyph size={20} />
              </span>
            }
            role="combobox"
            aria-expanded={hosted && list.length + toolCount > 0}
            aria-controls={hosted ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={hosted && active >= 0 ? `${listboxId}-${active}` : undefined}
            aria-label={askCopy.placeholder}
            placeholder={askCopy.placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            // A phone's field is a button to the sheet: read-only, so the keyboard waits for the sheet's own field.
            readOnly={!desktop}
            value={hosted ? query : ""}
            onFocus={desktop ? () => open("home_field") : undefined}
            onClick={(e) => {
              if (desktop) open("home_field");
              else {
                warmSearch();
                openSearch(e.currentTarget, "home_field");
              }
            }}
            onChange={(e) => {
              if (!hosted) open("home_field");
              setQuery(e.target.value);
            }}
            onKeyDown={onKeyDown}
            onClear={hosted ? () => setQuery("") : undefined}
          />
          {hosted ? (
            <div className="absolute top-full right-0 left-0 mt-2">
              <SearchDropdown maxHeight="max-h-[min(560px,var(--home-pop-room,420px))]" />
            </div>
          ) : null}
        </div>
        {starters.length > 0 ? (
          <ul data-home-starters="" className="mt-3 flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible">
            {starters.map((q) => (
              <li key={q} className="flex-none">
                <button
                  type="button"
                  onClick={(e) => {
                    warmSearch();
                    openSearchWith(desktop ? null : e.currentTarget, "home_starter", q);
                  }}
                  className="rounded-full border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] px-3 py-[7px] text-[13px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {foot ? <div data-home-search-foot="" className="border-t border-solid border-[color:var(--border)]">{foot}</div> : null}
    </section>
  );
}
