"use client";
// The closed table's Your game card (log reminder C1, L1): one per game the viewer played at the table, newest first,
// in the Last game card's shell, drawn from the saved result. Unlogged it says so and offers Log this game, which opens
// the viewer's own form filled in; logged it keeps the result with a check note and no button. Dates cross the JSON
// route as strings, so each is revived before a Date method is called.

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { trackerCopy } from "../../lib/copy/tracker";
import { PersonText } from "../../lib/person-name";
import { logGameHref } from "../../lib/rule-zero/table-view";
import type { TableGame } from "../../lib/social/rule-zero-games";
import { clockTime, gameDay } from "../../lib/social/when";
import { ordinal } from "../../lib/tracker/result";
import type { PlaySeat } from "../../lib/tracker/seat";
import { Note } from "../tracker/result";
import { GhostButton } from "../ui/button";
import { grid, Tile } from "./table-game";

const copy = ruleZeroCopy.expired;
const last = trackerCopy.table;

const seatOf = (s: TableGame["seats"][number], i: number): PlaySeat => ({ seat: i, you: s.you, name: s.name, art: s.artCropUri, partnerArt: null, commander: "", partner: null, deck: null });

export function YourGame({ game, tableId, utc }: { game: TableGame; tableId: string; utc: boolean }) {
  const tz = utc ? "UTC" : undefined;
  const { seats, result, deckName } = game;
  const until = gameDay(new Date(game.until), tz);
  const logged = game.loggedAt ? new Date(game.loggedAt) : null;
  const href = logGameHref({ tableId, viewerDeckId: game.deckId }, game.gameMs);
  const unlogged = copy.unlogged(until);
  return (
    <section aria-label={copy.yourGame} data-testid="your-game" className="flex flex-col gap-[12px] rounded-[14px] bg-[color:var(--surface)] p-[14px] text-left shadow-[inset_0_0_0_1px_var(--border-strong)]">
      <div className="flex items-baseline gap-[10px]">
        <span className="font-mono text-[11px] uppercase tracking-[.06em] text-[color:var(--fg-muted)]">{copy.yourGame}</span>
        <span className="ml-auto font-mono text-[11.5px] text-[color:var(--fg-faint)]">{gameDay(new Date(game.startedAt), tz)}</span>
      </div>
      {result.kind === "unknown" ? null : (
        <h2 className="m-0 font-display text-[20px] font-bold">
          {result.kind === "draw" ? last.draw : result.kind === "you" ? last.wonYou : <PersonText text={last.won(result.name)} />}
        </h2>
      )}
      <div className={`grid gap-[8px] ${grid(seats.length)}`}>
        {seats.map((s, i) => {
          const first = s.place === 1;
          return (
            <Tile
              key={i}
              p={seatOf(s, i)}
              h={56}
              className={first ? "shadow-[inset_0_0_0_2px_var(--accent)] [&_img]:opacity-60" : "[&_img]:opacity-40 [&_img]:[filter:grayscale(.6)]"}
            >
              <em className={`absolute right-[7px] top-[4px] font-display text-[13px] font-bold not-italic [text-shadow:0_1px_4px_rgba(0,0,0,.8)] ${first ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-muted)]"}`}>
                {ordinal(s.place)}
              </em>
            </Tile>
          );
        })}
      </div>
      {logged ? (
        <Note icon="check" text={copy.logged(gameDay(logged, tz), clockTime(logged, tz), deckName)} testId="your-game-logged" />
      ) : (
        <>
          <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
            {unlogged.before}
            <b className="font-semibold text-[color:var(--fg)]">{deckName}</b>
            {unlogged.after}
          </p>
          {href ? (
            <GhostButton href={href} className="flex min-h-[44px] w-full items-center justify-center rounded-[10px] px-[18px] text-[14.5px]">
              {ruleZeroCopy.page.log}
            </GhostButton>
          ) : null}
        </>
      )}
    </section>
  );
}
