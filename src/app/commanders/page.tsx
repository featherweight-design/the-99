// INTERIM Commanders surface — full grid + filters + hero ranking ships in #7.
// We deliberately DO NOT call recommendCommanders here (dozens of EDHREC
// fetches, multi-second load). We only need the collection count to decide
// which shell state to render.
import Link from "next/link";
import { requireUserId } from "../../lib/auth";
import { getCollectionStats } from "../../lib/home/summary";
import { CardFan, XcixSeal } from "../../components/marks";

export default async function CommandersPage() {
  const userId = await requireUserId();
  const stats = await getCollectionStats(userId);

  if (stats.uniqueCards === 0) {
    // No cards → collection-empty analog: send the user to upload.
    return (
      <section
        className="flex flex-col items-center justify-center text-center"
        style={{ padding: "32px" }}
      >
        {/* Card-fan mark: same construction as collection empty state */}
        <CardFan variant="mobile" className="mb-[22px] md:hidden" />
        <CardFan variant="desktop" className="mb-[26px] hidden md:block" />

        <h1
          className="font-display font-bold text-[28px]"
          style={{ color: "var(--fg)", margin: 0 }}
        >
          No collection yet
        </h1>

        <p
          className="mt-3 max-w-[420px] text-[16px] leading-[1.6]"
          style={{ color: "var(--fg-body)" }}
        >
          Upload your cards and we&apos;ll rank every commander you can build.
        </p>

        <Link
          href="/collection"
          className="mt-6 rounded-lg px-[24px] py-[12px] font-semibold text-[14px] bg-[color:var(--brass)] text-[color:var(--bg)] hover:bg-[color:var(--brass-hover)]"
        >
          Upload collection
        </Link>
      </section>
    );
  }

  // Interim shell: cards exist but the full ranking surface ships in #7.
  // §Empty State — No Commander Candidates gives us the chrome:
  // XCIX seal + heading + body + scanned-count mono line + CTAs.
  return (
    <section
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: "32px" }}
    >
      {/* XCIX seal: mobile 64×64, desktop 78×78 */}
      <XcixSeal variant="mobile" className="mb-[22px] md:hidden" />
      <XcixSeal variant="desktop" className="mb-[24px] hidden md:block" />

      <h1
        className="font-display font-bold text-[24px] leading-[1.25] md:text-[28px]"
        style={{ color: "var(--brass)", margin: 0 }}
      >
        No generals in the ranks — yet
      </h1>

      {/* Body copy: mobile 14px, desktop 16px; different content per breakpoint */}
      <p
        className="mt-[14px] max-w-[460px] text-[14px] leading-[1.6] md:mt-3 md:text-[16px]"
        style={{ color: "var(--fg-body)" }}
      >
        <span className="md:hidden">
          We scanned all {stats.uniqueCards.toLocaleString()} cards and none
          can helm a legal 99 on their own. Add a legendary creature and
          they&apos;ll show up here.
        </span>
        <span className="hidden md:inline">
          We scanned all {stats.uniqueCards.toLocaleString()} cards and none
          can helm a legal 99 on their own. Add a legendary creature — or a
          planeswalker that can command — and they&apos;ll appear here, ranked.
        </span>
      </p>

      {/* Scanned-count mono line: mobile 11px mt-[18px], desktop 12px mt-[18px] */}
      <p
        className="mt-[18px] font-mono text-[11px] md:text-[12px]"
        style={{ color: "var(--fg-faint)" }}
      >
        <span className="md:hidden">
          {stats.uniqueCards.toLocaleString()} cards · 0 eligible commanders
        </span>
        <span className="hidden md:inline">
          {stats.uniqueCards.toLocaleString()} cards scanned · 0 eligible
          commanders
        </span>
      </p>

      {/* CTAs — mobile: single secondary button; desktop: flex row with primary + secondary */}
      <div className="mt-[22px] md:mt-[24px] md:flex md:gap-3">
        <Link
          href="/collection"
          className={[
            // Mobile: secondary style
            "inline-block rounded-lg px-[22px] py-[12px] font-semibold text-[14px]",
            "md:hidden",
          ].join(" ")}
          style={{
            background: "transparent",
            border: "1px solid var(--border-strong)",
            color: "var(--fg)",
          }}
        >
          Add more cards
        </Link>
        {/* Desktop: primary "Add more cards" */}
        <Link
          href="/collection"
          className="hidden rounded-lg px-[24px] py-[12px] font-semibold text-[14px] bg-[color:var(--brass)] text-[color:var(--bg)] hover:bg-[color:var(--brass-hover)] md:inline-block"
        >
          Add more cards
        </Link>
        {/* Desktop: secondary "View collection" */}
        <Link
          href="/collection"
          className="hidden rounded-lg px-[24px] py-[12px] font-semibold text-[14px] md:inline-block"
          style={{
            background: "transparent",
            border: "1px solid var(--border-strong)",
            color: "var(--fg)",
          }}
        >
          View collection
        </Link>
      </div>
    </section>
  );
}
