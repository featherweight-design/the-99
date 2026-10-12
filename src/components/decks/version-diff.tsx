"use client";

// §Surfaces 4 — what one version changed, opened under its row in the rail.
//
// The cards are what the deck WAS; the figures on them are TODAY's (H31, Hugh 2026-10-03,
// half reversing deck versioning's decision 7). An In row carries an ownership dot and, when
// this deck would have to buy copies of it today, a buy tag at today's price (and `has N of M`
// when it holds some). What it would buy is Shopping's claim model, never raw ownership;
// `todayNote` above the columns says the figures are today's. An Out row carries neither.
// Pull offers stay out: a pull is an offer about the deck as it is now, and this list is the
// deck as it was. No availability marker and no `committed` dot either, because both describe
// a deck's claim and a version claims nothing.
//
// Every row opens the card modal, paging In then Out in display order, and on a pointer
// rests into the hover preview.
//
// The two lists are fetched when the row opens rather than with the rail: a
// ten-version deck would otherwise pay ten diffs to draw ten closed rows.

import { useEffect, useId, useState } from "react";
import { getVersionDiff } from "../../app/decks/actions";
import { printedFaceName } from "../../lib/collection/browse";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy, historyOriginCopy } from "../../lib/copy/deck-versioning";
import { printsPair } from "../../lib/decks/draft-shape";
import { cardTypeGroup, groupByCardType } from "../../lib/decks/grouping";
import { formatDeckDate } from "../../lib/decks/format";
// Type only: `versions.ts` reaches `src/db`, which throws at module init in a
// browser. See `src/lib/client-bundle-safety.test.ts`.
import type { VersionDiffCard, VersionDiffPayload, VersionSummary } from "../../lib/decks/versions";
import type { DeckOrigin } from "../../lib/precons/origin";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { CostTrack } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { useMinWidth } from "../ui/use-min-width";
import { BuyTag } from "./buy-tag";
import { DecklistGroupHeader } from "./decklist-group-header";
import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";
import { VersionOverviewLink } from "./synopsis-version";
import { ROW_PLATE_HOVER, useRowOpen } from "./update-diff-row";

const copy = deckVersioningCopy.history;

export type { VersionDiffPayload };

/** The order the modal pages: In then Out, each in display order (type group, then the
 *  grouping's own order), so Next walks the rows exactly as they are drawn. */
function displayOrder(cards: VersionDiffCard[]): string[] {
  return groupByCardType(grouped(cards)).flatMap(([, g]) => g.map((c) => c.oracleId));
}

/** A card on one side of the diff, grouped by type the way every other card list
 *  in this app is grouped. `cardTypeGroup` rather than a field on the payload:
 *  the snapshot stores quantities, and the type line is what the join brings. */
type GroupedCard = VersionDiffCard & { cardTypeGroup: ReturnType<typeof cardTypeGroup> };

function grouped(cards: VersionDiffCard[]): GroupedCard[] {
  return cards.map((card) => ({ ...card, cardTypeGroup: cardTypeGroup(card.typeLine) }));
}

/**
 * One card in the diff. A quantity move prints the pair inside the name, via the
 * import's own `recountedItem` — the same string the update review uses for the
 * same fact, so the two surfaces cannot describe a recount differently. Which
 * moves count as one is `printsPair`, shared with the review page and the
 * pending banner for the same reason.
 *
 * An In row draws today's ownership as a dot, and a buy tag when the deck would have to buy
 * copies under Shopping's claim model (`card.buy`), with `has N of M` when it holds some. The
 * dot is ownership and the tag is the claim: an owned copy a senior deck holds draws both. The
 * tag is `full` from
 * 1024px and `collapsed` below it: at 820 a partly owned row's fixed parts leave the name
 * about 40px with the full tag (H31 readiness, finding 2).
 */
