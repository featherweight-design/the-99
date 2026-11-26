"use client";

import { DeckBox, DeckBoxBand, DeckBoxFoot } from "../deck-box";
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
    <DeckBox aria-labelledby="precon-overview-label" data-testid="precon-overview" className="!mt-0">
      <DeckBoxBand
        id="precon-overview-label"
        title={synopsisCopy.label}
        aside={<small className="font-mono text-[11px] font-normal text-[color:var(--fg-faint)]">{preconsCopy.open.overview.aside}</small>}
      />
      <p className="m-0 px-[14px] py-[12px] text-[14px] leading-[1.7] text-[color:var(--fg-body)] [text-wrap:pretty] md:px-[16px]">
        <SynopsisText text={content.overview} cards={content.cards} art={art} />
      </p>
      <DeckBoxFoot className="!py-[4px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[44px] w-fit cursor-pointer items-center gap-[6px] text-[13px] font-medium text-[color:var(--accent-text)] transition-colors hover:text-[color:var(--accent-hover)] md:min-h-[32px]"
        >
          {synopsisCopy.entry}
          <span aria-hidden>→</span>
        </button>
      </DeckBoxFoot>
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
    </DeckBox>
    </HoverPreviewProvider>
  );
}
