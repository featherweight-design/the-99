"use client";

// Mana Balance's DRAWING, from props alone (public landing demo, PR 5f): the ready state's title and sub, lead, evidence
// table, "What Needs means", Hardest costs and Lands (folded until opened), the Improve my mana door's slot and the
// citation. `ManaBalancePanel` (`mana-balance-panel.tsx`) keeps the read, the stored open sections, the landing target and
// the help read, and renders this around the door; the landing demo renders it from the fictional fixture.
//
// Nothing here calls a server action, reads the session or the card-detail provider: the door arrives as a node, and a
// card name in Hardest costs is drawn through `renderCard` (none draws the plain name). Listed in
// `PUBLIC_SURFACE_COMPONENTS`, so the public-surface walk keeps it pure.

import type { ReactNode, Ref } from "react";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import { colorRows } from "../../lib/mana/color-rows";
import { defaultPatternColor, pippedColors, tappedTotal, type ManaPanelData } from "../../lib/tuning/mana-view";
import { ColorlessLine, KarstenCitation, ManaEvidenceTable, NeedsExplainer } from "./mana-evidence";
import { hardestClause, LandFacts, ManaSection, PatternRows, type CardNameRender } from "./mana-sections";

export const MANA_SHELL = "mt-[18px] flex flex-col gap-[18px] rounded-[12px] px-[14px] py-[16px] md:mt-6 md:px-[20px] md:py-[18px]";
export const MANA_SHELL_STYLE = { background: "var(--surface-sunken)", border: "1px solid var(--border)" } as const;
export const MANA_HEADING = "font-display text-[17px] font-semibold outline-none md:text-[19px]";

/** The two sections that fold. */
export type ManaSectionId = "hardest" | "lands";

export function ManaBalanceView({
  data,
  isOpen,
  onToggle,
  headingRef,
  improve,
  renderCard,
}: {
  data: ManaPanelData;
  /** Whether a section is open (the signed-in panel remembers this per deck). */
  isOpen: (id: ManaSectionId) => boolean;
  onToggle: (id: ManaSectionId) => void;
  headingRef?: Ref<HTMLHeadingElement>;
  /** The Improve my mana door: the caller's, since it reads and writes the deck. */
  improve?: ReactNode;
  /** A card name in Hardest costs, as the caller draws it (the signed-in panel: the card-detail trigger). */
  renderCard?: CardNameRender;
}) {
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
    <section aria-labelledby="mana-heading" data-mana-state={balance.state} className={MANA_SHELL} style={MANA_SHELL_STYLE}>
      <div className="flex flex-col gap-[6px]">
        <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[3px]">
          <h2 id="mana-heading" ref={headingRef} tabIndex={-1} className={MANA_HEADING} style={{ color: "var(--fg)" }}>{copy.title}</h2>
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
        <ManaSection id="hardest" label={copy.sections.hardest.label} clause={hardestClause(pipped)} open={isOpen("hardest")} onToggle={() => onToggle("hardest")}>
          <PatternRows colors={balance.colors} initial={initial} ids={ids} art={art} renderCard={renderCard} />
        </ManaSection>
      ) : null}
      <ManaSection
        id="lands"
        // R3b sets the two sections 12 apart, not the panel's 18.
        tight={!colorless && !!initial}
        label={copy.sections.lands.label}
        clause={copy.sections.lands.clause(balance.lands.count, tappedTotal(balance.lands.tapped), balance.lands.karstenLands.toFixed(1))}
        open={isOpen("lands")}
        onToggle={() => onToggle("lands")}
      >
        <LandFacts lands={balance.lands} cards={cards} commander={commander} commanders={commanders} />
      </ManaSection>

      {improve}

      <KarstenCitation landOnly={colorless} />
    </section>
  );
}
