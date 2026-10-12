"use client";

import { useState } from "react";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { Bracket } from "../../lib/profile/types";
import type { LineItem } from "../../lib/tuning/state";
import { MutationError } from "./mutation-error";
import type { CardActions } from "./suggestion-card";
import { SuggestionLine } from "./suggestion-line";

/**
 * Suggested changes' two lists (sub-project 8; Design's B10/B10b): a head with the count, the
 * tally and Apply all, then Additions and Cuts. The tally recounts on every answer: what the
 * deck would hold if every open line were made.
 */
const copy = deckTuningCopy.lists;

export function SuggestionLists({
  lines, deckSize, permits, newestPriceAsOf, actions, onSettled,
}: {
  lines: LineItem[];
  /** The deck's card count now, which the tally counts from. */
  deckSize: number;
  permits: readonly Bracket[];
  newestPriceAsOf: Date | null;
  actions: CardActions;
  onSettled: (announce: string) => void | boolean | Promise<void | boolean>;
}) {
  const [applying, setApplying] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const additions = lines.filter((l) => l.side === "add");
  const cuts = lines.filter((l) => l.side === "cut");
  const open = lines.filter((l) => l.verdict === "pending" && l.applies);
  const into = open.filter((l) => l.side === "add").length;
  const out = open.length - into;
  const anyAnswered = lines.some((l) => l.verdict !== "pending");

  async function applyAll() {
    setApplying(true);
    setRefused(null);
    let made = 0;
    let refusedWith: string | null = null;
    for (const line of open) {
      const result = await actions.apply(line.id).catch((): { ok: false; message: string } => ({ ok: false, message: copy.applyRefused }));
      if (!result.ok) {
        setRefused(result.message);
        refusedWith = result.message;
        break;
      }
      made += 1;
    }
    // One announcement and one re-read for the whole press, even when it stopped part way. The bulk
    // state holds until that re-read lands: until then the applied rows still read as pending, and
    // a press on one would re-submit it.
    if (made > 0) {
      const settled = lines.filter((l) => l.verdict === "accepted").length + made;
      await onSettled(copy.tallyOf(settled, lines.length, lines.filter((l) => l.verdict === "dismissed").length));
    }
    // A refusal before anything landed still re-reads: the row it stopped on is stale (applied
    // elsewhere, or no longer applies), and without a fresh read every later press retries it.
    else if (refusedWith !== null) await onSettled(refusedWith);
    setApplying(false);
  }

  return (
    <div className="mt-[14px] flex flex-col gap-[14px]">
      <div className="flex flex-wrap items-center gap-[12px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
          {copy.count(additions.length, cuts.length)}
        </span>
        <span aria-hidden className="h-px min-w-[16px] flex-1" style={{ background: "var(--border)" }} />
        {open.length > 0 ? (
          <>
            <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
              {copy.tally(into, out, deckSize + into - out, deckSize)}
            </span>
            <button
              type="button"
              onClick={applyAll}
              disabled={applying}
              className="flex min-h-[44px] items-center rounded-[7px] px-[13px] text-[12.5px] font-semibold text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] md:min-h-[32px] transition-colors"
            >
              {applying ? copy.applying : anyAnswered ? copy.applyRest : copy.applyAll}
            </button>
          </>
        ) : null}
      </div>
      {refused ? <MutationError message={refused} /> : null}
      {/* A disabled fieldset disables every line's buttons while Apply all works, so a row cannot be
          answered under it. */}
      <fieldset disabled={applying} className="m-0 flex min-w-0 flex-col gap-[14px] border-0 p-0">
        <List title={copy.additions} empty={copy.emptyAdditions} rows={additions} {...{ permits, newestPriceAsOf, actions, onSettled }} />
        <List title={copy.cuts} empty={copy.emptyCuts} rows={cuts} {...{ permits, newestPriceAsOf, actions, onSettled }} />
      </fieldset>
    </div>
  );
}

function List({
  title, empty, rows, permits, newestPriceAsOf, actions, onSettled,
}: {
  title: string;
  empty: string;
  rows: LineItem[];
  permits: readonly Bracket[];
  newestPriceAsOf: Date | null;
  actions: CardActions;
  onSettled: (announce: string) => void | boolean | Promise<void | boolean>;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-[10px] md:gap-[6px]">
      <h4 className="m-0 flex items-baseline gap-[8px] px-[2px] pt-[2px]">
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--fg)" }}>{title}</span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{rows.length}</span>
      </h4>
      {rows.length === 0 ? (
        <p className="m-0 px-[2px] font-mono text-[12.5px]" style={{ color: "var(--fg-faint)" }}>{empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[10px] p-0 md:gap-[6px]">
          {rows.map((line) => (
            <li key={line.id}>
              <SuggestionLine item={line} permits={permits} newestPriceAsOf={newestPriceAsOf} actions={actions} onSettled={onSettled} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
