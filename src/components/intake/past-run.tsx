"use client";
// A run opened from History (R1): the results page it was, read-only. These are the parts the route
// draws around the shipped results: the meta line under the title, the note that takes the read
// panel's place, the group of picks that went, and the state for a run that will not open.

import Link from "next/link";
import { useEffect, useRef } from "react";
import { helpMeChooseHistoryCopy } from "../../lib/copy/help-me-choose-history";
import type { GonePick } from "../../lib/intake/past-run";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { FailureMark, historyDate } from "../decks/tuning-history";

const copy = helpMeChooseHistoryCopy.past;

/**
 * The date under the title and the note, in the reader's own zone: drawn here, on the client, with the
 * hydration warning off, because the server cannot know the zone. Focus moves to the title on open, whose
 * accessible name adds that this is a past run (the heading is outside this module: it takes `titleId`).
 */
export function PastRunMeta({ at, titleId }: { at: string; titleId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const title = document.getElementById(titleId);
    if (!title) return;
    const day = new Date(at).toLocaleDateString("en-US", { month: "long", day: "numeric" });
    title.setAttribute("aria-label", `${title.textContent ?? ""}${copy.titleAria(day)}`);
    title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
  }, [at, titleId]);
  return (
    <span suppressHydrationWarning data-testid="past-run-meta" className="font-mono text-[10.5px] text-[color:var(--fg-faint)] md:text-[11px]">
      {copy.meta(historyDate(at))}
    </span>
  );
}

/** The note that takes the read panel's place; `picks` and `open` only when the aged count applies. */
export function PastRunNote({ nothing, aged }: { nothing: boolean; aged: { open: number; picks: number } | null }) {
  const base = nothing ? copy.noteNothing : copy.note;
  return (
    <p
      data-testid="past-run-note"
      className="m-0 max-w-[760px] rounded-[9px] border border-dashed border-[color:var(--border-dashed)] px-[12px] py-[9px] text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)]"
    >
      {base}
      {aged ? ` ${copy.open(aged.open, aged.picks)}` : ""}
    </p>
  );
}

/** The picks that went, one group after the open ones: what each is, and why it is not open now. */
export function GonePicks({ picks }: { picks: readonly GonePick[] }) {
  if (picks.length === 0) return null;
  return (
    <section aria-label={copy.goneLabel} data-testid="gone-picks" className="flex flex-col gap-[8px]">
      <h3 className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.goneHead(picks.length)}</h3>
      <ul className="m-0 grid list-none grid-cols-1 gap-[6px] p-0 md:grid-cols-2 md:max-w-[820px]">
        {picks.map((p) => (
          <li
            key={p.oracleId}
            className="flex min-h-[44px] items-center gap-[10px] rounded-[9px] border border-solid border-[color:var(--border)] px-[10px] py-[6px]"
          >
            <span
              aria-hidden="true"
              className="h-[34px] w-[24px] flex-none rounded-[3px] bg-[color:var(--elevated)] bg-cover bg-center opacity-[0.55]"
              style={p.artCropUri ?? p.imageUri ? { backgroundImage: `url(${p.artCropUri ?? p.imageUri})` } : undefined}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
              <CardDetailTrigger
                oracleId={p.oracleId}
                name={p.name}
                imageUri={p.imageUri}
                className="min-w-0 truncate text-left text-[13px] text-[color:var(--fg-body)] underline decoration-dotted underline-offset-[3px] cursor-pointer"
              >
                {p.name}
              </CardDetailTrigger>
              <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{p.deck ? copy.goneBuilt(p.deck.name) : copy.goneIndex}</span>
            </span>
            {p.deck ? (
              <Link href={`/decks/${p.deck.id}`} className="flex-none text-[12px] font-medium text-[color:var(--accent)] no-underline">
                {copy.openDeck}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A run that will not open: the row is gone, another player's, or the read failed. */
export function PastWontOpen({ historyHref }: { historyHref: string }) {
  return (
    <div data-testid="past-wont-open" className="flex flex-col gap-[14px]">
      <div className="flex items-start gap-[10px]">
        <span className="mt-[2px] flex-none text-[color:var(--danger)]"><FailureMark size={18} label={helpMeChooseHistoryCopy.loadFailed.tag} /></span>
        <p className="m-0 min-w-0 flex-1 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.failed}</p>
      </div>
      <Link
        href={historyHref}
        className="flex min-h-[44px] items-center self-start rounded-[8px] border border-solid border-[color:var(--accent)] px-[18px] text-[13.5px] font-semibold text-[color:var(--accent)] no-underline md:min-h-[40px]"
      >
        {copy.failedBack}
      </Link>
    </div>
  );
}
