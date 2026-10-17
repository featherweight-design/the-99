"use client";

// About's Reference tab (discovery R2·6a; README-r2 C5, STATES "The Reference", boards `ReferenceDesk` and
// `ReferencePhone`). Unmounted until R2·6b swaps `/about`: no route renders it, and its tests render it directly.
//
// Search, then what's new, then every entry by screen, then How it works, then the note. Search reads every entry's
// title, caption and keys (`searchEntries`), and while it holds text the list and what's new give way to its results.
// From `md` each screen is a section with its entries listed and a screens index beside them; below it each screen is
// a row that opens. One entry is open at a time, and a link to `#<entry id>` (what's new, a result, How it works'
// `explained in` links) opens that entry where it stands.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { aboutCopy } from "../../../lib/copy/about";
import { referenceCopy } from "../../../lib/copy/discovery";
import { HOW_IT_WORKS_ID } from "../../../lib/copy/how-it-works-links";
import { searchEntries } from "../../../lib/about/search";
import { noteAppScroll } from "../../../lib/ui/reveal";
import type { ReferenceEntry, ReferenceScreen } from "../../../lib/about/reference";
import { SearchField } from "../../ui/text-field";
import { SearchIcon } from "../../ui/search-icon";
import { PendingReporter } from "../../shell/pending-reporter";
import { EntryCaption } from "../entry-caption";
import { CreatorNote } from "./creator-note";
import { EntryFrame } from "./entry-frame";

/** How much of a long field a result shows either side of the match. */
const CONTEXT = 70;

function around(before: string, after: string): [string, string] {
  const b = before.length > CONTEXT ? `…${before.slice(-CONTEXT).replace(/^\S*\s/, "")}` : before;
  const a = after.length > CONTEXT ? `${after.slice(0, CONTEXT).replace(/\s\S*$/, "")}…` : after;
  return [b, a];
}

