"use client";

// The diff (#277, states 9–11 and 14–16). A page, never a modal: it is the
// whole decision, and the groups are long enough that a dialog would scroll
// inside a scroll.
//
// Nothing here writes. `onApply` hands the parent the oracle ids of removals the
// player chose to keep, and that list is the only thing the client contributes —
// the server re-derives the rest from the same paste.

import { useEffect, useId, useRef, useState } from "react";
import { deckImportCopy } from "../../lib/copy/deck-import";
import type { DeckUpdateChangedRow, DeckUpdatePreview } from "../../app/decks/update-actions";
import { GhostButton, PrimaryButton } from "../ui/button";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { cardTypeGroup, groupByCardType } from "../../lib/decks/grouping";
import { DecklistGroupHeader } from "./decklist-group-header";
import {
  DiffRowIn, DiffRowKeep, DiffRowOut, DiffRowUnchanged, DiffRowUnnamed,
} from "./update-diff-row";

const copy = deckImportCopy.update.diff;

/**
 * The rows of one group, under a card-type heading each, capped at what the
 * disclosure is showing.
 *
 * The cap is applied to the FLATTENED grouped order rather than to the preview's
 * own, and then the survivors are grouped again: sliced the other way round, the
 * four visible rows would be the first four of the paste and the headings above
 * them would count rows the disclosure is still hiding.
 *
 * `cardTypeGroup` is derived here because a preview row carries `typeLine` and no
 * group — the grouping is #389's, and the update flow's payload predates it.
 */
function typeGroups<T extends { oracleId: string; name: string; typeLine: string }>(
  rows: T[],
  shown: number,
) {
  return groupByCardType(typeOrder(rows).slice(0, shown));
}

/** The rows in the order the groups draw them: by card type, then as the grouping orders them. */
function typeOrder<T extends { oracleId: string; name: string; typeLine: string }>(rows: T[]) {
  const grouped = groupByCardType(rows.map((r) => ({ ...r, cardTypeGroup: cardTypeGroup(r.typeLine) })));
  return grouped.flatMap(([, groupRows]) => groupRows);
}

/** A row of the out or in group: an add or a removal, or a count change carrying both figures. */
type DiffGroupRow = DeckUpdateChangedRow & { from?: number; to?: number };

/** A count change's two figures, for the row that draws them; nothing on an add or a removal. */
function recountOf(row: { from?: number; to?: number }) {
  return row.from === undefined || row.to === undefined
    ? undefined
    : { from: String(row.from), to: String(row.to) };
}

/** Rows shown before the disclosure takes over. Four at both widths — the cap is
 *  about the shape of the page, not the space available. */
const ROW_CAP = 4;

/** A removal count past this share of the deck is state 14: the paste is
 *  probably a different deck, so the flow says so and offers the other door.
 *  Nothing is blocked. */
const WHOLESALE_SHARE = 0.75;

/** One announcement per settle. Six fast Keep toggles is one sentence, not six
 *  — the contract the synergy selection already holds to. */
const LIVE_DEBOUNCE_MS = 600;

function Group({
  heading,
  body,
  bodyMobile,
  action,
  total,
  hidden,
  children,
}: {
  heading: string;
  body?: string;
  bodyMobile?: string;
  action?: React.ReactNode;
  /** Rows in the group, of which `children` renders all — the disclosure hides
   *  the overflow with CSS-free unmounting, so this is what it counts. */
  total: number;
  /** What the disclosure says it hides, when that is not a row count: the copies past the cap, in
   *  the order the rows draw, for a group whose heading counts copies. Rows otherwise. */
  hidden?: number;
  children: (shown: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const rowsId = useId();
  const shown = expanded ? total : Math.min(ROW_CAP, total);
  return (
    <section className="mt-[22px] md:mt-[28px]">
      <div className="flex items-baseline justify-between gap-[10px]">
        <h3 className="font-display font-semibold text-[15px] md:text-[17px] m-0 text-[color:var(--fg)]">
          {heading}
        </h3>
        {action}
      </div>
      {body && (
        <p className="mt-[4px] mb-0 text-[12.5px] md:text-[13.5px] leading-[1.5] text-[color:var(--fg-muted)]">
          {bodyMobile ? (
            <>
              <span className="md:hidden">{bodyMobile}</span>
              <span className="hidden md:inline">{body}</span>
            </>
          ) : (
            body
          )}
        </p>
      )}
      <div id={rowsId} className="mt-[10px] md:mt-[12px] flex flex-col gap-[6px]">
        {children(shown)}
      </div>
      {total > ROW_CAP && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          // Named unconditionally, unlike the menus: this container holds the
          // first four rows at rest, so it is on the page in both states.
          aria-controls={rowsId}
          className="mt-[10px] font-mono text-[11.5px] min-h-[44px] md:min-h-0 md:py-[6px] cursor-pointer bg-transparent border-0 p-0 text-[color:var(--fg-faint)] md:hover:text-[color:var(--accent)] transition-colors"
        >
          {expanded ? copy.showFewer : copy.showMore(String(hidden ?? total - ROW_CAP))}
        </button>
      )}
    </section>
  );
}

/** A card-type heading and the rows filed under it, inside one of the flow's four
 *  groups. The shipped decklist header, so the type reads the same here as it
 *  does on the deck page the paste is about to change. */
function TypeGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[12px] last:mb-0">
      <DecklistGroupHeader label={label} count={count} />
      <div className="flex flex-col gap-[6px]">{children}</div>
    </div>
  );
}

