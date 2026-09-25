"use client";
// The review page's Commander section (handoff §4): first under the header, above the what-changed
// strip, when the draft moved its commander. Two rows, `was` and `now`, with the new commander's
// buy tag when it is to buy. Drawn only when the draft's commander moved.

import { cssUrl } from "../../lib/collection/browse";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import type { CommanderRow } from "../../lib/commander-change/draft-rows";
import type { DraftState } from "../../lib/decks/draft-shape";
import { BuyTag } from "./buy-tag";

const short = (name: string) => name.split(" // ")[0].split(",")[0].trim();

function Row({ label, rows, now, newestAsOf }: { label: string; rows: CommanderRow[]; now: boolean; newestAsOf: Date | null }) {
  return (
    <div
      className="flex min-h-[48px] items-center gap-[11px] rounded-[8px] px-[10px] py-[4px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="w-[30px] flex-none font-mono text-[10px] tracking-[0.06em]" style={{ color: "var(--fg-faint)" }}>{label}</span>
      <span aria-hidden="true" className="flex flex-none overflow-hidden rounded-[5px] border border-[color:var(--border-strong)]" style={{ width: 48, height: 35 }}>
        {rows.map((r, i) => (
          <span
            key={r.oracleId}
            className="block h-full bg-cover bg-center"
            style={{
              width: rows.length > 1 ? 24 : "100%",
              borderLeft: i > 0 ? "1px solid var(--bg)" : undefined,
              backgroundColor: "var(--elevated)",
              backgroundImage: r.artCropUri ? cssUrl(r.artCropUri) : undefined,
            }}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 text-[13.5px] leading-[1.35]" style={{ color: now ? "var(--fg)" : "var(--fg-muted)" }}>
        {rows.map((r) => r.name).join(" + ")}
      </span>
      {now ? rows.filter((r) => r.buy).map((r) => (
        <BuyTag key={r.oracleId} variant="row" price={r.price} newestAsOf={newestAsOf} />
      )) : null}
    </div>
  );
}

export function CommanderSection({ state }: { state: DraftState }) {
  const rows = state.commanderRows;
  if (!state.commander || !rows) return null;
  const was = rows.rows.filter((r) => r.side === "from");
  const now = rows.rows.filter((r) => r.side === "to");
  const pair = now.length > 1;
  // A trade moves a card between the 99 and the command zone; its card lines stay in the columns.
  const trade = state.addChanges.some((c) => was.some((w) => w.oracleId === c.oracleId))
    || state.removes.some((c) => now.some((n) => n.oracleId === c.oracleId));
  const leaving = was.filter((w) => !now.some((n) => n.oracleId === w.oracleId));
  const note = trade
    ? copy.review.noteTrade
    : leaving.length > 1
      ? copy.review.notePoolPair(short(leaving[0].name), short(leaving[1].name))
      : copy.review.notePool(short(leaving[0]?.name ?? ""));
  return (
    <section data-testid="review-commander" data-commander-change="true" className="mb-[16px] flex flex-col md:mb-[20px]">
      <div className="mb-[10px] flex items-baseline justify-between gap-[10px] pb-[10px] [border-bottom:1px_solid_var(--elevated)]">
        <h2 className="m-0 flex-none font-mono text-[11px] tracking-[0.16em] uppercase" style={{ color: "var(--accent)" }}>
          {pair ? copy.review.headingPair : copy.review.heading}
        </h2>
        <span className="text-right font-mono text-[10px] text-[color:var(--fg-locked)]">{note}</span>
      </div>
      <div className="flex flex-col gap-[6px]">
        <Row label={copy.review.was} rows={was} now={false} newestAsOf={rows.newestAsOf} />
        <Row label={copy.review.now} rows={now} now newestAsOf={rows.newestAsOf} />
      </div>
    </section>
  );
}

/** A traded card's command-zone hint in a review column's action slot (handoff §4). */
export function ZoneHint({ text }: { text: string }) {
  return <span className="flex-none font-mono text-[10px] text-[color:var(--fg-locked)]">{text}</span>;
}
