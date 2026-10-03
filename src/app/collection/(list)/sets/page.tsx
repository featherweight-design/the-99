// /collection/sets — the index. Entered from /collection; never a nav pillar of its own.
//
// Set completion is a different job from deckbuilding, and its population is inverted from
// /collection's: that page lists what you own, this one exists to show what you do not.
// That is why it is its own route rather than a view mode, and why none of /collection's
// filters cross the boundary in either direction.

import { requireUserId } from "../../../../lib/auth";
import { cacheForUser } from "../../../../lib/cache/user-lists";
import { loadOwnedSets } from "../../../../lib/sets/read";
import { getCollectionStats } from "../../../../lib/home/summary";
import { SetIndexView } from "../../../../components/sets/set-index-view";
import { setsIndexCopy } from "../../../../lib/copy/set-collections";
import { searchSetsAction } from "./actions";

export default async function SetsPage() {
  const userId = await requireUserId();

  // Cached under the reader's own tag, like the other list routes. The catalog half of
  // this payload (booster, rarity, base_set_size) is written by the weekly refresh, which
  // does not clear that tag — so a set re-indexed between visits shows its previous figure
  // until the hour ceiling. Both inputs move weekly, so the bound sits inside the cadence.
  const [sets, stats] = await Promise.all([
    cacheForUser(userId, ["sets-index"], () => loadOwnedSets(userId)),
    getCollectionStats(userId),
  ]);

  return (
    // A SECTION, not a `main`: the shell already renders one around every route, and a
    // nested main landmark is invalid (E20). The group's place head (`(list)/layout.tsx`)
    // sits above the padded column, so its strip lands where /collection's does (E19); the
    // column centers under it at its existing max width (Hugh's ruling, #1222 follow-up —
    // reverses R2's left anchor, which started "Your sets" under the Sets tab).
    <section className="flex flex-col">
      <div className="mx-auto w-full max-w-[900px] px-[16px] py-[20px] md:px-[34px] md:py-[28px]">
        <h1 className="font-display text-[24px] md:text-[28px]" style={{ color: "var(--fg)" }}>
          {setsIndexCopy.title}
        </h1>
        <p className="mt-[4px] mb-[18px] text-[13px]" style={{ color: "var(--fg-muted)" }}>
          {setsIndexCopy.subtitle(sets.length)}
        </p>

        <SetIndexView sets={sets} cardCount={stats.totalCards} onSearch={searchSetsAction} />
      </div>
    </section>
  );
}
