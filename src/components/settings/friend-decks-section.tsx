"use client";
// Settings' "Your decks" section (friend decks handoff, README 4b), last, after Spares: what a
// friend's Decks tab shows of the reader's. Two boxes, drawn as the news section's rows, each saved as it changes
// (`setFriendDeckPrefsAction`, both rules at once). The second sits under the first, indented, and with the first off
// it dims, reads unticked and cannot be pressed: there is nothing for it to include. A write that fails puts both back
// to what was last saved and says so in the shared social toast, as the news and Spares sections do.

import { useEffect, useRef, useState } from "react";
import { setFriendDeckPrefsAction } from "../../app/settings/actions";
import { settingsCopy } from "../../lib/copy/settings";
import { SETTINGS_TARGET_HASH, type FriendDeckPrefs } from "../../lib/social/deck-visibility-rule";
import { SECTION_HEAD } from "../social/friends-list";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { Checkbox } from "../ui/checkbox";

const c = settingsCopy.decks;

/**
 * The wash a deck's ⋯ menu lands on (`/settings#settings-decks-see` or `#settings-decks-unfinished`, draft hidden row #2988): the named
 * row scrolls into view and takes the elevated fill and a hairline ring for two seconds, then fades. Set on a data attribute rather than
 * in state (the row's own styling is `data-[washed]`), and with no fade under reduced motion. A bare `#settings-decks` is the heading's
 * own anchor and washes nothing.
 */
const WASH_MS = 2000;
const WASH = "data-[washed]:bg-[color:var(--elevated)] data-[washed]:shadow-[inset_0_0_0_1px_var(--border-strong)] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-500";
function useWashFromHash() {
  useEffect(() => {
    const timers: number[] = [];
    let washed: HTMLElement | null = null;
    // The page streams in after this mounts (and the router scrolls to the hash on its own as segments land), so the row is brought
    // back to the middle twice more while the wash runs, unless the reader has scrolled themselves.
    let moved = false;
    const mine = () => {
      moved = true;
    };
    const stop = () => {
      for (const t of timers.splice(0)) window.clearTimeout(t);
    };
    const run = () => {
      const id = window.location.hash.slice(1);
      if (id !== SETTINGS_TARGET_HASH.see && id !== SETTINGS_TARGET_HASH.unfinished) return;
      const el = document.getElementById(id);
      if (!el) return;
      stop();
      washed?.removeAttribute("data-washed");
      washed = el;
      moved = false;
      el.scrollIntoView({ block: "center" });
      el.setAttribute("data-washed", "");
      for (const ms of [300, 900]) timers.push(window.setTimeout(() => (moved ? undefined : el.scrollIntoView({ block: "center" })), ms));
      timers.push(window.setTimeout(() => el.removeAttribute("data-washed"), WASH_MS));
    };
    run();
    window.addEventListener("hashchange", run);
    window.addEventListener("wheel", mine, { passive: true });
    window.addEventListener("touchmove", mine, { passive: true });
    window.addEventListener("keydown", mine);
    return () => {
      window.removeEventListener("hashchange", run);
      window.removeEventListener("wheel", mine);
      window.removeEventListener("touchmove", mine);
      window.removeEventListener("keydown", mine);
      stop();
      washed?.removeAttribute("data-washed");
    };
  }, []);
}

export function FriendDecksSection({ prefs }: { prefs: FriendDeckPrefs }) {
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  useWashFromHash();

  // The two rules, held from the press; a fresh server value always wins (adjusted during render).
  const [on, setOn] = useState(prefs);
  const [served, setServed] = useState(prefs);
  if (served !== prefs) {
    setServed(prefs);
    setOn(prefs);
  }
  // What the server last accepted: a failure puts this back.
  const saved = useRef(prefs);
  useEffect(() => {
    saved.current = prefs;
  }, [prefs]);
  // One save at a time, as the news section: a redraw from one save can never land over a newer, unsaved press.
  const [saving, setSaving] = useState(false);

  async function save(next: FriendDeckPrefs) {
    if (saving) return;
    setOn(next);
    setSaving(true);
    const fail = () => {
      setOn(saved.current);
      setToast({ id: ++toastSeq.current, text: c.failed });
    };
    try {
      const r = await setFriendDeckPrefsAction(next.seeDecks, next.seeUnfinished);
      if (r.ok) {
        saved.current = next;
        setOn(next);
      } else fail();
    } catch {
      fail();
    } finally {
      setSaving(false);
    }
  }

  const unfinishedLive = on.seeDecks;
  return (
    <section aria-labelledby="settings-decks" className="mt-[26px] md:mt-[34px]">
      <h2 id="settings-decks" className={SECTION_HEAD}>{c.head}</h2>
      <p className="m-0 mt-[10px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{c.explain}</p>
      <ul className="m-0 mt-[4px] list-none p-0">
        <li className="[&+&]:[border-top:1px_solid_var(--border)]">
          <label
            id={SETTINGS_TARGET_HASH.see}
            data-friend-decks-row="see"
            className={`flex min-h-[44px] scroll-mt-[72px] cursor-pointer items-start gap-[12px] rounded-[8px] py-[8px] ${WASH}`}
          >
            <Checkbox checked={on.seeDecks} disabled={saving} onChange={(v) => save({ ...on, seeDecks: v })} className="mt-[1px]" />
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <b className="font-sans text-[14px] font-medium text-[color:var(--fg)]">{c.see.name}</b>
              <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{c.see.line}</span>
            </span>
          </label>
        </li>
        <li className="[&+&]:[border-top:1px_solid_var(--border)]">
          <label
            id={SETTINGS_TARGET_HASH.unfinished}
            data-friend-decks-row="unfinished"
            className={`flex min-h-[44px] scroll-mt-[72px] items-start gap-[12px] rounded-[8px] py-[8px] pl-[30px] ${WASH} ${unfinishedLive ? "cursor-pointer" : "cursor-default opacity-[.45]"}`}
          >
            <Checkbox
              // Off with the first: friends see no deck, so none is included, whatever is stored.
              checked={unfinishedLive && on.seeUnfinished}
              disabled={saving || !unfinishedLive}
              onChange={(v) => save({ ...on, seeUnfinished: v })}
              className="mt-[1px]"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <b className="font-sans text-[14px] font-medium text-[color:var(--fg)]">{c.unfinished.name}</b>
              <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{c.unfinished.line}</span>
            </span>
          </label>
        </li>
      </ul>
      <p className="m-0 mt-[10px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot}</p>
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}
