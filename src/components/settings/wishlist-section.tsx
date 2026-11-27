"use client";
// Settings' Wishlist section (cart on your wishlist, call 1, board `Settings`), after Spares: one switch that keeps
// Shopping for all decks on the reader's wishlist, and under it, indented, the decks it reads from in the shipped
// searchable `FilterPanel` (the field trigger the Kept for this deck box draws), so the row is one line at 5 decks or
// 50. Every deck starts chosen and a new deck joins by itself; a deck's ⋯ menu carries the same choice (Keep off my
// wishlist, the same column). Rows drawn as Your decks draws them: switch off, the From row dims and cannot open.
//
// Saving: the switch is one save at a time, as Your decks. The picker's ticks are written in press order, one after
// another, so a quick run of ticks all lands; a write that fails puts every deck back to what the server last
// accepted and says so in the shared social toast.

import { useEffect, useRef, useState } from "react";
import { BandText } from "../decks/deck-box";
import { setDecksOffWishlistAction, setWishlistSyncAction } from "../../app/settings/wishlist-actions";
import { settingsCopy, wishlistDecksPanelCopy } from "../../lib/copy/settings";
import type { WishlistSyncSettings } from "../../lib/wishlist/sync-settings";
import { SECTION_HEAD } from "../social/friends-list";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { Checkbox } from "../ui/checkbox";
import { FilterPanel } from "../ui/filter-panel";
import { captureClientError } from "../../lib/sentry/capture-client";

const c = settingsCopy.wishlist;

const keptOff = (s: WishlistSyncSettings) => new Set(s.decks.filter((d) => d.off).map((d) => d.id));

export function WishlistSection({ settings }: { settings: WishlistSyncSettings }) {
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  const [announce, setAnnounce] = useState("");

  // The switch and the decks left out, held from the press; a fresh server value always wins (adjusted during render).
  const [on, setOn] = useState(settings.on);
  const [off, setOff] = useState(() => keptOff(settings));
  const [served, setServed] = useState(settings);
  if (served !== settings) {
    setServed(settings);
    setOn(settings.on);
    setOff(keptOff(settings));
  }
  // What the server last accepted: a failure puts this back.
  const saved = useRef({ on: settings.on, off: keptOff(settings) });
  useEffect(() => {
    saved.current = { on: settings.on, off: keptOff(settings) };
  }, [settings]);

  const fail = () => {
    setOn(saved.current.on);
    setOff(new Set(saved.current.off));
    setToast({ id: ++toastSeq.current, text: c.failed });
  };

  const [saving, setSaving] = useState(false);
  async function saveSwitch(next: boolean) {
    if (saving) return;
    setOn(next);
    setSaving(true);
    try {
      const r = await setWishlistSyncAction(next);
      if (r.ok) saved.current = { ...saved.current, on: next };
      else fail();
    } catch (e) {
      captureClientError("settings.wishlist-sync", e);
      fail();
    } finally {
      setSaving(false);
    }
  }

  // The picker's writes, chained so each lands after the one before it.
  const queue = useRef<Promise<void>>(Promise.resolve());
  function saveDecks(ids: string[], leaveOut: boolean) {
    if (ids.length === 0) return;
    setOff((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (leaveOut) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    queue.current = queue.current.then(async () => {
      try {
        const r = await setDecksOffWishlistAction(ids, leaveOut);
        if (!r.ok) return fail();
        const next = new Set(saved.current.off);
        for (const id of ids) {
          if (leaveOut) next.add(id);
          else next.delete(id);
        }
        saved.current = { ...saved.current, off: next };
      } catch (e) {
        captureClientError("settings.wishlist-decks", e);
        fail();
      }
    });
  }

  const nameOf = (id: string) => settings.decks.find((d) => d.id === id)?.name ?? "";
  const chosen = settings.decks.filter((d) => !off.has(d.id)).map((d) => d.id);
  const copy = wishlistDecksPanelCopy;
  return (
    <section aria-labelledby="settings-wishlist" data-settings-wishlist="" className="mt-[26px] md:mt-[34px]">
      <h2 id="settings-wishlist" className={SECTION_HEAD}><BandText text={c.head} /></h2>
      <p className="m-0 mt-[10px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{c.explain}</p>
      <ul className="m-0 mt-[4px] list-none p-0">
        <li className="[&+&]:[border-top:1px_solid_var(--border)]">
          <label data-wishlist-row="sync" className="flex min-h-[44px] cursor-pointer items-start gap-[12px] rounded-[8px] py-[8px]">
            <Checkbox checked={on} disabled={saving} onChange={(v) => saveSwitch(v)} className="mt-[1px]" />
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <b className="font-sans text-[14px] font-medium text-[color:var(--fg)]">{c.sync.name}</b>
              <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{c.sync.line}</span>
            </span>
          </label>
        </li>
        <li data-wishlist-row="from" className={`[&+&]:[border-top:1px_solid_var(--border)] ${on ? "" : "opacity-[.45]"}`}>
          <div className="flex min-h-[44px] flex-col gap-[8px] py-[10px] pl-[30px] md:flex-row md:items-center md:gap-[14px]">
            <b className="flex-none font-sans text-[14px] font-medium text-[color:var(--fg)]">{c.from}</b>
            <div className="relative min-w-0 md:w-[340px]">
              <FilterPanel
                copy={copy}
                options={settings.decks.map((d) => ({ code: d.id, label: d.name, count: d.toBuy, disabled: false }))}
                selected={chosen}
                onToggle={(id) => {
                  const leaveOut = !off.has(id);
                  saveDecks([id], leaveOut);
                  setAnnounce(leaveOut ? copy.announceRemoved(nameOf(id), 0, 0, 0) : copy.announceAdded(nameOf(id), 0, 0, 0));
                }}
                onClear={() => {
                  saveDecks(chosen, true);
                  setAnnounce(copy.announceCleared(0));
                }}
                onAnnounce={setAnnounce}
                searchable
                disabled={!on || settings.decks.length === 0}
                triggerLook="field"
              />
            </div>
          </div>
        </li>
      </ul>
      <p className="m-0 mt-[10px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot}</p>
      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}
