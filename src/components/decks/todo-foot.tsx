"use client";

// The to-do card's foot (handoff `deck_messages`, `To-do Card.dc.html`'s `.ft` and the left column of
// `Next Steps.dc.html`, whose last panel opens it): the deck's status as one mono line, segments in a
// fixed order, version · proxies · provenance ▾ · other drafts ▾. Plain facts are text; the two ▾
// segments are disclosures that open INSIDE the card, under the line, one at a time and for the
// visit only (state, never stored). With nothing to do the foot stands alone as the quiet strip
// (R1's "v3 · committed 2 Oct 2026"), drawn by `TodoCard` around it.
//
// The version segment is where a commit or a discard lands focus, which `PendingBanner` did before
// the foot replaced it.

import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { availabilityCopy } from "../../lib/copy/availability";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { proxyCopy } from "../../lib/copy/proxies";
import { topOffCopy } from "../../lib/copy/top-off";
import { formatDeckDate } from "../../lib/decks/format";
import { mirrorUrl } from "../../lib/url/mirror";
import { COMMIT_RECEIPT_HASH, DISCARD_RECEIPT_HASH } from "./draft-announcer";

const copy = deckVersioningCopy.todoCard;

export interface TodoFootFacts {
  /** The newest version, while the list matches it. The caller nulls it while the pending row shows. */
  version: { number: number; committedAt: Date } | null;
  /** `proxiedCardCount`. 0 draws nothing. */
  proxies: number;
  /** The deck's live auto copies and the ledger they open. Null when there are none. */
  provenance: { count: number; panel: ReactNode } | null;
  /** Cards here some other draft also wants (the soft count). Null when there are none. */
  otherDrafts: { count: number } | null;
}

export function footHasSegments(f: TodoFootFacts): boolean {
  return f.version !== null || f.proxies > 0 || f.provenance !== null || f.otherDrafts !== null;
}

type Disclosure = "provenance" | "drafts";

export function TodoFoot({ facts, quiet }: { facts: TodoFootFacts; quiet: boolean }) {
  const [open, setOpen] = useState<Disclosure | null>(null);
  const ids = useId();
  // A segment that leaves while open (the last auto card kept) takes its disclosure with it, so it
  // does not come back open. Adjusted during render, so the stale panel never paints.
  if ((open === "provenance" && !facts.provenance) || (open === "drafts" && !facts.otherDrafts)) setOpen(null);
  if (!footHasSegments(facts)) return null;

  const toggle = (d: Disclosure) => setOpen((o) => (o === d ? null : d));
  const disclosure = (d: Disclosure, label: string) => (
    <button
      type="button"
      aria-expanded={open === d}
      aria-controls={`${ids}-${d}`}
      onClick={() => toggle(d)}
      // `.ds`: body ink and a dotted rule; the vertical padding is the board's `.tap`, a taller hit
      // area that does not move the line.
      className={`inline-block py-[12px] -my-[12px] bg-transparent border-0 px-0 cursor-pointer whitespace-nowrap font-mono text-[11px] leading-[1.7] ${
        open === d ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"
      }`}
    >
      <span className="[border-bottom:1px_dotted_var(--fg-faint)]">
        <span>{label}</span>
        <span aria-hidden className="ml-[0.5ch]">
          {open === d ? copy.disclosureOpen : copy.disclosureClosed}
        </span>
      </span>
    </button>
  );

  const segments: { key: string; node: ReactNode }[] = [];
  if (facts.version) {
    segments.push({
      key: "version",
      node: <VersionSegment text={deckVersioningCopy.pending.versionLine(facts.version.number, formatDeckDate(facts.version.committedAt))} />,
    });
  }
  if (facts.proxies > 0) segments.push({ key: "proxies", node: <span>{proxyCopy.deckHeader.line(facts.proxies)}</span> });
  if (facts.provenance) {
    segments.push({ key: "provenance", node: disclosure("provenance", topOffCopy.ledger.header(String(facts.provenance.count))) });
  }
  if (facts.otherDrafts) {
    segments.push({ key: "drafts", node: disclosure("drafts", availabilityCopy.deckRollup.softFoot(facts.otherDrafts.count)) });
  }

  // The card's foot sits on its own ground under a rule; the quiet strip is that ground already.
  const ground = quiet ? "" : "bg-[color:color-mix(in_srgb,var(--bg)_40%,var(--surface-rail))]";
  const pad = quiet ? "px-[16px] md:px-[30px]" : "px-[14px] md:px-[16px]";
  const panel = `${ground} ${pad} pt-[4px] pb-[12px] [border-top:1px_solid_var(--border)]`;
  return (
    <>
      <div
        data-todo-foot
        className={`${ground} ${pad} ${
          quiet ? "py-[10px] md:py-[12px]" : "py-[9px] [border-top:1px_solid_var(--border)]"
        } font-mono text-[11px] leading-[1.7] text-[color:var(--fg-faint)]`}
      >
        {segments.map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && (
              <span aria-hidden className="mx-[5px] text-[color:var(--fg-locked)]">
                {copy.footSeparator}
              </span>
            )}
            {s.node}
          </Fragment>
        ))}
      </div>
      {open === "provenance" && facts.provenance && (
        <div id={`${ids}-provenance`} className={panel}>
          {facts.provenance.panel}
        </div>
      )}
      {open === "drafts" && facts.otherDrafts && (
        <div id={`${ids}-drafts`} className={panel}>
          {/* The soft band's shipped sentence, until the pass sheet groups these by draft (PR 3). */}
          <p className="m-0 mt-[8px] font-sans text-[12px] leading-[1.5] text-[color:var(--fg-body)]">
            {availabilityCopy.deckRollup.softBody}
          </p>
        </div>
      )}
    </>
  );
}

/** The committed version line, and where a commit lands. Focusable but not a tab stop
 *  (`tabIndex={-1}`): a statement, not a control, reachable programmatically once, the paint after
 *  the commit sheet or a discard navigated here. See `COMMIT_RECEIPT_HASH` for why that matters. */
function VersionSegment({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== COMMIT_RECEIPT_HASH && hash !== DISCARD_RECEIPT_HASH) return;
    ref.current?.focus();
    // `replaceState`, so the receipt does not become an entry the reader can go back to and re-fire.
    mirrorUrl(`${window.location.pathname}${window.location.search}`);
  }, []);
  return (
    <span ref={ref} tabIndex={-1} className="outline-none">
      {text}
    </span>
  );
}
