"use client";
// Top off on the under deck: the ranked pool from the player's own cards, ticked and set aside by hand. The frame and the rows
// are the signed-in drawing (`TopOffFrame`, `CandidateRowView`), fed the fixture's first `TOP_OFF_OPENABLE` candidates (`drawnPool`: the ones whose card details ship); what the signed-in list keeps (the
// read, the actions, the announcements) is not here. A tap ticks, a decline sets aside and Restore puts back, all in this
// component's own state. The bulk pair is drawn with the signed-in strings and its presses only set those ticks: the two
// plans are the ones the fixture's read stored (`DemoTopOff.bulk`), applied by `demoBulk` as the list applies the server's.
// The commit press adds nothing anywhere.

import { useId, useState } from "react";

import { CardDetailTrigger } from "../../cards/card-detail-context";
import { TopOffFrame } from "../../decks/top-off-frame";
import { CandidateRowView, DeclinedRow } from "../../decks/top-off-rows";
import { useIsDesktop } from "../../ui/use-is-desktop";
import { topOffCopy } from "../../../lib/copy/top-off";
import { formatCents, summarisePrices } from "../../../lib/decks/price";
import type { DemoTopOff } from "../../../lib/demo/project-decks";
import { declineRow, demoBulk, drawnPool, liveTicks, toggleTick } from "./demo-top-off-state";

const noop = () => {};

export function DemoTopOffList({ topOff }: { topOff: DemoTopOff }) {
  const listId = useId();
  const capLineId = `${listId}-cap`;
  const isDesktop = useIsDesktop();
  const { candidates, openSlots, bodySize, newestAsOf, declaredBracket, noteCounts, bulk: plans } = topOff;
  const pool = drawnPool(candidates);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const [declined, setDeclined] = useState<ReadonlySet<string>>(() => new Set());
  const live = liveTicks(pool.map((c) => c.oracleId), ticked, declined, openSlots);
  const tickedCount = live.size;
  const atCap = tickedCount >= openSlots;
  const declinedHere = pool.filter((c) => declined.has(c.oracleId)).length;
  const allDeclined = pool.length > 0 && declinedHere === pool.length;
  const ownedCount = pool.filter((c) => c.owned && !declined.has(c.oracleId)).length;
  const buying = pool.filter((c) => live.has(c.oracleId) && !c.owned);
  const buyMoney = summarisePrices(buying.map((c) => ({ quantity: 1, price: c.price })), newestAsOf);
  const bulkPair = demoBulk({ pool, plans, declined, tickedCount, atCap, newestAsOf });
  const siblings = pool.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri }));
  const emptyNote =
    tickedCount !== 0
      ? null
      : allDeclined
        ? topOffCopy.commit.nothingTickedAllDeclined(String(pool.length))
        : ownedCount === 0
          ? topOffCopy.commit.nothingTickedUnowned(String(pool.length))
          : topOffCopy.commit.nothingTicked;

  return (
    // A transformed box is the containing block of the commit bar's `fixed` phone position, so the bar pins to the foot of this
    // box rather than to the page the demo sits in; the padding keeps the last rows clear of it.
    <div data-testid="demo-top-off" className="relative pb-[130px] md:pb-0" style={{ transform: "translateZ(0)", ["--tabbar-h" as string]: "0px" }}>
      <TopOffFrame
        listId={listId}
        capLineId={capLineId}
        isDesktop={isDesktop}
        openSlots={openSlots}
        bodySize={bodySize}
        poolSize={pool.length}
        untouched={pool.length - tickedCount - declinedHere}
        tickedCount={tickedCount}
        declinedHere={declinedHere}
        atCap={atCap}
        inflight={false}
        bulk={{
          collection: bulkPair.collection && { ...bulkPair.collection, onPress: () => setTicked(new Set(bulkPair.collection!.ids)) },
          best: bulkPair.best && { ...bulkPair.best, onPress: () => setTicked(new Set(bulkPair.best!.ids)) },
        }}
        onClearTicks={() => setTicked(new Set())}
        onRestoreAll={() => setDeclined(new Set())}
        emptyNote={emptyNote}
        buyCount={buying.length}
        buyTotal={buyMoney.pricedCopies > 0 ? formatCents(buyMoney.totalCents) : null}
        onCommit={noop}
        onCancel={noop}
        errorMessage={null}
      >
        {pool.map((c) => {
          if (declined.has(c.oracleId)) {
            return <DeclinedRow key={c.oracleId} name={c.name} disabled={false} onRestore={() => setDeclined((d) => { const n = new Set(d); n.delete(c.oracleId); return n; })} />;
          }
          const isTicked = live.has(c.oracleId);
          return (
            <CandidateRowView
              key={c.oracleId}
              candidate={c}
              ticked={isTicked}
              inert={!isTicked && atCap}
              inflight={false}
              capLineId={capLineId}
              newestAsOf={newestAsOf}
              declaredBracket={declaredBracket}
              noteCounts={noteCounts}
              isDesktop={isDesktop}
              nameTrigger={(className) => (
                <CardDetailTrigger oracleId={c.oracleId} name={c.name} imageUri={c.imageUri} siblings={siblings} preview title={c.name} testId="top-off-name" className={className}>
                  {c.name}
                </CardDetailTrigger>
              )}
              onToggle={() => setTicked(toggleTick(live, c.oracleId, openSlots))}
              onDecline={() => {
                const next = declineRow(live, declined, c.oracleId);
                setTicked(next.ticked);
                setDeclined(next.declined);
              }}
            />
          );
        })}
      </TopOffFrame>
    </div>
  );
}
