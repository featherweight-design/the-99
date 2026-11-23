"use client";
// Settings' Store section (store choice handoff, call 1, Setting S1 to S6), first on the page while
// `STORE_PREFERENCE_ENABLED` is on for the reader. One radio row per store, drawn as Your decks' rows with the upload
// choice's ring; the rows come from `STORES`, so a new store is one more row and one more line of copy. Saved as it
// changes through `useStoreChoice`, as the first-run row is: the rows are held (aria-disabled) while a write is in flight,
// and a write that fails puts the last saved store back and says so in the shared social toast. `#settings-store` is where Change
// store lands; arriving on it washes the whole section for two seconds (`useWashFromHash`).

import { storeCopy } from "../../lib/copy/store";
import { STORE_INFO, STORE_SETTINGS_ID } from "../../lib/stores/info";
import { STORES, type Store } from "../../lib/stores/rows";
import { SECTION_HEAD } from "../social/friends-list";
import { SocialToast } from "../social/social-toast";
import { useStoreChoice } from "../stores/use-store-choice";
import { WASH, useWashFromHash } from "./wash-from-hash";

const c = storeCopy.settings;
const WASHED = [STORE_SETTINGS_ID];

export function StoreSection({ store }: { store: Store }) {
  const { on, saving, save, toast, clearToast } = useStoreChoice(store);
  useWashFromHash(WASHED);

  return (
    <section
      id={STORE_SETTINGS_ID}
      aria-labelledby="settings-store-head"
      data-store-section=""
      className={`-mx-[10px] mt-[22px] scroll-mt-[72px] rounded-[10px] px-[10px] py-[2px] md:mt-[30px] ${WASH}`}
    >
      <h2 id="settings-store-head" className={SECTION_HEAD}>{c.head}</h2>
      <p className="m-0 mt-[10px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{c.explain}</p>
      <div role="radiogroup" aria-label={c.groupLabel} className="m-0 mt-[4px] flex flex-col">
        {STORES.map((id) => {
          const picked = on === id;
          return (
            <div key={id} className="[&+&]:[border-top:1px_solid_var(--border)]">
              <label data-store-row={id} className="flex min-h-[44px] cursor-pointer has-[[aria-disabled]]:cursor-default items-start gap-[12px] rounded-[8px] py-[9px] has-[:focus-visible]:shadow-[0_0_0_2px_var(--accent)]">
                <input
                  type="radio"
                  name="settings-store"
                  value={id}
                  checked={picked}
                  // Held, not `disabled`: a disabled radio drops keyboard focus to the page mid-write, so the press
                  // is refused in `save` and the row only reads as unavailable until the write lands.
                  aria-disabled={saving || undefined}
                  onChange={() => save(id)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  data-ring
                  className={`mt-[1px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2 ${
                    picked ? "border-[color:var(--accent)]" : "border-[color:var(--border-dashed)]"
                  }`}
                >
                  {picked ? <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--accent)]" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <b className="font-sans text-[14px] font-medium text-[color:var(--fg)]">{STORE_INFO[id].name}</b>
                  <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{c.rows[id]}</span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
      <p className="m-0 mt-[8px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot}</p>
      <SocialToast toast={toast} onDone={clearToast} />
    </section>
  );
}
