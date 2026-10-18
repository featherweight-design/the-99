"use client";
// Home's `Tonight's table` card (Rule 0 plan §PR 6, decision 1; boards E3, F3): for every seated player at an open
// table, the setter too, until it closes. It heads Home's Friends section (readiness gap 1: once a Friends section
// ships, the card moves to its head) with its own kicker and no heading of its own. Read per request
// (`loadHomeTables`), never from Home's cached payload.

import Link from "next/link";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import type { OpenTable } from "../../lib/social/rule-zero";
import { closesWhen } from "../../lib/social/when";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { useHydrated } from "../ui/hydrated-art";
import { ACCENT_BUTTON } from "./setup-sheet";

const copy = ruleZeroCopy.entry;

export function HomeTableCard({ table, now }: { table: OpenTable; now: Date }) {
  const closes = closesWhen(table.closesAt, now, useHydrated() ? undefined : "UTC");
  const n = table.seats.length;
  const deck = table.yourDeck;
  // A setter with no profile left names nobody, and never reads as you.
  const setter = table.setterName;
  const body = deck === null
    ? table.setByYou ? copy.homeBodyWaitingOwn(n, closes) : copy.homeBodyWaiting(setter, n, closes)
    : table.setByYou || setter === null
      ? copy.homeBodyOwn(deck, n, closes)
      : copy.homeBody(setter, deck, n, closes);
  const art = table.seats.flatMap((s) => (s.commander?.artCropUri ? [s.commander.artCropUri] : []));
  // The deck's name is bold in the sentence (E3). Every sentence names the deck after the setter, so its LAST
  // occurrence is the deck even when the setter's name contains it.
  const at = deck === null ? -1 : body.lastIndexOf(deck);
  return (
    <section
      aria-label={copy.homeKicker}
      data-testid="home-table-card"
      className="relative flex flex-col gap-[10px] overflow-hidden rounded-[14px] bg-[color:var(--surface-rail)] p-[14px] [border:1px_solid_var(--accent)]"
    >
      {art.length > 0 ? (
        <div aria-hidden className="pointer-events-none absolute inset-[-40px] flex opacity-[.28] [filter:blur(34px)_saturate(1.25)]">
          {art.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- the seats' own art, already requested by the faces
            <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />
          ))}
        </div>
      ) : null}
      <span className="relative font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--accent)]">{copy.homeKicker}</span>
      <h3 className="relative m-0 font-display text-[18px] font-bold text-[color:var(--fg)]">{table.podName}</h3>
      <div className="relative flex flex-wrap gap-[6px]">
        {table.seats.map((s, i) => (
          <Face
            key={i}
            name={s.displayName}
            commander={s.commander}
            size={36}
            className="[border:1.5px_solid_var(--bg)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--fg)_12%,transparent)]"
          />
        ))}
      </div>
      <p className="relative m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
        {at < 0 ? body : (
          <>
            {body.slice(0, at)}
            <b className="text-[color:var(--fg)]">{deck}</b>
            {body.slice(at + (deck?.length ?? 0))}
          </>
        )}
      </p>
      <Link href={`/friends/table/${table.tableId}`} className={`${ACCENT_BUTTON} relative w-full no-underline`}>
        {copy.homeOpen}
        <PendingReporter href={`/friends/table/${table.tableId}`} />
      </Link>
    </section>
  );
}