function Chip({ figure, label, labelMobile }: { figure: number; label: string; labelMobile?: string }) {
  return (
    <div className="flex items-baseline gap-[5px]">
      <span className="font-mono font-semibold text-[15px] md:text-[17px] text-[color:var(--fg)]">
        {figure}
      </span>
      <span className="font-mono text-[10px] md:text-[11px] text-[color:var(--fg-faint)]">
        {labelMobile ? (
          <>
            <span className="md:hidden">{labelMobile}</span>
            <span className="hidden md:inline">{label}</span>
          </>
        ) : (
          label
        )}
      </span>
    </div>
  );
}

export function UpdateDiff({
  preview,
  applying,
  onApply,
  onCancel,
  onImportAsNew,
}: {
  preview: DeckUpdatePreview;
  applying: boolean;
  onApply: (keep: string[]) => void;
  onCancel: () => void;
  onImportAsNew: () => void;
}) {
  // Locked cards start KEPT (Hugh, 2026-09-25): they stay unless the player unticks them.
  const [kept, setKept] = useState<Set<string>>(() => new Set(preview.lockedOut ?? []));
  const [live, setLive] = useState("");

  // Every figure here counts COPIES (Hugh, 2026-10-15): a count that drops is copies coming out
  // and one that rises is copies going in, so `3 in · 3 out` beside `99 → 99` adds up. Rows were
  // counted before, and a list that took Plains from 6 to 3 read `3 in, 0 out` over a deck that
  // stayed at 99. A drop is its own row in the out group (`fewer`), a rise its own row in the in
  // group (`more`), each carrying only the copies that move.
  const outRows: DiffGroupRow[] = [...preview.out, ...preview.fewer];
  const inRows: DiffGroupRow[] = [...preview.in, ...preview.more];
  const moving = (r: { quantity: number; from?: number; to?: number }) =>
    r.from === undefined || r.to === undefined ? r.quantity : Math.abs(r.to - r.from);
  const copiesOf = (rows: { quantity: number; from?: number; to?: number }[]) =>
    rows.reduce((n, r) => n + moving(r), 0);
  const outCopies = copiesOf(outRows);
  const arriving = copiesOf(inRows);
  const leaving = copiesOf(outRows.filter((r) => !kept.has(r.oracleId)));
  const landing = preview.built - leaving + arriving;
  const inN = String(arriving);
  const outN = String(leaving);

  useEffect(() => {
    const timer = setTimeout(
      () => setLive(copy.liveKept(String(kept.size), inN, outN)),
      LIVE_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [kept, inN, outN]);

  // `applying` only turns true on the render after the transition starts, so two
  // clicks in one tick both read false and both reach the server. The ref shuts
  // synchronously and closes that gap — the same guard the importer uses.
  const inFlight = useRef(false);
  function apply() {
    if (applying || inFlight.current) return;
    inFlight.current = true;
    onApply([...kept]);
  }

  // In copies against `built`, which is a copy count too. Comparing rows to it
  // under-triggers on exactly the deck this note is for: a list that dropped
  // twelve Islands and the rest of a mana base counts as a handful of rows.
  //
  // Deliberately not recomputed as removals are kept. What the note says is that
  // the *list* looks like a different deck, which is true of the paste and stays
  // true however many rows the player rescues from it. Moving with the Keeps
  // would make the sentence flicker in and out while the player works.
  const wholesale = preview.built > 0 && outCopies / preview.built > WHOLESALE_SHARE;
  const clamped = preview.notes.filter((n) => n.kind === "quantityClamped").length;
  // This flow never changes the deck's commanders, so a commander line in the
  // paste is only ever kept out of the 99. Past the second it is also a card the
  // player pasted and will not find in the deck, which is what earns it a line.
  const extraCommanders = preview.notes.filter(
    (n) => n.kind === "thirdCommanderDeclared",
  ).length;

  return (
    // The rows open the card modal, and the builder's provider does not reach
    // this route — the update flow is its own page. It is one of the deck's own pages, and its
    // rows draw the deck page's bare `short`, so the modal does too (`deckPage`).
    <CardDetailProvider deckPage deckPrintingPicks={preview.printingPicks ?? null}>
      <div className="p-[16px_18px_24px] md:mx-auto md:w-full md:max-w-[860px] md:p-[44px_48px]">
        <h2 className="font-display font-bold text-[20px] md:text-[28px] m-0 text-[color:var(--fg)]">
          {copy.heading}
        </h2>
        <p className="mt-[4px] text-[12px] md:text-[13.5px] leading-[1.5] text-[color:var(--fg-muted)]">
          <span className="md:hidden font-mono text-[10.5px]">
            {copy.provenanceMobile(String(preview.lineCount), String(preview.built))}
          </span>
          <span className="hidden md:inline">
            {copy.provenance(String(preview.lineCount), preview.deckName, String(preview.built))}
          </span>
        </p>

        {/* A versioned deck's paste lands in the draft, not in the committed
            list, and every figure below is about the draft it produces. A brew
            has no such distinction to draw, so it says nothing. */}
        {preview.version !== null && (
          <p className="mt-[8px] mb-0 text-[12px] md:text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
            {copy.draftPasteNotice(preview.version)}
          </p>
        )}

        {/* The non-fatal notes the flow surfaces. Everything else the parser
            drops — sideboard, maybeboard, a commander duplicated into the 99 — is
            dropped in silence, the rule the import already holds to. */}
        {clamped > 0 && (
          <p className="mt-[8px] mb-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
            {deckImportCopy.notes.quantityClamped(clamped)}
          </p>
        )}
        {extraCommanders > 0 && (
          <p className="mt-[8px] mb-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
            {deckImportCopy.notes.thirdCommanderDeclared(extraCommanders)}
          </p>
        )}

        <div className="mt-[16px] md:mt-[20px] flex flex-wrap items-baseline gap-x-[18px] gap-y-[8px] md:gap-x-[26px] pb-[16px] [border-bottom:1px_solid_var(--border)]">
          <Chip figure={outCopies} label={copy.chipOut} />
          <Chip figure={arriving} label={copy.chipIn} />
          <Chip
            figure={preview.unresolved.length}
            label={copy.chipUnnamed}
            labelMobile={copy.chipUnnamedMobile}
          />
          <Chip
            figure={preview.unchanged.length}
            label={copy.chipUnchanged}
            labelMobile={copy.chipUnchangedMobile}
          />
          <span className="font-mono text-[11px] md:text-[12px] ml-auto text-[color:var(--fg-muted)]">
            {copy.landing(String(preview.built), String(landing))}
          </span>
        </div>

        {outRows.length > 0 && (
          <Group
            heading={copy.outHeading(String(outCopies))}
            body={preview.fewer.length > 0 ? copy.outBodyFewer : copy.outBody}
            action={
              <GhostButton
                onClick={() => setKept(new Set(outRows.map((r) => r.oracleId)))}
                className="flex-none font-mono text-[11.5px] px-[12px] h-[38px] md:h-[32px]"
              >
                {copy.keepAll(String(outCopies))}
              </GhostButton>
            }
            total={outRows.length}
            hidden={copiesOf(typeOrder(outRows).slice(ROW_CAP))}
          >
            {(shown) =>
              typeGroups(outRows, shown).map(([group, rows]) => (
                <TypeGroup key={group} label={group} count={copiesOf(rows)}>
                  {rows.map((row) => (
                    <DiffRowOut
                      key={row.oracleId}
                      card={row}
                      recount={recountOf(row)}
                      kept={kept.has(row.oracleId)}
                      action={
                        <DiffRowKeep
                          name={row.name}
                          kept={kept.has(row.oracleId)}
                          onToggle={() =>
                            setKept((prev) => {
                              const next = new Set(prev);
                              if (!next.delete(row.oracleId)) next.add(row.oracleId);
                              return next;
                            })
                          }
                        />
                      }
                    />
                  ))}
                </TypeGroup>
              ))
            }
          </Group>
        )}

        {/* State 15: the group unmounts at zero rather than drawing an empty block. */}
        {inRows.length > 0 && (
          <Group
            heading={copy.inHeading(String(arriving))}
            body={copy.inMeta(
              String(copiesOf(inRows.filter((r) => r.owned))),
              String(copiesOf(inRows.filter((r) => !r.owned))),
            )}
            total={inRows.length}
            hidden={copiesOf(typeOrder(inRows).slice(ROW_CAP))}
          >
            {(shown) =>
              typeGroups(inRows, shown).map(([group, rows]) => (
                <TypeGroup key={group} label={group} count={copiesOf(rows)}>
                  {rows.map((row) => (
                    <DiffRowIn
                      key={row.oracleId}
                      card={row}
                      sourceLine={row.sourceLine}
                      recount={recountOf(row)}
                    />
                  ))}
                </TypeGroup>
              ))
            }
          </Group>
        )}

        {preview.unresolved.length > 0 && (
          <Group
            heading={copy.unnamedHeading(String(preview.unresolved.length))}
            body={copy.unnamedBody(String(preview.existingUnresolvedCount))}
            total={preview.unresolved.length}
          >
            {(shown) =>
              preview.unresolved
                .slice(0, shown)
                .map((row) => (
                  <DiffRowUnnamed
                    key={`${row.sourceLine}-${row.rawName}`}
                    rawName={row.rawName}
                    sourceLine={row.sourceLine}
                  />
                ))
            }
          </Group>
        )}

        {preview.unchanged.length > 0 && (
          <UnchangedGroup rows={preview.unchanged} />
        )}

        {wholesale && (
          <div className="mt-[22px] rounded-[10px] p-[14px_16px] bg-[color:var(--elevated-hover)] [border:1px_solid_var(--border-strong)] [border-left:3px_solid_var(--warning)]">
            <p className="m-0 text-[13px] md:text-[14px] leading-[1.6] text-[color:var(--fg-body)]">
              {/* Copies, not the rows the CTA counts. This is the one sentence on
                  the screen about magnitude rather than about the groups, and it
                  says "cards" — feeding it rows would have it disagree with the
                  threshold that raised it, which is a share of `built`. */}
              {copy.wholesaleNote(String(arriving), String(outCopies))}
            </p>
            <GhostButton
              onClick={onImportAsNew}
              className="w-full md:w-auto mt-[12px] text-[14px] md:text-[13px] py-[12px] md:py-[10px] md:px-[20px] min-h-[44px]"
            >
              {copy.importAsNew}
            </GhostButton>
          </div>
        )}

        <div className="mt-[26px] pt-[18px] flex flex-col md:flex-row md:items-center gap-[10px] md:gap-[14px] [border-top:1px_solid_var(--border)]">
          <PrimaryButton
            onClick={apply}
            // Never disabled while applying: the button holds focus, and disabling
            // it blurs the control the player is standing on.
            aria-busy={applying}
            aria-label={copy.applyAria(inN, outN, preview.deckName)}
            className="w-full md:w-auto text-[15px] md:text-[14px] py-[13px] md:py-0 md:px-[24px] md:h-[44px] min-h-[44px] md:whitespace-nowrap"
          >
            <span className="md:hidden">{copy.applyMobile(inN, outN)}</span>
            <span className="hidden md:inline">{copy.apply(inN, outN)}</span>
          </PrimaryButton>
          <span className="font-mono text-[11.5px] md:text-[12px] text-[color:var(--fg-muted)]">
            {copy.summary(String(kept.size), String(landing))}
          </span>
          <GhostButton
            onClick={onCancel}
            className="w-full md:w-auto md:ml-auto text-[14px] md:text-[13px] py-[12px] md:py-[10px] md:px-[20px] min-h-[44px]"
          >
            {copy.cancel}
          </GhostButton>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {live}
        </div>
      </div>
    </CardDetailProvider>
  );
}

/** Split out because its disclosure reads differently: the group is collapsed to
 *  nothing at rest, so the control names the whole set rather than a remainder. */
function UnchangedGroup({ rows }: { rows: DeckUpdatePreview["unchanged"] }) {
  const [expanded, setExpanded] = useState(false);
  const rowsId = useId();
  return (
    <section className="mt-[22px] md:mt-[28px]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        // Omitted while collapsed: this group renders nothing at rest, so the
        // id it would name does not exist yet.
        aria-controls={expanded ? rowsId : undefined}
        className="font-mono text-[11.5px] min-h-[44px] md:min-h-0 md:py-[6px] cursor-pointer bg-transparent border-0 p-0 text-[color:var(--fg-faint)] md:hover:text-[color:var(--accent)] transition-colors"
      >
        {expanded ? copy.showFewer : copy.unchangedDisclosure(String(rows.length))}
      </button>
      {expanded && (
        <div id={rowsId} className="mt-[10px] flex flex-col">
          {/* Expanded, so every row is shown — the cap belongs to the four
              capped groups, and this one is all-or-nothing. */}
          {typeGroups(rows, rows.length).map(([group, groupRows]) => (
            <TypeGroup key={group} label={group} count={groupRows.length}>
              {groupRows.map((row) => (
                <DiffRowUnchanged key={row.oracleId} card={row} />
              ))}
            </TypeGroup>
          ))}
        </div>
      )}
    </section>
  );
}
