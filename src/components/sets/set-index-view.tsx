"use client";

// /collection/sets — the sets you hold cards in, and a search that reaches any of them.
//
// Five states, all drawn: first run, populated, search active, search with no match, and a
// set whose base_set_size is still null. That last one renders its own tag and NEVER a
// percentage — a set nobody has indexed has no denominator, and 0% would be a claim.

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchField } from "../ui/text-field";
import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../ui/empty-state";
import { ACTION_SIZE, GhostButton, PrimaryButton } from "../ui/button";
import { setsIndexCopy } from "../../lib/copy/set-collections";
import { SetIcon } from "./set-icon";
import { PendingTrack } from "../shell/pending-track";
import type { SetIndexRow } from "../../lib/sets/read";
import { mirrorUrl } from "../../lib/url/mirror";

function CompletionBar({ percent, complete }: { percent: number; complete: boolean }) {
  return (
    <div
      className="h-[4px] w-full overflow-hidden rounded-full"
      style={{ background: "var(--surface-sunken)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${percent}%`,
          background: complete ? "var(--success)" : "var(--accent)",
        }}
      />
    </div>
  );
}

function Row({ set }: { set: SetIndexRow }) {
  // Three states, not two. A search result carries no figure because none was computed;
  // a set with a null denominator carries none because its catalog is not indexed. Only
  // the second gets the not-indexed tag, and both name the set so a screen-reader user
  // can tell one row from the next. Every set with printings has a denominator — its base
  // run, or every printing of it (`sectionsOf`) — so the tag is a backlog state only.
  const counted = !set.uncounted;
  const indexed = set.baseSetSize !== null && set.percent !== null;
  // The exact counts, not the rounded percentage: 275/276 displays as 100% and is not
  // complete, and the success treatment is a claim rather than a rounding.
  // `indexed` too: a zero denominator satisfies `owned === baseSetSize` while the row is
  // simultaneously rendering "not indexed yet", which would put a success ring beside it.
  const complete = counted && indexed
    && set.baseSetSize !== null && set.baseSetSize > 0 && set.owned === set.baseSetSize;
  // Addendum R2 §30. Never `0 / 0 extras`, and an unindexed row has no ratio so it has no
  // second line either — the tag stands alone.
  const showExtras = counted && indexed && set.extrasTotal > 0;
  const baseAria = counted && indexed
    ? set.owned === 0
      ? setsIndexCopy.row.zeroAria(set.baseSetSize as number, set.name)
      : setsIndexCopy.row.ratioAria(set.owned, set.baseSetSize as number, set.name)
    : counted
      ? `${set.name}: ${setsIndexCopy.notIndexed.aria}`
      : set.name;
  // The label is explicit, so it replaces every descendant: a visible figure missing from
  // it is announced to nobody. Same defect `set-cell.tsx` already fixed for its price tag.
  const ratioAria = showExtras
    ? baseAria + setsIndexCopy.row.extrasAria(set.extrasOwned, set.extrasTotal)
    : baseAria;

  return (
    <li>
      <Link
        href={`/collection/sets/${set.code}`}
        aria-label={ratioAria}
        className="relative overflow-hidden flex items-center gap-[12px] rounded-[10px] px-[12px] py-[11px] min-h-[44px]
                   md:min-h-[auto] transition-colors hover:bg-[color:var(--elevated)] has-[[data-pending]]:bg-[color:var(--elevated)]"
      >
        <PendingTrack href={`/collection/sets/${set.code}`} />
        <SetIcon
          uri={set.iconSvgUri}
          size={26}
          tone={complete ? "success" : "muted"}
          ringed={complete}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-[8px]">
            <span className="truncate text-[14px]" style={{ color: "var(--fg-body)" }}>
              {set.name}
            </span>
            <span
              className="font-mono text-[10px] tracking-[0.08em] shrink-0"
              style={{ color: "var(--fg-faint)" }}
            >
              {set.code.toUpperCase()}
              {set.releasedAt ? ` · ${set.releasedAt.slice(0, 4)}` : ""}
            </span>
          </span>
          {counted && indexed ? (
            <span className="mt-[6px] block">
              <CompletionBar percent={set.percent as number} complete={complete} />
            </span>
          ) : null}
        </span>

        <span className="shrink-0 text-right font-mono text-[11px]">
          {counted && indexed ? (
            <>
              {/* Brightened from --fg-muted: with the extras line below it at --fg-muted
                  too, the only ranking left between the two figures would be 1px of type
                  size. A complete row keeps --success here and leaves the line below it
                  muted — a finished base run with extras outstanding must not read as a
                  finished set. */}
              <span
                className="block"
                style={{ color: complete ? "var(--success)" : "var(--fg-body)" }}
              >
                {set.owned} / {set.baseSetSize} · {set.percent}%
              </span>
              {/* A figure of the same kind as the one above it, so it ranks under it rather
                  than sitting beside a year at --fg-faint. --fg-muted and never
                  --fg-locked: this is text and owes 4.5:1, where --fg-locked measures
                  3.16-3.44 and is only legitimate on the cell's rarity word. */}
              {showExtras ? (
                <span
                  className="mt-[2px] block text-[10px]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {setsIndexCopy.row.extrasLine(set.extrasOwned, set.extrasTotal)}
                </span>
              ) : null}
            </>
          ) : counted ? (
            // Never a percentage. There is no denominator to divide by yet.
            <span style={{ color: "var(--fg-locked)" }}>{setsIndexCopy.notIndexed.tag}</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export function SetIndexView({
  sets,
  cardCount,
  onSearch,
}: {
  sets: SetIndexRow[];
  cardCount: number;
  /** Returns the collectible catalogue's matches, held or not. */
  onSearch: (query: string) => Promise<SetIndexRow[]>;
}) {
  // `q` is URL-owned: a component-local query could not be shared, reloaded or restored by
  // navigation, and `/collection/sets?q=blood` was ignored on arrival.
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<SetIndexRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Initialised from the URL's own query: starting false meant a shared link painted its
  // no-match state for one frame before the mount effect ran.
  const [pending, setPending] = useState((params.get("q") ?? "").trim() !== "");
  const [, startTransition] = useTransition();

  // A `q` already in the URL on arrival runs once, so a shared link lands on its results
  // rather than on an empty field.
  // Follows the URL rather than reading it once. Back, Forward or any client navigation
  // changes `q`, and a query captured only at mount left the field and its results showing
  // a search the reader had navigated away from.
  const urlQuery = params.get("q") ?? "";
  const lastUrlQuery = useRef<string | null>(null);
  useEffect(() => {
    if (lastUrlQuery.current === urlQuery) return;
    lastUrlQuery.current = urlQuery;
    // Invalidates anything in flight: `search` takes the next ticket.
    search(urlQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  const held = new Set(sets.map((s) => s.code));
  const searching = query.trim() !== "";
  const shown = searching ? (results ?? []) : sets;

  // Each keystroke starts its own request, and they can resolve out of order: an earlier
  // one landing late would overwrite the current query's rows, or repopulate a field the
  // reader has already cleared. The latest request wins and the rest are dropped.
  const latest = useRef(0);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A visit-scoped cache keyed on the normalised query, which is the convention AGENTS.md
  // states for a list a reader flips between: going back to a query already searched this
  // visit — `eoe`, clear, `eoe` — should not send the catalogue read again. It lives for
  // one visit and unmounts with the component, so there is nothing to invalidate.
  const cache = useRef(new Map<string, SetIndexRow[]>());

  // Cleared on unmount too: navigating away straight after typing would otherwise still
  // fire the pending action against a page that is gone.
  useEffect(() => () => {
    if (debounce.current !== null) clearTimeout(debounce.current);
  }, []);

  function search(next: string) {
    setQuery(next);
    // replaceState rather than the router, for the same reason the grid's filters use it:
    // the answer comes from a server action, so routing would be a second request for a
    // result already on its way.
    const live = new URLSearchParams(window.location.search);
    // The TRIMMED value decides, and is what gets written: serialising the raw input left
    // `?q=%20` behind for a search the component treats as no search at all.
    const trimmed = next.trim();
    if (trimmed === "") live.delete("q"); else live.set("q", trimmed);
    const qs = live.toString();
    mirrorUrl(qs ? `/collection/sets?${qs}` : "/collection/sets");
    const ticket = ++latest.current;
    // Cleared before the early return, so a failure never describes the request after it.
    setFailed(false);
    if (debounce.current !== null) clearTimeout(debounce.current);
    if (trimmed === "") {
      setResults(null);
      setPending(false);
      return;
    }
    const key = trimmed.toLowerCase();
    const hit = cache.current.get(key);
    if (hit !== undefined) {
      setResults(hit);
      setPending(false);
      return;
    }
    // In flight is not "no such set": without this the no-match copy rendered the moment
    // a reader typed, before the database had answered.
    setPending(true);
    // 150ms, the window the shipped card search uses. Every keystroke used to start its
    // own uncancellable query against the catalogue; `latest` discarded the answers, but
    // the work had already run.
    debounce.current = setTimeout(() => {
      // Awaited FIRST, then the state update is wrapped: a transition's callback runs
      // synchronously, so anything after an await inside it has already left the
      // transition and React never treats the results update as one.
      void onSearch(next)
        .then((rows) => {
          // Filed only by the request that is still current. Caching before the check let
          // a slow earlier response overwrite a newer one under the same key, and the next
          // visit then served those stale rows without asking again.
          if (ticket !== latest.current) return;
          cache.current.set(key, rows);
          startTransition(() => { setResults(rows); setPending(false); });
        })
        .catch(() => {
          // A failed request is not "no such set". Without this the no-match branch spoke
          // for a database that was simply unreachable, and the rejection went unhandled.
          if (ticket !== latest.current) return;
          startTransition(() => { setResults([]); setFailed(true); setPending(false); });
        });
    }, 150);
  }

  // `cardCount === 0`, not "no sets": a reader holding only promos, tokens or digital
  // products has a real collection and no collectible set in it, and telling them to
  // upload one would be false.
  if (sets.length === 0 && cardCount > 0 && !searching) {
    return (
      <div>
        <SearchField
          containerClassName="px-[12px] py-[10px] mb-[14px]"
          className="text-[14px]"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={setsIndexCopy.search.placeholder}
          aria-label={setsIndexCopy.search.ariaLabel}
        />
        <EmptyState>
          <EmptyStateTitle level={2}>{setsIndexCopy.noCollectibleSets.heading}</EmptyStateTitle>
          <EmptyStateBody>{setsIndexCopy.noCollectibleSets.body}</EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  if (sets.length === 0 && !searching) {
    return (
      <div>
        <SearchField
          containerClassName="px-[12px] py-[10px] mb-[14px]"
          className="text-[14px]"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={setsIndexCopy.search.placeholder}
          aria-label={setsIndexCopy.search.ariaLabel}
        />
        <EmptyState>
        <EmptyStateTitle level={2}>{setsIndexCopy.firstRun.heading}</EmptyStateTitle>
        <EmptyStateBody>{setsIndexCopy.firstRun.body}</EmptyStateBody>
        <div className="mt-[18px] flex flex-col items-center gap-[10px]">
          <PrimaryButton href="/collection/replace" className={ACTION_SIZE}>
            {setsIndexCopy.firstRun.primary}
          </PrimaryButton>
          <span className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
            {setsIndexCopy.firstRun.secondary}
          </span>
        </div>
        </EmptyState>
      </div>
    );
  }

  const newToYou = searching ? shown.filter((s) => !held.has(s.code)).length : 0;

  return (
    <div>
      <SearchField
        containerClassName="px-[12px] py-[10px] mb-[14px]"
        className="text-[14px]"
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder={setsIndexCopy.search.placeholder}
        aria-label={setsIndexCopy.search.ariaLabel}
      />

      {/* Suppressed while a request is in flight or after one failed: "0 collectible sets
          match" above "Looking…" is a count nobody has computed. */}
      {searching && (pending || failed) ? null : (
        <p className="mb-[10px] font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
          {searching
            ? setsIndexCopy.resultLine(shown.length, newToYou)
            : setsIndexCopy.restLine(sets.length, cardCount)}
        </p>
      )}

      {searching && pending ? (
        <p
          role="status"
          aria-live="polite"
          className="py-[24px] text-center text-[13px]"
          style={{ color: "var(--fg-muted)" }}
        >
          {setsIndexCopy.search.pending}
        </p>
      ) : searching && shown.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle level={2}>
            {failed
              ? setsIndexCopy.searchFailed.heading
              : setsIndexCopy.noMatch.heading(query.trim())}
          </EmptyStateTitle>
          <EmptyStateBody>
            {failed ? setsIndexCopy.searchFailed.body : setsIndexCopy.noMatch.body}
          </EmptyStateBody>
          <div className="mt-[16px]">
            {/* A failure gets a retry, which is what its copy offers; a genuine no-match
                gets the clear. Offering "clear the search" against "try again in a moment"
                left no way to recover from a transient failure except retyping. */}
            <GhostButton onClick={() => search(failed ? query : "")} className={ACTION_SIZE}>
              {failed ? setsIndexCopy.searchFailed.action : setsIndexCopy.noMatch.action}
            </GhostButton>
          </div>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-[2px]">
          {shown.map((s) => <Row key={s.code} set={s} />)}
        </ul>
      )}
    </div>
  );
}
