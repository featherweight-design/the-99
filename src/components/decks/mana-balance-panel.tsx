"use client";

// Mana Balance (Tuning hub handoff R3b, the full view): the free count of a deck's colors, read
// fresh on every open, with no button, no credit and no verdict. Order, top to bottom: title and
// sub, lead, the evidence table, "What Needs means", Hardest costs and Lands (both folded until
// opened, remembered per deck), the Improve my mana door, and the citation.
//
// The read mirrors Proposed cuts' (`cuts-panel.tsx`): read on mount and again whenever `revision`
// moves, only the newest-asked read drawn, a failed read its own state, and a counting frame that
// appears only after a short delay so a fast read never flashes it. The stable heading
// (`#mana-heading`) is drawn in the ready and failed states only, so the hub's focus waits for it.

import { useCallback, useEffect, useRef, useState } from "react";

import { readManaBalance } from "../../app/decks/mana-actions";
import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import type { ManaPanelData } from "../../lib/tuning/mana-view";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { MANA_HEADING as HEADING, MANA_SHELL as SHELL, MANA_SHELL_STYLE as SHELL_STYLE, ManaBalanceView } from "./mana-balance-view";
import { ImproveDoor, type HelpRead } from "./mana-improve-door";
import { FailureMark } from "./tuning-history";
import { useStoredKeys } from "./use-folded-shelves";
import { useTarget } from "../discovery/targets-provider";

/** The counting frame appears only after this, so a fast read never flashes it. */
const COUNTING_DELAY_MS = 400;

/** The OPEN sections, per deck (both start folded: R3b, design table `ManaSection`). */
export const manaOpenKey = (deckId: string) => `the99.mana.open.${deckId}`;

export function ManaBalancePanel({
  deckId,
  read = readManaBalance,
  help,
  revision,
  onSettled,
}: {
  deckId: string;
  /** The server action; injectable so every state is testable without a request. */
  read?: (deckId: string) => Promise<ManaPanelData | null>;
  /** The help read, injectable for the same reason. */
  help?: HelpRead;
  /** Changes whenever the list changes elsewhere on the page, so the count is read again. */
  revision?: string;
  /** Called once the first read has landed or failed (the tab's opening loader). */
  onSettled?: () => void;
}) {
  const [data, setData] = useState<ManaPanelData | null>(null);
  const [failed, setFailed] = useState(false);
  const [counting, setCounting] = useState(false);
  const settledRef = useRef(onSettled);
  useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

  // Reads can overlap (the mount's, one per revision), and a slow one asked first must not land
  // over a newer answer: only the latest-asked read is drawn.
  const asked = useRef(0);
  const reread = useCallback(async () => {
    const mine = ++asked.current;
    try {
      const next = await read(deckId);
      if (mine !== asked.current) return;
      // Null is a refusal or a catalog read that failed: either way there is no count to draw.
      setData(next);
      setFailed(next === null);
    } catch {
      if (mine !== asked.current) return;
      setData(null);
      setFailed(true);
    }
  }, [read, deckId]);

  useEffect(() => {
    const t = setTimeout(() => setCounting(true), COUNTING_DELAY_MS);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading external state on mount, as the other panels do
    void reread().finally(() => { clearTimeout(t); settledRef.current?.(); });
    return () => clearTimeout(t);
  }, [reread]);

  const seenRevision = useRef(revision);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    void reread();
  }, [revision, reread]);

  const sections = useStoredKeys(manaOpenKey(deckId));
  // The head is the tool's landing target (discovery R2, E11): drawn in the ready and failed states, so a landing
  // waits out the first read.
  const target = useTarget("mana-balance");

  if (failed && data === null) {
    return (
      <section aria-labelledby="mana-heading" data-mana-state="failed" className={SHELL} style={SHELL_STYLE}>
        <div className="flex flex-col gap-[6px]">
          <h2 id="mana-heading" ref={target} tabIndex={-1} className={`flex items-center gap-[9px] ${HEADING}`} style={{ color: "var(--fg)" }}>
            <span style={{ color: "var(--danger)" }}><FailureMark size={16} label={copy.failed.tag} /></span>
            {copy.failed.heading}
          </h2>
          <p className="text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{copy.failed.body}</p>
          <p className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.failed.kept}</p>
        </div>
      </section>
    );
  }
  if (data === null) {
    // A different element tree from the ready state's, and no `mana-heading`: the hub's focus
    // waits for the real heading, and a reused node would hide the swap.
    return counting ? (
      <div role="status" aria-busy="true" aria-label={copy.title} data-mana-state="counting" className={SHELL} style={SHELL_STYLE}>
        <p className={HEADING} style={{ color: "var(--fg)" }}>{copy.title}</p>
      </div>
    ) : null;
  }

  return (
    <ManaBalanceView
      data={data}
      isOpen={(id) => sections.has(id)}
      onToggle={(id) => sections.toggle(id)}
      headingRef={target}
      improve={<ImproveDoor deckId={deckId} balance={data.balance} commander={data.commander} revision={revision} read={help} />}
      renderCard={(c) => (
        <CardDetailTrigger oracleId={c.oracleId} name={c.name} siblings={c.siblings} imageUri={c.imageUri} preview className={c.className}>
          {c.name}
        </CardDetailTrigger>
      )}
    />
  );
}
