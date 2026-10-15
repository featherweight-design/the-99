"use client";
// The wishlist tab's search (Social R2, boards W2 and WP2): a field over the grid, and a results panel under it. A
// row's Add to wishlist press turns, in place, into `want` and the stepper; a card already on the list draws the
// stepper straight away. Remove is not offered here (card details carries it).
//
// The search is debounced and ticketed as the Add cards sheet's is. The results are a plain list, not a listbox: each
// row holds its own press. The caller owns the tiles: every settled write is reported up through `onWant`.

import { useEffect, useId, useRef, useState } from "react";
import { addToWishlistAction, searchWishlistCardsAction, setWishlistWantAction, type WishlistSearchResult } from "../../app/collection/wishlist/actions";
import { wishlistCopy } from "../../lib/copy/wishlist";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { useSearchDismiss } from "../../lib/ui/search-dismiss";
import { SearchField } from "../ui/text-field";
import { WantStepper } from "./want-stepper";

const copy = wishlistCopy;
const SEARCH_DEBOUNCE_MS = 150;

/** A write the caller should draw: the card is on the list wanting `want` (holding `have`), or it is not (`null`). */
export type WantChange = { card: { oracleId: string; name: string; imageUri: string | null }; want: number | null; have: number };

/** The outlined bookmark on the Add press, 15px. */
function BookmarkIcon() {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
    </svg>
  );
}

