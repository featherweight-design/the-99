"use client";
// Settings' "What's new on Home" section (menu and Home handoff, `Settings.dc.html` `.cks`; plan PR 4): one checkbox
// per news kind AVAILABLE to this reader, in `FEED_KINDS` order (`loadNewsSettings`). A kind whose switch is off for
// them is absent, never drawn disabled. Each box saves as it changes (`saveFeedKinds`, the whole checked set); a write
// that fails puts the set back to what was last saved and says so in the shared social toast, as Spares does. One
// column at both widths; the row is the press, at least 44px tall at every width.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveFeedKinds } from "../../app/settings/feed-actions";
import { feedCopy } from "../../lib/copy/feed";
import { DEFAULT_ON_KINDS, type FeedKind } from "../../lib/feed/kinds";
import type { NewsSetting } from "../../lib/feed/prefs";
import { SECTION_HEAD } from "../social/friends-list";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { Checkbox } from "../ui/checkbox";

const c = feedCopy.news;

const onOf = (kinds: readonly NewsSetting[]): FeedKind[] => kinds.filter((k) => k.on).map((k) => k.kind);

export function NewsSection({ kinds }: { kinds: NewsSetting[] }) {
  const router = useRouter();
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);

  // The checked set, held from the press; a fresh server value always wins (adjusted during render).
  const [on, setOn] = useState<FeedKind[]>(() => onOf(kinds));
  const [served, setServed] = useState(kinds);
  if (served !== kinds) {
    setServed(kinds);
    setOn(onOf(kinds));
  }
  // What the server last accepted: a failure puts this back, never an older press's "before".
  const saved = useRef<FeedKind[]>(onOf(kinds));
  useEffect(() => {
    saved.current = onOf(kinds);
  }, [kinds]);
  // One save at a time: while a save is in flight every box waits, so a redraw from that save can never land over a
  // newer, still-unsaved press (the stepper's rule beside it, PR 3 review round 2).
  const [saving, setSaving] = useState(false);

  if (kinds.length === 0) return null;

  async function toggle(kind: FeedKind, checked: boolean) {
    if (saving) return;
    const next = kinds.map((k) => k.kind).filter((k) => (k === kind ? checked : on.includes(k)));
    setOn(next);
    setSaving(true);
    const fail = () => {
      setOn(saved.current);
      setToast({ id: ++toastSeq.current, text: c.failed });
    };
    try {
      const r = await saveFeedKinds(next, kinds.map((k) => k.kind));
      if (r.ok) {
        saved.current = next;
        // A redraw that landed while this save was pending (another section's save) carried the old choices.
        setOn(next);
      }
      else if (r.reason === "off") router.refresh();
      else {
        // Refused: the kinds this page offered may have changed under it (a switch went off), so draw the current ones.
        fail();
        router.refresh();
      }
    } catch {
      fail();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="settings-news" className="mt-[26px] md:mt-[34px]">
      <h2 id="settings-news" className={SECTION_HEAD}>{c.head}</h2>
      <ul className="m-0 mt-[4px] list-none p-0">
        {kinds.map(({ kind }) => {
          const k = c.kinds[kind];
          return (
            <li key={kind} className="[&+&]:[border-top:1px_solid_var(--border)]">
              <label className="flex min-h-[44px] cursor-pointer items-start gap-[12px] py-[8px]">
                <Checkbox checked={on.includes(kind)} disabled={saving} onChange={(v) => toggle(kind, v)} className="mt-[1px]" />
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <b className="font-sans text-[14px] font-medium text-[color:var(--fg)]">{k.name}</b>
                  <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">
                    {(DEFAULT_ON_KINDS as readonly FeedKind[]).includes(kind) ? `${k.line} ${c.defaultOn}` : k.line}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="m-0 mt-[10px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot}</p>
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}