function DiffCardRow({
  card,
  side,
  siblings,
  newestAsOf,
  wide,
}: {
  card: VersionDiffCard;
  side: "in" | "out";
  siblings: string[];
  newestAsOf: Date | null;
  wide: boolean;
}) {
  const moved = printsPair(card);
  // `printedFaceName`, as every other deck row draws it: a two-faced card owned as a
  // flavor-named printing names its front face, not the whole `X // Y`.
  const label = printedFaceName(card);
  const name = moved
    ? deckImportCopy.update.diff.recountedItem(label, String(card.from), String(card.to))
    : label;
  const rowOpen = useRowOpen(card, siblings, true);
  const previewHandlers = usePreviewRow(card.imageUri);
  const describedId = useId();
  const incoming = side === "in";
  // Shopping's answer, not ownership's: a copy the reader owns that a senior deck holds is
  // still a buy here, as it is on Shopping.
  const short = incoming && card.buy > 0;
  const covered = card.to - card.buy;
  const partial = short && covered > 0;
  // A tagged row says how many this deck holds, never "Owned": an owned copy held by a senior
  // deck is a buy, and "Owned" over a buy tag would contradict it.
  const description = !incoming
    ? null
    : short
      ? copy.partialA11y(covered, card.to)
      : card.ownedNow > 0 ? copy.owned : copy.notOwned;
  return (
    <div
      {...rowOpen}
      {...previewHandlers}
      data-version-diff-row
      className={`flex items-center gap-[9px] min-h-[44px] md:min-h-[38px] px-[8px] md:px-[9px] rounded-[7px] bg-[color:var(--surface)] border border-solid border-[color:var(--border)] ${ROW_PLATE_HOVER}`}
    >
      {incoming && <OwnershipDot owned={card.ownedNow > 0} size={7} />}
      {description !== null && <span id={describedId} className="sr-only">{description}</span>}
      <CardDetailTrigger
        oracleId={card.oracleId}
        // The whole drawn name, pair included: the trigger's accessible name replaces its
        // text, so a `label` alone would hide a quantity move from a screen reader.
        name={name}
        title={name}
        siblings={siblings}
        describedBy={description !== null ? describedId : undefined}
        className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[12.5px] md:text-[13px] text-[color:var(--fg)]"
      >
        {name}
      </CardDetailTrigger>
      {partial && (
        <span aria-hidden className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {copy.partialOwned(covered, card.to)}
        </span>
      )}
      {short && (
        <BuyTag
          variant="row"
          price={card.price}
          newestAsOf={newestAsOf}
          density={wide ? "full" : "collapsed"}
        />
      )}
      <CostTrack cost={card.manaCost} />
    </div>
  );
}

/**
 * One direction's list. Hidden below `md` when the phone's segmented pair has the
 * other one shown — one mounting either way, never a phone copy beside a desktop
 * one, so no card name is in the DOM twice.
 *
 * An empty column is never drawn at all: the caller filters it out, and a
 * direction header over nothing reads as a list that failed to load.
 */
