import { Suspense } from "react";
import Link from "next/link";
import type { RecentDeck } from "../../lib/home/summary";
import { COMPLETENESS_THRESHOLDS } from "../../lib/recs/score";
import { HeroCommander, HeroCommanderSkeleton } from "./hero-commander";

/* §Deck row state color: success ≥ high, warning ≥ mid, danger below —
   derived from deck cardCount/99 (distinct from the hero bar's
   EDHREC-owned/total metric, but sharing the same thresholds). */
function deckStateColor(cardCount: number): string {
  const pct = (cardCount / 99) * 100;
  if (pct >= COMPLETENESS_THRESHOLDS.high) return "var(--success)";
  if (pct >= COMPLETENESS_THRESHOLDS.mid) return "var(--warning)";
  return "var(--danger)";
}

export function Dashboard({
  userId,
  stats,
  decks,
  name,
}: {
  userId: string;
  stats: { totalCards: number; uniqueCards: number };
  decks: RecentDeck[];
  name: string | null;
}) {
  return (
    // §Signed-In Home Dashboard: Main content area — padding 20px mobile / 34px 40px 44px desktop
    <div className="p-5 md:px-10 md:pt-[34px] md:pb-11 bg-[radial-gradient(760px_380px_at_45%_-60px,rgba(201,162,75,0.08),transparent_70%)]">
      {/* ── Greeting header ──
          §Page heading "Welcome back":
            Mobile: Cinzel 700 24px primary — content "Welcome back" (no name)
            Desktop: Cinzel 700 32px primary — content "Welcome back, {name}" */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              color: "var(--fg)",
              margin: 0,
            }}
            className="text-[24px] md:text-[32px]"
          >
            <span className="md:hidden">Welcome back</span>
            <span className="hidden md:inline">
              {name ? `Welcome back, ${name}` : "Welcome back"}
            </span>
          </h1>
          {/* §Stats sub-line:
              Mobile:  mono 11px muted, mt 6px — "{N} commanders buildable · {M} decks"
              Desktop: mono 13px muted, mt 8px — "{total} cards · {unique} unique · {N} commanders buildable · {M} decks"
              (commander count not available here; omit and show card/unique/decks per available data) */}
          <p
            className="text-[11px] md:text-[13px] mt-[6px] md:mt-[8px]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--fg-muted)",
            }}
          >
            {/* Mobile: compact */}
            <span className="md:hidden">
              {stats.totalCards.toLocaleString()} cards · {decks.length} deck
              {decks.length === 1 ? "" : "s"}
            </span>
            {/* Desktop: full */}
            <span className="hidden md:inline">
              {stats.totalCards.toLocaleString()} cards ·{" "}
              {stats.uniqueCards.toLocaleString()} unique · {decks.length} deck
              {decks.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>

      </div>

      {/* ── Hero Commander ──
          §Section label: mono 10px/11px uppercase 0.16em tracking, fg-faint, mt 22px mb 10px/12px.
          The label and the "All commanders →" link belong to the same thing and
          now sit on one row above it: the hero is the top-ranked commander, not
          a deck, and the ranked list it heads is reached through that link. */}
      <div className="mt-[22px] mb-[10px] md:mb-[12px] flex items-baseline justify-between">
        <div
          className="text-[10px] md:text-[11px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.16em",
            color: "var(--fg-faint)",
          }}
        >
          Recommended commander
        </div>
        <Link href="/commanders" style={{ fontSize: 13, color: "var(--brass)" }}>
          All commanders →
        </Link>
      </div>
      {/* Streamed — §READINESS item 4: HeroCommander is the expensive component.
          Suspense boundary lets the rest of the page stream first. */}
      <Suspense fallback={<HeroCommanderSkeleton />}>
        <HeroCommander userId={userId} />
      </Suspense>

      {/* ── Two-column grid: recent decks (1.5fr) + collection stats (1fr) ──
          §Decks/stats section layout: grid, 1.5fr 1fr, gap 20px */}
      <div className="mt-6 grid gap-5 md:grid-cols-[1.5fr_1fr]">
        {/* Recent decks */}
        <div>
          {/* §Section label */}
          <div
            className="mb-[10px] md:mb-[12px] text-[10px] md:text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.16em",
              color: "var(--fg-faint)",
            }}
          >
            Recent decks
          </div>
          {decks.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>No decks yet.</p>
          ) : (
            // §Deck rows gap: flex-col, gap 10px
            <ul className="flex flex-col gap-[10px]">
              {decks.map((d) => (
                <li key={d.id}>
                  {/* §Deck row: flex, align-items center, gap 14px, bg surface, border line, border-left 3px state-color,
                      br 8px, padding 13px 16px, cursor pointer
                      §Deck row hover: bg surface-raised (Tailwind class, not inline style per adjudication #3) */}
                  <Link
                    href={`/decks/${d.id}`}
                    className="flex items-center gap-[14px] rounded-[8px] p-[13px_16px] bg-surface hover:bg-surface-raised transition-colors"
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderLeft: `3px solid ${deckStateColor(d.cardCount)}`,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      {/* §Deck name: Cinzel 600 16px primary */}
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: 16,
                          color: "var(--fg)",
                        }}
                      >
                        {d.name}
                      </div>
                      {/* §Deck commander line: 12px muted, mt 2px */}
                      <div
                        className="mt-[2px]"
                        style={{ fontSize: 12, color: "var(--fg-muted)" }}
                      >
                        {d.commanderName}
                      </div>
                    </div>
                    {/* §Deck owned count: mono 13px, color = state color */}
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: deckStateColor(d.cardCount),
                      }}
                    >
                      {d.cardCount}/99
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Collection stats + Update entry (mobile) */}
        <aside>
          {/* §Section label */}
          <div
            className="mb-[10px] md:mb-[12px] text-[10px] md:text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.16em",
              color: "var(--fg-faint)",
            }}
          >
            Collection
          </div>
          {/* §Collection Stats Panel container: bg surface, border line, br 12px, padding 6px 20px */}
          <div
            className="rounded-[12px] px-5 py-[6px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
            }}
          >
            {/* §Stat row: flex, justify-between, align-center, padding 14px 0, border-bottom elevated (except last)
                §Stat label: 13px secondary (fg-body)
                §Stat value: mono 15px primary */}
            {[
              { label: "Total cards", value: stats.totalCards.toLocaleString() },
              { label: "Unique", value: stats.uniqueCards.toLocaleString() },
              { label: "Decks built", value: String(decks.length) },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                className="flex items-center justify-between py-[14px]"
                style={{
                  borderBottom:
                    i === arr.length - 1 ? "none" : "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--fg-body)" }}>{label}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    color: "var(--fg)",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

        </aside>
      </div>
    </div>
  );
}