function OpenEntry({ entry }: { entry: ReferenceEntry }) {
  return (
    <div data-entry-open={entry.id} className="flex flex-col gap-[18px] pb-[18px] pt-[4px] lg:flex-row">
      {entry.shot && <EntryFrame shot={entry.shot} alt={referenceCopy.frameAlt(entry.title, entry.screen)} />}
      <div className="flex min-w-0 flex-col gap-[10px]">
        <EntryCaption caption={entry.caption} className="!text-[14px] !leading-[1.6]" />
        {entry.keys.length > 0 && (
          <ol className="m-0 flex list-none flex-col gap-[6px] p-0">
            {entry.keys.map((k, i) => (
              <li key={i} className="flex gap-[8px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
                <span aria-hidden className="text-[color:var(--accent)]">
                  {i + 1}
                </span>
                <span>{k}</span>
              </li>
            ))}
          </ol>
        )}
        {(entry.tryIt || entry.row) && (
          <div className="mt-[4px] flex flex-wrap items-center gap-x-[18px] gap-y-[10px]">
            {entry.tryIt && (
              <Link
                href={entry.tryIt.href}
                className="inline-flex min-h-[42px] items-center gap-[10px] text-[14px] font-semibold text-[color:var(--accent)] hover:underline"
              >
                {entry.tryIt.label}
                <span
                  aria-hidden
                  className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[color:var(--accent)] text-[14px]"
                >
                  →
                </span>
                <PendingReporter href={entry.tryIt.href} />
              </Link>
            )}
            {entry.row && (
              <a href={`#${entry.row}`} className="py-[8px] font-mono text-[12px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]">
                {referenceCopy.reachesThis}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryRow({ entry, open, onToggle }: { entry: ReferenceEntry; open: boolean; onToggle: () => void }) {
  const body = `entry-body-${entry.id}`;
  return (
    <div id={entry.id} className="scroll-mt-[20px] border-t border-t-[color:var(--border)] md:border-t-0 md:border-b md:border-b-[color:var(--border)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={body}
        onClick={onToggle}
        className="grid w-full min-h-[48px] grid-cols-[minmax(0,1fr)] items-baseline gap-y-[3px] py-[10px] text-left [grid-template-areas:'title'_'first'] lg:min-h-[44px] lg:grid-cols-[300px_minmax(0,1fr)_56px_16px] lg:items-center lg:gap-x-[16px] lg:py-[6px] lg:[grid-template-areas:'title_first_mark_chev']"
      >
        <span className="text-[14.5px] font-medium text-[color:var(--fg)] [grid-area:title]">
          {entry.title}
          {entry.inTools && <span className="font-mono text-[10.5px] font-normal text-[color:var(--accent)] lg:hidden"> {referenceCopy.inTools}</span>}
        </span>
        <span className="hidden font-mono text-[10.5px] text-[color:var(--accent)] [grid-area:mark] lg:inline">
          {entry.inTools ? referenceCopy.inTools : ""}
        </span>
        <span className="text-[13px] leading-[1.45] text-[color:var(--fg-faint)] [grid-area:first] lg:overflow-hidden lg:text-ellipsis lg:whitespace-nowrap">
          {entry.first}
        </span>
        <span aria-hidden className="hidden text-[13px] text-[color:var(--fg-faint)] [grid-area:chev] md:inline">
          {open ? "⌃" : "⌄"}
        </span>
      </button>
      <div id={body} hidden={!open}>
        {open && <OpenEntry entry={entry} />}
      </div>
    </div>
  );
}

export type ReferenceTabProps = {
  screens: readonly ReferenceScreen[];
  /** What's new since the reader's last visit, in page order; empty when nothing is. */
  whatsNew: readonly { id: string; title: string }[];
  /** The shipped How it works section, or null with its switch off. */
  how: ReactNode;
  /** Its row count, for the index. */
  howCount: number;
};

export function ReferenceTab({ screens, whatsNew, how, howCount }: ReferenceTabProps) {
  const [query, setQuery] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openScreens, setOpenScreens] = useState<ReadonlySet<string>>(new Set());

  const all = useMemo(() => screens.flatMap((s) => s.entries), [screens]);
  const screenOf = useMemo(() => new Map(screens.flatMap((s) => s.entries.map((e) => [e.id, s.key]))), [screens]);

  /** Opens an entry where it stands: its screen too on the phone. */
  const reveal = (id: string) => {
    const screen = screenOf.get(id);
    if (!screen) return false;
    setOpenId(id);
    setOpenScreens((prev) => (prev.has(screen) ? prev : new Set(prev).add(screen)));
    return true;
  };

  /** A press on a link to an entry on this page: clear any search, open it, and bring it into view. */
  const go = (id: string) => (e: MouseEvent) => {
    if (!reveal(id)) return;
    e.preventDefault();
    setQuery("");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // The pressed link unmounts with the search, so focus moves to the entry it opened.
        document.getElementById(id)?.querySelector<HTMLElement>("button[aria-expanded]")?.focus({ preventScroll: true });
        noteAppScroll();
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      }),
    );
  };

  // A link to `#<entry id>`: what's new, a result, How it works' `explained in` lines, or one from another page.
  useEffect(() => {
    const follow = () => {
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return; // a malformed fragment (`#%E0`) names no entry
      }
      if (!id || !reveal(id)) return;
      setQuery(""); // a search hides every screen, the entry's with it
      requestAnimationFrame(() => {
        noteAppScroll();
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    };
    // A link to the hash already in the address fires no `hashchange`, so pressing the same `explained in` line twice
    // would open its entry only once. A press `go` already handled is left to it.
    const again = (e: globalThis.MouseEvent) => {
      if (e.defaultPrevented) return;
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      if (a && a.getAttribute("href") === window.location.hash) window.setTimeout(follow, 0);
    };
    follow();
    window.addEventListener("hashchange", follow);
    document.addEventListener("click", again);
    return () => {
      window.removeEventListener("hashchange", follow);
      document.removeEventListener("click", again);
    };
    // `reveal` reads `screenOf`, which follows `screens`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenOf]);

  const q = query.trim();
  const hits = q ? searchEntries(all, q) : [];

  const toggleScreen = (key: string) =>
    setOpenScreens((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div data-about-reference className="mt-[16px] flex items-start gap-[48px] px-[16px] md:mt-[28px] md:px-0">
      <div className="flex min-w-0 flex-1 flex-col gap-[12px] md:gap-[14px]">
        <SearchField
          ref={field}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          clearLabel={referenceCopy.clear}
          clearTrimmed
          clearClassName="h-[32px] w-[32px] rounded-none bg-transparent text-[14px]"
          leading={<SearchIcon size={16} className="shrink-0 text-[color:var(--fg-faint)]" />}
          placeholder={referenceCopy.search}
          aria-label={referenceCopy.search}
          containerClassName={`h-[46px] rounded-[10px] bg-[color:var(--surface-sunken)] px-[14px] ${q ? "border-[color:var(--accent)]" : ""}`}
          className="text-[15px] touch:text-base"
        />

        {!q && whatsNew.length > 0 && (
          <div id="new" className="flex scroll-mt-[20px] flex-col gap-[10px] rounded-[12px] border border-[color:var(--accent-dim)] bg-[color:var(--surface)] px-[18px] py-[16px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--accent)]">
              {aboutCopy.newSinceEyebrow(whatsNew.length)}
            </span>
            <div className="flex flex-wrap gap-[8px]">
              {whatsNew.map((n) => (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  onClick={go(n.id)}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-[color:var(--border-strong)] px-[12px] text-[13.5px] text-[color:var(--fg)] hover:border-[color:var(--accent-dim)]"
                >
                  {n.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {q && hits.length > 0 && (
          <div data-reference-hits className="flex flex-col gap-[12px] md:gap-[14px]">
            <p role="status" className="m-0 pb-[4px] pt-[6px] font-mono text-[12px] text-[color:var(--fg-muted)]">
              {referenceCopy.hits(hits.length, q)}
            </p>
            {hits.map((h) => {
              const [before, after] = around(h.before, h.after);
              // A title match still shows a line of the entry: its first sentence, as the closed row does.
              return (
                <a
                  key={h.entry.id}
                  href={`#${h.entry.id}`}
                  onClick={go(h.entry.id)}
                  className="block rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface)] px-[16px] py-[14px] hover:border-[color:var(--border-strong)]"
                >
                  <span className="block font-mono text-[11px] uppercase tracking-[0.06em] text-[color:var(--fg-faint)]">{h.entry.screen}</span>
                  <span className="mt-[4px] block text-[15px] font-medium text-[color:var(--fg)]">{h.field === "title" ? <Marked before={before} hit={h.hit} after={after} /> : h.entry.title}</span>
                  <span className="mt-[4px] block text-[13.5px] leading-[1.5] text-[color:var(--fg-muted)]">
                    {h.field === "title" ? h.entry.first : <Marked before={before} hit={h.hit} after={after} />}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        {q && hits.length === 0 && (
          <div role="status" className="flex flex-col gap-[8px] rounded-[12px] border border-dashed border-[color:var(--border-dashed)] px-[20px] py-[28px]">
            <span className="text-[16px] text-[color:var(--fg)]">{referenceCopy.none(q)}</span>
            <span className="text-[14px] leading-[1.5] text-[color:var(--fg-muted)]">{referenceCopy.noneNote}</span>
            <a
              href={`#screen-${screens[0]?.key ?? ""}`}
              onClick={(e) => {
                e.preventDefault();
                // The link leaves with the search, so focus goes to the field the reader searched from.
                field.current?.focus();
                setQuery("");
              }}
              className="mt-[6px] self-start py-[8px] text-[14.5px] font-semibold text-[color:var(--accent)] hover:underline"
            >
              {referenceCopy.noneOut}
            </a>
          </div>
        )}

        <div hidden={q !== ""} className="flex flex-col">
          {screens.map((s) => {
            const open = openScreens.has(s.key);
            return (
              <section
                key={s.key}
                id={`screen-${s.key}`}
                aria-label={s.name}
                data-reference-screen={s.key}
                className="scroll-mt-[20px] border-b border-b-[color:var(--border)] md:mt-[14px] md:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleScreen(s.key)}
                  className="flex min-h-[50px] w-full items-center justify-between gap-[10px] text-left md:hidden"
                >
                  <span className="font-display text-[16px] font-semibold text-[color:var(--fg)]">{s.name}</span>
                  <span className="whitespace-nowrap font-mono text-[11.5px] text-[color:var(--fg-faint)]">
                    {s.entries.length} <span aria-hidden>{open ? "⌃" : "⌄"}</span>
                  </span>
                </button>
                <div className="hidden items-baseline gap-[12px] border-b border-b-[color:var(--border-strong)] pb-[8px] md:flex">
                  <h2 className="m-0 font-display text-[19px] font-semibold text-[color:var(--fg)]">{s.name}</h2>
                  <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)]">
                    {s.where} · {referenceCopy.count(s.entries.length)}
                  </span>
                </div>
                <div className={`${open ? "" : "hidden"} md:block`}>
                  {s.entries.map((e) => (
                    <EntryRow key={e.id} entry={how ? e : { ...e, row: null }} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} />
                  ))}
                </div>
              </section>
            );
          })}
          {how}
          <CreatorNote />
        </div>
      </div>

      {/* While a search holds the column the screens are hidden, so an index of them would lead nowhere. */}
      {!q && <ScreensIndex screens={screens} howCount={how ? howCount : 0} />}
    </div>
  );
}

function Marked({ before, hit, after }: { before: string; hit: string; after: string }) {
  return (
    <>
      {before}
      <mark className="rounded-[3px] bg-[color:var(--accent-dim)] px-[2px] text-[color:var(--fg)]">{hit}</mark>
      {after}
    </>
  );
}

/** From `md`: the 21 screens beside the list, the one in view marked, with How it works last. */
function ScreensIndex({ screens, howCount }: { screens: readonly ReferenceScreen[]; howCount: number }) {
  const [current, setCurrent] = useState<string | null>(screens[0]?.key ?? null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    // Each callback reports only the screens whose state CHANGED, so the screens inside the band are kept across
    // callbacks, and the one marked is the first of them in page order.
    const els = [...document.querySelectorAll("[data-reference-screen]")];
    const inBand = new Set<Element>();
    let io: IntersectionObserver | null = null;
    // The band is the top 30% of the viewport, set in pixels and rebuilt on resize rather than as a percentage root
    // margin, which is not resolved against the viewport's height in every engine.
    const watch = () => {
      io?.disconnect();
      inBand.clear();
      io = new IntersectionObserver(
        (seen) => {
          for (const s of seen) {
            if (s.isIntersecting) inBand.add(s.target);
            else inBand.delete(s.target);
          }
          const key = els.find((el) => inBand.has(el))?.getAttribute("data-reference-screen");
          if (key) setCurrent(key);
        },
        { rootMargin: `0px 0px -${Math.round(window.innerHeight * 0.7)}px 0px` },
      );
      for (const el of els) io.observe(el);
    };
    watch();
    window.addEventListener("resize", watch);
    return () => {
      window.removeEventListener("resize", watch);
      io?.disconnect();
    };
  }, [screens]);
  return (
    <nav aria-label={referenceCopy.screensLabel} className="relative hidden w-[230px] flex-none flex-col gap-[2px] md:flex">
      <span className="pb-[8px] font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{referenceCopy.screensLabel}</span>
      {screens.map((s) => (
        <a
          key={s.key}
          href={`#screen-${s.key}`}
          aria-current={current === s.key ? "location" : undefined}
          className={`flex min-h-[30px] items-center justify-between text-[13.5px] ${
            current === s.key ? "font-medium text-[color:var(--fg)]" : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
          }`}
        >
          <span>{s.name}</span>
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{s.entries.length}</span>
        </a>
      ))}
      {howCount > 0 && (
        <a
          href={`#${HOW_IT_WORKS_ID}`}
          className="mt-[8px] flex min-h-[30px] items-center justify-between border-t border-t-[color:var(--border)] pt-[8px] text-[13.5px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
        >
          <span>{referenceCopy.howIndex}</span>
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{howCount}</span>
        </a>
      )}
    </nav>
  );
}