function Column({
  heading,
  headingTone,
  cards,
  side,
  siblings,
  newestAsOf,
  wide,
  hiddenOnPhone,
  headingOnPhone,
}: {
  heading: string;
  /** `--success` coming in, `--warning` going out. The direction is the one fact
   *  the header carries that the rows below it do not. */
  headingTone: string;
  cards: VersionDiffCard[];
  side: "in" | "out";
  siblings: string[];
  newestAsOf: Date | null;
  wide: boolean;
  hiddenOnPhone: boolean;
  /** The phone normally reads the direction off the pressed segment, so the
   *  header is desktop-only. A version that only added or only cut has no pair to
   *  press, and without this the phone would draw an unlabelled list of names
   *  with nothing anywhere saying which way they went. */
  headingOnPhone: boolean;
}) {
  return (
    <section
      className={`flex-1 min-w-0 flex-col ${hiddenOnPhone ? "hidden md:flex" : "flex"}`}
    >
      <h3
        className={`${headingOnPhone ? "block" : "hidden"} md:block font-mono text-[10px] uppercase tracking-[0.14em] m-0 pb-[8px] mb-[11px] [border-bottom:1px_solid_var(--elevated)]`}
        style={{ color: headingTone }}
      >
        {heading}
      </h3>
      {groupByCardType(grouped(cards)).map(([group, groupCards]) => (
        <div key={group} className="mb-[13px] last:mb-[16px] md:last:mb-0">
          <DecklistGroupHeader label={group} count={groupCards.length} />
          <div className="flex flex-col gap-[4px]">
            {groupCards.map((card) => (
              <DiffCardRow
                key={card.oracleId}
                card={card}
                side={side}
                siblings={siblings}
                newestAsOf={newestAsOf}
                wide={wide}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** One statistic beside the version's title. Desktop only — the phone has the
 *  rail row's own meta line directly above this panel, which already carries the
 *  card count and the mana value. */
function StatBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] px-[13px] py-[9px] bg-[color:var(--surface)] border border-solid border-[color:var(--border)]">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] mb-[4px]">
        {label}
      </div>
      {children}
    </div>
  );
}

/**
 * The v1 arm: a version with nothing before it to compare against.
 *
 * Not an empty diff — an empty diff would say the reader took ninety-nine
 * decisions and then changed nothing. It says instead why there is no diff.
 *
 * No link out: the rail now draws on the deck page itself, so every link to the
 * deck page from here pointed at the page the reader was already on.
 */
function InitialPanel() {
  return (
    <div className="flex items-start gap-[11px] rounded-[9px] px-[15px] py-[12px] max-w-[640px] bg-[color:var(--surface-sunken)] border border-solid border-[color:var(--elevated)] [border-left:3px_solid_var(--accent)]">
      <span
        aria-hidden
        className="flex-none flex items-center justify-center w-[20px] h-[20px] rounded-full [border:1.5px_solid_var(--accent)] font-display font-bold text-[12px] text-[color:var(--accent)]"
      >
        i
      </span>
      <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
        <b className="font-semibold text-[color:var(--fg)]">{copy.initialHeading}</b>
        {" — "}
        {copy.initialBody}
      </p>
    </div>
  );
}

/**
 * Who was at the helm of a version: the commander, or the pair.
 *
 * Null when the primary's name did not resolve — the name index is the only
 * source for it, and a version whose commander is missing from the catalog has
 * nothing to put on either side of the arrow. An unresolved PARTNER is not that
 * case: the primary still names the deck, and dropping the partner's absent name
 * is better than dropping the sentence.
 */
/** What a predecessor needs to be compared against: a version, or v0 (precons R3 K10). */
type Before = {
  commanderOracleId: string | null;
  partnerOracleId: string | null;
  commanderName: string | null;
  partnerName: string | null;
  manaValue: number | null;
};

function helm(version: Before | null): string | null {
  if (!version || version.commanderName === null) return null;
  if (version.partnerName === null) return version.commanderName;
  return copy.commanderPair(version.commanderName, version.partnerName);
}

/**
 * What a version changed, drawn in place under its rail row.
 *
 * The panel's chrome is desktop-only: at 390px the diff sits directly on the
 * screen, because the rail row immediately above it already names the version and
 * its note, and a bordered card inset inside a bordered row is two frames around
 * one list. The substance is identical at both widths — that is the parity the
 * canvas's desktop-only frame does not draw.
 */
export function VersionDiff({
  deckId,
  version,
  previous,
  origin = null,
  panelId,
  cache,
}: {
  deckId: string;
  version: VersionSummary;
  /** The version committed before this one, or null for a v1. Null is the arm
   *  that draws the provenance note rather than two empty columns. */
  previous: VersionSummary | null;
  /** A linked deck's v0, v1's predecessor when there is no committed one (precons R3 K10, K11):
   *  v1 is then a diff rather than the initial arm, and the commander line and the mana-value box
   *  compare against the precon. Ignored when `previous` is set. */
  origin?: DeckOrigin | null;
  /** Owned by the rail, which points its row's `aria-controls` at it. */
  panelId: string;
  /** The rail's own map of the diffs this visit has already read, keyed on
   *  version id — closing a row unmounts this panel, so without it A → B → A
   *  pays for A twice. Owned by the rail and not by a module, so it dies with the
   *  route and needs no invalidation: see AGENTS.md, "Caching a list a reader
   *  flips between". */
  cache: Map<string, VersionDiffPayload>;
}) {
  const before: Before | null = previous ?? origin;
  const initial = before === null;
  // `"unavailable"` is a third state, not an empty payload: two empty lists are a
  // real answer for a version that moved no cards, and rendering a refused or
  // failed read as that answer claims something about the version the app does not
  // know.
  const [diff, setDiff] = useState<VersionDiffPayload | "unavailable" | null>(
    initial ? { in: [], out: [], newestAsOf: null } : cache.get(version.id) ?? null,
  );
  // Phone only, and it decides which column is on screen rather than which one is
  // drawn twice.
  const [shown, setShown] = useState<"in" | "out">("in");

  useEffect(() => {
    // A diff already in hand is either the rail's cached copy — read out of the
    // same map while this panel's initial state was built, which is where a cache
    // decision belongs — or one this panel already read. Either way there is
    // nothing to fetch.
    if (initial || diff !== null) return;
    let live = true;
    // A refusal is null, and is deliberately NOT filed: a read that was refused
    // should be retried when the reader asks again, not remembered as this
    // version's answer. Closing the row unmounts this panel, so reopening it is
    // that retry.
    getVersionDiff(deckId, version.id)
      .then((result) => {
        if (result !== null) cache.set(version.id, result);
        if (live) setDiff(result ?? "unavailable");
      })
      .catch(() => {
        if (live) setDiff("unavailable");
      });
    return () => {
      live = false;
    };
  }, [cache, deckId, diff, initial, version.id]);

  const payload = diff === null || diff === "unavailable" ? null : diff;
  const inCount = payload?.in.length ?? 0;
  const outCount = payload?.out.length ?? 0;
  // The pair names a direction, so it is drawn only when there are two
  // directions to choose between. One column keeps its own heading instead.
  const segmented = inCount > 0 && outCount > 0;
  const wide = useMinWidth("(min-width: 1024px)");
  const siblings = payload === null ? [] : [...displayOrder(payload.in), ...displayOrder(payload.out)];

  // Drawn only on an actual change, and only when both sides resolved to a name.
  // Each side is the whole helm rather than the primary alone: a version piloted
  // by a pair reads as both names, so a partner arriving, leaving or being
  // swapped says what moved instead of rendering `Korvold → Korvold`.
  const from = helm(before);
  const to = helm(version);
  // `from !== to` as well as the ids: a swap between two partners the name index
  // cannot resolve moves the ids while leaving both sides reading as the primary
  // alone, and `Korvold → Korvold` says nothing.
  const commanderMoved =
    before !== null &&
    from !== null &&
    to !== null &&
    from !== to &&
    (before.commanderOracleId !== version.commanderOracleId ||
      before.partnerOracleId !== version.partnerOracleId);

  const manaBefore = before?.manaValue ?? null;
  const manaAfter = version.manaValue;

  return (
    <div
      id={panelId}
      className={
        "px-[14px] md:px-[18px] md:py-[18px] md:rounded-[12px] md:bg-[color:var(--surface-rail)] " +
        "md:border md:border-solid md:border-[color:var(--elevated)] " +
        // The trailing gap belongs to a panel that ends in a card list, where the
        // last row would otherwise sit against the next rail row. The v1 arm ends
        // in its own bordered note, which already carries the separation.
        (initial ? "" : "md:mb-[22px]")
      }
    >
      <div
        // DESKTOP'S HEADER, and on the phone only the version's overview link, which is the one
        // thing in it the phone draws (6e): the note it sits under is the row's there, above the
        // panel. So the link is one mount at both widths, in the note's own column at 1300.
        className={`flex md:items-baseline md:justify-between md:gap-[12px] md:flex-wrap ${
          initial ? "md:mb-[14px]" : "md:mb-[16px]"
        }`}
      >
        <div>
          <h3 className="hidden md:block m-0 font-display font-bold text-[18px] text-[color:var(--fg)]">
            {`v${version.number} · ${formatDeckDate(version.committedAt)}`}
          </h3>
          <p
            className={`hidden md:block m-0 mt-[5px] text-[13px] ${
              version.note === null
                ? "italic text-[color:var(--fg-faint)]"
                : "text-[color:var(--fg-body)]"
            }`}
          >
            {version.note ?? copy.noNote}
          </p>
          <VersionOverviewLink versionId={version.id} />
        </div>
        {initial ? (
          // The v1 header carries its figures as text rather than as stat boxes:
          // there is no before for an arrow to point away from.
          <div className="hidden md:block font-mono text-[10px] leading-[1.5] text-right text-[color:var(--fg-locked)]">
            {copy.cardCount(version.cardCount)}
            {manaAfter !== null && ` · ${copy.manaValue(manaAfter.toFixed(2))}`}
            {version.gamesHeld > 0 && (
              <>
                <br />
                {copy.gamesHeld(version.gamesHeld)}
              </>
            )}
          </div>
        ) : (
          <div className="hidden md:flex gap-[10px]">
            {/* Keyed on the after figure alone, with the before half optional.
                `averageManaValue` answers null for a list with nothing to average,
                so a version that came off an all-land predecessor has a real curve
                of its own and nothing earlier to point away from — and the pair
                gate would have dropped the figure it does know. The changed strip
                draws its mana cell by the same rule. */}
            {manaAfter !== null && (
              <StatBox label={deckVersioningCopy.changed.manaValue}>
                <div className="flex items-baseline gap-[5px] font-mono">
                  {manaBefore !== null && (
                    <>
                      <span className="text-[12px] text-[color:var(--fg-locked)]">
                        {manaBefore.toFixed(2)}
                      </span>
                      <span aria-hidden className="text-[10px] text-[color:var(--fg-locked)]">
                        →
                      </span>
                    </>
                  )}
                  {/* Neutral, never `--success`: a mana curve coming down is not
                      an improvement the app is entitled to congratulate. */}
                  <span className="text-[15px] text-[color:var(--fg-body)]">
                    {manaAfter.toFixed(2)}
                  </span>
                </div>
              </StatBox>
            )}
            {version.gamesHeld > 0 && (
              <StatBox label={copy.heldLabel}>
                <div className="font-mono text-[15px] text-[color:var(--fg-body)]">
                  {copy.heldValue(version.gamesHeld)}
                </div>
              </StatBox>
            )}
          </div>
        )}
      </div>

      {/* Outside the header, which is desktop-only: who was at the helm is the
          version's substance and not its chrome, and a phone that lost the
          sentence would draw a commander-only commit as a version that changed
          nothing. One element at both widths rather than a phone copy beside a
          desktop one. */}
      {commanderMoved && (
        <p className="m-0 mb-[12px] md:-mt-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">
          {copy.commanderChange(from, to)}
        </p>
      )}

      {initial ? (
        <InitialPanel />
      ) : diff === null ? (
        // The panel's height, held empty. Two absences decide this between them:
        // the surface takes no SVG — every mark on it is a CSS disc, a border or a
        // text glyph — and Design drew no loading state for it, so a disc or a
        // sentence of engineering's own invention is the other thing it must not
        // be. What is left is the space the diff will occupy, so the row does not
        // jump when a read that takes one query comes back.
        <div data-diff-pending className="h-[48px]" />
      ) : diff === "unavailable" ? (
        // Never `noChange`: the read was refused or failed, so the app knows
        // nothing about what this version moved.
        <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
          {copy.diffUnavailable}
        </p>
      ) : (
        <>
          {previous === null && origin !== null && diff.origin && (
            // K10: what v1 is drawn against, and how much of the box it kept. Above the phone's pair
            // too, because it describes both directions.
            <div className="mb-[12px] rounded-[8px] border border-dashed border-[color:var(--border-dashed)] px-[11px] py-[8px] font-mono text-[10.5px] leading-[1.5]">
              <p className="m-0 text-[color:var(--fg-muted)]">{historyOriginCopy.againstOrigin(origin.name)}</p>
              <p className="m-0 text-[color:var(--fg-faint)]">{historyOriginCopy.kept(diff.origin.kept, diff.origin.of)}</p>
            </div>
          )}
          {segmented && (
            <div className="md:hidden flex gap-[6px] mb-[12px]">
              {(
                [
                  ["in", copy.diffIn(inCount)],
                  ["out", copy.diffOut(outCount)],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setShown(value)}
                  aria-pressed={shown === value}
                  className={[
                    "font-sans text-[12.5px]",
                    // 44px, not the canvas's 38px: the phone tap floor governs a
                    // real control, and the canvas draws this pair as a span.
                    "flex-1 rounded-full px-[11px] py-[6px] min-h-[44px]",
                    shown === value
                      ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)]"
                      : "font-medium text-[color:var(--fg-faint)] bg-transparent border border-solid border-[color:var(--border-strong)]",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {inCount > 0 && (
            // Above the columns at both widths. On the phone it describes the In list, so it
            // goes while the Out segment is pressed.
            <p
              className={`${segmented && shown === "out" ? "hidden md:block" : "block"} m-0 mb-[12px] font-mono text-[10.5px] text-[color:var(--fg-faint)]`}
            >
              {copy.todayNote(version.number)}
            </p>
          )}
          <HoverPreviewProvider>
          <div className="flex flex-col md:flex-row md:items-start gap-[22px]">
            {inCount > 0 && (
              <Column
                heading={copy.diffIn(inCount)}
                headingTone="var(--success)"
                cards={diff.in}
                side="in"
                siblings={siblings}
                newestAsOf={diff.newestAsOf}
                wide={wide}
                hiddenOnPhone={segmented && shown !== "in"}
                headingOnPhone={!segmented}
              />
            )}
            {outCount > 0 && (
              <Column
                heading={copy.diffOut(outCount)}
                headingTone="var(--warning)"
                cards={diff.out}
                side="out"
                siblings={siblings}
                newestAsOf={diff.newestAsOf}
                wide={wide}
                hiddenOnPhone={segmented && shown !== "out"}
                headingOnPhone={!segmented}
              />
            )}
          </div>
          </HoverPreviewProvider>
          {inCount === 0 && outCount === 0 && (
            // Both widths: this is the panel's whole content, and a phone that drew
            // nothing would read as a read that failed.
            <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
              {copy.noChange}
            </p>
          )}
        </>
      )}
    </div>
  );
}
