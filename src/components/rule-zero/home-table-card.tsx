"use client";
// Home's `Tonight's table` card (Rule 0 plan §PR 6, decision 1; boards E3, F3; revisions board H1 to H8): for every seated
// player at an open table, the setter too, until it closes. It leads Home's body, above everything but the page head, with its own
// kicker and no heading of its own; from `xl` it is one row (kicker, pod and faces | sentence | Open the table). Read per
// request (`loadHomeTables`), never from Home's cached payload.

import Link from "next/link";
import { Fragment } from "react";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { isThirdPartyName, PersonName, type PersonParts } from "../../lib/person-name";
import type { OpenTable } from "../../lib/social/rule-zero";
import { closesWhen } from "../../lib/social/when";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { useHydrated } from "../ui/hydrated-art";
import { ACCENT_BUTTON } from "./setup-sheet";

const copy = ruleZeroCopy.entry;
const SLOT = "\u0000";

export function HomeTableCard({ table, now }: { table: OpenTable; now: Date }) {
  const closes = closesWhen(table.closesAt, now, useHydrated() ? undefined : "UTC");
  const n = table.seats.length;
  const deck = table.yourDeck;
  // A setter with no profile left names nobody, and never reads as you. The deck's slot is filled with a mark, then
  // split on it, so the bold lands on the slot whatever the deck is called.
  const setter = table.setterName;
  const sentence = (d: string) => table.setByYou || setter === null ? copy.homeBodyOwn(d, n, closes) : copy.homeBody(setter, d, n, closes);
  const body: string | PersonParts | null = deck === null
    ? table.setByYou ? copy.homeBodyWaitingOwn(n, closes) : copy.homeBodyWaiting(setter, n, closes)
    : null;
  const parts: string | PersonParts = deck === null ? [] : sentence(SLOT);
  const said = body ?? parts;
  const drawn: PersonParts = typeof said === "string" ? [said] : said;
  const art = table.seats.flatMap((s) => (s.commander?.artCropUri ? [s.commander.artCropUri] : []));
  return (
    <section
      aria-label={copy.homeKicker}
      data-testid="home-table-card"
      className="relative flex flex-col gap-[10px] overflow-hidden rounded-[14px] bg-[color:var(--surface-rail)] p-[14px] [border:1px_solid_var(--accent)] xl:flex-row xl:items-center xl:gap-[22px] xl:p-[16px_18px]"
    >
      {art.length > 0 ? (
        <div aria-hidden className="pointer-events-none absolute inset-[-40px] flex opacity-[.28] [filter:blur(34px)_saturate(1.25)]">
          {art.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- the seats' own art, already requested by the faces
            <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />
          ))}
        </div>
      ) : null}
      <div className="relative flex flex-col gap-[10px] xl:w-[230px] xl:flex-none xl:gap-[8px]">
      <span className="font-mono text-[10.5px] leading-[14px] font-medium uppercase tracking-[.14em] text-[color:var(--accent-text)]">{copy.homeKicker}</span>
      <h3 className="m-0 font-display text-[18px] leading-[25px] font-bold text-[color:var(--fg)]"><PersonName n={table.podName} /></h3>
      <div className="flex flex-wrap gap-[6px]">
        {table.seats.map((s, i) => (
          <Face
            key={i}
            name={s.displayName}
            commander={s.commander}
            size={30}
            className="[border:1.5px_solid_var(--bg)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--fg)_12%,transparent)]"
          />
        ))}
      </div>
      </div>
      <p className="relative m-0 text-[13.5px] xl:min-w-0 xl:flex-1 leading-[1.55] text-[color:var(--fg-body)]">
        {drawn.map((part, i) => {
          if (isThirdPartyName(part)) return <PersonName key={i} n={part} />;
          const [before, ...after] = part.split(SLOT);
          return after.length === 0 ? <Fragment key={i}>{part}</Fragment> : (
            <Fragment key={i}>
              {before}
              <b className="text-[color:var(--fg)]">{deck}</b>
              {after.join("")}
            </Fragment>
          );
        })}
      </p>
      <Link href={`/friends/table/${table.tableId}`} className={`${ACCENT_BUTTON} relative w-full no-underline xl:h-[40px] xl:min-h-0 xl:w-auto xl:px-[20px] xl:text-[13.5px]`}>
        {copy.homeOpen}
        <PendingReporter href={`/friends/table/${table.tableId}`} />
      </Link>
    </section>
  );
}
