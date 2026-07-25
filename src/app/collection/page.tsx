// /collection — designed browse surface (#6).
// Server component: loads full aggregated collection once and hands it to
// the client browser for filter/sort/window/modal state.
//
// Empty-collection state remains the shell's design; this surface's own
// "no results" case is triggered when filters return zero (Task 5).

import { requireUserId } from "../../lib/auth";
import { getCollectionLastUpdated, getCollectionStats } from "../../lib/home/summary";
import { formatLastUpdated, loadBrowseCards } from "../../lib/collection/browse";
import { CardFan } from "../../components/marks";
import { CollectionBrowser } from "../../components/collection/browser";
import { GhostButton, PrimaryButton } from "../../components/ui/button";

export default async function CollectionPage() {
  const userId = await requireUserId();
  const [stats, cards, lastUpdated] = await Promise.all([
    getCollectionStats(userId),
    loadBrowseCards(userId),
    getCollectionLastUpdated(userId),
  ]);

  // Empty collection — shell's state, kept intact.
  if (stats.uniqueCards === 0) {
    return (
      <section className="flex flex-col items-center justify-center text-center p-8 md:p-[48px]">
        <CardFan variant="mobile" className="mb-[22px] md:hidden" />
        <CardFan variant="desktop" className="mb-[26px] hidden md:block" />
        <h1
          className="font-display font-bold text-[28px]"
          style={{ color: "var(--fg)", margin: 0 }}
        >
          Your collection is empty
        </h1>
        <p
          className="mt-3 max-w-[420px] text-[16px]"
          style={{ color: "var(--fg-body)", lineHeight: 1.6 }}
        >
          A pile of possibilities waiting for a commander. Upload a CSV and the
          table fills — commanders and decks follow.
        </p>
        <div className="mt-[26px]">
          <PrimaryButton
            href="/collection/replace"
            className="text-[13px] md:text-[14px] px-[20px] md:px-[22px] py-[11px]"
          >
            Upload your CSV
          </PrimaryButton>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-80px)] md:min-h-screen">
      {/* Header — §Collection Page Header */}
      <div
        className="flex items-center md:items-end justify-between gap-[20px] p-[20px_18px_12px] md:p-[28px_34px_0] mb-[14px] md:mb-0"
        style={{ background: "var(--bg)" }}
      >
        <div>
          {/* Title — §Page Title "Collection": Cinzel 700, 22/30px, #EDE6D8 (--fg) */}
          <h1 className="font-display font-bold text-[22px] md:text-[30px] m-0" style={{ color: "var(--fg)" }}>
            Collection
          </h1>
          {/* Subtitle — §Subtitle / Stats Line: mono 11/12px, #8E8269 (--fg-faint), margin-top 2/4px */}
          <p
            className="font-mono text-[11px] md:text-[12px] mt-[2px] md:mt-[4px]"
            style={{ color: "var(--fg-faint)" }}
          >
            <span className="md:hidden">
              {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique
            </span>
            <span className="hidden md:inline">
              {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique
              {lastUpdated ? ` · last updated ${formatLastUpdated(lastUpdated)}` : ""}
            </span>
          </p>
        </div>
        {/* Replace button — §Replace Collection Button (desktop-only per table) */}
        <div className="flex items-center gap-[12px]">
          <a
            href="/collection/replace"
            className="md:hidden text-[13px]"
            style={{ color: "var(--brass)" }}
          >
            ↻ Replace
          </a>
          <GhostButton
            href="/collection/replace"
            className="hidden md:inline-block text-[13px] px-[16px] py-[9px]"
          >
            ↻ Replace collection
          </GhostButton>
        </div>
      </div>

      <CollectionBrowser cards={cards} />
    </section>
  );
}