export function WishlistSearch({
  onOpenChange,
  onWant,
  onFailure,
}: {
  /** Whether the results panel is drawn, so the caller can dim the grid behind it. */
  onOpenChange: (open: boolean) => void;
  onWant: (change: WantChange) => void;
  onFailure: (kind: "add" | "set") => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WishlistSearchResult[]>([]);
  const [searched, setSearched] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // A row's want, in two layers over the want the search answered with (null: not on the list). `confirmed` is the
  // last count a write settled at, and a fresh search answer retires it: the answer is newer. `pending` is the count a
  // write in flight is drawn at, tagged with that write's sequence, so only the newest write for a card clears it and a
  // failure falls back to the last confirmed count, never to a count no write saved.
  const [confirmed, setConfirmed] = useState<Map<string, number | null>>(new Map());
  const [pending, setPending] = useState<Map<string, { seq: number; want: number }>>(new Map());
  const seqs = useRef(new Map<string, number>());
  const inputRef = useRef<HTMLInputElement>(null);
  // Rows whose Add press just turned into the stepper: theirs takes focus as it draws.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const ticket = useRef(0);
  const trimmed = query.trim();

  // The debounced search. A ticket drops an answer that a newer keystroke has outdated.
  useEffect(() => {
    if (trimmed === "") {
      ticket.current++;
      return;
    }
    const mine = ++ticket.current;
    const t = setTimeout(() => {
      searchWishlistCardsAction(trimmed)
        .then((r) => {
          if (mine !== ticket.current) return;
          setResults(r.ok ? r.results : []);
          setConfirmed(new Map());
          setFailed(!r.ok);
          setSearched(trimmed);
        })
        .catch(() => {
          if (mine !== ticket.current) return;
          setResults([]);
          setFailed(true);
          setSearched(trimmed);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed]);

  const open = trimmed !== "" && searched !== null;
  useEffect(() => {
    onOpenChange(open);
  }, [open, onOpenChange]);

  const { ref: rootRef, onEscape } = useSearchDismiss<HTMLDivElement>(trimmed !== "", () => setQuery(""));

  const wantOf = (r: WishlistSearchResult) =>
    pending.get(r.oracleId)?.want ?? (confirmed.has(r.oracleId) ? confirmed.get(r.oracleId)! : r.want);
  const confirm = (oracleId: string, want: number | null) => setConfirmed((prev) => new Map(prev).set(oracleId, want));

  async function add(r: WishlistSearchResult) {
    if (adding === r.oracleId || wantOf(r) !== null) return;
    setAdding(r.oracleId);
    try {
      const out = await addToWishlistAction(r.oracleId);
      if (!out.ok) throw new Error(out.reason);
      // `held`: the collection already reaches the want, so no line stands and the press stays as it was.
      if (out.status === "wanted") {
        setFresh((prev) => new Set(prev).add(r.oracleId));
        confirm(r.oracleId, out.want);
        onWant({ card: r, want: out.want, have: out.have });
      }
    } catch {
      onFailure("add");
    } finally {
      setAdding(null);
    }
  }

  async function step(r: WishlistSearchResult, next: number) {
    const id = r.oracleId;
    const seq = (seqs.current.get(id) ?? 0) + 1;
    seqs.current.set(id, seq);
    setPending((prev) => new Map(prev).set(id, { seq, want: next }));
    try {
      const out = await setWishlistWantAction(id, next);
      if (!out.ok) throw new Error(out.reason);
      const want = out.status === "wanted" ? out.want : null;
      confirm(id, want);
      onWant({ card: r, want, have: out.have });
    } catch {
      onFailure("set");
    } finally {
      // Only the newest write for the card stops drawing its count: an older one settling leaves the newer in view.
      setPending((prev) => {
        if (prev.get(id)?.seq !== seq) return prev;
        const rest = new Map(prev);
        rest.delete(id);
        return rest;
      });
    }
  }

  // The results are a plain list of rows, each with its own press (Add, or the stepper), reached by Tab: a listbox's
  // options may not hold controls of their own. Escape closes the panel from anywhere inside the search, the field
  // or a row's press, and puts focus back in the field first so it is not lost with the row.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && trimmed !== "" && e.target !== inputRef.current) inputRef.current?.focus();
    onEscape(e);
  }
  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="relative w-full md:w-[560px]">
      <SearchField
        aria-label={collectionEditCopy.add.searchAria}
        placeholder={copy.page.search.placeholder}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
        ref={inputRef}
        containerClassName="h-[44px] md:h-[46px] py-0 rounded-[10px] md:bg-[color:var(--bg)]"
        className="text-[16px] md:text-[15px]"
      />
      {open && (
        <div
          data-testid="wishlist-results"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[30] max-h-[420px] overflow-y-auto rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-0 py-[6px] shadow-[0_22px_50px_rgba(0,0,0,.6)]"
        >
          {failed ? (
            <p role="alert" className="m-0 px-[10px] py-[14px] text-[13.5px] text-[color:var(--fg-body)]">
              {collectionEditCopy.add.searchFailed}
            </p>
          ) : results.length === 0 ? (
            <p role="status" className="m-0 px-[10px] py-[14px] text-[13.5px] text-[color:var(--fg-body)]">
              {collectionEditCopy.add.noResultsTitle(searched ?? trimmed)}
            </p>
          ) : (
            <ul aria-label={collectionEditCopy.add.resultsAria} className="m-0 flex list-none flex-col p-0">
              {results.map((r, i) => {
                const want = wantOf(r);
                return (
                  <li
                    key={r.oracleId}
                    className="flex min-h-[56px] items-center gap-[12px] border-t border-solid border-[color:var(--elevated)] py-0 pl-[14px] pr-[10px] first:border-t-0 hover:bg-[color:var(--elevated)]"
                  >
                    <span aria-hidden className="relative h-[42px] w-[30px] flex-none overflow-hidden rounded-[3px] bg-[color:var(--surface-sunken)]">
                      {r.imageUri && (
                        // eslint-disable-next-line @next/next/no-img-element -- card art is a remote Scryfall image
                        <img src={r.imageUri} alt="" decoding="async" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span id={`${listId}-${i}`} className="truncate text-[14px] font-semibold text-[color:var(--fg)]">{r.name}</span>
                      <span className="truncate font-mono text-[11px] text-[color:var(--fg-faint)]">
                        {want !== null ? (
                          <>
                            <span className="hidden md:inline">{copy.page.search.haveOnList(r.owned)}</span>
                            <span className="md:hidden">{copy.page.search.onList}</span>
                          </>
                        ) : (
                          copy.page.search.have(r.owned)
                        )}
                      </span>
                    </span>
                    {want !== null ? (
                      <span className="flex flex-none items-center gap-[8px] md:gap-[12px]">
                        <span aria-hidden className="hidden font-mono text-[11px] text-[color:var(--fg-muted)] md:inline md:text-[12.5px]">{copy.details.want}</span>
                        <WantStepper
                          value={want}
                          onChange={(next) => void step(r, next)}
                          fewerLabel={copy.details.fewer}
                          moreLabel={copy.details.more}
                          countLabel={copy.details.want}
                          focusOnMount={fresh.has(r.oracleId)}
                        />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void add(r)}
                        aria-label={copy.page.search.add}
                        aria-describedby={`${listId}-${i}`}
                        aria-busy={adding === r.oracleId || undefined}
                        className="flex h-[44px] md:h-[36px] flex-none cursor-pointer items-center gap-[7px] rounded-[8px] border border-solid border-[color:var(--accent)] bg-transparent px-[13px] text-[13px] font-semibold text-[color:var(--accent)]"
                      >
                        <BookmarkIcon />
                        <span className="hidden md:inline">{copy.page.search.add}</span>
                        <span className="md:hidden">{copy.page.search.addShort}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
