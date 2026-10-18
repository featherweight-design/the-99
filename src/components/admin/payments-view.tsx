import Link from "next/link";
import { monthParam, shiftMonth, usd, type MonthKey } from "../../lib/admin/costs-rule";
import { adminCopy } from "../../lib/copy/admin";
import { money } from "../../lib/payments/admin-read-rule";
import type { PaymentsMonth } from "../../lib/payments/admin-read";
import { PendingReporter } from "../shell/pending-reporter";
import { SectionHead, Table } from "./costs-detail";
import { GiftForm, type PickAccount } from "./gift-form";

// The Payments tab (admin plan A2b, A-R4, A-R6). No new layout: the Costs page's month bar and tiles, its table (a grid
// on desktop, a card per row on the phone), the group editor's member rows for the account, and the invites top-up's
// number field and pending bar for the grant.

const copy = adminCopy.payments;
const fmt = (m: MonthKey, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(m.year, m.month, 1)));
const monthLong = (m: MonthKey) => fmt(m, { month: "long", year: "numeric" });
const hrefFor = (m: MonthKey, current: MonthKey) =>
  m.year === current.year && m.month === current.month ? "/admin/payments" : `/admin/payments?month=${monthParam(m)}`;
const day = (d: Date) => new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
const TILE = "flex min-w-0 flex-col gap-[4px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] py-[11px] md:px-[14px] md:py-[13px]";
const EMPTY = "m-0 rounded-[12px] border border-dashed border-[color:var(--border-dashed)] px-[14px] py-[14px] text-[13px] text-[color:var(--fg-muted)]";

