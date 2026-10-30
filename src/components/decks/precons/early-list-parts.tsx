// The two pieces an early decklist adds to the open precon's page (announcements handoff, Early-List board): the
// dashed `--fact` band that says what the list is and when it changes, with Wizards' post linked out, and the last
// group of lines the catalog cannot match yet (G3), drawn by the post's words with no dot, no pips and no press.

import { preconsCopy } from "../../../lib/copy/precons";
import type { UnmatchedLine } from "../../../lib/announcements/early-list";
import { LinkOutLabel } from "../../ui/link-out-icon";
import { NEW_TAB_SUFFIX } from "../../ui/external-link";
import { DecklistGroupHeader } from "../decklist-group-header";

const copy = preconsCopy.early;

export type EarlyBandContent = {
  /** The bold sentence: when Wizards posted it, or that the set is out and this is still the early list. */
  lead: string;
  tail: string;
  /** Wizards' post, or null when its stored address is not one to link to. */
  postUrl: string | null;
};

/** A column on a phone, its link a 44px press; one row from `md`, the link at the right end, 32px. */
export function EarlyBand({ lead, tail, postUrl }: EarlyBandContent) {
  return (
    <div
      data-testid="early-band"
      className="flex flex-col gap-[6px] rounded-[10px] border border-dashed border-[color:color-mix(in_srgb,var(--fact)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--fact)_6%,var(--bg))] p-[11px_13px] md:flex-row md:items-center md:gap-[16px] md:p-[12px_16px]"
    >
      <p className="m-0 flex-1 text-[13px] leading-[1.55] text-[color:var(--fg-body)]">
        <b className="font-semibold text-[color:var(--fg)]">{lead}</b> {tail}
      </p>
      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener"
          className="flex min-h-[44px] flex-none items-center self-start whitespace-nowrap rounded-[6px] font-sans text-[13px] font-medium text-[color:var(--accent-text)] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:min-h-[32px] md:self-auto"
        >
          <LinkOutLabel>{copy.readPost}</LinkOutLabel>
          <span className="sr-only">{NEW_TAB_SUFFIX}</span>
        </a>
      )}
    </div>
  );
}

/** The last group: every line the catalog cannot match yet, in post order. They count toward M, never toward owned. */
export function UnmatchedGroup({ lines }: { lines: readonly UnmatchedLine[] }) {
  if (lines.length === 0) return null;
  const copies = lines.reduce((n, l) => n + l.count, 0);
  return (
    <section aria-label={copy.unmatched.label} data-testid="early-unmatched" className="mb-[16px] md:mb-[20px]">
      <DecklistGroupHeader label={copy.unmatched.label} count={copies} note={copy.unmatched.count(copies)} noteColor="var(--fg-muted)" />
      <p className="m-0 mb-[4px] text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.unmatched.note}</p>
      {/* The list rows' own grid: a column on a phone, two from `md`. */}
      <ul
        className="m-0 flex list-none flex-col gap-[3px] p-0 md:grid md:gap-x-[20px] md:gap-y-[4px]"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
      >
        {lines.map((l, i) => (
          <li
            // A post can name the same card twice; its place keeps the key unique.
            key={`${i}:${l.name}`}
            className="flex h-[36px] items-center gap-[10px] rounded-[8px] border border-dashed border-[color:var(--border-dashed)] bg-transparent px-[10px] text-[14px] text-[color:var(--fg-body)]"
          >
            <span className="min-w-0 flex-1 truncate">{l.name}</span>
            {l.count > 1 && <span className="flex-none font-mono text-[11px] text-[color:var(--fg-muted)]">{preconsCopy.open.basicCount(l.count)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
