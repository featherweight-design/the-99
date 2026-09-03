// /decks — Deck list page.
// §Deck List: populated grid, empty state preserved, ?commander redirect.
import { redirect } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { listDecksWithStats } from "../../lib/decks/read";
import { selectParamSuffix } from "../../lib/decks/selection-param";
import { CardFan } from "../../components/marks";
import { Crown } from "../../components/ui/crown";
import { DeckCard } from "../../components/decks/deck-card";
import { NewDeckButton } from "../../components/decks/new-deck-button";
import { ImportDeckButton } from "../../components/decks/import-deck-button";
import { PrimaryButton } from "../../components/ui/button";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateTitle,
} from "../../components/ui/empty-state";

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ commander?: string; select?: string | string[] }>;
}) {
  // Step 1: redirect on ?commander= query param
  const params = await searchParams;
  if (params.commander) {
    // The synergy picks ride along. `selectParamSuffix` is empty when nothing
    // uuid-shaped survives, so a build with no selection lands on exactly the
    // URL this page has always produced.
    redirect(
      `/decks/new?commander=${encodeURIComponent(params.commander)}` +
        selectParamSuffix(params.select),
    );
  }

  const userId = await requireUserId();
  const decks = await listDecksWithStats(userId);

  // ── Empty state — §Empty State — No Decks. Verbatim from interim; not regressed. ──
  if (decks.length === 0) {
    return (
      <EmptyState>
        {/* Card-fan mark: mobile variant → 100×110, decks-desktop → 120×130 (−15° front) */}
        <div className="mb-[22px] md:mb-[26px] flex items-end justify-center gap-[14px] md:gap-[18px]">
          <CardFan variant="mobile" className="md:hidden" />
          <CardFan variant="decks-desktop" className="hidden md:block" />
        </div>

        <Crown tone="page" className="mb-[14px]" />

        <EmptyStateTitle className="text-[24px] md:text-[28px]">
          No decks yet.
        </EmptyStateTitle>

        {/* Body: mobile 14px different copy, desktop 16px different copy */}
        <EmptyStateBody className="mt-3 text-[14px] md:max-w-[420px] md:text-[16px]">
          <span className="md:hidden">
            Pick a commander and we&apos;ll assemble the 99 from cards you
            already own.
          </span>
          <span className="hidden md:inline">
            Pick a commander and we&apos;ll assemble the 99 from cards you
            already own — then track what&apos;s missing.
          </span>
        </EmptyStateBody>

        {/* "Browse commanders" CTA: mobile pad 13px 26px mt-[24px], desktop 12px 26px */}
        <PrimaryButton
          href="/commanders"
          className="mt-[24px] text-[14px] px-[26px] py-[13px] md:py-[12px]"
        >
          Browse commanders
        </PrimaryButton>

        {/* A player whose first deck already exists somewhere else has no other
            way in: the header's import link only renders over a populated grid. */}
        <div className="mt-[14px]">
          <ImportDeckButton />
        </div>
      </EmptyState>
    );
  }

  // ── Populated state ──
  // Aggregate subtitle values
  const totalBuilt = decks.reduce((sum, d) => sum + d.built, 0);

  return (
    <section>
      {/*
        §Page header container:
        mobile:  p 20px 18px 14px, border-bottom 1px var(--border), flex center space-between, mb 12px
        desktop: p 30px 34px, no border-bottom, flex flex-end space-between, mb 22px
      */}
      <div
        className="flex items-center md:items-end justify-between p-[20px_18px_14px] md:p-[30px_34px] mb-[12px] md:mb-[22px] border-b border-[color:var(--border)] md:border-b-0"
      >
        <div>
          {/* §Page header — title "Your decks": Cinzel 700, 22/28px, var(--fg) */}
          <h1
            className="font-display font-bold text-[22px] md:text-[28px] m-0"
            style={{ color: "var(--fg)" }}
          >
            Your decks
          </h1>
          {/* §Page header — subtitle: IBM Plex Mono 11/12px var(--fg-faint), mt 2/5px */}
          <p
            className="font-mono text-[11px] md:text-[12px] mt-[2px] md:mt-[5px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {decks.length} deck{decks.length !== 1 ? "s" : ""} · {totalBuilt} cards built
          </p>
        </div>

        {/* §New Deck button — desktop only (mobile has full-width below).
            #35 removed the decorative mobile avatar that used to sit beside it:
            it duplicated the shell header's real account trigger a few pixels
            away, in the pre-#35 34×34/r10 styling. */}
        <div className="hidden md:flex md:items-center md:gap-[10px]">
          <ImportDeckButton />
          <NewDeckButton />
        </div>
      </div>

      {/* Mobile "New Deck" button — full-width, above the grid */}
      {/* §New Deck button mobile: full-width, 11px 0 padding, shown only on mobile */}
      <div className="md:hidden px-[14px] mb-[11px] flex flex-col gap-[8px]">
        <NewDeckButton />
        <ImportDeckButton />
      </div>

      {/*
        §Deck grid:
        mobile:  flex col, gap 11px, p 14px
        desktop: grid 2-col (1fr 1fr), gap 16px
      */}
      <ul
        className="flex flex-col gap-[11px] p-[14px] md:grid md:gap-[16px] md:p-[0_34px_30px]"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        {decks.map((deck) => (
          <li key={deck.id}>
            <DeckCard deck={deck} />
          </li>
        ))}
      </ul>
    </section>
  );
}
