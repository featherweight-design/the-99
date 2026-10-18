"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from "react";
import { leaveDialogsForNavigation, useDialogA11y } from "../../lib/a11y/dialog";
import { useCardDetailsIsUp, usePanelBeside } from "../../lib/a11y/help-over-dialog";
import { firstSentence, restOfFirstParagraph } from "../../lib/about/caption";
import type { EntryPayload } from "../../lib/about/entries-payload";
import {
  REFERENCE_HREF,
  TOOLS_HREF,
  aroundMatch,
  elsewhereChips,
  elsewhereKind,
  entriesAt,
  entryHref,
  helpTitle,
  placeKey,
  placeName,
  type HelpPlace,
} from "../../lib/about/help-panel";
import { entryOfHref, revealReferenceEntry } from "../../lib/about/reveal-entry";
import { screenForPath } from "../../lib/about/screen-for-path";
import { searchEntries } from "../../lib/about/search";
import type { DeckView } from "../../lib/copy/about";
import { helpPanelCopy } from "../../lib/copy/discovery";
import { ENTRY_TARGETS } from "../../lib/discovery/entry-targets";
import type { TargetId } from "../../lib/discovery/targets";
import { useMomentHold } from "../../lib/moments/hold";
import { mirrorUrl } from "../../lib/url/mirror";
import { useTargets } from "../discovery/targets-provider";
import { usePendingPush } from "../shell/pending-push";
import { SearchIcon } from "../ui/search-icon";
import { SearchField } from "../ui/text-field";
import { useIsDesktop } from "../ui/use-is-desktop";
import type { HelpEntries } from "./help-root";

/**
 * The ? panel (1280, from `md`) and sheet (390, below it): `HelpSheet` in the handoff, design table
 * `discovery-r2-8-help.md`. One component, its two forms chosen by width: the panel is non-modal (the page stays
 * usable, no scroll lock, and it holds moments off itself), the sheet is modal over a scrim with a grabber. Both move
 * focus in on open and back to the ? on close, and close on ✕, Escape, the ? again and leaving the page.
 */

const LINE: CSSProperties = { borderBottom: "1px solid var(--border)" };

