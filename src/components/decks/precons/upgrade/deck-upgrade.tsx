"use client";

// Upgrade precon on the deck page (addendum A2c, B2; STATES-deck-page.md). The precon page's press (R2c) in a precon band under
// the deck header, between the header and the Recommended mix, while the deck is still the box (the gate, `deck-gate.ts`):
//
// - The first visit after a start, it IS the shipped arrival receipt (`PreconArrivalBand`), its body and History kept, with
//   the press in the ✕'s place. After that visit the band stays, with no ✕ and no mark, until the gate closes.
// - Desktop: one line, the head and the mono owned line on the left, the press at the right at 32px. Phone: one row about
//   64px tall, the head shortened to `From the … precon` and ellipsized, the owned line under it, the press at 44px.
// - The flow is R2d's, over this page, with the intro's last line and the result's press in the deck's words. Apply is one
//   press with one Undo: no second confirm, because the result is the review. It is free; only a run costs credits.
//
// The host stays mounted while the band comes and goes: Apply refreshes the page, the gate closes and the band leaves, and
// the toast with its Undo (held here) must outlive it.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyPreconUpgradeOnDeck, undoPreconUpgradeOnDeck } from "../../../../app/decks/precon-upgrade-deck-actions";
import { preconsCopy } from "../../../../lib/copy/precons";
import { preconUpgradeCopy, preconUpgradeDeckCopy } from "../../../../lib/copy/precon-upgrade";
import type { PreconArrival } from "../../../../lib/precons/arrival-read";
import type { DeckUpgrade } from "../../../../lib/precons/upgrade/deck-read";
import { DECK_TOAST_CLAIM, ToastFrame, useToastClock } from "../../../collection/edit-toast-frame";
import { ArrivalBandShell, PreconArrivalBand } from "../../arrival-strip";
import { DeckRefusalToast } from "../../token-refusal-toast";
import { leadOf } from "./result-view";
import { UpgradeFlow } from "./upgrade-flow";
import { runningLabel, useLinePulse, useUpgradeRun, type Picks } from "./use-upgrade-run";
import { useClock } from "./wait-view";

const copy = preconUpgradeDeckCopy;

type Receipt = { arrival: PreconArrival; added: { entryId: string } | null; onDismiss: () => void };
type Applied = { runId: string; text: string };

export function DeckUpgradeHost({ deckId, upgrade, receipt, commanderArt }: {
  deckId: string;
  /** The band's read (`readDeckUpgrade`); null while the gate is shut, or the switch is off, or the read failed. */
  upgrade: DeckUpgrade | null;
  /** The shipped arrival receipt, on the first visit after a start; null otherwise or once dismissed. */
  receipt: Receipt | null;
  /** The deck's own commanders' art: the box's commander is not one of the 99 the band's read carries. */
  commanderArt: [string, string | null][];
}) {
  const [applied, setApplied] = useState<Applied | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <>
      {upgrade ? (
        <DeckUpgradeBand key={upgrade.fileName} deckId={deckId} upgrade={upgrade} receipt={receipt} commanderArt={commanderArt} onApplied={(a) => { setFailed(null); setApplied(a); }} onFailed={setFailed} />
      ) : receipt ? (
        <PreconArrivalBand onDismiss={receipt.onDismiss} arrival={receipt.arrival} added={receipt.added} />
      ) : null}
      {applied && <AppliedToast key={applied.runId} deckId={deckId} applied={applied} onDone={() => setApplied(null)} onFailed={(t) => { setApplied(null); setFailed(t); }} />}
      {failed && <DeckRefusalToast kind="upgrade-refusal" title={failed} onDone={() => setFailed(null)} />}
    </>
  );
}

