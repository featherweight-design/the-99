"use client";
// The commander picker (Social R1 R2, decision 21; R2 Friends F2 and F3, both widths). A dialog at desktop,
// a tall sheet at phone (`SocialModal`). It opens on the search field, with the commanders of your own decks
// first (newest deck first, up to eight); typing searches every commander the catalog lists, by name, with
// its art. One press picks: the caller saves and closes, so there is no Save. `Use initials instead` clears
// the face, and is offered once one is set.
//
// Two frames the boards never drew (E15), built from the drawn ones' rules: with no decks of your own the
// deck row is hidden and the picker is the search alone; a search that finds nothing says so in the list's
// place. A search in flight keeps the previous results standing under `aria-busy` (E16).

import { useEffect, useId, useRef, useState } from "react";
import type { CommanderTile } from "../../lib/decks/commander-picker";
import { socialCopy } from "../../lib/copy/social";
import { listDeckCommandersAction, searchFaceCommandersAction } from "../../app/friends/actions";
import { SearchField } from "../ui/text-field";
import { FadingImg } from "../ui/hydrated-art";
import { SocialModal } from "./social-modal";

const c = socialCopy.commander;
/** The catalog search asks for nothing under two characters (`nameSearch`). */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 180;

type Deck = { k: "loading" } | { k: "done"; tiles: CommanderTile[] };
type Found = { q: string; tiles: CommanderTile[] } | null;

export function CommanderPicker({
  current,
  onPick,
  onClose,
}: {
  /** The face's oracle id now, outlined in the deck row. */
  current: string | null;
  /** A tile, or null for initials. The caller saves, closes and draws the face. */
  onPick: (tile: CommanderTile | null) => void;
  onClose: () => void;
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
          setFound({ q, tiles: r.ok ? r.tiles : [] });
          setHl(0);
          setBusy(false);
        },
        () => {
          if (ask === asked.current) setBusy(false);
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, searching]);

  const results = searching ? found : null;
  const tiles = results?.tiles ?? [];

  function onKeyDown(e: React.KeyboardEvent) {
    if (!results || tiles.length === 0) return;
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
  return (
    <SocialModal title={c.title} sub={c.sub} closeLabel={socialCopy.page.close} onClose={onClose} initialFocusRef={search} tall width={520}>
      <SearchField
        ref={search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={c.search}
        aria-label={c.search}
        role="combobox"
        aria-expanded={results !== null}
        aria-controls={listId}
        aria-activedescendant={results && tiles.length > 0 ? `${listId}-${Math.min(hl, tiles.length - 1)}` : undefined}
        autoComplete="off"
        containerClassName="h-[44px] flex-none"
        className="text-[14px]"
      />

      {searching ? (
        results && results.q === q && tiles.length === 0 && !busy ? (
          <p role="status" className="m-0 mt-[16px] text-[13.5px] text-[color:var(--fg-muted)]">{c.noResults(q)}</p>
        ) : (
          <ul id={listId} role="listbox" aria-label={c.search} aria-busy={busy || undefined} className="m-0 mt-[8px] flex list-none flex-col p-0">
            {tiles.map((t, i) => (
              <li key={t.oracleId} id={`${listId}-${i}`} role="option" aria-selected={i === hl}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onPick(t)}
                  onPointerMove={() => setHl(i)}
                  className={`flex h-[52px] w-full cursor-pointer items-center gap-[12px] rounded-[8px] border-0 bg-transparent px-[4px] text-left font-sans text-[14px] text-[color:var(--fg)] ${i === hl ? "bg-[color:var(--elevated)]" : ""}`}
                >
                  <Art tile={t} className="h-[40px] w-[56px] flex-none rounded-[6px]" />
                  <span className="min-w-0 truncate">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : deckTiles.length > 0 ? (
        <section className="mt-[16px]">
          <h3 className="m-0 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{c.fromDecks}</h3>
          <ul className="m-0 mt-[10px] grid list-none grid-cols-2 gap-[10px] p-0 md:grid-cols-4">
            {deckTiles.map((t) => {
              const cur = t.oracleId === current;
              return (
                <li key={t.oracleId}>
                  <button
                    type="button"
                    aria-pressed={cur}
                    onClick={() => onPick(t)}
                    className="flex w-full cursor-pointer flex-col gap-[6px] border-0 bg-transparent p-0 text-left font-sans text-[12px]"
                  >
                    <Art tile={t} className={`h-[95px] w-full rounded-[8px] md:h-[78px] ${cur ? "outline-2 outline-offset-2 outline-[color:var(--accent)] [outline-style:solid]" : ""}`} />
                    <span className={`truncate ${cur ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"}`}>{t.name}</span>
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

function Art({ tile, className }: { tile: CommanderTile; className: string }) {
  return tile.artCropUri ? (
    <FadingImg src={tile.artCropUri} alt="" className={`block object-cover [border:1px_solid_var(--border)] ${className}`} />
  ) : (
    <span aria-hidden className={`block bg-[color:var(--surface-sunken)] [border:1px_solid_var(--border)] ${className}`} />
  );
}
