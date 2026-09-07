import Link from "next/link";
import { cssUrl } from "../../lib/collection/browse";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { readCommanderProse } from "../../lib/prose/read";
import { dailyPick } from "../../lib/recs/daily-pick";
import { getRankedList } from "../../lib/recs/ranked-list";
import { completeness, COMPLETENESS_THRESHOLDS } from "../../lib/recs/score";
import type { SynergyState } from "../../lib/recs/synergy-state";

/** WUBRG identity pip. Colors come from brand tokens (--w --u --b --r --g). */
function ColorPip({ color }: { color: string }) {
  const c = color.toUpperCase();
  const token =
    c === "W" ? "--w"
    : c === "U" ? "--u"
    : c === "B" ? "--b"
    : c === "R" ? "--r"
    : c === "G" ? "--g"
    : "--fg-faint";
  return (
    <span
      aria-label={`Color: ${c}`}
      // §Card: WUBRG pip — 11px × 11px, border-radius 3px, border rgba(0,0,0,0.35)
      className="inline-block h-[11px] w-[11px] rounded-[3px]"
      style={{ background: `var(${token})`, border: "1px solid rgba(0,0,0,0.35)" }}
    />
  );
}

function fillColor(pct: number): string {
  // §Hero card: Progress bar fill — ≥90% success, ≥75% warning, <75% danger
  if (pct >= COMPLETENESS_THRESHOLDS.high) return "var(--success)";
  if (pct >= COMPLETENESS_THRESHOLDS.mid) return "var(--warning)";
  return "var(--danger)";
}

/**
 * The figure is missing because EDHREC's top-cards list is, so the reason it is
 * missing is the reason EDHREC gave. "absent" is settled — the commander isn't
 * indexed — while "degraded" is an outage that fixes itself, and the two must
 * not read alike. "ok" is unreachable in practice (an ok row always has counts)
 * but stays a total map so a future state can't silently render nothing.
 *
 * None of these say "deck". The bar measures how much of a *commander's*
 * top-cards list the collection already covers, which is what the sibling
 * surfaces call it ("own 40 of top 259" on the rec card).
 */
const COMPLETENESS_FALLBACK: Record<SynergyState, string> = {
  ok: "This commander's top-cards list isn't ready yet.",
  absent: "EDHREC doesn't track this commander, so there's no top-cards list to compare.",
  degraded: "We couldn't reach EDHREC. The count returns once it's back.",
};

/** The no-art fallback the handoff specified for the art column. */
const ART_STRIPES =
  "repeating-linear-gradient(135deg, var(--surface) 0 11px, var(--surface-sunken) 11px 22px), var(--bg)";

/**
 * §Hero card: Art. The tile holds Scryfall's 63:88 instead of filling a
 * full-height strip, so the whole card reads rather than a band cropped out of
 * its middle — the crop the appshell addendum left open for Eng to take. It
 * renders at both widths too; the strip was `hidden md:block`, which left the
 * phone hero with no art at all.
 */
function ArtColumn({ imageUri }: { imageUri: string | null }) {
  return (
    <div
      className="flex flex-none items-center justify-center p-[10px] md:p-[14px]"
      style={{ background: "var(--bg)", borderRight: "1px solid var(--border-strong)" }}
      aria-hidden
    >
      <div
        data-testid="hero-art"
        className="w-[84px] rounded-[6px] md:w-[132px]"
        style={{
          aspectRatio: "63/88",
          background: imageUri ? `${cssUrl(imageUri)} center/cover` : ART_STRIPES,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}

export function HeroCommanderSkeleton() {
  return (
    <div
      // §Hero card container: bg surface, border line, border-radius 14px, overflow hidden
      className="mb-[34px] flex overflow-hidden rounded-[14px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
      aria-busy="true"
    >
      <ArtColumn imageUri={null} />
      {/* Info area skeleton */}
      <div className="flex flex-1 flex-col justify-center p-6 md:p-[26px_30px]">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-faint)",
          }}
        >
          Loading recommendations…
        </p>
      </div>
    </div>
  );
}

/**
 * Async server component — cheap once scores are persisted, expensive only on a
 * cold miss (dozens of EDHREC fetches).
 * Dashboard wraps this in <Suspense> so the surrounding shell streams first.
 * READINESS item 4: degraded flag renders an interim "synergy data offline" note.
 */
