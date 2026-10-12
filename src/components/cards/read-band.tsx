"use client";

// FIND A DECK READ'S BAND (handoff R2 §2, §3, §5): the one place the read is offered, runs and fails,
// first under the view's head, in the same spot in every state. The press is Proposed cuts' button
// with its credit as a segment, and the standing line under it is the shared credit line.
import type { ReactNode } from "react";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { CreditButton, FailMark } from "../ui/credit-button";
import { CreditsText } from "../ui/credits-text";

const copy = swapToolsCopy.fits.read;

function Band({ children, accent = false, testId }: { children: ReactNode; accent?: boolean; testId: string }) {
  return (
    <section
      data-testid={testId}
      className="flex flex-col gap-[11px] rounded-[10px] px-[16px] py-[14px]"
      style={{ background: "var(--surface)", border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}` }}
    >
      {children}
    </section>
  );
}

const Standing = ({ line }: { line: string }) => (
  <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]"><CreditsText text={line} /></p>
);

/** P1, P1a, P1c, P8: the offer. Spent or paused, the press is off and its segment goes. */
export function OfferBand({ lead, cardName, blocked, spent, closed = false, standing, onPress }: {
  lead: string; cardName: string; blocked: boolean; spent: boolean;
  /** Paused or the owner's share used: the press is off and its segment goes, as when spent. */
  closed?: boolean;
  standing: string; onPress: () => void;
}) {
  return (
    <Band testId="read-band-offer">
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [text-wrap:pretty]">{lead}</p>
      <div className="flex">
        <CreditButton
          label={copy.press}
          credit={copy.credit}
          filled
          blocked={blocked}
          spent={spent || closed}
          onPress={onPress}
          ariaLabel={spent ? copy.pressAriaSpent : closed ? copy.press : copy.pressAria(cardName)}
        />
      </div>
      <Standing line={standing} />
    </Band>
  );
}

/** P2: running. Still rows hold the read's place; no Stop (the run outlives the view, lock 5). */
export function RunningBand({ title, elapsed }: { title: string; elapsed: string }) {
  return (
    <>
      <Band testId="read-band-running" accent>
        <p className="m-0 flex items-center gap-[8px] text-[13.5px] font-semibold text-[color:var(--fg)]">
          <span aria-hidden className="w-[7px] h-[7px] flex-none rounded-full bg-[color:var(--accent)]" />
          {title}
        </p>
        <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{`${copy.runningSub} · ${elapsed}`}</p>
        <p className="m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.runningKeep}</p>
      </Band>
      <div aria-hidden data-testid="read-skeleton" className="flex flex-col gap-[10px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-[8px] rounded-[9px] p-[12px] border border-solid border-[color:var(--border)]" style={{ background: "var(--surface-sunken)" }}>
            <span className="h-[10px] w-[42%] rounded-[3px]" style={{ background: "var(--elevated)" }} />
            <span className="h-[8px] w-[88%] rounded-[3px]" style={{ background: "var(--surface-raised)" }} />
            <span className="h-[8px] w-[70%] rounded-[3px]" style={{ background: "var(--surface-raised)" }} />
          </div>
        ))}
      </div>
    </>
  );
}

/** P7: failed. The credit came back; Try again carries the same segment, outlined. */
export function FailedBand({ blocked, spent, standing, onRetry }: { blocked: boolean; spent: boolean; standing: string; onRetry: () => void }) {
  return (
    <Band testId="read-band-failed">
      <p className="m-0 flex items-center gap-[8px] text-[13.5px] font-semibold text-[color:var(--fg)]">
        <FailMark label={copy.failedTag} />
        {copy.failedHead}
      </p>
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.failedBody}</p>
      <div className="flex">
        <CreditButton label={copy.retry} credit={copy.credit} filled={false} blocked={blocked} spent={spent} onPress={onRetry} />
      </div>
      <Standing line={standing} />
    </Band>
  );
}

/** P6, P6b: no real fit. No press: the same inputs would say the same thing. */
export function NoFitBox({ body, foot }: { body: string; foot: string }) {
  return (
    <Band testId="read-band-nofit">
      <p className="m-0 text-[13.5px] font-semibold text-[color:var(--fg)]">{copy.noFitHead}</p>
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [text-wrap:pretty]">{body}</p>
      <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{foot}</p>
    </Band>
  );
}