export function HelpPanel({
  data,
  deckView,
  onClose,
  onShowMe,
  returnFocusRef,
}: {
  data: HelpEntries;
  deckView: DeckView | null;
  onClose: () => void;
  onShowMe: (target: TargetId) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const desk = useIsDesktop();
  const ref = useRef<HTMLElement | null>(null);
  // The sheet is the shell's sheet: modal, page held, Back closes it. The panel holds nothing (row 26).
  // Focus moves in to the ✕, the panel's first control, so a phone's keyboard does not rise on open.
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // The panel is not modal, so Tab is not held in it: the page beside it is the reader's to Tab through. Over card
  // details (R2·9) it is its own dialog stacked on that one, so it takes the trap while it is open: one trap live.
  const detailsUp = useCardDetailsIsUp();
  // Stacked only when it opened over card details, and only until that card closes: a card opened from the page while
  // the panel is open is the dialog in front, drawn over the panel, holding focus and keys. Adjusted during render.
  const [over, setOver] = useState(detailsUp);
  if (over && !detailsUp) setOver(false);
  const stacked = desk && over;
  const under = desk && detailsUp && !over;
  usePanelBeside(stacked);
  useDialogA11y(ref, onClose, { lockScroll: !desk, trapTab: !desk || stacked, returnFocusRef, initialFocusRef: closeRef });
  // No scroll lock on the panel, so it tells the moments itself that it is open over the page.
  useMomentHold(true);

  const pathname = usePathname();
  // Read once per render from the live address: Collection mirrors its open card as `?card=` without a navigation.
  const screen = screenForPath(pathname, typeof window === "undefined" ? "" : window.location.search);
  const here: HelpPlace | null = screen === null ? null : screen === "deck" ? { screen, view: deckView ?? "your-deck" } : { screen };

  const [query, setQuery] = useState("");
  const q = query.trim();
  // An Elsewhere chip swaps the list in place; the screen in view stays the title (row 119, "Conflicts settled").
  const [chosen, setChosen] = useState<HelpPlace | null>(null);
  const shown = chosen ?? here;
  const [openId, setOpenId] = useState<string | null>(null);

  const entries = data.entries;
  const ready = data.state === "ready";
  const hits = useMemo(() => (q ? searchEntries(entries, q) : []), [entries, q]);
  // G21: no visible entry lives on this screen (or the page is no screen at all).
  const empty = ready && (here === null || entries.every((e) => e.screen !== here.screen));

  // A link press closes the panel, which unmounts the link and the report its own status would carry to the shell's
  // loading screen. So the navigation runs from the pending provider, which stays mounted and reports it, as the
  // account menu's rows do; the link's own navigation is cancelled so it does not run twice. The sheet's history entry
  // stays under the new page rather than stepping back, which would cancel the navigation. A press to the Reference
  // already open goes to it through `revealReferenceEntry`, one to any other page already open just closes, and a
  // modified press is the browser's own.
  const { go } = usePendingPush();
  const leave = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const now = window.location.pathname + window.location.search;
    const page = href.split("#")[0];
    if (page === now) {
      // The Reference already up, with an entry or without: every such link takes `revealReferenceEntry`, which clears
      // the Reference's search and opens the entry or goes to the top. The address moves here, since a fragment
      // already in it (or none) fires no `hashchange`. Any other page already open (Tools, on Tools) just closes.
      if (page === REFERENCE_HREF) {
        e.preventDefault();
        mirrorUrl(href, window.history.state);
        onClose();
        revealReferenceEntry(entryOfHref(href));
        return;
      }
      onClose();
      return;
    }
    e.preventDefault();
    if (!desk) leaveDialogsForNavigation();
    onClose();
    go(href);
  };

  const targets = useTargets();
  const showable = (id: string): TargetId | null => {
    const t = ENTRY_TARGETS[id];
    // Only a control registered and drawn now (C4, R2 gap 7).
    return t !== undefined && targets?.targetRect(t) ? t : null;
  };

  const body = (() => {
    if (!ready) return null;
    if (q) {
      if (hits.length === 0) {
        return (
          <div role="status" data-help-none className="flex flex-col gap-[8px] px-[4px] py-[28px]">
            <span className="text-[15px] text-[color:var(--fg)]">{helpPanelCopy.none(q)}</span>
            <span className="text-[13.5px] leading-[1.5] text-[color:var(--fg-muted)]">{helpPanelCopy.noneNote}</span>
            <Link
              href={REFERENCE_HREF}
              onClick={leave(REFERENCE_HREF)}
              className="mt-[6px] self-start py-[8px] text-[14px] font-semibold text-[color:var(--accent)] no-underline"
            >
              {helpPanelCopy.noneOut}
            </Link>
          </div>
        );
      }
      return (
        <div data-help-hits>
          <p role="status" className="m-0 pb-[8px] pt-[6px] font-mono text-[11.5px] text-[color:var(--fg-muted)]" style={LINE}>
            {helpPanelCopy.hits(hits.length, q)}
          </p>
          {hits.map((h) => {
            const [before, after] = aroundMatch(h.before, h.after);
            const marked = <Marked before={before} hit={h.hit} after={after} />;
            const href = entryHref(h.entry.id);
            return (
              <Link key={h.entry.id} href={href} onClick={leave(href)} data-help-hit={h.entry.id} className="block py-[12px] no-underline" style={LINE}>
                <span className="block font-mono text-[11px] uppercase tracking-[0.04em] text-[color:var(--fg-faint)]">
                  {helpTitle({ screen: h.entry.screen, view: h.entry.view })}
                </span>
                <span className="mt-[4px] block text-[14.5px] font-medium text-[color:var(--fg)]">
                  {h.field === "title" ? marked : h.entry.title}
                </span>
                {/* A title match still shows a line of the entry: its first sentence, as the Reference does. */}
                <span className="mt-[3px] block text-[13px] leading-[1.45] text-[color:var(--fg-muted)]">
                  {h.field === "title" ? firstSentence(h.entry.caption) : marked}
                </span>
              </Link>
            );
          })}
        </div>
      );
    }
    if (empty || here === null || shown === null) return null;
    const rows = entriesAt(entries, shown);
    const kind = elsewhereKind(here.screen);
    const chips = elsewhereChips(entries, here, shown);
    return (
      <>
        <div className="flex items-baseline justify-between pb-[8px] pt-[6px]" style={LINE}>
          <span data-help-here className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
            {helpPanelCopy.here(placeName(shown))}
          </span>
          <span data-help-count className="font-mono text-[11px] text-[color:var(--fg-faint)]">{helpPanelCopy.count(rows.length)}</span>
        </div>
        <ul className="m-0 list-none p-0">
          {rows.map((e) => (
            <Row
              key={e.id}
              entry={e}
              open={openId === e.id}
              onToggle={() => setOpenId(openId === e.id ? null : e.id)}
              target={showable(e.id)}
              onShowMe={onShowMe}
              onLeave={leave}
            />
          ))}
        </ul>
        {kind !== null && chips.length > 0 && (
          <>
            <p className="m-0 pb-[6px] pt-[16px] font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
              {helpPanelCopy.elsewhere[kind]}
            </p>
            <div className="flex flex-wrap gap-[8px]">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  data-help-chip={c.key}
                  onClick={() => {
                    setChosen(placeKey(c.place) === placeKey(here) ? null : c.place);
                    setOpenId(null);
                  }}
                  className="h-[34px] cursor-pointer rounded-full border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] text-[13px] text-[color:var(--fg-body)]"
                >
                  {c.label} <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{c.count}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </>
    );
  })();

  const pad = desk ? "px-[20px]" : "px-[16px]";

  return (
    <>
      {!desk && <div aria-hidden data-help-scrim onClick={onClose} className="fixed inset-0 z-[49] bg-[rgba(10,8,6,0.62)]" />}
      <section
        ref={ref}
        role="dialog"
        aria-modal={desk && !stacked ? "false" : "true"}
        aria-label={helpPanelCopy.button}
        tabIndex={-1}
        data-help-panel={desk ? "panel" : "sheet"}
        className={`fixed ${stacked ? "z-[51]" : under ? "z-[49]" : "z-50"} box-border flex flex-col overflow-hidden bg-[color:var(--surface-rail)] text-[color:var(--fg)] outline-none ${
          desk
            ? "right-0 top-0 h-dvh w-[400px] shadow-[-24px_0_60px_rgba(0,0,0,0.5)]"
            : "bottom-0 left-0 h-[684px] max-h-dvh w-full rounded-t-[18px] shadow-[0_-20px_60px_rgba(0,0,0,0.55)]"
        }`}
        style={
          desk
            ? { borderLeft: "1px solid var(--border-strong)" }
            : { border: "1px solid var(--border-strong)", borderBottom: 0 }
        }
      >
        {!desk && (
          <span aria-hidden data-help-grabber className="mb-[2px] mt-[8px] h-[4px] w-[40px] shrink-0 self-center rounded-full bg-[color:var(--border-dashed)]" />
        )}
        <header className={`flex shrink-0 items-start justify-between gap-[12px] ${desk ? "px-[20px] pb-[14px] pt-[22px]" : "px-[16px] pb-[12px] pt-[10px]"}`}>
          <div className="min-w-0">
            <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{helpPanelCopy.eyebrow}</span>
            {here !== null && (
              <h2 className="m-0 mt-[6px] font-display text-[20px] font-semibold text-[color:var(--fg)]">{helpTitle(here)}</h2>
            )}
          </div>
          <button
            type="button"
            ref={closeRef}
            aria-label={helpPanelCopy.close}
            onClick={onClose}
            className="-mr-[12px] -mt-[8px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[20px] leading-none text-[color:var(--fg-muted)]"
          >
            ✕
          </button>
        </header>
        {empty && (
          <p data-help-empty className={`m-0 shrink-0 pb-[12px] text-[13.5px] leading-[1.5] text-[color:var(--fg-muted)] ${pad}`}>
            {helpPanelCopy.empty}
          </p>
        )}
        <div className={`shrink-0 pb-[12px] ${pad}`}>
          <SearchField
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenId(null);
            }}
            onClear={() => setQuery("")}
            clearLabel={helpPanelCopy.clear}
            clearTrimmed
            clearClassName="h-[28px] w-[28px] rounded-none bg-transparent text-[14px] text-[color:var(--fg-faint)]"
            leading={<SearchIcon size={16} className="shrink-0 text-[color:var(--fg-faint)]" />}
            placeholder={helpPanelCopy.search}
            aria-label={helpPanelCopy.search}
            containerClassName={`box-border h-[44px] rounded-[10px] bg-[color:var(--surface-sunken)] px-[12px] ${q ? "border-[color:var(--accent)]" : ""}`}
            className="text-[15px] touch:text-base"
          />
        </div>
        <div data-help-body className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${pad}`}>
          {body}
        </div>
        <footer
          className={`flex shrink-0 items-center justify-between bg-[color:var(--surface-rail)] ${desk ? "px-[20px] pb-[14px] pt-[12px]" : "px-[16px] pb-[22px] pt-[12px]"}`}
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <Link href={TOOLS_HREF} onClick={leave(TOOLS_HREF)} className="py-[10px] font-mono text-[12.5px] text-[color:var(--fg-muted)] no-underline">
            {helpPanelCopy.footTools}
          </Link>
          <Link href={REFERENCE_HREF} onClick={leave(REFERENCE_HREF)} className="py-[10px] font-mono text-[12.5px] text-[color:var(--accent)] no-underline">
            {helpPanelCopy.footAll}
          </Link>
        </footer>
      </section>
    </>
  );
}

function Row({
  entry,
  open,
  onToggle,
  target,
  onShowMe,
  onLeave,
}: {
  entry: EntryPayload;
  open: boolean;
  onToggle: () => void;
  target: TargetId | null;
  onShowMe: (target: TargetId) => void;
  onLeave: (href: string) => (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const href = entryHref(entry.id);
  const rest = open ? restOfFirstParagraph(entry.caption) : "";
  return (
    <li
      data-help-row={entry.id}
      className={open ? "-mx-[12px] rounded-[10px] bg-[color:var(--surface)] bg-clip-padding px-[12px] pb-[14px] pt-[12px]" : "py-[12px]"}
      style={{ borderBottom: `1px solid ${open ? "transparent" : "var(--border)"}` }}
    >
      <div className="flex items-start gap-[10px]">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left [color:inherit] [font:inherit]"
        >
          <span className="block text-[14.5px] font-medium leading-[1.35] text-[color:var(--fg)]">{entry.title}</span>
          <span className="mt-[3px] block text-[13px] leading-[1.45] text-[color:var(--fg-muted)]">{firstSentence(entry.caption)}</span>
        </button>
        {target !== null && (
          <button
            type="button"
            data-help-show-me={entry.id}
            onClick={() => onShowMe(target)}
            className="h-[30px] flex-none cursor-pointer whitespace-nowrap rounded-full border border-solid border-[color:var(--border-strong)] bg-transparent px-[10px] font-mono text-[11.5px] text-[color:var(--accent)]"
          >
            {helpPanelCopy.showMe}
          </button>
        )}
      </div>
      {open && (
        <div data-help-open className="mt-[10px] flex flex-col gap-[8px]">
          {rest && <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{rest}</p>}
          {entry.keys.slice(0, 2).map((k, i) => (
            <div key={i} data-help-key className="flex gap-[8px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]">
              <span aria-hidden className="text-[color:var(--accent)]">·</span>
              <span>{k}</span>
            </div>
          ))}
          <Link href={href} onClick={onLeave(href)} className="self-start py-[4px] font-mono text-[12px] text-[color:var(--accent)] no-underline">
            {helpPanelCopy.readWhole}
          </Link>
        </div>
      )}
    </li>
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