export async function HeroCommander({ userId }: { userId: string }) {
  const { items, degraded } = await getRankedList(userId);
  // Not `items[0]`. The hero turns over daily inside the top of the ranking, so the
  // one surface meant to introduce the collection is not the same card forever (#345).
  const top = dailyPick(items, userId, new Date());

  if (!top) {
    // No candidates — dedicated empty surface lives at /commanders.
    // Hero on Home just falls back to a quiet placeholder.
    return (
      <div
        className="mb-[34px] rounded-[14px] p-[26px_30px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--fg-faint)",
          }}
        >
          No commander candidates yet.
        </p>
      </div>
    );
  }

  const pct = completeness(top);
  const prose = await readCommanderProse(top.oracleId);

  return (
    <div
      // §Hero card container: display flex, bg surface, border line, border-radius 14px, overflow hidden, mb 34px
      // Border and background are classes, not inline style, so the hover state can
      // reach them — the card became clickable and had no hover feedback at all.
      // Hover values match commanders/rec-card.tsx.
      className="relative mb-[34px] flex overflow-hidden rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--elevated-hover)]"
    >
      {/* Stretched link — same pattern as commanders/rec-card.tsx. The hero has
          no interactive children, so nothing needs lifting above it. */}
      <Link
        href={`/commanders/${top.slug}`}
        aria-label={explainedCopy.home.cardAria(top.name)}
        className="absolute inset-0 z-[1] rounded-[14px]"
      />

      <ArtColumn imageUri={top.imageUri} />

      {/* Info area — §Hero card: Info area — flex 1, padding 26px 30px, flex-col, justify center */}
      <div className="flex flex-1 flex-col justify-center p-6 md:p-[26px_30px]">
        {/* WUBRG pips — §Card: WUBRG pip, gap 4px */}
        <div className="mb-2 flex items-center gap-[4px]">
          {top.colorIdentity.map((c) => (
            <ColorPip key={c} color={c} />
          ))}
        </div>
        {/* Commander name — §Hero card: Commander name — Cinzel 700 28px primary */}
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
          }}
        >
          {top.name}
        </h2>

        {/* The stored sentence, clamped to two lines. The clamp is CSS only: the whole
            string stays in the DOM, so the card's accessible name and a text search both
            still reach it. At 375px this column holds roughly 58 characters a line, so
            without the clamp a sentence would push the completeness row off the card. */}
        {prose !== null && (
          <p
            className="mt-[10px] max-w-[420px] overflow-hidden"
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--fg-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {prose}
          </p>
        )}

        {degraded && (
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--warning)",
            }}
          >
            synergy data offline — ranking by pool + roles only
          </p>
        )}

        {/* Completeness row — §Hero card: Completeness row — flex, gap 10px, mt 18px, max-w 420px */}
        {pct != null ? (
          <div className="mt-[18px] flex max-w-[420px] items-center gap-[10px]">
            {/* §Hero card: Owned count — mono 13px, color success/warning/danger.
                The bare `40/259` was the figure the "most complete deck" label
                was misread against; it carries the unit the sibling rec card
                already uses ("own 40 of top 259") so it cannot be read as a
                deck's card count. */}
            <span
              className="shrink-0"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: fillColor(pct),
              }}
            >
              own {top.edhrecOwnedCount} of top {top.edhrecTotal}
            </span>
            {/* §Hero card: Progress bar track — flex 1, h 6px, bg elevated, br 3px, overflow hidden */}
            <div
              className="h-[6px] flex-1 overflow-hidden rounded-[3px]"
              style={{ background: "var(--elevated)" }}
              role="progressbar"
              aria-label={`Top cards you own for ${top.name}`}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {/* §Hero card: Progress bar fill — h 100%, br 3px, bg success/warning/danger */}
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${pct}%`, background: fillColor(pct) }}
              />
            </div>
          </div>
        ) : (
          <p
            className="mt-[18px]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-faint)",
            }}
          >
            {COMPLETENESS_FALLBACK[top.synergyState]}
          </p>
        )}
      </div>
    </div>
  );
}
