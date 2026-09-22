"use client";

import { useId, useState } from "react";

import { BRACKET_RULES_SOURCE, SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { formatDeckDate } from "../../lib/decks/format";

const copy = deckAnalysisCopy;

/**
 * "How we make these decisions" — collapsed by default, expanding in place.
 *
 * FOUR ROWS: where each figure comes from, then what it might miss. Game changers carries no
 * misses line, and that contrast is the point: a reader who sees three caveats beside one flat
 * statement learns which count is exact without being told.
 *
 * TWO SOURCES ARE LINKED, and they are the two that ARE someone else's list. The Game Changer
 * list and the bracket rules are Wizards' — a dated blog post, so the row says when it was last
 * read against the code — and the combo index is Commander Spellbook's. The land-denial and
 * extra-turn rows combine Spellbook's bracket estimate with our own reading of the rules text,
 * and say so in their sentences; neither is a list to link to.
 *
 * LOCAL STATE, NEVER PERSISTED. It is read once, mid-argument, and a panel that reopened itself
 * on every visit would be a panel nobody asked to see again.
 */
export function ProvenancePanel() {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const d = copy.detection;
  const rows: { key: string; label: string; from: string; misses?: string | null; link?: { name: string; url: string } }[] = [
    {
      key: "gameChangers",
      label: copy.findings.labels.gameChangers,
      from: d.gameChangers.from,
      link: { name: BRACKET_RULES_SOURCE.name, url: BRACKET_RULES_SOURCE.url },
    },
    { key: "massLandDenial", label: copy.findings.labels.massLandDenial, from: d.landDenial.from, misses: d.landDenial.misses },
    { key: "extraTurns", label: copy.findings.labels.extraTurns, from: d.extraTurns.from, misses: d.extraTurns.misses },
    {
      key: "twoCardCombos",
      label: copy.findings.labels.twoCardCombos,
      from: d.combos.from,
      misses: d.combos.misses,
      link: { name: SPELLBOOK_SOURCE.name, url: SPELLBOOK_SOURCE.url },
    },
  ];

  return (
    <section className="flex flex-col gap-[10px]" data-testid="provenance">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="self-start inline-flex min-h-[44px] md:min-h-0 items-center gap-[8px] md:gap-[9px] bg-transparent border-0 p-0 font-mono text-[10px] cursor-pointer text-[color:var(--fg-faint)]"
      >
        <span className="border-b border-dotted border-[color:var(--border-dashed)]">{copy.provenance.toggle}</span>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div id={bodyId} className="flex flex-col gap-[12px] text-[12.5px] leading-[1.6]" style={{ color: "var(--fg-muted)" }}>
          <p className="m-0" style={{ color: "var(--fg-body)" }}>{copy.provenance.lead}</p>
          <dl className="m-0 flex flex-col gap-[10px]">
            {rows.map((row) => (
              <div key={row.key} className="flex flex-col gap-[3px] border-t border-[color:var(--border)] pt-[10px]">
                <dt className="font-semibold text-[12px]" style={{ color: "var(--fg)" }}>{row.label}</dt>
                <dd className="m-0">
                  {row.from}
                  {row.link ? (
                    <>
                      {" "}
                      <a
                        href={row.link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10.5px] no-underline border-b border-[color:var(--accent)] text-[color:var(--accent)]"
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
      ) : null}
    </section>
  );
}
