"use client";
// The chip list under each Role Coverage heading. Client-side for two reasons the
// server component next door cannot cover: the chips open the card-detail modal,
// and a pool of several hundred ramp cards is truncated to a readable opening
// hand with the rest behind a toggle.

import { useState } from "react";
import type { RoleCard } from "../../lib/recs/score";
import { commandersCopy } from "../../lib/copy/commanders";
import { CardDetailTrigger } from "../decks/card-detail-provider";

// A well-stocked pool puts 200+ cards under a single role, and the four panels
// stacked turned the page into a wall of names with the panels below it pushed
// off the bottom. Twelve is two or three rows at phone width — enough to read
// the shape of what you own without the section becoming the page.
const INITIAL = 12;

export function OwnedChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center font-mono rounded-full"
      style={{
        fontSize: "11.5px",
        background: "var(--surface-raised)",
        border: "1px solid color-mix(in srgb, var(--success) 40%, var(--bg))",
        padding: "4px 10px",
        color: "var(--fg-body)",
        gap: 6,
      }}
    >
      {/* Green dot */}
      <span
        className="block shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: "var(--success)" }}
      />
      {name}
    </span>
  );
}

export function RoleCardList({ cards, emptyLabel }: { cards: RoleCard[]; emptyLabel: string }) {
  const [expanded, setExpanded] = useState(false);

  if (cards.length === 0) {
    return (
      <span className="font-mono" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
        {emptyLabel}
      </span>
    );
  }

  const shown = expanded ? cards : cards.slice(0, INITIAL);
  const hidden = cards.length - shown.length;
  // Paging runs over the whole role, not the visible slice: Next from the last
  // chip on screen should reach the card after it, which is the point of not
  // having made the reader expand the list first.
  const siblings = cards.map((c) => c.oracleId);

  return (
    <>
      <div className="flex flex-wrap gap-[7px]">
        {shown.map((card) => (
          <CardDetailTrigger
            key={card.oracleId}
            oracleId={card.oracleId}
            name={card.name}
            siblings={siblings}
            className="rounded-full"
          >
            <OwnedChip name={card.name} />
          </CardDetailTrigger>
        ))}
      </div>
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="font-mono underline cursor-pointer bg-transparent border-0 p-0"
          style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 9 }}
        >
          {expanded ? commandersCopy.roleCoverage.showFewer : commandersCopy.roleCoverage.showRest(hidden)}
        </button>
      )}
    </>
  );
}
