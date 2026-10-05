"use client";

import { useState } from "react";

import { BRACKET_RULES_SOURCE, SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { howItWorksCopy, type HowMethod } from "../../lib/copy/about";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { formatDeckDate } from "../../lib/decks/format";
import { MethodTags } from "../ui/method-tag";
import { useDeckPageSwitches } from "./deck-page-switches";
import { ModalChrome } from "./receipt-modal";

const copy = deckAnalysisCopy;

/**
 * "How we make these decisions →", and the sheet it opens (the Analysis tab handoff's 3c): 560px,
 * no mark, no aside, and the shipped body unchanged. Opened from the findings' head row. Outside
 * links leave the app, and nothing else in the sheet opens anything.
 *
 * FIVE ROWS, the four bracket rules and tutors (brief §5.5): where each figure comes from, then
 * what it might miss. Game changers carries no misses line, and that contrast is the point: a
 * reader who sees four caveats beside one flat statement learns which count is exact without
 * being told.
 *
 * TWO SOURCES ARE LINKED, and they are the two that ARE someone else's list. The Game Changer
 * list and the bracket rules are Wizards' — a dated blog post, so the row says when it was last
 * read against the code — and the combo index is Commander Spellbook's. The land-denial and
 * extra-turn rows combine Spellbook's bracket estimate with our own reading of the rules text,
 * and say so in their sentences; neither is a list to link to.
 *
 * METHOD TAGS, behind HOW_IT_WORKS_ENABLED (About's "How the app reaches its answers", Hugh
 * 2026-09-28): each row names how its count is reached, in the same words the About appendix uses.
 * Off, the sheet is exactly as it was.
 *
 * LOCAL STATE, NEVER PERSISTED. It is read once, mid-argument, and a sheet that reopened itself
 * on every visit would be a sheet nobody asked to see again.
 */
export function ProvenanceOpener({
  className = "",
  tone = "quiet",
}: {
  className?: string;
  /**
   * `quiet` is the findings head row's (10px, `--fg-faint`); `accent` is the empty state's
   * (11px, `--accent`), where it sits beside the one call to action (handoff §2, 2a).
   */
  tone?: "quiet" | "accent";
}) {
  const [open, setOpen] = useState(false);
  const accent = tone === "accent";
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        data-testid="provenance-opener"
        className={
          "inline-flex min-h-[44px] items-center gap-[8px] bg-transparent border-0 p-0 font-mono cursor-pointer "
          + (accent ? "text-[11px] text-[color:var(--accent)] " : "md:min-h-0 text-[10px] text-[color:var(--fg-faint)] ")
          + className
        }
      >
        <span
          className={`border-b border-dotted ${accent ? "border-b-[color:var(--accent)] border-[color:var(--accent)]" : "border-b-[color:var(--border-dashed)] border-[color:var(--border-dashed)]"}`}
        >
          {copy.provenance.toggle}
        </span>
        <span aria-hidden>→</span>
      </button>
      {open ? <ProvenanceSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ProvenanceSheet({ onClose }: { onClose: () => void }) {
  const d = copy.detection;
  const { howItWorks } = useDeckPageSwitches();
  const m = howItWorksCopy.bracketMethods;
  const rows: {
    key: string;
    label: string;
    from: string;
    methods: readonly HowMethod[];
    misses?: string | null;
    link?: { name: string; url: string };
  }[] = [
    {
      key: "gameChangers",
      label: copy.findings.labels.gameChangers,
      from: d.gameChangers.from,
      methods: m.gameChangers,
      link: { name: BRACKET_RULES_SOURCE.name, url: BRACKET_RULES_SOURCE.url },
    },
    { key: "massLandDenial", label: copy.findings.labels.massLandDenial, from: d.landDenial.from, methods: m.landDenial, misses: d.landDenial.misses },
    { key: "extraTurns", label: copy.findings.labels.extraTurns, from: d.extraTurns.from, methods: m.extraTurns, misses: d.extraTurns.misses },
    {
      key: "twoCardCombos",
      label: copy.findings.labels.twoCardCombos,
      from: d.combos.from,
      methods: m.combos,
      misses: d.combos.misses,
      link: { name: SPELLBOOK_SOURCE.name, url: SPELLBOOK_SOURCE.url },
    },
    { key: "tutors", label: copy.findings.labels.tutors, from: d.tutors.from, methods: m.tutors, misses: d.tutors.misses },
  ];

  return (
    <ModalChrome
      title={copy.provenance.toggle}
      closeLabel={copy.sheets.closeProvenance}
      onClose={onClose}
      width={560}
    >
      <div data-testid="provenance" className="flex flex-col gap-[11px] md:gap-[12px] px-[16px] py-[14px] md:px-[18px] md:pt-[16px] md:pb-[18px] text-[12.5px] leading-[1.6]" style={{ color: "var(--fg-muted)" }}>
        <p className="m-0" style={{ color: "var(--fg-body)" }}>{copy.provenance.lead}</p>
        <dl className="m-0 flex flex-col gap-[10px]">
          {rows.map((row) => (
            <div key={row.key} className="flex flex-col gap-[3px] border-t border-[color:var(--border)] pt-[10px]">
              <dt className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] font-semibold text-[12px]" style={{ color: "var(--fg)" }}>
                {row.label}
                {howItWorks ? <MethodTags methods={row.methods} /> : null}
              </dt>
              <dd className="m-0">
                {row.from}
                {row.link ? (
                  <>
                    {" "}
                    <a
                      href={row.link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10.5px] no-underline border-b border-b-[color:var(--accent)] border-[color:var(--accent)] text-[color:var(--accent)]"
                    >
                      {copy.provenance.source(row.link.name)}
                    </a>
                  </>
                ) : null}
              </dd>
              {row.key === "gameChangers" ? (
                <dd className="m-0 font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
                  {copy.provenance.rulesChecked(formatDeckDate(new Date(`${BRACKET_RULES_SOURCE.lastChecked}T12:00:00Z`)))}
                </dd>
              ) : null}
              {row.misses ? <dd className="m-0">{row.misses}</dd> : null}
            </div>
          ))}
        </dl>
        <p className="m-0" style={{ color: "var(--fg-faint)" }}>{d.why}</p>
      </div>
    </ModalChrome>
  );
}
