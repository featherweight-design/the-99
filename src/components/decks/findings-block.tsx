"use client";

import { useState } from "react";

import { findings, type Finding } from "../../lib/bracket/findings";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import type { DeckProfile } from "../../lib/profile/types";
import { FindingMark } from "./finding-mark";
import { ProvenanceOpener } from "./provenance-panel";
import { ReceiptModal, type FindingArt } from "./receipt-modal";

const copy = deckAnalysisCopy.findings;

/** How many names a finding prints before its `+n`. The phone row has the whole width. */
const NAMES_DESKTOP = 2;
const NAMES_PHONE = 3;

/**
 * "What is in this deck" — five findings, each with its count and its cards, and the receipt
 * behind every one that has cards.
 *
 * ONE RULE GOVERNS THE TAB: the climb states, the findings open. A present finding's control
 * opens its receipt and a zero draws no control at all; the section's only other control is the
 * head row's `How we make these decisions →`, which is about all five rather than any one.
 *
 * ONE LIST AT BOTH WIDTHS, restyled rather than drawn twice. Desktop lays the five out as tiles
 * in a row; the phone stacks them as rows in one box. Two subtrees would mount every control
 * twice, and a hidden copy of a button is a second thing for a test or a probe to find.
 */
export function FindingsBlock({ profile, art }: { profile: DeckProfile; art: FindingArt }) {
  const list = findings(profile);
  const [open, setOpen] = useState<Finding["id"] | null>(null);
  const opened = open ? list.find((f) => f.id === open) ?? null : null;

  return (
    // ONE OPENER for how these are decided, mounted once: at the head row's right end on desktop,
    // where the grid places it, and under the box at 44px on the phone (handoff §2, row 4).
    <section
      className="flex flex-col gap-[9px] md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-x-3 md:gap-y-[11px]"
      data-testid="findings-block"
    >
      <h3
        className="m-0 font-mono font-normal uppercase text-[9.5px] tracking-[0.14em] md:text-[10px] md:tracking-[0.16em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {copy.heading}
      </h3>
      {/* In the DOM straight after the heading, so focus meets it where desktop draws it; the phone
          moves it under the box with `order`. */}
      <ProvenanceOpener className="self-start max-md:order-last" />
      <ul
        className={
          "md:col-span-2 "
          +
          // The phone's box is one surface; the desktop's is the page, with each tile its own.
          "m-0 p-0 list-none flex flex-col overflow-hidden rounded-[11px] border border-[color:var(--border)] "
          + "max-md:bg-[color:var(--surface)] "
          + "md:grid md:grid-cols-5 md:gap-[10px] md:overflow-visible md:rounded-none md:border-0"
        }
      >
        {list.map((f) => (
          <FindingItem key={f.id} finding={f} art={art} onOpen={() => setOpen(f.id)} />
        ))}
      </ul>
      {opened ? <ReceiptModal finding={opened} art={art} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

function FindingItem({
  finding,
  art,
  onOpen,
}: {
  finding: Finding;
  art: FindingArt;
  onOpen: () => void;
}) {
  const empty = finding.state === "empty";
  const label = copy.labels[finding.id];
  const names = namesOf(finding, art);

  return (
    <li
      data-testid={`finding-${finding.id}`}
      data-state={finding.state}
      className={
        "flex flex-col border-b border-b-[color:var(--border)] last:border-b-0 "
        + "md:rounded-[9px] md:border md:last:border-b md:last:border-b-[color:var(--border)] md:bg-[color:var(--surface)] md:gap-[7px] md:px-[14px] md:py-[12px] "
        + (empty
          ? "px-[13px] py-[11px] max-md:opacity-50 "
          : "px-[13px] pt-[11px] md:border-[color:var(--border-strong)] md:last:border-b-[color:var(--border-strong)] ")
      }
    >
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[7px] md:gap-x-[7px]">
        {/* The mark and the figure dim together on desktop; on the phone the whole row does. */}
        <span className={"flex items-center gap-[10px] md:gap-[7px]" + (empty ? " md:opacity-35" : "")}>
          <FindingMark id={finding.id} />
          <span
            className="font-mono font-semibold leading-none text-[15px] md:text-[19px]"
            style={{ color: empty ? "var(--fg-faint)" : "var(--fg)" }}
          >
            {finding.count}
          </span>
        </span>
        {/* On its own line on desktop, beside the figure on the phone. */}
        <span className="flex flex-wrap items-center gap-[7px] md:basis-full">
          <span
            className={"text-[12.5px] md:text-[12px] " + (empty ? "font-medium" : "font-semibold")}
            style={{ color: empty ? "var(--fg-muted)" : "var(--fg)" }}
          >
            {label}
          </span>
          {finding.state === "notALimit" ? (
            <span
              className="font-mono text-[8.5px] uppercase tracking-[0.1em] rounded-full border border-[color:var(--border-strong)] px-[6px] py-[2px]"
              style={{ color: "var(--fg-faint)" }}
            >
              {copy.noLimit}
            </span>
          ) : null}
        </span>
      </div>

      {empty ? (
        // Desktop only. The phone's empty row is one line, and the zero already says it.
        <span className="hidden md:block text-[10.5px]" style={{ color: "var(--fg-disabled)" }}>
          {copy.empty}
        </span>
      ) : (
        <>
          <span
            className="mt-[4px] pl-[26px] text-[11.5px] leading-[1.5] md:mt-0 md:pl-0 md:text-[10.5px] md:leading-normal"
            style={{ color: "var(--fg-muted)" }}
          >
            <span className="md:hidden">{names.phone}</span>
            <span className="hidden md:inline">{names.desktop}</span>
          </span>
          <span className="flex justify-end md:justify-start">
            <button
              type="button"
              onClick={onOpen}
              aria-label={copy.openAria(finding.count, label)}
              aria-haspopup="dialog"
              className="inline-flex min-h-[44px] md:min-h-0 items-center bg-transparent border-0 p-0 font-mono text-[10px] md:text-[9.5px] cursor-pointer text-[color:var(--accent)]"
            >
              <span className="border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)]">
                {finding.combos ? copy.openCombo(finding.count) : copy.open(finding.count)}
                <span aria-hidden className="md:hidden"> →</span>
              </span>
            </button>
          </span>
        </>
      )}
    </li>
  );
}

/**
 * The names line, at the two widths' own budgets. A combo is named as its pair; the second and
 * later combos are counted, not named, because a pair of pairs does not fit a line.
 */
function namesOf(finding: Finding, art: FindingArt): { desktop: string; phone: string } {
  const nameOf = (id: string, fallback: string) => art.get(id)?.name ?? fallback;
  if (finding.combos) {
    const first = finding.combos[0];
    if (!first) return { desktop: "", phone: "" };
    const pair = copy.comboPair(
      ...(first.cards.map((c) => nameOf(c.oracleId, c.name)) as [string, string]),
    );
    const line = copy.names([pair], finding.combos.length - 1);
    return { desktop: line, phone: line };
  }
  const all = finding.cards.map((c) => nameOf(c.oracleId, c.name));
  const cut = (n: number) => copy.names(all.slice(0, n), Math.max(0, all.length - n));
  return { desktop: cut(NAMES_DESKTOP), phone: cut(NAMES_PHONE) };
}
