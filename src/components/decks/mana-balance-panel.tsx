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
import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import { colorRows } from "../../lib/mana/color-rows";
import { defaultPatternColor, pippedColors, tappedTotal, type ManaPanelData } from "../../lib/tuning/mana-view";
import { ColorlessLine, KarstenCitation, ManaEvidenceTable, NeedsExplainer } from "./mana-evidence";
import { ImproveDoor, type HelpRead } from "./mana-improve-door";
import { hardestClause, LandFacts, ManaSection, PatternRows } from "./mana-sections";
import { FailureMark } from "./tuning-history";
import { useStoredKeys } from "./use-folded-shelves";

/** The counting frame appears only after this, so a fast read never flashes it. */
const COUNTING_DELAY_MS = 400;

/** The OPEN sections, per deck (both start folded: R3b, design table `ManaSection`). */
export const manaOpenKey = (deckId: string) => `the99.mana.open.${deckId}`;

const SHELL = "mt-[18px] flex flex-col gap-[18px] rounded-[12px] px-[14px] py-[16px] md:mt-6 md:px-[20px] md:py-[18px]";
const SHELL_STYLE = { background: "var(--surface-sunken)", border: "1px solid var(--border)" } as const;
const HEADING = "font-display text-[17px] font-semibold outline-none md:text-[19px]";

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

  if (failed && data === null) {
    return (
      <section aria-labelledby="mana-heading" data-mana-state="failed" className={SHELL} style={SHELL_STYLE}>
        <div className="flex flex-col gap-[6px]">
          <h2 id="mana-heading" tabIndex={-1} className={`flex items-center gap-[9px] ${HEADING}`} style={{ color: "var(--fg)" }}>
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

  const { balance, commander, commanders, cards, ids, art } = data;
  const { pipTotal, sourceTotal, rows } = colorRows(balance.supply);
  const colorless = balance.state === "colorless";
  const pipped = pippedColors(balance.colors);
  const initial = defaultPatternColor(balance.colors);
  const supply = balance.supply;
  // The Colors card's own footer test: the deck has no lands and no other source of any kind.
  const noLands = supply.lands === 0 && supply.nonlandSources === 0 && supply.unattributedNonland === 0;
  const colorlessRow = rows.find((r) => r.c === "C");

  return (
    <section aria-labelledby="mana-heading" data-mana-state={balance.state} className={SHELL} style={SHELL_STYLE}>
      <div className="flex flex-col gap-[6px]">
        <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[3px]">
          <h2 id="mana-heading" tabIndex={-1} className={HEADING} style={{ color: "var(--fg)" }}>{copy.title}</h2>
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.sub(pipTotal, sourceTotal)}</span>
        </div>
        {colorless ? (
          <div className="flex items-start gap-[10px] rounded-[10px] border border-[color:var(--border-strong)] bg-[var(--surface)] px-[14px] py-[12px]">
            <span aria-hidden className="inline-flex size-[18px] flex-none items-center justify-center rounded-full border border-[color:var(--fg-faint)] font-mono text-[10.5px] font-semibold text-[color:var(--fg-faint)]">i</span>
            <p className="min-w-0 flex-1 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.thin.colorless}</p>
          </div>
        ) : (
          <p className="max-w-[660px] text-[13px] leading-[1.6] [text-wrap:pretty] text-[color:var(--fg-body)] md:text-[13.5px]">
            {balance.state === "noSources" && noLands ? `${deckStatsCopy.colors.noLands} ${copy.thin.noSources}` : copy.lead}
          </p>
        )}
      </div>

      {colorless ? (
        // Alone, every source is colorless, so a share of them says nothing. A deck with no {C} pip and
        // no source still draws the line the note points to, at zero.
        <ColorlessLine row={colorlessRow ?? { c: "C", pips: 0, lands: 0, other: 0, pipShare: 0, sourceShare: 0 }} share={false} />
      ) : (
        <div className="flex flex-col gap-[8px]">
          <ManaEvidenceTable balance={balance} />
          <NeedsExplainer />
        </div>
      )}

      {!colorless && initial ? (
        <ManaSection id="hardest" label={copy.sections.hardest.label} clause={hardestClause(pipped)} open={sections.has("hardest")} onToggle={() => sections.toggle("hardest")}>
          <PatternRows colors={balance.colors} initial={initial} ids={ids} art={art} />
        </ManaSection>
      ) : null}
      <ManaSection
        id="lands"
        // R3b sets the two sections 12 apart, not the panel's 18.
        tight={!colorless && !!initial}
        label={copy.sections.lands.label}
        clause={copy.sections.lands.clause(balance.lands.count, tappedTotal(balance.lands.tapped), balance.lands.karstenLands.toFixed(1))}
        open={sections.has("lands")}
        onToggle={() => sections.toggle("lands")}
      >
        <LandFacts lands={balance.lands} cards={cards} commander={commander} commanders={commanders} />
      </ManaSection>

      <ImproveDoor deckId={deckId} balance={balance} commander={commander} revision={revision} read={help} />

      <KarstenCitation landOnly={colorless} />
    </section>
  );
}
