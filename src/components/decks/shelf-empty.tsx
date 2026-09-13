"use client";

// S2 and S3 — two of the five kinds of nothing (STATES §3).
//
// Neither offers `Clear filters`: no filter caused either one, and offering the
// wrong exit is what makes an empty grid read as a broken app. Neither draws the
// card-fan mark, which belongs to `DecksZero` and to the state where the player
// owns no decks at all.
//
// The chassis and the shelf line stay mounted above both — the first invariant
// in the states table. Whatever caused the emptiness stays on screen and stays
// reversible.

import { folderCopy } from "../../lib/copy/folders";

const ACTION =
  "inline-flex h-[34px] cursor-pointer items-center rounded-[8px] border border-solid "
  + "border-[color:var(--border-strong)] bg-transparent px-[14px] font-sans text-[12.5px] "
  + "text-[color:var(--fg)]";

const FRAME =
  "flex min-h-0 flex-auto flex-col items-center justify-center gap-[12px] px-[22px] py-[46px] text-center";

/**
 * S2 — a named shelf holding nothing. The state a reader lands on immediately
 * after creating a folder, which is the loop: create, land here, and the state
 * says how to fill it.
 *
 * It names where filing happens rather than narrating a control on screen — the
 * affordance is on a tile, on another shelf.
 */
export function ShelfEmpty({ name, onAllDecks }: { name: string; onAllDecks: () => void }) {
  return (
    <div className={FRAME} data-shelf-empty="named">
      <h2 className="m-0 font-display text-[20px] font-bold text-[color:var(--fg)]">
        {folderCopy.empty.shelfHeading}
      </h2>
      <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
        {folderCopy.empty.shelfFigure(name)}
      </p>
      <p className="m-0 max-w-[340px] text-[13.5px] leading-[1.65] text-[color:var(--fg-muted)]">
        {folderCopy.empty.shelfBody}
      </p>
      <button type="button" onClick={onAllDecks} className={`${ACTION} mt-[2px]`}>
        {folderCopy.empty.shelfAction}
      </button>
    </div>
  );
}

/**
 * S3 — Unfiled, with everything filed. NO BODY COPY: nothing is wrong and
 * nothing needs doing, and `refresh.ts`' voice rule forbids explaining that a
 * state is fine. A count is the honest form of that sentence, in the two
 * denominators the app already counts in.
 */
export function UnfiledEmpty({
  decks,
  folders,
  onAllDecks,
}: {
  decks: number;
  folders: number;
  onAllDecks: () => void;
}) {
  return (
    <div className={FRAME} data-shelf-empty="unfiled">
      <h2 className="m-0 font-display text-[20px] font-bold text-[color:var(--fg)]">
        {folderCopy.empty.unfiledHeading}
      </h2>
      <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
        {folderCopy.empty.unfiledFigure(decks, folders)}
      </p>
      <button type="button" onClick={onAllDecks} className={`${ACTION} mt-[2px]`}>
        {folderCopy.empty.unfiledAction}
      </button>
    </div>
  );
}
