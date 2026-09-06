// The receipt line (§8), shared by the owned scope's `RecCard` and discovery's
// row. It lives in its own file because both import it: leaving it in
// `rec-card.tsx` and importing it from `discovery-row.tsx` would close a cycle,
// since `RecCard` delegates its discovery arm to that row.

import { availabilityCopy } from "../../lib/copy/availability";
import type { ReceiptCounts } from "../../lib/commanders/in-use";

/** A glyph-and-words clause on the receipt line. Discovery's ownership clause
    and the shipped availability clause are the same shape, so they render
    through the same markup and cannot drift apart. */
export type ReceiptClause = {
  text: string;
  color: string;
  /** Fill or border. Decorative — the words beside it say the whole fact. */
  glyph: React.CSSProperties;
};

function Clause({ clause }: { clause: ReceiptClause }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="block shrink-0"
        style={{ width: 6, height: 6, transform: "rotate(45deg)", ...clause.glyph }}
      />
      <span style={{ color: clause.color }}>{clause.text}</span>
    </>
  );
}

/**
 * It ALWAYS renders, in both ranking modes; only the second clause is a suffix,
 * so row height never changes between two players looking at the same commander.
 * The canvas draws Lathril with the whole line absent, but the README and the
 * copy module both rule the line unconditional and the README wins by this
 * epic's stated precedence.
 *
 * The second clause is not derived from the two rankings. Counting it off the
 * availability map instead is what lets it render under `Everything I own`,
 * where no free ranking exists — and Design drew it that way (canvas state A,
 * "Everything I own (default)", already reads `34 of your cards fit · 12
 * already in use`).
 *
 * ONE such clause, chosen by severity: §8 calls it "the second clause",
 * singular, and no canvas row draws both. Hard outranks soft for the same reason
 * it does in the deck roll-up — a card sleeved into a finished deck is the
 * harder fact. A pool holding both therefore says nothing about its soft claims;
 * that is flagged to Design rather than improvised into a third clause.
 *
 * `lead` is discovery's ownership clause, which sits BEFORE the fit count rather
 * than after it. It is not chosen by severity and never competes with the
 * availability clause: ownership and commitment are different facts.
 */
export function ReceiptLine({
  fits,
  counts,
  avail,
  fontSize,
  lead,
  gap = 6,
  lineHeight,
}: {
  fits: number;
  counts: ReceiptCounts | null;
  avail: "all" | "free";
  fontSize: number;
  lead?: ReceiptClause;
  gap?: number;
  lineHeight?: number;
}) {
  const { receipt } = availabilityCopy;
  // Glyph follows the clause: solid accent for a finished deck's claim, hollow
  // for a brew's, exactly as the marker draws them elsewhere.
  // Null counts are unknown, not zero: the availability read failed, so the
  // clause is dropped rather than drawn as "nothing is committed", which is a
  // claim this render has no basis for.
  const clause: ReceiptClause | null = !counts
    ? null
    : counts.inUse > 0
      ? {
          text: receipt.inUse(counts.inUse),
          color: "var(--avail-hard-fg)",
          glyph: { background: "var(--accent)" },
        }
      : counts.wantedByBrew > 0
        ? {
            text: receipt.wantedByBrew(counts.wantedByBrew),
            color: "var(--fg-body)",
            glyph: { border: "1.5px solid var(--fg-muted)" },
          }
        : null;

  return (
    <p
      className="m-0 font-mono flex items-center flex-wrap"
      style={{ fontSize, color: "var(--fg-faint)", gap, lineHeight }}
    >
      {lead && (
        <>
          <Clause clause={lead} />
          <span style={{ color: "var(--border-strong)" }}>·</span>
        </>
      )}
      {avail === "free" ? receipt.fitFree(fits) : receipt.fit(fits)}
      {clause && (
        <>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <Clause clause={clause} />
        </>
      )}
    </p>
  );
}
