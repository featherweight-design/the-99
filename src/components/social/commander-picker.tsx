"use client";
// The commander picker (Social R1 R2, decision 21; R2 Friends F2 and F3, both widths). A dialog at desktop,
// a tall sheet at phone (`SocialModal`). It opens on the search field, with the commanders of your own decks
// first (newest deck first, up to eight); typing searches every commander the catalog lists, by name, with
// its art. One press picks: the caller saves and closes, so there is no Save. `Use initials instead` clears
// the face, and is offered once one is set.
//
// Two frames the boards never drew (E15), built from the drawn ones' rules: with no decks of your own the
// deck row is hidden and the picker is the search alone; a search that finds nothing says so in the list's
// place. A search in flight keeps the previous results standing under `aria-busy` (E16), but they are not the
// current query's, so nothing is highlighted and Enter picks nothing until its own answer lands. A search that
// fails says so in the list's place, as an alert; typing asks again.
//
// Each result row carries the commander's colour identity on its right (R2 F3), drawn by the identity pips the
// commander rows use. A deck tile names its commander up to the first comma, as the boards do.

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { CommanderTile } from "../../lib/decks/commander-picker";
import { socialCopy } from "../../lib/copy/social";
import { listDeckCommandersAction, searchFaceCommandersAction } from "../../app/friends/actions";
import { SearchField } from "../ui/text-field";
import { FadingImg } from "../ui/hydrated-art";
import { IdentityPips } from "../commanders/commander-art";
import { colorNames } from "../../lib/copy/color-labels";
import { SocialModal } from "./social-modal";

const c = socialCopy.commander;
/** The catalog search asks for nothing under two characters (`nameSearch`). */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 180;

type Deck = { k: "loading" } | { k: "done"; tiles: CommanderTile[] };
type Found = { q: string; tiles: CommanderTile[]; failed: boolean } | null;

/** The deck tile's short name: up to the first comma ("Omnath, Locus of Creation" is "Omnath"). */
export function tileName(name: string): string {
  return name.split(",")[0];
}

