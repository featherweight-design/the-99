"use client";
// Store choice R1 (account 1, 2026-11-22), PROPOSAL: Settings' Store section, first on the page. One radio row per store,
// drawn as Your decks' rows with upload-choice's ring; the list is STORES, so a fourth store is one more row. Saved as it
// changes (one write at a time, as the other sections); a failure puts the last saved store back and says so in the
// shared social toast. `#settings-store` is the anchor the Shopping strip's Change store link lands on, and it washes the
// section as `#settings-decks-see` washes its row.
import { useState } from "react";
import { STORES, type StoreId } from "../../lib/store/stores";
import { storeCopy as c } from "../../lib/copy/store";
import { SECTION_HEAD } from "../social/friends-list";

export function StoreSection({ store, washed = false, saving = null }: { store: StoreId; washed?: boolean; saving?: StoreId | null }) {
  const [on, setOn] = useState<StoreId>(saving ?? store);
  return (
    <section
      id="settings-store"
      aria-labelledby="settings-store-head"
      data-washed={washed ? "" : undefined}
      className="-mx-[10px] mt-[22px] scroll-mt-[72px] rounded-[10px] px-[10px] pb-[2px] pt-[2px] md:mt-[30px] data-[washed]:bg-[color:var(--elevated)] data-[washed]:shadow-[inset_0_0_0_1px_var(--border-strong)]"
    >
      <h2 id="settings-store-head" className={SECTION_HEAD}>{c.head}</h2>
      <p className="m-0 mt-[10px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{c.explain}</p>
      <div role="radiogroup" aria-label={c.groupLabel} className="m-0 mt-[4px] flex flex-col">
        {STORES.map((s, i) => {
          const picked = on === s.id;
          return (
            <div key={s.id} className={i > 0 ? "[border-top:1px_solid_var(--border)]" : ""}><label
              data-store-row={s.id}
              className="flex min-h-[44px] cursor-pointer items-start gap-[12px] rounded-[8px] py-[9px]"
            >
              <input type="radio" name="store" value={s.id} checked={picked} disabled={saving !== null} onChange={() => setOn(s.id)} className="sr-only" />
              <span
                aria-hidden
                className={`mt-[1px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2 ${picked ? "border-[color:var(--accent)]" : "border-[color:var(--border-dashed)]"}`}
              >
                {picked ? <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--accent)]" /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <b className="font-sans text-[14px] font-medium text-[color:var(--fg)]">{s.name}</b>
                <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{c.rows[s.id]}</span>
              </span>
            </label></div>
          );
        })}
      </div>
      <p className="m-0 mt-[8px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot}</p>
    </section>
  );
}
