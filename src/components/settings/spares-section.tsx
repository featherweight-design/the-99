"use client";
// Settings' Spares section (menu and Home handoff, `Settings.dc.html`; README item 10; plan PR 3, G3): the threshold
// stepper (1 to 9, saved as it changes), who sees the spares (a pointer to each pod's own switch in Friends, never a
// copy of it), and Kept back: a search over the reader's own spare cards, and the kept cards as the shipped collection
// row (`CollectionRowCells`) with a ✕ to let each go.
//
// The page reads; this holds what a press changed until the server's redraw lands (every write revalidates
// `/settings`). A write that fails puts the value back and says so in the shared social toast, as `/friends` does.

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrowseListCard } from "../../lib/collection/browse";
import { printedNameOf } from "../../lib/collection/browse";
import { settingsCopy } from "../../lib/copy/settings";
import { PersonName, type ThirdPartyName } from "../../lib/person-name";
import { SPARE_MIN_HIGH, SPARE_MIN_LOW } from "../../lib/social/spare-rules";
import type { SpareSearchHit } from "../../lib/social/spare-settings";
import { keepCardAction, releaseCardAction, searchSpareCardsAction, setSpareMinAction } from "../../app/settings/actions";
import { CollectionRowCells, collectionRowSpoken } from "../collection/rows-view";
import { CollectionMarkKey } from "../collection/collection-mark-key";
import { SECTION_HEAD } from "../social/friends-list";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { SearchField } from "../ui/text-field";
import { ROW_SHELL_GRID } from "../ui/row-shell";
import { PendingReporter } from "../shell/pending-reporter";
import { TOUCH_HIT } from "../ui/touch-hit";

const c = settingsCopy.spares;

/** A read starts this long after the last key, and only from this many characters (as card search's). */
const SEARCH_DEBOUNCE_MS = 150;
const SEARCH_MIN_CHARS = 2;

const off = (r: { ok: boolean; reason?: string }) => !r.ok && r.reason === "off";