export function CommanderPicker({
  current,
  onPick,
  onClose,
  returnFocusRef,
}: {
  /** The face's oracle id now, outlined in the deck row. */
  current: string | null;
  /** A tile, or null for initials. The caller saves, closes and draws the face. */
  onPick: (tile: CommanderTile | null) => void;
  onClose: () => void;
  /** Where focus goes when the picker closes: the head's face, which a pick never removes. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [deck, setDeck] = useState<Deck>({ k: "loading" });
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found>(null);
  const [busy, setBusy] = useState(false);
  const [hl, setHl] = useState(0);
  const asked = useRef(0);

  useEffect(() => {
    let live = true;
    listDeckCommandersAction().then(
      (r) => live && setDeck({ k: "done", tiles: r.ok ? r.tiles : [] }),
      () => live && setDeck({ k: "done", tiles: [] }),
    );
    return () => {
      live = false;
    };
  }, []);

  const q = query.trim();
  const searching = q.length >= MIN_QUERY;
  useEffect(() => {
    if (!searching) return;
    const ask = ++asked.current;
    const t = setTimeout(() => {
      setBusy(true);
      searchFaceCommandersAction(q).then(
        (r) => {
          if (ask !== asked.current) return;
          setFound(r.ok ? { q, tiles: r.tiles, failed: false } : { q, tiles: [], failed: true });
          setHl(0);
          setBusy(false);
        },
        () => {
          if (ask !== asked.current) return;
          setFound({ q, tiles: [], failed: true });
          setBusy(false);
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, searching]);

  const results = searching ? found : null;
  const tiles = results?.tiles ?? [];
  // The results answer the query in the field, not one typed before it: only then may a row be highlighted or picked.
  const fresh = results !== null && results.q === q;
  const failed = fresh && results.failed && !busy;

  // The modal's body is what scrolls, and a short one (a phone above its keyboard) can hold the row the arrow keys
  // are on below its fold, where Enter would pick a commander the reader cannot see. That row is brought into view
  // inside the body only, and only as far as it needs: never the page (`scrollIntoView` would move it), as the card
  // tag picker does.
  const active = fresh && tiles.length > 0 ? Math.min(hl, tiles.length - 1) : -1;
  useEffect(() => {
    if (active < 0) return;
    const opt = document.getElementById(`${listId}-${active}`);
    const body = opt?.closest<HTMLElement>("[data-social-modal-body]");
    if (!opt || !body) return;
    const o = opt.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    if (o.top < b.top) body.scrollTop -= b.top - o.top;
    else if (o.bottom > b.bottom) body.scrollTop += o.bottom - b.bottom;
  }, [listId, active]);

  function onKeyDown(e: React.KeyboardEvent) {
    // An IME's Enter and arrows choose among its candidates; the picker acts only once composing is done.
    if (e.nativeEvent.isComposing) return;
    if (!fresh || tiles.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHl((h) => Math.min(tiles.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHl((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onPick(tiles[Math.min(hl, tiles.length - 1)]);
    }
  }

  const deckTiles = deck.k === "done" ? deck.tiles : [];
  // The listbox exists only while a search shows rows: an empty or failed search draws a line in its place.
  const listShown = searching && !failed && !(fresh && tiles.length === 0 && !busy);
  return (
    <SocialModal title={c.title} sub={c.sub} closeLabel={socialCopy.page.close} onClose={onClose} initialFocusRef={search} returnFocusRef={returnFocusRef} tall width={520}>
      <SearchField
        ref={search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
        onKeyDown={onKeyDown}
        placeholder={c.search}
        aria-label={c.search}
        role="combobox"
        aria-expanded={listShown}
        aria-controls={listShown ? listId : undefined}
        aria-activedescendant={fresh && tiles.length > 0 ? `${listId}-${Math.min(hl, tiles.length - 1)}` : undefined}
        autoComplete="off"
        // 16px at phone, or iOS zooms the page into the field.
        containerClassName="h-[46px] flex-none md:h-[44px]"
        className="text-[16px] [@media(pointer:fine)]:md:text-[14px]"
      />

      {searching ? (
        failed ? (
          <p role="alert" className="m-0 mt-[16px] text-[13.5px] text-[color:var(--fg-muted)]">{c.searchFailed}</p>
        ) : fresh && tiles.length === 0 && !busy ? (
          <p role="status" className="m-0 mt-[16px] text-[13.5px] text-[color:var(--fg-muted)]">{c.noResults(q)}</p>
        ) : (
          <ul id={listId} role="listbox" aria-label={c.search} aria-busy={busy || undefined} className="m-0 mt-[8px] flex list-none flex-col p-0">
            {tiles.map((t, i) => {
              const on = fresh && i === hl;
              return (
                <li key={t.oracleId} id={`${listId}-${i}`} role="option" aria-selected={on}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => onPick(t)}
                    onPointerMove={() => setHl(i)}
                    className={`flex h-[56px] w-full cursor-pointer items-center gap-[12px] border-0 px-[4px] text-left font-sans text-[14.5px] text-[color:var(--fg)] md:h-[52px] md:text-[14px] ${on ? "rounded-[8px] bg-[color:var(--elevated)] [border-bottom:1px_solid_transparent]" : "bg-transparent [border-bottom:1px_solid_var(--elevated)]"}`}
                  >
                    <Art tile={t} className="h-[40px] w-[56px] flex-none rounded-[6px]" />
                    <span className="min-w-0 truncate">{t.name}</span>
                    <span data-identity={t.colorIdentity.join("")} className="ml-auto flex flex-none pl-[8px]">
                      {/* The pips are color alone; the names say it in words. */}
                      <span className="sr-only">{", "}{t.colorIdentity.length > 0 ? colorNames(t.colorIdentity).join(", ") : c.colorless}</span>
                      <IdentityPips colorIdentity={t.colorIdentity} size={10} gap={3} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : deckTiles.length > 0 ? (
        <section className="mt-[16px]">
          <h3 className="m-0 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{c.fromDecks}</h3>
          <ul className="m-0 mt-[10px] grid list-none grid-cols-2 gap-[12px] p-0 md:grid-cols-4 md:gap-[10px]">
            {deckTiles.map((t) => {
              const cur = t.oracleId === current;
              return (
                <li key={t.oracleId}>
                  <button
                    type="button"
                    aria-pressed={cur}
                    aria-label={t.name}
                    onClick={() => onPick(t)}
                    className="flex w-full cursor-pointer flex-col gap-[6px] border-0 bg-transparent p-0 text-left font-sans text-[13px] md:text-[12px]"
                  >
                    <Art tile={t} framed className={`h-[95px] w-full rounded-[8px] md:h-[78px] ${cur ? "outline-2 outline-offset-2 outline-[color:var(--accent)] [outline-style:solid]" : ""}`} />
                    <span className={`truncate ${cur ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"}`}>{tileName(t.name)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="mt-auto flex min-h-[44px] items-center justify-between gap-[12px] pt-[14px] font-mono text-[11px] text-[color:var(--fg-faint)]">
        <span>{searching || deckTiles.length === 0 ? c.anyNote : c.savedNote}</span>
        {current ? (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="min-h-[44px] flex-none cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--accent)]"
          >
            {c.clear}
          </button>
        ) : null}
      </div>
    </SocialModal>
  );
}

/** A tile's art. A deck tile is `framed` in `--border-strong`; a result row's art is not (R2 F2, F3). */
function Art({ tile, className, framed = false }: { tile: CommanderTile; className: string; framed?: boolean }) {
  const frame = framed ? "[border:1px_solid_var(--border-strong)]" : "";
  return tile.artCropUri ? (
    <FadingImg src={tile.artCropUri} alt="" className={`block object-cover ${frame} ${className}`} />
  ) : (
    <span aria-hidden className={`block bg-[color:var(--surface-sunken)] ${frame} ${className}`} />
  );
}
