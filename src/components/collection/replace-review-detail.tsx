"use client";
// What the ledger path adds to the Replace review (collection edit A2), in order of risk: the four
// figures, what the replace overwrites, the decks it leaves short, then the card lists. The
// shipped matched banner and issue sections draw around it, unchanged.

import type { UploadChangePreview, UploadMode } from "../../app/collection/actions";
import type { ShortDeck } from "../../lib/collection/write";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { ShortDeckWarning } from "./short-deck-warning";
import { Rows, Tile } from "./review-parts";
import { SyncReviewDetail, type SyncReviewControls } from "./sync-review";

const c = collectionEditCopy.upload;

/** "Jun 2", pinned to en-US and UTC so a server render and a browser agree. */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** The line naming what a Replace overwrites, or null when there is nothing to say. */
export function overwriteLine(change: Pick<UploadChangePreview, "editsSinceUpload" | "lastUploadAt" | "historyReaches">): string | null {
  if (change.lastUploadAt === null) return change.editsSinceUpload > 0 ? c.overwriteNoUpload(change.editsSinceUpload) : null;
  if (!change.historyReaches) return c.overwriteUnknown(day(change.lastUploadAt));
  return change.editsSinceUpload > 0 ? c.overwriteBanner(change.editsSinceUpload, day(change.lastUploadAt)) : null;
}

/** The ledger path's read of a Replace, as the review draws it. */
export type ReviewChange = {
  data: UploadChangePreview;
  decks: ShortDeck[];
  fresh: ReadonlySet<string>;
  /** A confirm came back with a different answer than the one on screen. */
  changed: boolean;
  /** A confirm that wrote nothing and could not be answered with a warning: shown as A5. */
  failure: { body: string } | null;
};

export function ReplaceReviewDetail({
  change,
  decks,
  freshDeckIds,
  changed,
  mode = "replace",
  onSwitchToReplace,
  sync,
}: {
  mode?: UploadMode;
  /** A Sync's answers and what its review needs from the flow; required for `mode="sync"`. */
  sync?: SyncReviewControls;
  /** An Add that brings in nothing new offers the other way. */
  onSwitchToReplace?: () => void;
  change: UploadChangePreview;
  /** The decks the replace would leave short: the preview's, or a later confirm's redrawn answer. */
  decks: ShortDeck[];
  freshDeckIds: ReadonlySet<string>;
  /** A confirm came back with a different answer than the one on screen. */
  changed: boolean;
}) {
  const d = change.detail;
  if (mode === "add") return <AddReviewDetail detail={d} onSwitchToReplace={onSwitchToReplace} />;
  if (mode === "sync" && change.sync && sync)
    return <SyncReviewDetail change={change} syncData={change.sync} decks={decks} freshDeckIds={freshDeckIds} changed={changed} controls={sync} />;
  const overwrite = overwriteLine(change);
  return (
    <div className="mt-[16px] flex flex-col gap-[16px] md:mt-[24px] md:gap-[22px]">
      <div className="grid grid-cols-2 gap-[10px] md:grid-cols-4 md:gap-[12px]">
        <Tile n={d.unchanged} label={c.tiles.unchanged} ink="var(--fg)" />
        <Tile n={d.up} label={c.tiles.up} ink="var(--success)" />
        <Tile n={d.down} label={c.tiles.down} ink="var(--fg)" />
        <Tile n={d.leaving} label={c.tiles.leaving} ink="var(--warning)" />
      </div>
      {overwrite ? (
        <p className="m-0 rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--elevated-hover)] p-[12px_14px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
          {overwrite}
        </p>
      ) : null}
      <div className="grid gap-[22px] md:grid-cols-2">
        {decks.length > 0 ? (
          <ShortDeckWarning variant="embedded" decks={decks} pending={false} notice={changed} freshDeckIds={freshDeckIds} />
        ) : null}
        <Rows heading={c.listLeaving(d.lists.leaving.total)} list={d.lists.leaving} tone="other" />
        <Rows heading={c.listDown(d.lists.down.total)} list={d.lists.down} tone="other" />
        <Rows heading={c.listUp(d.lists.up.total)} list={d.lists.up} tone="up" />
      </div>
    </div>
  );
}

/**
 * An Add's review: what gets added and nothing else. It lowers nothing, so it has no deck section,
 * no overwritten-edits line and no `edited` tag, and its four figures collapse into the banner.
 * When every card is already owned the list is still drawn, under a note saying so (A3b): the
 * add is allowed, it just brings nothing new.
 */
function AddReviewDetail({ detail: d, onSwitchToReplace }: { detail: UploadChangePreview["detail"]; onSwitchToReplace?: () => void }) {
  return (
    <div className="mt-[16px] flex flex-col gap-[16px] md:mt-[24px] md:gap-[22px]">
      {d.allOwned ? (
        <div
          role="note"
          className="rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--elevated-hover)] p-[12px_14px]"
        >
          <div className="text-[14px] font-semibold text-[color:var(--fg)]">{c.allOwned}</div>
          <p className="m-0 mt-[4px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.allOwnedBody(d.distinctCards)}</p>
          {onSwitchToReplace ? (
            <button
              type="button"
              onClick={onSwitchToReplace}
              className="mt-[6px] min-h-[44px] text-[13.5px] text-[color:var(--accent)] underline underline-offset-2"
            >
              {c.switchToReplace}
            </button>
          ) : null}
        </div>
      ) : null}
      <Rows heading={c.listAdded(d.lists.up.total)} list={d.lists.up} tone="up" />
    </div>
  );
}
