"use client";

import { useMemo, useState } from "react";
import { preconsCopy } from "../../../lib/copy/precons";
import { synopsisCopy } from "../../../lib/copy/synopsis";
import type { PreconOverview as PreconOverviewData } from "../../../lib/precons/overview-read";
import type { FindingArt } from "../receipt-modal";
import { PreconSynopsisModal } from "../synopsis-body";
import { SynopsisText } from "../synopsis-text";
import { HoverPreviewProvider } from "../hover-preview";

/**
 * A precon's pre-written Overview on its own page (small items 5, `Precon-Overview` §1): under "You own"
 * and above the list-note line, the label, its aside, the Overview paragraph (760 at most on desktop) and
 * `View full overview →`, which opens the shipped Overview modal read only. No credit, no write press and
 * no state but present: the page draws nothing at all for a precon with no Overview yet.
 */
export function PreconOverview({ overview, preconName, commanderId = null, listArt }: {
  overview: PreconOverviewData;
  preconName: string;
  /** The precon's face commander (the first of its commanders), drawn beside the Overview in the stages shape. */
  commanderId?: string | null;
  /** The precon's own cards' art, by oracle id: it wins over the catalog's for a card both cover. */
  listArt: ReadonlyMap<string, { name: string; imageUri: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const art = useMemo<FindingArt>(() => {
    const out = new Map(listArt);
    for (const [oracleId, imageUri] of Object.entries(overview.art)) {
      if (!out.has(oracleId)) out.set(oracleId, { name: "", imageUri });
    }
    return out;
  }, [listArt, overview.art]);
  const { content } = overview;
  if (!content.overview) return null;
  // Its own preview provider: the header sits above the list's, and a card name here previews as it
  // does on the Analysis tab.
  return (
    <HoverPreviewProvider>
    <section aria-labelledby="precon-overview-label" data-testid="precon-overview" className="flex flex-col gap-[6px]">
      <div className="flex flex-wrap items-baseline gap-[10px]">
        <h2 id="precon-overview-label" className="m-0 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">
          {synopsisCopy.label}
        </h2>
        <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{preconsCopy.open.overview.aside}</small>
      </div>
      <p className="m-0 mt-[2px] text-[14px] leading-[1.7] text-[color:var(--fg-body)] [text-wrap:pretty] md:max-w-[760px]">
        <SynopsisText text={content.overview} cards={content.cards} art={art} />
      </p>
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-[6px] text-[13px] font-medium text-[color:var(--accent-text)] transition-colors hover:text-[color:var(--accent-hover)] md:min-h-[32px]"
        >
          {synopsisCopy.entry}
          <span aria-hidden>→</span>
        </button>
      </div>
      {open ? (
        <PreconSynopsisModal
          preconName={preconName}
          content={content}
          contractVersion={overview.contractVersion}
          commanderId={commanderId}
          art={art}
          evidenceNames={overview.evidenceNames}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
    </HoverPreviewProvider>
  );
}
