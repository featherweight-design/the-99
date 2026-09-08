// The owned lane's row (§Recommendation Card, §Fit Bar, §Role Chips, §Synergy Line,
// §Receipts Preview, §Per-Commander Degraded Note).
// Desktop: grid 24px 1fr 206px 32px (rank · evidence · fit · action).
// Mobile: two bands with the fit figure on band one's trailing edge.
// The art is no longer a thumbnail in a column of its own: it bleeds in from the
// leading edge behind the whole row, so there is no card fill and no border —
// rows are separated by a divider and told apart by the wash behind them.
// Whole row links to /commanders/${slug}.

import Link from "next/link";
import { fitSegments } from "../../lib/recs/format";
import { retryRecs } from "../../app/commanders/actions";
import { CommanderBleed, IdentityPips } from "./commander-art";
import { DiscoveryRow } from "./discovery-row";
import { FitBar } from "./fit-bar";
import { RetryLink } from "./retry-submit";
import { commanderDetailHref } from "./list-nav";
import { ReceiptLine } from "./receipt-line";
import { RoleChips } from "./role-chips";
import { availabilityCopy } from "../../lib/copy/availability";
import { commandersCopy } from "../../lib/copy/lanes";
import { explainedCopy } from "../../lib/copy/commander-explained";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import type { CommanderListItem } from "../../lib/recs/recommend";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws without DATABASE_URL and
// pulls the neon driver in with it. A type-only clause is erased at compile
// time, so none of that reaches the client bundle.
import type { DiscoveryItem } from "../../lib/discovery/list";

export type ScoreDelta = { drop: number; was: number };

type RecCardCommon = {
  rank: number;
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
      /** Which pool the owned lane is scoring against, carried into the detail
          link and the receipts. It sits on this arm alone: the discover lane has
          no availability control, so there is nothing there for it to describe. */
      avail: "all" | "free";
      /** The receipt's second clause, by severity. Counted server-side. Null when
          the availability read failed, which drops the clause rather than printing
          a zero the reader would take for a fact. It sits on this arm alone: the
          receipt is a claim about an availability pool discover does not have. */
      counts: ReceiptCounts | null;
      /**
       * How far this commander's score fell against the free pool, and what it
       * was. Null under `Everything I own`, and null where the score did not
       * move: the delta is a statement about a re-rank and has nothing to say
       * before one has happened, or when one changed nothing.
       */
      delta: ScoreDelta | null;
      discovery?: never;
      sort?: never;
    })
  | (RecCardCommon & {
      discovery: DiscoveryItem;
      sort: "fit" | "new";
      delta?: null;
      commander?: never;
    });

