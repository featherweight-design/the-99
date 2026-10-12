"use client";
// One result (HANDOFF §4): a row, or one of the three best-fit cards. Both carry the same four
// facts: the commander (its name opens the card), its figures with the weakest lit and tagged
// SETS RANK, its own mark (free, held, or a buy), and the ownership line, which is a real fill run
// for this row. The runs are the list's (`ChooseResults`), one `trialFillRows` call per slice of
// twelve as the slice arrives, and a row draws whichever state its own run is in.
//
// TWO CONTROLS, NEVER NESTED. The row's press is a link to the create page (brief §8 Q7), drawn
// as the trailing `›` and stretched over the whole row; the name is a sibling button raised above
// that stretch, and so is *Retry*. The link carries the answers as `b`, `k`, `a`, `t` for PR 6.
//
// The ownership line's states (pending, ready, failed) share one reserved height, so no
// state moves the row. No motion anywhere (STATES invariant).

import Link from "next/link";
import type { ReactNode } from "react";

import { CardDetailTrigger } from "../cards/card-detail-provider";
import { IdentityPips } from "../commanders/commander-art";
import { BuyTag } from "../decks/buy-tag";
import { AvailabilityGlyph } from "../ui/availability-marker";
import { CommanderThumb } from "../ui/commander-thumb";
import { OwnershipDot } from "../ui/ownership-dot";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import { serializeChooseParams, type ChooseParams } from "../../lib/intake/params";
import type { Figure } from "../../lib/intake/present";
import type { CommanderMark, ResultRow } from "../../lib/intake/rows";
import type { ReasonPart } from "../../lib/intake/the-read";
import type { TrialFigures } from "../../lib/intake/trial";
import { priceFactOf } from "./price-fact";
import { PendingReporter } from "../shell/pending-reporter";

/**
 * The row's press: the create page with this commander, carrying the results screen's own params
 * beside it. None of them collides with the create page's (`commander`, `select`), and carrying
 * them whole is what lets that page both read the answers and send *Back to results* to the very
 * screen the press came from (`handOffFrom`).
 */
export function handOffHref(oracleId: string, p: ChooseParams): string {
  const rest = serializeChooseParams({ ...p, results: true }).slice(1);
  return `/decks/new?${new URLSearchParams({ commander: oracleId }).toString()}&${rest}`;
}

/** About a whole-dollar figure: the fill is an estimate, and cents would claim otherwise. */
const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

export type Trial =
  | { state: "pending" }
  | { state: "ready"; figures: TrialFigures }
  | { state: "failed" };

