// /decks — Deck list page.
// §Deck List: populated grid, empty state preserved, ?commander redirect.
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { requireUserId } from "../../lib/auth";
import { listDecksWithStats } from "../../lib/decks/read";
import { CardFan } from "../../components/marks";
import { Crab } from "../../components/character/crab";
import { DeckCard } from "../../components/decks/deck-card";
import { NewDeckButton } from "../../components/decks/new-deck-button";

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ commander?: string }>;
}) {
  // Step 1: redirect on ?commander= query param
  const params = await searchParams;
  if (params.commander) {
    redirect(`/decks/new?commander=${encodeURIComponent(params.commander)}`);
  }

  const [userId, user] = await Promise.all([requireUserId(), currentUser()]);
  const decks = await listDecksWithStats(userId);

  // ── Empty state — §Empty State — No Decks. Verbatim from interim; not regressed. ──
  if (decks.length === 0) {
    return (
      <section
        className="flex flex-col items-center justify-center text-center"
        style={{ padding: "32px" }}
      >
        {/* Card-fan mark: mobile variant → 100×110, decks-desktop → 120×130 (−15° front) */}
        <div className="mb-[22px] md:mb-[26px] flex items-end justify-center gap-[14px] md:gap-[18px]">
          <CardFan variant="mobile" className="md:hidden" />
          <Crab size={64} className="md:hidden" />
          <CardFan variant="decks-desktop" className="hidden md:block" />
          <Crab size={80} className="hidden md:block" />
        </div>

        <h1
          className="font-display font-bold text-[24px] md:text-[28px]"
          style={{ color: "var(--fg)", margin: 0 }}
        >
          No decks yet.
        </h1>

        {/* Body: mobile 14px different copy, desktop 16px different copy */}
        <p
          className="mt-3 text-[14px] leading-[1.6] md:max-w-[420px] md:text-[16px]"
          style={{ color: "var(--fg-body)" }}
        >
          <span className="md:hidden">
            Pick a commander and we&apos;ll assemble the 99 from cards you
            already own.
          </span>
          <span className="hidden md:inline">
            Pick a commander and we&apos;ll assemble the 99 from cards you
            already own — then track what&apos;s missing.
          </span>
        </p>

        {/* "Browse commanders" CTA: mobile pad 13px 26px mt-[24px], desktop 12px 26px */}
        <Link
          href="/commanders"
          className={[
            "mt-[24px] rounded-lg font-semibold text-[14px]",
            "px-[26px] py-[13px] md:py-[12px]",
            "bg-[color:var(--brass)] text-[color:var(--bg)]",
            "hover:bg-[color:var(--brass-hover)]",
          ].join(" ")}
        >
          Browse commanders
        </Link>
      </section>
    );
  }

  // ── Populated state ──
  // Aggregate subtitle values
  const totalBuilt = decks.reduce((sum, d) => sum + d.built, 0);

  // Mobile avatar: initials from firstName + lastName (or email prefix)
  const initials = (() => {
    const first = user?.firstName?.[0] ?? "";
    const last = user?.lastName?.[0] ?? "";
    if (first || last) return (first + last).toUpperCase();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    return email[0]?.toUpperCase() ?? "?";
  })();

  return (
    <section>
      {/*
        §Page header container:
        mobile:  p 20px 18px 14px, border-bottom 1px #2A241D, flex center space-between, mb 12px
        desktop: p 30px 34px, no border-bottom, flex flex-end space-between, mb 22px
      */}
      <div
        className="flex items-center md:items-end justify-between p-[20px_18px_14px] md:p-[30px_34px] mb-[12px] md:mb-[22px] border-b border-[#2A241D] md:border-b-0"
      >
        <div>
          {/* §Page header — title "Your decks": Cinzel 700, 22/28px, #EDE6D8 */}
          <h1
            className="font-display font-bold text-[22px] md:text-[28px] m-0"
            style={{ color: "#EDE6D8" }}
          >
            Your decks
          </h1>
          {/* §Page header — subtitle: IBM Plex Mono 11/12px #8E8269, mt 2/5px */}
          <p
            className="font-mono text-[11px] md:text-[12px] mt-[2px] md:mt-[5px]"
            style={{ color: "#8E8269" }}
          >
            {decks.length} deck{decks.length !== 1 ? "s" : ""} · {totalBuilt} cards built
          </p>
        </div>

        {/* Right side: mobile shows avatar, desktop shows "New Deck" button */}
        <div className="flex items-center gap-[12px]">
          {/*
            §Page header — avatar (mobile only):
            34×34px, br 10px, bg #221D16, border 1px #C9A24B, mono 11px #C9A24B initials
          */}
          <div
            className="md:hidden flex items-center justify-center rounded-[10px] font-mono text-[11px]"
            style={{
              width: 34,
              height: 34,
              background: "#221D16",
              border: "1px solid #C9A24B",
              color: "#C9A24B",
            }}
            aria-hidden
          >
            {initials}
          </div>

          {/* §New Deck button — desktop only (mobile has full-width below) */}
          <div className="hidden md:block">
            <NewDeckButton />
          </div>
        </div>
      </div>

      {/* Mobile "New Deck" button — full-width, above the grid */}
      {/* §New Deck button mobile: full-width, 11px 0 padding, shown only on mobile */}
      <div className="md:hidden px-[14px] mb-[11px]">
        <NewDeckButton />
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
