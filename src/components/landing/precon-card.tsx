"use client";
// The precon card on the landing (addendum A2 section 6): the featured precon's face commander in the same 150px band as the commander
// cards, the precon's name and its colour pips over it, the kicker, the Overview's lead and `Read the whole Overview ›`. Selecting
// anywhere on the card opens the SHIPPED precon Overview modal (`PreconSynopsisModal`), read only, from the stored row the page read:
// no link to the precon's list (a precon's list is signed-in only, README call 9, A). The modal closes back to this card. Card names
// inside it open nothing here (the landing has no card details surface of its own); their hover preview works.

import { useMemo, useRef, useState } from "react";
import { landingCopy } from "../../lib/copy/landing";
import type { LandingPrecon } from "../../lib/public/landing-precon";
import { CardDetailContext } from "../cards/card-detail-context";
import { HoverPreviewProvider } from "../decks/hover-preview";
import type { FindingArt } from "../decks/receipt-modal";
import { PreconSynopsisModal } from "../decks/synopsis-body";
import { LaunchPanel } from "./launch-panel";
import { art, NAME_INK_SHADOW } from "./hero-phone";
import { demoCardDetail } from "./demo/demo-providers";
import { rise } from "./section";

const c = landingCopy.written;
const NO_OPEN = demoCardDetail({ onOpen: () => {}, onClose: () => {}, openOracleId: null });

export function PreconCard({ precon, n, className }: { precon: LandingPrecon; n: number; className: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const findingArt = useMemo<FindingArt>(() => new Map(Object.entries(precon.art).map(([oracleId, imageUri]) => [oracleId, { name: precon.evidenceNames[oracleId] ?? "", imageUri }])), [precon.art, precon.evidenceNames]);
  const commander = precon.commander;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-testid="precon-card"
        aria-haspopup="dialog"
        aria-label={`${precon.name}. ${c.preconOpen}`}
        onClick={() => setOpen(true)}
        className={`${className} w-full cursor-pointer p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]`}
        style={rise(n)}
      >
        {commander?.artCropUri ? (
          <span className="relative block h-[150px] w-full overflow-hidden bg-[color:var(--surface-sunken)]" style={art(commander.artCropUri)}>
            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,.7))]" />
            <span className="absolute bottom-[10px] left-[14px] z-[2] flex items-center gap-[8px] font-display text-[15px] font-bold text-[color:var(--fg)]" style={{ textShadow: NAME_INK_SHADOW }}>
              {precon.name}
              <span aria-hidden="true" className="inline-flex gap-[3px]">
                {commander.colorIdentity.map((k) => (
                  <i key={k} className="block h-[7px] w-[7px] rounded-[1px]" style={{ background: `var(--${k.toLowerCase()})` }} />
                ))}
              </span>
            </span>
          </span>
        ) : (
          <span className="block px-[16px] pt-[16px] font-display text-[17px] font-bold text-[color:var(--fg)]">{precon.name}</span>
        )}
        <span className="flex flex-1 flex-col gap-[10px] px-[16px] pb-[16px] pt-[14px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{commander ? c.preconKicker(commander.name) : c.preconTag}</span>
          <span className="m-0 block text-[14px] leading-[1.6] text-[color:var(--fg-body)]">{precon.overview}</span>
          <span className="mt-auto inline-flex min-h-[44px] items-center text-[13.5px] text-[color:var(--accent-text)] md:min-h-[32px]">{c.preconOpen}</span>
        </span>
      </button>
      {open ? (
        <CardDetailContext.Provider value={NO_OPEN}>
          <HoverPreviewProvider>
            <PreconSynopsisModal
              preconName={precon.name}
              content={precon.content}
              contractVersion={precon.contractVersion}
              commanderId={commander?.oracleId ?? null}
              art={findingArt}
              evidenceNames={precon.evidenceNames}
              onClose={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
              footer={
                <div data-testid="precon-teaser" className="flex flex-col gap-[14px] border-t border-solid border-t-[color:var(--border)] pt-[16px]">
                  <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--fg-body)]">{c.preconTeaser}</p>
                  <LaunchPanel />
                </div>
              }
            />
          </HoverPreviewProvider>
        </CardDetailContext.Provider>
      ) : null}
    </>
  );
}
