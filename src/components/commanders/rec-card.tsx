// Recommendation Card (§Recommendation Card, §Fit Bar, §Role Chips, §Synergy Line,
// §Receipts Preview, §Per-Commander Degraded Note).
// Desktop: grid 40px 100px 1fr 236px (rank · art · evidence · fit).
// Mobile: stacked tile with Fit pinned top-right.
// Whole card links to /commanders/${slug}.

import Link from "next/link";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR, cssUrl } from "../../lib/collection/browse";
import { fitSegments } from "../../lib/recs/format";
import { retryRecs } from "../../app/commanders/actions";
import { FitBar } from "./fit-bar";
import { RoleChips } from "./role-chips";
import { availabilityCopy } from "../../lib/copy/availability";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import type { CommanderListItem } from "../../lib/recs/recommend";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws without DATABASE_URL and
// pulls the neon driver in with it. A type-only clause is erased at compile
// time, so none of that reaches the client bundle.
import type { DiscoveryItem } from "../../lib/discovery/list";

/**
 * The receipt line (§8). It ALWAYS renders, in both ranking modes; only the
 * second clause is a suffix, so row height never changes between two players
 * looking at the same commander. The canvas draws Lathril with the whole line
 * absent, but the README and the copy module both rule the line unconditional
 * and the README wins by this epic's stated precedence.
 *
 * The second clause is not derived from the two rankings. Counting it off the
 * availability map instead is what lets it render under `Everything I own`,
 * where no free ranking exists — and Design drew it that way (canvas state A,
 * "Everything I own (default)", already reads `34 of your cards fit · 12
 * already in use`).
 *
 * ONE clause, chosen by severity: §8 calls it "the second clause", singular, and
 * no canvas row draws both. Hard outranks soft for the same reason it does in
 * the deck roll-up — a card sleeved into a finished deck is the harder fact. A
 * pool holding both therefore says nothing about its soft claims; that is
 * flagged to Design rather than improvised into a third clause.
 */
function ReceiptLine({
  fits,
  counts,
  avail,
  fontSize,
}: {
  fits: number;
  counts: ReceiptCounts | null;
  avail: "all" | "free";
  fontSize: number;
}) {
  const { receipt } = availabilityCopy;
  // Glyph follows the clause: solid accent for a finished deck's claim, hollow
  // for a brew's, exactly as the marker draws them elsewhere. Decorative in both
  // cases — the words beside it already say the whole fact.
  // Null counts are unknown, not zero: the availability read failed, so the
  // clause is dropped rather than drawn as "nothing is committed", which is a
  // claim this render has no basis for.
  const clause = !counts
    ? null
    : counts.inUse > 0
      ? {
          text: receipt.inUse(counts.inUse),
          color: "var(--avail-hard-fg)",
          glyph: { background: "var(--accent)" },
        }
      : counts.wantedByBrew > 0
        ? {
            text: receipt.wantedByBrew(counts.wantedByBrew),
            color: "var(--fg-body)",
            glyph: { border: "1.5px solid var(--fg-muted)" },
          }
        : null;

  return (
    <p
      className="m-0 font-mono flex items-center gap-[6px] flex-wrap"
      style={{ fontSize, color: "var(--fg-faint)" }}
    >
      {avail === "free" ? receipt.fitFree(fits) : receipt.fit(fits)}
      {clause && (
        <>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <span
            aria-hidden="true"
            className="block shrink-0"
            style={{
              width: 6,
              height: 6,
              transform: "rotate(45deg)",
              ...clause.glyph,
            }}
          />
          <span style={{ color: clause.color }}>{clause.text}</span>
        </>
      )}
    </p>
  );
}

export type ScoreDelta = { drop: number; was: number };

type RecCardCommon = {
  rank: number;
  avail: "all" | "free";
  /** The receipt's second clause, by severity. Counted server-side. Null when
      the availability read failed, which drops the clause rather than printing
      a zero the reader would take for a fact. */
  counts: ReceiptCounts | null;
};

/**
 * A union rather than optional props: `DiscoveryItem` has no `score`, no fit
 * segments, no `synergyState` and no `receipts`, so an optional `commander`
 * would leave `fitSegments` reading `undefined`. The discriminant is the
 * presence of `commander`, which leaves every owned-scope call site unchanged.
 */