export function RecCard(props: RecCardProps) {
  // Narrowed on the arm's own required prop: the forbidden keys are typed
  // `never`, so a call site cannot pass `discovery={undefined}` into the owned
  // arm and land here.
  if (props.commander === undefined) {
    return (
      <DiscoveryRow item={props.discovery} rank={props.rank} sort={props.sort} />
    );
  }
  const { commander: c, rank, avail, counts, delta } = props;
  const fit = fitSegments(c);
  // The score itself, not the bar's percentage. A commander whose synergy went
  // unmeasured scores 32 of 40 and fills 80% of the track, and printing the
  // fill here would show the reader an 80 on the list and a 32 on the detail
  // page for the same commander. The denominator carries the difference.
  const scoreDisplay = c.score;
  // The design draws one mono line under the figure, denominator and unit
  // together. An unmeasured commander keeps its own denominator there: `/100`
  // under a score out of 40 would be a reading nobody took.
  const fitUnit =
    c.fitSynergy !== null
      ? commandersCopy.row.fitDenominator
      : commandersCopy.row.fitDenominatorMeasurable(c.measurableTotal);
  const scoreAria = explainedCopy.score.scoreAria(c.score, c.measurableTotal);

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
    <div className="relative group transition-colors hover:bg-[color:var(--elevated-hover)]">
      {/* Stretched link keeps the whole row clickable without nesting the
          retry <form> inside an anchor (invalid HTML); the forms sit above it
          on z-[2]. Brand focus-visible outline inherited from globals.css. */}
      <Link
        href={commanderDetailHref(c.slug, avail)}
        aria-label={`${c.name} — view commander details`}
        className="absolute inset-0 z-[1]"
      />

      <CommanderBleed imageUri={c.imageUri} colorIdentity={c.colorIdentity} />

      {/* ── Mobile layout: two bands in 268px ── */}
      <div
        className="relative sm:hidden p-[12px_13px] flex flex-col gap-[9px]"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {/* Band one: rank, name and pips, fit pinned to the trailing edge. */}
        <div className="flex gap-[10px] items-start">
          <span
            className="font-mono font-[600] shrink-0"
            // minWidth, not width: a two-digit rank in a fixed box crowds the
            // name beside it. The floor still aligns the single digits, which
            // is what the fixed width was for.
            style={{
              fontSize: 17,
              color: rank === 1 ? "var(--accent)" : "var(--fg-faint)",
              minWidth: 16,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {rank}
          </span>

          <div className="flex-1 min-w-0 flex items-center gap-[6px]">
            <span
              className="font-display font-[600] truncate"
              style={{ fontSize: 14.5, color: "var(--fg)" }}
            >
              {c.name}
            </span>
            <IdentityPips colorIdentity={c.colorIdentity} />
          </div>

          {/* Fit score pinned to the trailing edge */}
          <div className="flex flex-col items-end shrink-0">
            {/* The band has no room for the long denominator beside the figure,
                so the one place it cannot be dropped is the accessible name. */}
            <span className="sr-only">{scoreAria}</span>
            <span
              className="font-mono font-[600]"
              style={{ fontSize: 20, color: "var(--fg)", lineHeight: 1 }}
              aria-hidden
            >
              {scoreDisplay}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--fg-faint)" }}
              aria-hidden
            >
              {fitUnit}
            </span>
            {delta && (
              <span
                className="font-mono"
                style={{ fontSize: 10, color: "var(--fg-muted)", marginTop: 2 }}
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
                <RetryLink fontSize={12}>Retry</RetryLink>
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

      {/* ── Desktop layout: grid 24px 1fr 206px 32px ── */}
      <div
        className="relative hidden sm:grid p-[24px_26px]"
        style={{
          gridTemplateColumns: "24px 1fr 206px 32px",
          gap: 20,
          alignItems: "stretch",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Rank column. Brass at rank 1, and the diamond below it. */}
        <div className="flex flex-col items-center justify-center gap-[7px]">
          <span
            className="font-mono font-[600]"
            style={{
              fontSize: 19,
              color: rank === 1 ? "var(--accent)" : "var(--fg-faint)",
              lineHeight: 1,
            }}
          >
            {rank}
          </span>
          {/* Diamond pip below numeral */}
          <span
            aria-hidden="true"
            className="block shrink-0"
            style={{
              width: 6,
              height: 6,
              transform: "rotate(45deg)",
              background: rank === 1 ? "var(--accent)" : "var(--border-strong)",
            }}
          />
        </div>

        {/* Evidence column */}
        <div className="flex flex-col gap-[13px]" style={{ minWidth: 0 }}>
          {/* Commander name */}
          <div className="flex items-center gap-[8px]" style={{ minWidth: 0 }}>
            <h3
              className="font-display font-[600] m-0 truncate"
              style={{ fontSize: 17, color: "var(--fg)", lineHeight: 1.1 }}
            >
              {c.name}
            </h3>
            <IdentityPips colorIdentity={c.colorIdentity} />
          </div>

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
                style={{ width: 148, height: 5, background: "var(--elevated)" }}
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
              style={{ fontSize: 10.5, color: "var(--fg-faint)", lineHeight: 1.4 }}
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
                  <RetryLink fontSize={12.5}>Retry</RetryLink>
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
          {/* The figure over its denominator, as the count stack opposite it on
              the discover lane: the unit is a line of its own, not a clause
              trailing the number. */}
          <div className="flex flex-col gap-[3px]">
            <span className="sr-only">{scoreAria}</span>
            <span
              className="font-mono font-[600]"
              style={{ fontSize: 27, color: "var(--fg)", lineHeight: 1 }}
              aria-hidden
            >
              {scoreDisplay}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--fg-faint)" }}
              aria-hidden
            >
              {fitUnit}
            </span>
          </div>

          {/* Score delta (§9). Desktop buys the longer form: the bare arrow
              says how far without saying from where. */}
          {delta && (
            <p className="m-0 font-mono" style={{ fontSize: 10.5, color: "var(--fg-muted)" }}>
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

        {/* Trailing action. `z-[2]` above the stretched link, which it shares a
            destination with: the pill names the action the whole row performs.
            Desktop only — a second link to the same place on the phone would be
            a duplicate the band has no room for and the row does not need. */}
        <div className="flex items-center justify-center">
          <Link
            href={commanderDetailHref(c.slug, avail)}
            className="relative z-[2] flex h-[32px] items-center rounded-full border border-[color:var(--border-strong)] bg-[rgba(20,17,14,0.5)] px-[12px] font-mono whitespace-nowrap text-[color:var(--fg-body)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            style={{ fontSize: 11 }}
          >
            {commandersCopy.row.action}
          </Link>
        </div>
      </div>
    </div>
  );
}