function DeckUpgradeBand({ deckId, upgrade, receipt, commanderArt, onApplied, onFailed }: {
  deckId: string;
  upgrade: DeckUpgrade;
  receipt: Receipt | null;
  commanderArt: [string, string | null][];
  onApplied: (a: Applied) => void;
  onFailed: (text: string) => void;
}) {
  const router = useRouter();
  const { panel, view, pending, open, setOpen, close, refresh, confirm } = useUpgradeRun(upgrade.fileName, upgrade.panel);
  const art = useMemo(() => new Map([...upgrade.art, ...commanderArt]), [upgrade.art, commanderArt]);
  const [applying, setApplying] = useState(false);
  // Applied, and the page's refresh (which takes the band away) not yet landed: the press stays off, or a second Apply of
  // the same run would be refused and say the deck hadn't changed.
  const [applied, setApplied] = useState(false);
  // A refusal that holds for one run (it no longer fits, or a cut is locked): said in the foot, its press off.
  const [refusals, setRefusals] = useState<Record<string, string>>({});

  async function apply(runId: string) {
    setApplying(true);
    try {
      const r = await applyPreconUpgradeOnDeck(deckId, runId);
      if (r.ok) {
        const run = panel.runs.find((x) => x.id === runId);
        const lead = run ? leadOf(panel, run) : null;
        const leads = lead && !lead.isFace ? lead.cards.map((c) => c.name).join(" + ") : null;
        setApplied(true);
        onApplied({ runId, text: copy.applied(r.swaps, leads) });
        close();
        // The deck moved off the box: the page's next render draws the swaps as changes since v0, and no band.
        router.refresh();
        return;
      }
      if (r.reason === "locked" || r.reason === "listChanged") {
        setRefusals((m) => ({ ...m, [runId]: r.reason === "locked" ? copy.locked : copy.listChanged }));
        if (r.reason === "listChanged") void refresh(true);
        return;
      }
      // Shut since the page drew (the deck changed in another tab) or the run is gone: the flow stays, and the page reads again.
      onFailed(copy.applyFailed);
      router.refresh();
    } catch {
      onFailed(copy.applyFailed);
    } finally {
      setApplying(false);
    }
  }

  const button = useRef<HTMLButtonElement>(null);
  const pulse = useLinePulse(button);
  const press = (
    <button
      ref={button}
      type="button"
      onClick={() => setOpen(true)}
      disabled={applied}
      aria-haspopup="dialog"
      // The phone's running label truncates inside the press rather than growing the row past one line.
      className="relative h-[44px] min-w-0 max-w-[60%] flex-none cursor-pointer self-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[9px] border-[1.5px] border-solid border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] px-[14px] font-sans text-[13.5px] font-semibold text-[color:var(--accent-text)] md:h-[32px] md:max-w-none md:rounded-[8px] md:px-[16px] md:text-[13px]"
    >
      {view.kind === "wait" ? <Running strategy={runningLabel(panel, view, pending?.id ?? null)} startedAt={view.startedAt} /> : copy.entry}
      {pulse > 0 && <span key={pulse} aria-hidden className="anim-line-pulse pointer-events-none absolute inset-0 rounded-[9px] md:rounded-[8px]" />}
    </button>
  );

  const a = upgrade.arrival;
  const owned = a.owned === a.of ? preconsCopy.arrival.bodyAll(a.unmapped) : preconsCopy.arrival.bodyShort(a.unmapped, a.owned, a.of);
  return (
    <>
      {receipt ? (
        <PreconArrivalBand onDismiss={receipt.onDismiss} arrival={receipt.arrival} added={receipt.added} action={press} />
      ) : (
        <ArrivalBandShell gap="gap-[12px] md:gap-[14px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[2px] md:flex-row md:flex-wrap md:items-baseline md:gap-x-[12px]">
            <p className="m-0 truncate text-[13px] font-semibold text-[color:var(--fg)] md:hidden">{copy.band.phone(upgrade.precon)}</p>
            <p className="m-0 hidden text-[13.5px] font-semibold text-[color:var(--fg)] md:block">
              {upgrade.kind === "linked" ? copy.band.linked(upgrade.precon) : copy.band.started(upgrade.precon)}
            </p>
            <p className="m-0 font-mono text-[11px] leading-[1.55] text-[color:var(--fg-faint)]">{owned}</p>
          </div>
          {press}
        </ArrivalBandShell>
      )}
      {open && (
        <UpgradeFlow
          key={view.kind === "results" ? `results:${view.runId}` : view.kind}
          precon={upgrade.precon}
          panel={panel}
          art={art}
          view={view}
          // A refusal is about the deck as it was: closing clears it, so an unlock or a refresh is read again on the next press.
          onClose={(how) => { setRefusals({}); close(how); }}
          onConfirm={(p) => void confirm(p as Picks)}
          onRetry={view.kind === "failed" ? () => void confirm(view.picks) : undefined}
          apply={{ nextVersion: upgrade.nextVersion, onApply: (id) => void apply(id), pending: applying, refusals }}
        />
      )}
    </>
  );
}

/** The press's label while a run is in flight: `Upgrading toward Spells · 0:04`, as the precon page's press reads. */
function Running({ strategy, startedAt }: { strategy: string; startedAt: number }) {
  return <>{preconUpgradeCopy.entry.running(strategy, useClock(startedAt))}</>;
}

/**
 * After Apply (A1): the shared toast, `Applied 14 swaps. Muddle leads.`, with Undo. It holds the deck stack's floor as a
 * receipt does, and the window holds on hover and focus and while the Undo is out.
 */
function AppliedToast({ deckId, applied, onDone, onFailed }: { deckId: string; applied: Applied; onDone: () => void; onFailed: (text: string) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [undoing, setUndoing] = useState(false);
  useToastClock(ref, !hover && !focus && !undoing, onDone);
  // A receipt entering the stack sends any alert there away (the refusal is older news).
  const self = useRef({});
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(DECK_TOAST_CLAIM, { detail: self.current }));
  }, []);

  async function undo() {
    if (undoing) return;
    setUndoing(true);
    try {
      const r = await undoPreconUpgradeOnDeck(deckId, applied.runId);
      if (!r.ok) { onFailed(copy.undoFailed); return; }
      onDone();
      // The box's list and commander are back, and so is the band.
      router.refresh();
    } catch {
      onFailed(copy.undoFailed);
    }
  }

  return (
    <ToastFrame
      frameRef={ref}
      placement="deck"
      kind="receipt"
      title={applied.text}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
      actions={
        <button
          type="button"
          onClick={() => void undo()}
          aria-disabled={undoing || undefined}
          aria-busy={undoing || undefined}
          className={`inline-flex h-[44px] items-center whitespace-nowrap border-0 bg-transparent px-[10px] text-[13.5px] font-semibold ${undoing ? "cursor-default text-[color:var(--fg-muted)] opacity-80" : "cursor-pointer text-[color:var(--accent-text)]"}`}
        >
          {copy.undo}
        </button>
      }
    />
  );
}