type RecCardProps =
  | (RecCardCommon & {
      commander: CommanderListItem;
      /**
       * How far this commander's score fell against the free pool, and what it
       * was. Null under `Everything I own`, and null where the score did not
       * move: the delta is a statement about a re-rank and has nothing to say
       * before one has happened, or when one changed nothing.
       */
      delta: ScoreDelta | null;
      discovery?: undefined;
      sort?: undefined;
    })
  | (RecCardCommon & {
      discovery: DiscoveryItem;
      sort: "fit" | "new";
      delta?: null;
      commander?: undefined;
    });

export function RecCard(props: RecCardProps) {
  // The discovery arm renders nothing until Phase 10 fills it in.
  if (!props.commander) return null;
  const { commander: c, rank, avail, counts, delta } = props;
  const gradient = commanderGradient(c.colorIdentity);
  const fit = fitSegments(c);
  const scoreDisplay = Math.round(fit.pct);

  // §Synergy Receipts Hidden Note / §Per-Commander Degraded Note. Split by
  // synergyState, not by a null fitSynergy: an "absent" commander is one EDHREC
  // does not index, so offering Retry there gives the user a button that can
  // never change anything.
  const perCmdDegraded = c.synergyState === "degraded";
  const perCmdAbsent = c.synergyState === "absent";

  // Receipts preview preformatted server-side (empty string = none)
  const receipts = c.receipts;

  // Synergy bar pct
  const synergyPct =
    c.edhrecOwnedCount !== null && c.edhrecTotal !== null && c.edhrecTotal > 0
      ? Math.round((c.edhrecOwnedCount / c.edhrecTotal) * 100)
      : 0;

  return (
    <div className="relative group">
      {/* Stretched link keeps the whole card clickable without nesting the
          retry <form> inside an anchor (invalid HTML); the forms sit above it
          on z-[2]. Brand focus-visible outline inherited from globals.css. */}
      <Link
        href={`/commanders/${c.slug}`}
        aria-label={`${c.name} — view commander details`}
        className="absolute inset-0 z-[1] rounded-[11px] sm:rounded-[12px]"
      />
      {/* ── Mobile layout: stacked tile ── */}
      <div
        className="sm:hidden rounded-[11px] p-[12px_13px] flex flex-col gap-[9px] transition-colors group-hover:border-[color:var(--border-strong)] group-hover:bg-[color:var(--elevated-hover)]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Mobile top row: art + name/info + fit score */}
        <div className="flex gap-[10px] items-start">
          {/* Art thumbnail — mobile 36×50px. Image when available; gradient
              is the fallback (per the pattern used across grid-view, card
              modal, builder-spine, etc.). */}
          <div
            className="shrink-0 rounded-[6px]"
            style={{
              width: 36,
              height: 50,
              background: c.imageUri ? undefined : gradient,
              backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
            }}
          />

          {/* Name + type line */}
          <div className="flex-1 min-w-0">
            {/* Rank + name row */}
            <div className="flex items-center gap-[6px]">
              <span
                className="font-display font-[800] shrink-0"
                // minWidth, not width: 16px was measured against Cinzel, and a
                // two-digit rank in a wider display face overflows a fixed box
                // into the name beside it. The floor still aligns the single
                // digits, which is what the fixed width was for.
                style={{ fontSize: 17, color: "var(--fg-faint)", minWidth: 16, textAlign: "center" }}
              >
                {rank}
              </span>
              <span
                className="font-display font-[600] truncate"
                style={{ fontSize: 14.5, color: "var(--fg)" }}
              >
                {c.name}
              </span>
            </div>
          </div>

          {/* Fit score pinned top-right */}
          <div className="flex flex-col items-center shrink-0">
            <span
              className="font-mono font-[600]"
              style={{ fontSize: 20, color: "var(--fg)", lineHeight: 1 }}
            >
              {scoreDisplay}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--fg-faint)" }}
            >
              FIT
            </span>
            {delta && (
              <span
                className="font-mono"
                style={{ fontSize: 10, color: "var(--fg-body)", marginTop: 2 }}
              >
                <span aria-hidden="true">
                  {availabilityCopy.receipt.delta(delta.drop)}
                </span>
                <span className="sr-only">
                  {availabilityCopy.receipt.deltaAria(delta.drop, delta.was)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Fit bar (mobile) */}
        <FitBar fit={fit} />

        {/* Role chips */}
        <RoleChips roleCounts={c.roleCounts} />

        {/* Receipts / synergy short (mobile) */}
        {c.edhrecOwnedCount !== null && c.edhrecTotal !== null && (
          <p className="m-0 font-mono" style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>
            own{" "}
            <strong style={{ fontWeight: 600, color: "var(--fg-body)" }}>
              {c.edhrecOwnedCount}
            </strong>{" "}
            of top {c.edhrecTotal}
          </p>
        )}

        {/* Receipt line (mobile). Outside the synergy conditional above: it is
            a claim about the player's own collection, which every commander
            has, including the ones EDHREC does not index. */}
        <ReceiptLine
          fits={c.colorPoolSize}
          counts={counts}
          avail={avail}
          fontSize={10.5}
        />

        {/* Per-commander degraded note (mobile) */}
        {perCmdDegraded && (
          <div
            className="flex items-center gap-[8px] rounded-[7px]"
            style={{
              background: "var(--elevated-hover)",
              border: "1px solid var(--border-strong)",
              borderLeft: "2px solid var(--fg-faint)",
              padding: "7px 11px",
            }}
          >
            <span style={{ color: "var(--fg-faint)", fontSize: 12 }}>⚠</span>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              Synergy data unavailable.{" "}
              <form action={retryRecs} className="inline relative z-[2]">
                <button
                  type="submit"
                  // brand focus-visible outline treatment inherited from globals.css
                  className="underline cursor-pointer bg-transparent border-0 p-0 font-[inherit] text-[color:var(--accent)]"
                  style={{ fontSize: 12 }}
                >
                  Retry
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Per-commander absent note (mobile) — settled fact, so no Retry */}
        {perCmdAbsent && (
          <div
            className="flex items-center gap-[8px] rounded-[7px]"
            style={{
              background: "var(--elevated-hover)",
              border: "1px solid var(--border-strong)",
              borderLeft: "2px solid var(--fg-faint)",
              padding: "7px 11px",
            }}
          >
            <span style={{ color: "var(--fg-faint)", fontSize: 12 }}>⚠</span>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              EDHREC doesn&apos;t track this commander, so fit comes from pool and roles alone.
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop layout: grid 40px 100px 1fr 236px ── */}
      <div
        className="hidden sm:grid rounded-[12px] p-[24px_26px] transition-colors group-hover:border-[color:var(--border-strong)] group-hover:bg-[color:var(--elevated-hover)]"
        style={{
          gridTemplateColumns: "40px 100px 1fr 236px",
          gap: 20,
          alignItems: "stretch",
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Rank column */}
        <div className="flex flex-col items-center justify-center gap-[7px]">
          <span
            className="font-display font-[800]"
            style={{ fontSize: 26, color: "var(--fg-faint)", lineHeight: 1 }}
          >
            {rank}
          </span>
          {/* Diamond pip below numeral */}
          <span
            className="block"
            style={{
              width: 6,
              height: 6,
              background: "var(--border-strong)",
              transform: "rotate(45deg)",
            }}
          />
        </div>

        {/* Art thumbnail — desktop aspect 63/88. Image when available;
            gradient is the fallback (matches grid-view / card-modal /
            builder-spine pattern). */}
        <div
          className="rounded-[8px] relative"
          style={{
            aspectRatio: "63/88",
            background: c.imageUri ? undefined : gradient,
            backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow:
              "inset 0 -30px 34px -26px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.28)",
          }}
        >
          {/* WUBRG identity pips — absolute bottom */}
          {c.colorIdentity.length > 0 && (
            <div
              className="absolute flex gap-[3px]"
              style={{ left: 6, right: 6, bottom: 6 }}
            >
              {c.colorIdentity.map((color) => (
                <span
                  key={color}
                  className="block rounded-full shrink-0"
                  style={{
                    width: 11,
                    height: 11,
                    background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Evidence column */}
        <div className="flex flex-col gap-[13px]" style={{ minWidth: 0 }}>
          {/* Commander name */}
          <h3
            className="font-display font-[600] m-0"
            style={{ fontSize: 20, color: "var(--fg)", lineHeight: 1.1 }}
          >
            {c.name}
          </h3>

          {/* Role chips */}
          <RoleChips roleCounts={c.roleCounts} />

          {/* Synergy line (desktop, when synergy available) */}
          {c.edhrecOwnedCount !== null && c.edhrecTotal !== null && (
            <div className="flex items-center gap-[10px]">
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--fg-faint)",
                }}
              >
                Synergy
              </span>
              {/* Overlap bar track */}
              <div
                className="overflow-hidden rounded-full"
                style={{ width: 120, height: 6, background: "var(--elevated)" }}
              >
                <div
                  className="h-full"
                  style={{ width: `${synergyPct}%`, background: "var(--accent)" }}
                />
              </div>
              {/* "own N of top M" text */}
              <span className="font-mono" style={{ fontSize: 12, color: "var(--fg-body)" }}>
                own{" "}
                <strong style={{ fontWeight: 600, color: "var(--fg)" }}>
                  {c.edhrecOwnedCount}
                </strong>{" "}
                of top {c.edhrecTotal}
              </span>
            </div>
          )}

          {/* Receipt line (desktop) */}
          <ReceiptLine
            fits={c.colorPoolSize}
            counts={counts}
            avail={avail}
            fontSize={12.5}
          />

          {/* Receipts preview (desktop) */}
          {receipts && (
            <p
              className="m-0 font-mono overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ fontSize: 11, color: "var(--fg-locked)", lineHeight: 1.4 }}
            >
              <span style={{ color: "var(--fg-faint)" }}>receipts:</span>{" "}
              {receipts}
            </p>
          )}

          {/* Per-commander degraded note (desktop) */}
          {perCmdDegraded && (
            <div
              className="flex items-center gap-[9px] rounded-[7px]"
              style={{
                background: "var(--elevated-hover)",
                border: "1px solid var(--border-strong)",
                borderLeft: "2px solid var(--fg-faint)",
                padding: "9px 13px",
              }}
            >
              <span style={{ color: "var(--fg-faint)", fontSize: 13 }}>⚠</span>
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
                <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>
                  Synergy data unavailable
                </strong>{" "}
                for this commander.{" "}
                <form action={retryRecs} className="inline relative z-[2]">
                  <button
                    type="submit"
                    // brand focus-visible outline treatment inherited from globals.css
                    className="underline cursor-pointer bg-transparent border-0 p-0 font-[inherit] text-[color:var(--accent)]"
                    style={{ fontSize: 12.5 }}
                  >
                    Retry
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Per-commander absent note (desktop) — settled fact, so no Retry */}
          {perCmdAbsent && (
            <div
              className="flex items-center gap-[9px] rounded-[7px]"
              style={{
                background: "var(--elevated-hover)",
                border: "1px solid var(--border-strong)",
                borderLeft: "2px solid var(--fg-faint)",
                padding: "9px 13px",
              }}
            >
              <span style={{ color: "var(--fg-faint)", fontSize: 13 }}>⚠</span>
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
                <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>
                  No synergy data
                </strong>{" "}
                — EDHREC doesn&apos;t track this commander, so fit comes from pool
                and roles alone.
              </div>
            </div>
          )}
        </div>

        {/* Fit column */}
        <div
          className="flex flex-col justify-center gap-[10px]"
          style={{ borderLeft: "1px solid var(--border)", paddingLeft: 20 }}
        >
          {/* Score + /100 + Fit label row */}
          <div className="flex items-baseline gap-[6px]">
            <span
              className="font-mono font-[600]"
              style={{ fontSize: 34, color: "var(--fg)", lineHeight: 1 }}
            >
              {scoreDisplay}
            </span>
            <span className="font-mono" style={{ fontSize: 13, color: "var(--fg-faint)" }}>
              /100
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
                marginLeft: 2,
              }}
            >
              Fit
            </span>
          </div>

          {/* Score delta (§9). Desktop buys the longer form: the bare arrow
              says how far without saying from where. */}
          {delta && (
            <p className="m-0 font-mono" style={{ fontSize: 12, color: "var(--fg-body)" }}>
              <span aria-hidden="true">
                {availabilityCopy.receipt.deltaFrom(delta.drop, delta.was)}
              </span>
              <span className="sr-only">
                {availabilityCopy.receipt.deltaAria(delta.drop, delta.was)}
              </span>
            </p>
          )}

          {/* Fit bar with legend */}
          <FitBar fit={fit} legend />
        </div>
      </div>
    </div>
  );
}