export function ChooseRow({
  row,
  figures,
  owned,
  params,
  cardName,
  cardUnpriced = false,
  best,
  trial,
  retry,
  deckNames = {},
}: {
  row: ResultRow;
  figures: readonly Figure[];
  /** The owned order: its figure is a count, not a share. */
  owned: boolean;
  params: ChooseParams;
  cardName: string | null;
  /** The card's chip reads it unpriced: said on a row still counting or failed, as on a ready one. */
  cardUnpriced?: boolean;
  /** A best-fit card, with its rank. */
  best?: number;
  /** This row's ownership figures, counted by the list a slice at a time. */
  trial: Trial;
  retry: () => void;
  /** A deck commander's oracle id to the short name a reason draws it by (`shortName`). */
  deckNames?: Readonly<Record<string, string>>;
}) {
  const href = handOffHref(row.oracleId, params);
  // A reason naming a deck that no longer resolves (deleted since) is drawn not at all: dropping only
  // the name would leave a sentence with a hole in it ("Unlike , it ...").
  const whole = row.reason?.every((part) => "text" in part || deckNames[part.deck] !== undefined) ?? false;
  const reason = row.reason && row.reason.length > 0 && whole ? <Reason parts={row.reason} deckNames={deckNames} /> : null;
  const own = (
    <OwnershipLine
      mark={row.mark}
      trial={trial}
      retry={retry}
      budgetDollars={params.budgetDollars}
      ownOnly={params.pool === "own"}
      cardName={cardName}
      cardUnpriced={cardUnpriced}
      best={best !== undefined}
    />
  );
  const name = (size: string, rank?: number) => (
    <div className="flex items-center gap-[8px] min-w-0">
      {/* F11: on a phone a best fit's rank leaves the art and leads the name line. */}
      {rank !== undefined && (
        <span
          data-testid="best-rank-phone"
          className="md:hidden flex-none flex items-center justify-center w-[20px] h-[20px] rounded-full font-mono text-[10.5px] font-semibold text-[color:var(--accent)] border border-solid border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)]"
        >
          {rank}
        </span>
      )}
      <CardDetailTrigger
        oracleId={row.oracleId}
        name={row.name}
        testId="row-name"
        className={`relative z-[1] min-w-0 truncate text-left font-display font-semibold ${size} text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--accent)] underline-offset-[3px] cursor-pointer`}
      >
        {row.name}
      </CardDetailTrigger>
      <span className="md:hidden"><IdentityPips colorIdentity={row.colorIdentity} size={9} gap={4} /></span>
      <span className="hidden md:inline-flex"><IdentityPips colorIdentity={row.colorIdentity} size={11} gap={4} /></span>
      {/* The set it was printed in, of those asked (addendum §2), titled with the set's name. */}
      {row.set && (
        <span
          data-testid="row-set"
          title={row.set.name}
          className="flex-none font-mono text-[9.5px] leading-none px-[4px] py-[2px] rounded-[4px] border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
        >
          <span className="sr-only">{copy.results.printedIn(row.set.name)}</span>
          <span aria-hidden>{row.set.code.toUpperCase()}</span>
        </span>
      )}
    </div>
  );
  const press = (children: ReactNode, className: string) => (
    <Link
      href={href}
      aria-label={copy.results.handOff(row.name)}
      data-testid="row-hand-off"
      // Stretched over the whole result: the result's own box is the press target.
      className={`${className} no-underline after:absolute after:inset-0 after:content-['']`}
    >
      {children}
      <PendingReporter href={href} />
    </Link>
  );

  if (best !== undefined) {
    return (
      <li
        data-testid="best-fit"
        className="relative flex flex-row md:flex-col overflow-hidden rounded-[12px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_30%,var(--border))] bg-[color:var(--surface-rail)]"
      >
        <div
          aria-hidden
          // F11: the art crop's own ratio on desktop, so the commander is never cut off.
          className="relative shrink-0 w-[88px] md:w-full md:aspect-[626/457] border-0 border-r border-r-[color:var(--border)] md:border-r-0 md:border-b md:border-b-[color:var(--border)] border-solid border-[color:var(--border)] bg-[color:var(--elevated)] bg-cover bg-center"
          // The crop, or the card's own image where the catalog has no crop, as the row's thumb does:
          // a best fit is never a blank block.
          style={row.artCropUri ?? row.imageUri ? { backgroundImage: `url(${row.artCropUri ?? row.imageUri})` } : undefined}
        >
          <span data-testid="best-rank" className="absolute left-[10px] top-[10px] hidden md:flex items-center justify-center w-[26px] h-[26px] rounded-full font-mono text-[12px] font-semibold text-[color:var(--accent)] bg-[color:var(--bg)] border border-solid border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)]">
            {best}
          </span>
        </div>
        <div className="flex flex-col gap-[9px] min-w-0 flex-1 p-[11px_12px] md:p-[14px_15px_15px]">
          {name("text-[14.5px] md:text-[17px]", best)}
          {reason}
          <Figures figures={figures} owned={owned} best />
          <hr className="m-0 border-0 border-t border-solid border-[color:var(--border)]" />
          {own}
        </div>
        {press(null, "absolute inset-0")}
      </li>
    );
  }

  return (
    <li
      data-testid="result-row"
      className={[
        "relative grid items-center rounded-[10px] md:rounded-[11px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)]",
        "grid-cols-[40px_minmax(0,1fr)_14px] gap-x-[11px] gap-y-[5px] p-[10px_12px] min-h-[44px]",
        "md:grid-cols-[40px_minmax(0,1fr)_340px_14px] md:gap-x-[16px] md:gap-y-[7px] md:p-[12px_15px]",
      ].join(" ")}
    >
      {/* With a reason (the read's picks), it takes the line under the name: before the figure on
          a phone, before the ownership line on desktop. Every class is spelled out for Tailwind. */}
      <div className={`col-start-1 row-start-1 self-center ${reason ? "row-span-4 md:row-span-3" : "row-span-3 md:row-span-2"}`}>
        <CommanderThumb imageUri={row.imageUri} colorIdentity={row.colorIdentity} size="result" />
      </div>
      <div className="col-start-2 row-start-1 min-w-0">{name("text-[14px] md:text-[16px]")}</div>
      {reason && <div className="col-start-2 row-start-2 min-w-0">{reason}</div>}
      <div className={`col-start-2 md:col-start-3 md:row-start-1 self-center min-w-0 ${reason ? "row-start-3 md:row-span-3" : "row-start-2 md:row-span-2"}`}>
        <Figures figures={figures} owned={owned} />
      </div>
      <div className={`col-start-2 min-w-0 ${reason ? "row-start-4 md:row-start-3" : "row-start-3 md:row-start-2"}`}>{own}</div>
      {press(
        <span aria-hidden>›</span>,
        `col-start-3 row-start-1 md:col-start-4 self-center text-[18px] text-[color:var(--fg-faint)] ${reason ? "row-span-4 md:row-span-3" : "row-span-3 md:row-span-2"}`,
      )}
    </li>
  );
}