export function SparesSection({ spareMin, pods, kept }: { spareMin: number; pods: ThirdPartyName[]; kept: BrowseListCard[] }) {
  const router = useRouter();
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  // Stable, so the search's effect does not re-run (and re-ask) on every redraw of the section.
  const fail = useCallback(() => setToast({ id: ++toastSeq.current, text: c.failed }), []);

  // The stepper's value, held from the press until the redraw carries it; a fresh server value always wins. One save
  // at a time: both buttons wait while a save is in flight, so no older answer can land over a newer press.
  const [min, setMin] = useState(spareMin);
  const [servedMin, setServedMin] = useState(spareMin);
  const [saving, setSaving] = useState(false);
  // The last value known to be STORED (the server's, or a save that succeeded): a failure rolls back to this.
  const confirmedMin = useRef(spareMin);
  if (servedMin !== spareMin) {
    setServedMin(spareMin);
    setMin(spareMin);
  }
  useEffect(() => {
    confirmedMin.current = spareMin;
  }, [spareMin]);
  async function step(next: number) {
    if (saving || next < SPARE_MIN_LOW || next > SPARE_MIN_HIGH) return;
    setSaving(true);
    setMin(next);
    try {
      const r = await setSpareMinAction(next);
      if (r.ok) confirmedMin.current = next;
      else if (off(r)) router.refresh();
      else {
        setMin(confirmedMin.current);
        fail();
      }
    } catch {
      setMin(confirmedMin.current);
      fail();
    } finally {
      setSaving(false);
    }
  }

  // Released rows leave at once; a failure brings them back. Every redraw from the server retires the set.
  const [released, setReleased] = useState<ReadonlySet<string>>(() => new Set());
  const [servedKept, setServedKept] = useState(kept);
  if (servedKept !== kept) {
    setServedKept(kept);
    setReleased(new Set());
  }
  async function release(oracleId: string) {
    setReleased((prev) => new Set(prev).add(oracleId));
    const back = () => setReleased((prev) => {
      const next = new Set(prev);
      next.delete(oracleId);
      return next;
    });
    try {
      const r = await releaseCardAction(oracleId);
      if (off(r)) router.refresh();
      else if (!r.ok) {
        back();
        fail();
      }
    } catch {
      back();
      fail();
    }
  }
  const shown = kept.filter((k) => !released.has(k.oracleId));
  // The search re-asks when the server's kept set changes (a release or a keep lands), so a card let go shows up in it.
  const keptKey = kept.map((k) => k.oracleId).join(",");

  return (
    <section aria-labelledby="settings-spares" className="mt-[26px] md:mt-[34px]">
      <h2 id="settings-spares" className={SECTION_HEAD}>{c.head}</h2>
      <p className="m-0 mt-[10px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{c.explain}</p>
      <div className="mt-[12px] flex flex-wrap items-center gap-[10px] text-[14px] leading-[1.5] text-[color:var(--fg)]">
        <span>{c.before}</span>
        <Stepper value={min} saving={saving} onStep={step} />
        <span>{c.after}</span>
      </div>
      <WhoSees pods={pods} />
      <h3 className="m-0 mt-[22px] font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{c.keptHead(shown.length)}</h3>
      <p className="m-0 mt-[6px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{c.keptExplain}</p>
      <KeepSearch keptKey={keptKey} onFail={fail} />
      {shown.length > 0 && (
        <>
        {/* The kept rows draw /collection's wordless fact marks, so the key that decodes them travels with them
            (collection-mark-key.tsx's surface-local rule). */}
        <CollectionMarkKey className="mt-[10px]" />
        <ul className="m-0 mt-[10px] flex list-none flex-col gap-[6px] p-0">
          {shown.map((card) => (
            <li key={card.oracleId}>
              <KeptRow card={card} onRelease={() => release(card.oracleId)} />
            </li>
          ))}
        </ul>
        </>
      )}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}

/** The board's `.stepper`: − value +, 44px tall on the phone, 36px from `md`. Saves as it changes, one save at a time. */
function Stepper({ value, saving, onStep }: { value: number; saving: boolean; onStep: (next: number) => void }) {
  const button =
    "flex h-full w-[44px] cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-sans text-[18px] text-[color:var(--fg-body)] disabled:cursor-default disabled:text-[color:var(--fg-locked)]";
  return (
    <span
      role="group"
      aria-label={c.stepperLabel}
      className="inline-flex h-[44px] items-center overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] md:h-[36px]"
    >
      <button type="button" aria-label={c.fewer} disabled={saving || value <= SPARE_MIN_LOW} onClick={() => onStep(value - 1)} className={button}>
        −
      </button>
      <output
        aria-live="polite"
        className="flex h-full min-w-[40px] items-center justify-center font-mono text-[15px] font-semibold text-[color:var(--fg)] [border-left:1px_solid_var(--border-strong)] [border-right:1px_solid_var(--border-strong)]"
      >
        {value}
      </output>
      <button type="button" aria-label={c.more} disabled={saving || value >= SPARE_MIN_HIGH} onClick={() => onStep(value + 1)} className={button}>
        +
      </button>
    </span>
  );
}

/** Who sees them (`.who2`): the pods the reader shares with, bold, and a pointer to Friends, where each pod's switch lives. */
function WhoSees({ pods }: { pods: ThirdPartyName[] }) {
  // The list is laid out over the pods' positions, so a pod's name is only ever drawn by `PersonName`.
  const parts = new Intl.ListFormat("en-US", { type: "conjunction" }).formatToParts(pods.map((_, i) => String(i)));
  return (
    <div className="mt-[12px] flex min-h-[44px] items-center justify-between gap-[10px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] py-0 pl-[14px] pr-[4px] text-[13px] text-[color:var(--fg-body)]">
      <span>
        {pods.length === 0 ? c.offeredNone : (
          <>
            {c.offeredTo}{" "}
            {parts.map((p, i) => (p.type === "element" ? <b key={i} className="font-semibold text-[color:var(--fg)]"><PersonName n={pods[Number(p.value)]} /></b> : p.value))}
            .
          </>
        )}{" "}
        {c.choose}
      </span>
      <Link
        href="/friends"
        aria-label={c.friendsAria}
        className="flex min-h-[44px] items-center whitespace-nowrap px-[10px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] no-underline"
      >
        {c.friends} ›
        <PendingReporter href="/friends" />
      </Link>
    </div>
  );
}

/** Keep a card back (`.kpf`): a search over the reader's own spare cards; a press keeps the card back. */
function KeepSearch({ keptKey, onFail }: { keptKey: string; onFail: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ for: string; items: SpareSearchHit[] } | null>(null);
  const [keeping, setKeeping] = useState<string | null>(null);
  const trimmed = query.trim();
  const active = trimmed.length >= SEARCH_MIN_CHARS;
  useEffect(() => {
    if (!active) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const r = await searchSpareCardsAction(trimmed);
        if (!live) return;
        if (r.ok) setHits({ for: trimmed, items: r.hits });
        else router.refresh();
      } catch {
        if (live) onFail();
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [trimmed, active, keptKey, router, onFail]);

  async function keep(hit: SpareSearchHit) {
    if (keeping) return;
    setKeeping(hit.oracleId);
    try {
      const r = await keepCardAction(hit.oracleId);
      if (off(r)) router.refresh();
      else if (r.ok) {
        setQuery("");
        setHits(null);
      } else onFail();
    } catch {
      onFail();
    } finally {
      setKeeping(null);
    }
  }

  const shown = active && hits?.for === trimmed ? hits.items : null;
  return (
    <div className="mt-[12px]">
      <SearchField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
        placeholder={c.search}
        aria-label={c.searchLabel}
        maxLength={100}
        containerClassName="h-[44px] rounded-[10px] bg-transparent md:h-[40px]"
        className="text-[16px] [@media(pointer:fine)]:text-[14.5px]"
      />
      <div aria-live="polite">
        {shown && shown.length === 0 && (
          <p className="m-0 mt-[8px] text-[13px] text-[color:var(--fg-muted)]">{c.noMatch}</p>
        )}
        {shown && shown.length > 0 && (
          <ul className="m-0 mt-[6px] flex list-none flex-col gap-[4px] p-0">
            {shown.map((hit) => (
              <li key={hit.oracleId}>
                <button
                  type="button"
                  aria-label={c.keepAria(hit.name, hit.spare)}
                  aria-busy={keeping === hit.oracleId || undefined}
                  onClick={() => keep(hit)}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-[10px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] px-[12px] text-left hover:border-[color:var(--border-strong)]"
                >
                  <span className="min-w-0 truncate text-[14px] font-semibold text-[color:var(--fg)]">{hit.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-[color:var(--fg-faint)]">{c.hitSpare(hit.spare)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * A kept card (`.crow`): the shipped collection row's cells, with the ✕ in the column `/collection` gives its chevron
 * (26px here, per the board), at both widths.
 */
function KeptRow({ card, onRelease }: { card: BrowseListCard; onRelease: () => void }) {
  // The cells draw cost, rarity and bracket marks silently and leave the speaking to their host; this row is a div,
  // so the ✕ carries the same spoken row `/collection` gives its button, as its description.
  const describedBy = useId();
  return (
    <div
      className={`${ROW_SHELL_GRID} gap-[10px] bg-[color:var(--surface)] [--row-bg:var(--surface)] [border:1px_solid_var(--border)] py-[10px] pl-[12px] pr-0 [grid-template-columns:38px_1fr_76px_auto_26px] md:gap-[16px] md:py-[12px] md:pl-[18px] md:[grid-template-columns:52px_1fr_90px_150px_92px_26px]`}
    >
      <CollectionRowCells card={card} />
      <button
        type="button"
        aria-label={c.releaseAria(printedNameOf(card))}
        aria-describedby={describedBy}
        onClick={onRelease}
        className={`${TOUCH_HIT} flex h-full cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-muted)]`}
      >
        ✕
      </button>
      <span id={describedBy} className="sr-only">{collectionRowSpoken(card)}</span>
    </div>
  );
}
