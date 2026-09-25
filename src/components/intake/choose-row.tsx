"use client";
// One result (HANDOFF §4): a row, or one of the three best-fit cards. Both carry the same four
// facts: the commander (its name opens the card), its figures with the weakest lit and tagged
// SETS RANK, its own mark (free, held, or a buy), and the ownership line, which is a real fill run
// for this row alone once it is on screen (`trialFillRow`).
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
import type { ChooseParams } from "../../lib/intake/params";
import type { Figure } from "../../lib/intake/present";
import type { CommanderMark, ResultRow } from "../../lib/intake/rows";
import type { TrialFigures } from "../../lib/intake/trial";
import { priceFactOf } from "./price-fact";

/** The row's press: the create page with this commander, and the answers PR 6 will read. */
export function handOffHref(oracleId: string, p: ChooseParams): string {
  const sp = new URLSearchParams({ commander: oracleId });
  if (p.budgetDollars !== null) sp.set("b", String(p.budgetDollars));
  if (p.bracket !== null) sp.set("k", String(p.bracket));
  if (p.card) sp.set("a", p.card);
  if (p.themes.length > 0) sp.set("t", p.themes.join(","));
  return `/decks/new?${sp.toString()}`;
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
  best,
  trial,
  retry,
}: {
  row: ResultRow;
  figures: readonly Figure[];
  /** The owned order: its figure is a count, not a share. */
  owned: boolean;
  params: ChooseParams;
  cardName: string | null;
  /** A best-fit card, with its rank. */
  best?: number;
  /** This row's ownership figures, counted by the list a slice at a time. */
  trial: Trial;
  retry: () => void;
}) {
  const href = handOffHref(row.oracleId, params);
  const own = (
    <OwnershipLine
      mark={row.mark}
      trial={trial}
      retry={retry}
      budgetDollars={params.budgetDollars}
      cardName={cardName}
      best={best !== undefined}
    />
  );
  const name = (size: string) => (
    <div className="flex items-center gap-[8px] min-w-0">
      <CardDetailTrigger
        oracleId={row.oracleId}
        name={row.name}
        testId="row-name"
        className={`relative z-[1] min-w-0 truncate text-left font-display font-semibold ${size} text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--accent)] underline-offset-[3px] cursor-pointer`}
      >
        {row.name}
      </CardDetailTrigger>
      <span className="md:hidden"><IdentityPips colorIdentity={row.colorIdentity} size={9} /></span>
      <span className="hidden md:inline-flex"><IdentityPips colorIdentity={row.colorIdentity} size={11} /></span>
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
          className="relative shrink-0 w-[88px] md:w-full md:h-[132px] border-0 border-r md:border-r-0 md:border-b border-solid border-[color:var(--border)] bg-[color:var(--elevated)] bg-cover bg-center"
          style={row.artCropUri ? { backgroundImage: `url(${row.artCropUri})` } : undefined}
        >
          <span className="absolute left-[10px] top-[10px] flex items-center justify-center w-[26px] h-[26px] rounded-full font-mono text-[12px] font-semibold text-[color:var(--accent)] bg-[color:var(--bg)] border border-solid border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)]">
            {best}
          </span>
        </div>
        <div className="flex flex-col gap-[9px] min-w-0 flex-1 p-[11px_12px] md:p-[14px_15px_15px]">
          {name("text-[14.5px] md:text-[17px]")}
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
        "grid-cols-[44px_minmax(0,1fr)_14px] gap-x-[11px] gap-y-[5px] p-[10px_12px] min-h-[44px]",
        "md:grid-cols-[44px_minmax(0,1fr)_340px_14px] md:gap-x-[16px] md:gap-y-[7px] md:p-[12px_15px]",
      ].join(" ")}
    >
      <div className="col-start-1 row-start-1 row-span-3 md:row-span-2 self-center">
        <CommanderThumb imageUri={row.imageUri} colorIdentity={row.colorIdentity} />
      </div>
      <div className="col-start-2 row-start-1 min-w-0">{name("text-[14px] md:text-[16px]")}</div>
      <div className="col-start-2 row-start-2 md:col-start-3 md:row-start-1 md:row-span-2 self-center min-w-0">
        <Figures figures={figures} owned={owned} />
      </div>
      <div className="col-start-2 row-start-3 md:row-start-2 min-w-0">{own}</div>
      {press(
        <span aria-hidden>›</span>,
        "col-start-3 row-start-1 row-span-3 md:col-start-4 md:row-span-2 self-center text-[18px] text-[color:var(--fg-faint)]",
      )}
    </li>
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
  cardName,
  best,
}: {
  mark: CommanderMark;
  trial: Trial;
  retry: () => void;
  budgetDollars: number | null;
  cardName: string | null;
  best: boolean;
}) {
  const ready = trial.state === "ready" ? trial.figures : null;
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
          <Segment><Mark mark={mark} /></Segment>
          {ready ? (
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
      {ready?.unpricedCard && cardName && (
        <p data-testid="row-unpriced" className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {copy.results.unpriced(cardName)}
        </p>
      )}
    </div>
  );
}