export function PaymentsView({
  month,
  current,
  payments,
  spendMicro,
  names,
  accounts,
  clerk,
}: {
  month: MonthKey;
  current: MonthKey;
  payments: PaymentsMonth;
  /** This environment's model spend for the month, the Costs page's own figure. */
  spendMicro: number;
  /** The masked name of each account id the page draws (`namesFor`). */
  names: Readonly<Record<string, string>>;
  accounts: readonly PickAccount[];
  clerk: "ok" | "down";
}) {
  const isCurrent = month.year === current.year && month.month === current.month;
  const prevHref = hrefFor(shiftMonth(month, -1), current);
  const nextHref = hrefFor(shiftMonth(month, 1), current);
  const nameOf = (id: string) => names[id] ?? id;
  // USD first (the Prices are in USD); any other currency is its own set of tiles, never added in.
  const [main, ...others] = payments.revenue;
  const usdRow = main && main.currency.toLowerCase() === "usd" ? main : null;
  const rest = usdRow ? others : payments.revenue;
  const tilesFor = (r: PaymentsMonth["revenue"][number] | null, currency: string) => [
    { label: copy.tiles.gross, fig: money(r?.grossCents ?? 0, currency), sub: [copy.tileSub.payments(r?.payments ?? 0), r?.unattributed ? copy.tileSub.unattributed(r.unattributed) : null].filter(Boolean).join(" · ") },
    { label: copy.tiles.tax, fig: money(r?.taxCents ?? 0, currency), sub: copy.tileSub.tax },
    { label: copy.tiles.net, fig: money(r?.netCents ?? 0, currency), sub: copy.tileSub.net },
  ];
  const tiles = [...tilesFor(usdRow, "usd"), { label: copy.tiles.spend, fig: usd(spendMicro), sub: copy.tileSub.spend }];

  return (
    <>
      <div className="sticky top-[calc(var(--header-offset,0px)+var(--admin-head-h,0px))] z-[1] flex flex-none items-center gap-[10px] border-0 border-solid border-[color:var(--border)] [border-bottom-width:1px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[14px] md:px-[28px] md:pb-[14px] md:pt-[18px]">
        <Link href={prevHref} aria-label={adminCopy.costs.period.previous} className="px-[6px] text-[18px] text-[color:var(--fg-muted)]">
          ‹<PendingReporter href={prevHref} />
        </Link>
        <span data-testid="payments-month" className="font-display text-[19px] text-[color:var(--fg)]">{monthLong(month)}</span>
        {isCurrent ? (
          <span aria-hidden className="px-[6px] text-[18px] text-[color:var(--fg-disabled)]">›</span>
        ) : (
          <Link href={nextHref} aria-label={adminCopy.costs.period.next} className="px-[6px] text-[18px] text-[color:var(--fg-muted)]">
            ›<PendingReporter href={nextHref} />
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-[22px] px-[16px] pb-[28px] pt-[16px] md:px-[28px] md:pb-[40px] md:pt-[22px]">
        <div className="flex flex-col gap-[8px]">
          <div data-testid="payments-tiles" className="grid grid-cols-2 gap-[8px] md:grid-cols-4 md:gap-[12px]">
            {tiles.map((t) => (
              <div key={t.label} className={TILE}>
                <span className="text-[12px] text-[color:var(--fg-muted)]">{t.label}</span>
                <span className="whitespace-nowrap font-mono text-[19px] font-medium text-[color:var(--fg)] md:text-[22px]">{t.fig}</span>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{t.sub}</span>
              </div>
            ))}
          </div>
          {payments.revenue.length === 0 && <p className="m-0 text-[12.5px] text-[color:var(--fg-muted)]">{copy.noPayments}</p>}
          {rest.map((r) => (
            <div key={r.currency} className="flex flex-col gap-[6px]">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{copy.otherCurrency(r.currency)}</span>
              <div className="grid grid-cols-2 gap-[8px] md:grid-cols-4 md:gap-[12px]">
                {tilesFor(r, r.currency).map((t) => (
                  <div key={t.label} className={TILE}>
                    <span className="text-[12px] text-[color:var(--fg-muted)]">{t.label}</span>
                    <span className="whitespace-nowrap font-mono text-[19px] font-medium text-[color:var(--fg)] md:text-[22px]">{t.fig}</span>
                    <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{t.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <GiftForm accounts={accounts} clerkDown={clerk === "down"} />

        <section className="flex flex-col gap-[10px]">
          <SectionHead title={copy.grantsHead} meta={copy.grantsMeta(payments.grants.length, payments.grantsTotal)} />
          {payments.grants.length === 0 ? (
            <p className={EMPTY}>{copy.noGrants}</p>
          ) : (
            <Table
              label={copy.grantsHead}
              head={[copy.grantsCols.account, copy.grantsCols.source, copy.grantsCols.units, copy.grantsCols.when]}
              right={[2]}
              grid="minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,0.8fr) minmax(0,0.8fr)"
              rows={payments.grants.map((g) => {
                const units = g.revokedUnits > 0 ? `${g.units} · ${copy.revoked(g.revokedUnits)}` : String(g.units);
                return {
                  cells: [nameOf(g.userId), copy.sources[g.source], units, day(g.createdAt)],
                  title: nameOf(g.userId),
                  fig: units,
                  meta: `${copy.sources[g.source]} · ${day(g.createdAt)}`,
                };
              })}
            />
          )}
        </section>

        <section className="flex flex-col gap-[10px]">
          <SectionHead title={copy.giftsHead} />
          {payments.gifts.length === 0 ? (
            <p className={EMPTY}>{copy.noGifts}</p>
          ) : (
            <ul data-testid="payments-gifts" className="m-0 flex list-none flex-col p-0">
              {payments.gifts.map((g, i) => (
                <li key={i} className="flex flex-col gap-[2px] border-0 border-t border-solid border-[color:var(--border)] py-[10px] first:border-t-0">
                  <span className="text-[13.5px] text-[color:var(--fg-body)]">{copy.giftLine(nameOf(g.actorId), nameOf(g.userId), g.units)}</span>
                  <span className="text-pretty text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">“{g.note}”</span>
                  <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{day(g.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
