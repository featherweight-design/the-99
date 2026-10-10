"use client";
// What the ledger path adds to the Replace review (collection edit A2), in order of risk: the four
// figures, what the replace overwrites, the decks it leaves short, then the card lists. The
// shipped matched banner and issue sections draw around it, unchanged.

import { useState } from "react";
import type { UploadChangePreview } from "../../app/collection/actions";
import type { ShortDeck } from "../../lib/collection/write";
import type { PreviewList, PreviewListRow } from "../../lib/collection/upload-preview";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { ShortDeckWarning } from "./short-deck-warning";

const SHOWN = 8;
const c = collectionEditCopy.upload;

/** "Jun 2", pinned to en-US and UTC so a server render and a browser agree. */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** The line naming what a Replace overwrites, or null when there is nothing to say. */
export function overwriteLine(change: Pick<UploadChangePreview, "editsSinceUpload" | "lastUploadAt" | "historyReaches">): string | null {
  if (change.lastUploadAt === null) return change.editsSinceUpload > 0 ? c.overwriteNoUpload(change.editsSinceUpload) : null;
  if (!change.historyReaches) return c.overwriteUnknown(day(change.lastUploadAt));
  return change.editsSinceUpload > 0 ? c.overwriteBanner(change.editsSinceUpload, day(change.lastUploadAt)) : null;
}

function Tile({ n, label, ink }: { n: number; label: string; ink: string }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface)] p-[12px_14px] md:p-[16px_18px]">
      <div className="font-mono text-[22px] font-semibold leading-none md:text-[26px]" style={{ color: ink }}>
        {n.toLocaleString("en-US")}
      </div>
      <div className="mt-[6px] text-[12px] text-[color:var(--fg-muted)]">{label}</div>
    </div>
  );
}

function Rows({ heading, list, tone }: { heading: string; list: PreviewList; tone: "up" | "other" }) {
  const [all, setAll] = useState(false);
  if (list.total === 0) return null;
  const shown = all ? list.rows : list.rows.slice(0, SHOWN);
  return (
    <div className="min-w-0">
      <h2 className="m-0 mb-[8px] font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">
        {heading}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
        {shown.map((r: PreviewListRow) => (
          <li
            key={`${r.oracleId}|${r.setCode}|${r.collectorNumber}|${r.finish}`}
            className="flex min-h-[40px] items-center gap-[10px] rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface)] p-[8px_12px]"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-[color:var(--fg)] md:text-[14px]">{r.name}</span>
            {r.edited ? (
              <span className="flex-none rounded-[4px] border border-[color:var(--warning)] px-[5px] font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--warning)]">
                {c.edited}
              </span>
            ) : null}
            <span
              className="flex-none font-mono text-[12px]"
              style={{ color: tone === "up" ? "var(--success)" : "var(--fg-muted)" }}
            >
              {r.before === 0 ? c.newBadge : `×${r.before}`} → ×{r.after}
            </span>
          </li>
        ))}
      </ul>
      {!all && list.rows.length > SHOWN ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-[8px] min-h-[44px] text-[13px] text-[color:var(--accent)] underline underline-offset-2"
        >
          {c.showAll(list.rows.length)}
        </button>
      ) : null}
    </div>
  );
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
}: {
  change: UploadChangePreview;
  /** The decks the replace would leave short: the preview's, or a later confirm's redrawn answer. */
  decks: ShortDeck[];
  freshDeckIds: ReadonlySet<string>;
  /** A confirm came back with a different answer than the one on screen. */
  changed: boolean;
}) {
  const d = change.detail;
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