/**
 * The read's line on why this commander (handoff "The reason line"): never truncated, wrapped
 * pretty, and a deck the read names drawn by its commander's short name, which the app supplies
 * from the id the read returned. Every deck it names resolves: the row draws no line otherwise.
 */
function Reason({ parts, deckNames }: { parts: readonly ReasonPart[]; deckNames: Readonly<Record<string, string>> }) {
  return (
    <p data-testid="row-reason" className="m-0 text-[12.5px] md:text-[13px] leading-[1.5] [text-wrap:pretty] text-[color:var(--fg-body)]">
      {parts.map((part, i) =>
        "text" in part ? (
          <span key={i}>{part.text}</span>
        ) : (
          <span key={i} data-testid="reason-deck" className="font-semibold text-[color:var(--fg)]">{deckNames[part.deck]}</span>
        ),
      )}
    </p>
  );
}

function Figures({ figures, owned, best = false }: { figures: readonly Figure[]; owned: boolean; best?: boolean }) {
  return (
    <ul className={`m-0 p-0 list-none flex flex-col ${best ? "gap-[4px]" : "gap-[2px] md:gap-[5px]"}`}>
      {figures.map((f) => (
        <li
          key={f.text}
          data-testid="figure"
          data-sets-rank={f.setsRank || undefined}
          className={`flex items-baseline ${best ? "gap-[7px]" : "gap-[8px]"} font-mono md:font-sans text-[10.5px] leading-[1.45] md:leading-normal md:text-[12.5px]`}
        >
          <span
            className={[
              "font-mono font-semibold md:text-right",
              best ? "md:text-[15px] text-[13px]" : "md:text-[14px]",
              owned ? "md:min-w-[34px]" : "md:min-w-[38px]",
              f.dim ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]",
            ].join(" ")}
          >
            {owned ? f.pct : `${f.pct}%`}
          </span>
          <span className={`min-w-0 ${best ? "md:text-[12.5px] text-[12px]" : ""} ${f.dim ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg-body)]"}`}>
            {f.text}
            {f.setsRank && (
              <span className={`ml-[6px] font-mono text-[8.5px] ${best ? "" : "md:text-[9px]"} tracking-[.12em] text-[color:var(--accent)] whitespace-nowrap`}>
                {copy.results.setsRank}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Mark({ mark }: { mark: CommanderMark }) {
  switch (mark.kind) {
    case "free":
      return (
        <span data-testid="mark-free" className="inline-flex items-center gap-[6px] text-[color:var(--fg-body)]">
          <OwnershipDot owned size={6} />
          {copy.results.free}
        </span>
      );
    case "held":
      return (
        <span data-testid="mark-held" className="inline-flex items-center gap-[6px] text-[color:var(--avail-hard-fg)]">
          <AvailabilityGlyph state="hard" seam="var(--surface-rail)" />
          {copy.results.held(mark.deck)}
        </span>
      );
    case "buy":
      return (
        <span data-testid="mark-buy" className="inline-flex">
          <BuyTag variant="row" {...priceFactOf(mark.price)} />
        </span>
      );
  }
}

/** One unbreakable piece of the ownership line, led by its separator (see `OwnershipLine`). */
function Segment({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap">
      <span aria-hidden data-sep className="w-[14px] shrink-0 text-center text-[color:var(--border-strong)]">·</span>
      {children}
    </span>
  );
}

function OwnershipLine({
  mark,
  trial,
  retry,
  budgetDollars,
  ownOnly = false,
  cardName,
  cardUnpriced,
  best,
}: {
  mark: CommanderMark;
  trial: Trial;
  retry: () => void;
  budgetDollars: number | null;
  /** Only cards I own (three answers §3): the commander is marked apart from the 99. */
  ownOnly?: boolean;
  cardName: string | null;
  cardUnpriced: boolean;
  best: boolean;
}) {
  const ready = trial.state === "ready" ? trial.figures : null;
  // A ready row's own count decides; until then the card's chip does, so for a card the fill buys
  // (unowned, or every copy held: `buysCard`) the line is there from the first paint.
  const unpriced = ready ? ready.unpricedCard !== null : cardUnpriced;
  const capCents = budgetDollars === null ? null : budgetDollars * 100;
  return (
    <div className="flex flex-col gap-[3px]">
      {/* Every segment carries its own leading separator, and the row is pulled left by one
          separator's width inside a box that clips it: the separator of whichever segment starts a
          line falls in the clipped gutter. So no separator is ever the first box on a line, and none
          can be the last, since each one leads its own unbreakable segment. */}
      <div
        data-testid="ownership-line"
        data-trial={trial.state}
        className="overflow-x-clip min-h-[18px] font-mono text-[10px] md:text-[11px] text-[color:var(--fg-muted)]"
      >
        <div className="flex flex-wrap items-center gap-y-[3px] -ml-[14px]">
          <Segment>
            {ownOnly && (
              <span className="mr-[6px] text-[9.5px] uppercase tracking-[.08em] text-[color:var(--fg-locked)]">{copy.results.rowCommander}</span>
            )}
            <Mark mark={mark} />
          </Segment>
          {ready && ownOnly ? (
            // The fill buys nothing here, so no figure to buy: where the 99 comes from, and how much of
            // its usual 99 (the ordinary fill's, `trialFill`) the player already owns.
            <>
              <Segment>{copy.results.rowOwn}</Segment>
              <Segment>{copy.results.rowUsual(ready.owned)}</Segment>
            </>
          ) : ready ? (
            <>
              <Segment>{copy.results.ownCount(ready.owned)}</Segment>
              <Segment>
                {copy.results.ownBuy(
                  dollars(ready.buyCents),
                  capCents !== null && ready.buyCents <= capCents ? `$${budgetDollars!.toLocaleString("en-US")}` : undefined,
                )}
              </Segment>
            </>
          ) : trial.state === "failed" ? (
            <Segment>
              <span role="status" className="inline-flex items-center gap-[7px] text-[10.5px] text-[color:var(--fg-muted)]">
                {copy.results.rowFailed}
                <button
                  type="button"
                  onClick={retry}
                  className="relative z-[1] font-mono text-[10.5px] p-0 bg-transparent border-0 cursor-pointer text-[color:var(--accent)] underline decoration-[color:var(--accent)] underline-offset-[2px]"
                >
                  {copy.results.retry}
                </button>
              </span>
            </Segment>
          ) : (
            <Segment>
              <span aria-busy="true" className="inline-flex items-center gap-[9px] text-[10.5px] text-[color:var(--fg-faint)]">
                <span aria-hidden className={`block h-[8px] rounded-[4px] bg-[color:var(--elevated)] ${best ? "w-[90px]" : "w-[120px]"}`} />
                {copy.results.rowPending}
              </span>
            </Segment>
          )}
        </div>
      </div>
      {unpriced && cardName && (
        <p data-testid="row-unpriced" className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {copy.results.unpriced(cardName)}
        </p>
      )}
    </div>
  );
}
