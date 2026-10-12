"use client";

// §Surfaces 4 — the version rail. One row per committed version, newest first,
// and the newest wears `current` because it is the list the deck is sleeved as.
//
// It draws inside the builder's `Versions` tab panel rather than on a route of
// its own, so the deck's head — art, commander, progress, the pending banner —
// stays on screen while history is read. §Surfaces 4 drew it as its own route
// with a tab row at the head; that made Versions the one tab that navigated and
// the one that dropped the deck it belongs to.
//
// There is no restore control, and that is a decision rather than an omission
// (§Decisions): a version is a record of what was on the table, and a button that
// overwrote the draft with a three-month-old list would be the one destructive
// act in this feature nobody asked for. `restoreDraftFromVersion` exists for the
// discard path and is not wired here.
//
// The pending draft has no row either. It is not a version, and a rail that drew
// it would be a rail whose top entry is not a record of anything.

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { deckVersioningCopy, historyOriginCopy } from "../../lib/copy/deck-versioning";
import { preconMonth, preconsCopy } from "../../lib/copy/precons";
import { formatDeckDate } from "../../lib/decks/format";
// Type only: `versions.ts` reaches `src/db`, which throws at module init in a
// browser. See `src/lib/client-bundle-safety.test.ts`.
import type { VersionSummary } from "../../lib/decks/versions";
import type { DeckOrigin } from "../../lib/precons/origin";
import { UnlinkDialog } from "./precons/precon-link-dialogs";
import { VersionDiff, type VersionDiffPayload } from "./version-diff";

const copy = deckVersioningCopy.history;

/** The `current` marker's width, reserved on every other row so that every
 *  row's delta lands on one vertical rather than sliding left under the newest
 *  one. Desktop only — the phone puts the marker inline in the top line. */
const MARKER_SLOT = 62;

/** The version number's slot, so a `v10` cannot push the note of one row further
 *  right than the note of the row above it. */
const NUMBER_SLOT = 34;

/** The adds and removes, each dropped at nought rather than drawn as one. The
 *  `/` between them is desktop-only: on the phone the pair sits inline in the top
 *  line, where a separator between two figures already spaced apart reads as a
 *  fraction. */
function Delta({
  version,
  initial,
  phone,
}: {
  version: VersionSummary;
  /** Whether this version has a predecessor at all. Decided by the rail, which
   *  holds the list — never inferred from a nought delta, because a version that
   *  swapped nothing and one that started the deck are different facts and only
   *  the second is `initial`. */
  initial: boolean;
  phone: boolean;
}) {
  const size = phone ? "text-[11.5px]" : "text-[12px]";
  // Nothing before it to have changed anything against, so the whole group —
  // including the `/` — is replaced by one word.
  if (initial) {
    return <span className={`font-mono ${size} text-[color:var(--fg-faint)]`}>{copy.initial}</span>;
  }
  return (
    <span className={`flex flex-none items-center gap-[7px] font-mono ${size}`}>
      {version.adds > 0 && (
        <span className="text-[color:var(--success)]">{`+${version.adds}`}</span>
      )}
      {!phone && version.adds > 0 && version.removes > 0 && (
        <span aria-hidden className="text-[color:var(--border-strong)]">
          /
        </span>
      )}
      {version.removes > 0 && (
        <span className="text-[color:var(--warning)]">{`−${version.removes}`}</span>
      )}
    </span>
  );
}

function CurrentMarker({ phone }: { phone: boolean }) {
  return (
    <span
      className={`flex-none font-mono uppercase tracking-[0.12em] rounded-[4px] border border-solid border-[color:var(--accent-shadow)] text-[color:var(--accent)] ${
        phone ? "text-[9.5px] px-[6px] py-[1px]" : "text-[10px] px-[7px] py-[2px]"
      }`}
    >
      {copy.current}
    </span>
  );
}

/** The meta line under the note. The phone drops the `committed` prefix and the
 *  games tally: at 390px the line has room for the date and the size, and the
 *  word `committed` is the one part of it a rail of committed versions does not
 *  need to say. */
function MetaLine({
  version,
  phone,
}: {
  version: VersionSummary & { current: boolean };
  phone: boolean;
}) {
  const parts = [
    phone
      ? `${formatDeckDate(version.committedAt)} · ${copy.cardCount(version.cardCount)}`
      : copy.committed(formatDeckDate(version.committedAt), version.cardCount),
  ];
  if (version.manaValue !== null) parts.push(copy.manaValue(version.manaValue.toFixed(2)));
  // Never on the current version: it is still accumulating games, so a tally
  // beside it would be a figure that is wrong by the next evening.
  if (!phone && !version.current && version.gamesHeld > 0) {
    parts.push(copy.gamesHeld(version.gamesHeld));
  }
  return (
    <span
      className={`block font-mono text-[10px] text-[color:var(--fg-faint)] ${
        phone ? "mt-[4px]" : "mt-[2px]"
      }`}
    >
      {parts.join(" · ")}
    </span>
  );
}

/** The note, or the absence of one. Always rendered: a row with no note and no
 *  slot for one would be shorter than its neighbours, and the rail's job is to
 *  be read down. */
function Note({ note, phone }: { note: string | null; phone: boolean }) {
  return (
    <span
      className={`${phone ? "text-[13px] leading-[1.45]" : "text-[13.5px]"} ${
        note === null ? "italic text-[color:var(--fg-faint)]" : "text-[color:var(--fg)]"
      }`}
    >
      {note ?? copy.noNote}
    </span>
  );
}

/**
 * One rail row.
 *
 * A `button`, not the plain `div` the canvas draws: the row opens the diff in
 * place, and a click target with no role and no tabindex is reachable by mouse
 * only. It carries `aria-expanded` and points `aria-controls` at the panel it
 * opens, so the state a reader sees in the accent rule is the state a screen
 * reader is told.
 *
 * The layout is drawn twice for the two widths — a block of two stacked lines on
 * the phone, one centred row on desktop — because the pieces are not in the same
 * ORDER at the two widths: the phone puts `current` beside the version number and
 * the delta at the end of that same top line, and desktop puts both at the row's
 * right end after the note. One element cannot hold two orders.
 */
function RailRow({
  version,
  initial,
  open,
  panelId,
  onToggle,
}: {
  version: VersionSummary & { current: boolean };
  initial: boolean;
  open: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      // Only while the panel is in the document: a closed row unmounts its panel,
      // and `aria-controls` pointing at an id nothing has is a broken
      // relationship for a screen reader. `unresolved-row.tsx` does the same.
      aria-controls={open ? panelId : undefined}
      className={[
        "w-full text-left rounded-[9px]",
        "px-[12px] py-[11px] md:px-[14px] md:py-[12px] min-h-[64px] md:min-h-0",
        version.current
          ? "bg-[color:var(--surface-rail)] border border-solid border-[color:var(--border-strong)] [border-left:3px_solid_var(--accent)]"
          : "bg-[color:var(--surface)] border border-solid border-[color:var(--border)]",
      ].join(" ")}
    >
      {/* Phone */}
      <span className="md:hidden block">
        <span className="flex items-baseline gap-[9px]">
          <span
            className="font-mono text-[13px]"
            style={{ color: version.current ? "var(--accent)" : "var(--fg-body)" }}
          >
            {`v${version.number}`}
          </span>
          {version.current && <CurrentMarker phone />}
          <span className="flex-1" />
          <Delta version={version} initial={initial} phone />
        </span>
        <span className="block mt-[6px]">
          <Note note={version.note} phone />
          <MetaLine version={version} phone />
        </span>
      </span>

      {/* Desktop */}
      <span className="hidden md:flex items-center gap-[14px]">
        <span
          className="flex-none font-mono text-[13px]"
          style={{
            width: NUMBER_SLOT,
            color: version.current ? "var(--accent)" : "var(--fg-body)",
          }}
        >
          {`v${version.number}`}
        </span>
        <span className="flex-1 min-w-0">
          <Note note={version.note} phone={false} />
          <MetaLine version={version} phone={false} />
        </span>
        <Delta version={version} initial={initial} phone={false} />
        {version.current ? (
          <CurrentMarker phone={false} />
        ) : (
          // Empty, and that is its whole job: it holds the marker's width so the
          // delta above it and the delta beside it share a right edge.
          <span aria-hidden className="flex-none" style={{ width: MARKER_SLOT }} />
        )}
      </span>
    </button>
  );
}

/** The dashed divider above v0 (K10), drawn only when committed versions stand above it. */
function OriginDivider() {
  const rule = <span aria-hidden className="flex-1 border-x-0 border-b-0 border-t border-dashed border-t-[color:var(--border-dashed)]" />;
  return (
    <div className="flex items-center gap-[10px] mt-[8px] mb-[2px]">
      {rule}
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
        {historyOriginCopy.originDivider}
      </span>
      {rule}
    </div>
  );
}

/**
 * v0's row (precons R3 §5): a third kind, passed in rather than inferred from a number, and never
 * the current one. A dashed box on no ground, `v0` faint, `the box` where `initial` sits; never the
 * accent rule, the `current` marker, the accent number or the rail's fill (lock 4). The meta says
 * `released`, never `committed`, and carries no games tally: no game was played on v0.
 */
function OriginRow({ origin, open, panelId, onToggle }: {
  origin: DeckOrigin;
  open: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  const note = <span className="text-[13px] leading-[1.45] md:text-[13.5px] md:leading-normal text-[color:var(--fg-body)]">{historyOriginCopy.originNote(origin.name)}</span>;
  const meta = (
    <span className="block mt-[4px] md:mt-[2px] font-mono text-[10px] text-[color:var(--fg-faint)]">
      {historyOriginCopy.originMeta(origin.setCode, preconMonth(origin.releaseDate), origin.cardCount)}
    </span>
  );
  const delta = (phone: boolean) => (
    <span className={`flex-none font-mono ${phone ? "text-[11.5px]" : "text-[12px]"} text-[color:var(--fg-faint)]`}>
      {historyOriginCopy.originDelta}
    </span>
  );
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      data-origin-row
      className="w-full text-left rounded-[9px] px-[12px] py-[11px] md:px-[14px] md:py-[12px] min-h-[64px] md:min-h-0 bg-transparent border border-dashed border-[color:var(--border-dashed)]"
    >
      {/* Phone */}
      <span className="md:hidden block">
        <span className="flex items-baseline gap-[9px]">
          <span className="font-mono text-[13px] text-[color:var(--fg-faint)]">v0</span>
          <span className="flex-1" />
          {delta(true)}
        </span>
        <span className="block mt-[6px]">
          {note}
          {meta}
        </span>
      </span>
      {/* Desktop */}
      <span className="hidden md:flex items-center gap-[14px]">
        <span className="flex-none font-mono text-[13px] text-[color:var(--fg-faint)]" style={{ width: NUMBER_SLOT }}>
          v0
        </span>
        <span className="flex-1 min-w-0">
          {note}
          {meta}
        </span>
        {delta(false)}
        <span aria-hidden className="flex-none" style={{ width: MARKER_SLOT }} />
      </span>
    </button>
  );
}

/**
 * v0 opened (K12): a full-width note in the diff's place, dashed where InitialPanel carries the
 * accent rule. What v0 is, which version the deck is sleeved as (nothing, on a brew), the precon's
 * own page, and the way to unlink (K13).
 */
function OriginPanel({ deckId, deckName, origin, current, panelId }: {
  deckId: string;
  deckName: string;
  origin: DeckOrigin;
  /** The newest committed version, `v3`, or null on a linked brew. */
  current: string | null;
  panelId: string;
}) {
  const [unlinking, setUnlinking] = useState(false);
  const action = "inline-flex items-center min-h-[44px] md:min-h-[36px] font-sans text-[13px] font-semibold";
  return (
    <div
      id={panelId}
      data-origin-panel
      className="md:mb-[22px] rounded-[9px] px-[15px] py-[12px] bg-[color:var(--surface-sunken)] border border-dashed border-[color:var(--border-dashed)]"
    >
      <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
        <b className="font-semibold text-[color:var(--fg)]">{historyOriginCopy.originHeading}</b>{" "}
        {historyOriginCopy.originBody(origin.name, current)}
      </p>
      <div className="flex flex-wrap items-center gap-x-[18px] mt-[6px]">
        <Link href={`/decks/precons/${encodeURIComponent(origin.fileName)}`} className={`${action} text-[color:var(--accent)] no-underline`}>
          {historyOriginCopy.originOpen(origin.name)}
        </Link>
        <button
          type="button"
          onClick={() => setUnlinking(true)}
          className={`${action} cursor-pointer bg-transparent border-0 p-0 text-[color:var(--fg-muted)]`}
        >
          {preconsCopy.link.unlink.entryLong}
        </button>
      </div>
      {unlinking && (
        <UnlinkDialog deckId={deckId} deckName={deckName} fileName={origin.fileName} preconName={origin.name} onDismiss={() => setUnlinking(false)} />
      )}
    </div>
  );
}

/** The rail's open row: a version by id, or v0. */
const ORIGIN = "origin";

/**
 * The rail, and the one open diff beneath it.
 *
 * One open row at a time. Two open panels would put two card lists on a page
 * whose point is the rail, and the reader would be scrolling past a diff to reach
 * the row they wanted rather than reading the rail.
 */
export function VersionRail({
  deckId,
  deckName = "",
  versions,
  origin = null,
  foot = null,
}: {
  deckId: string;
  /** Named in the unlink confirm v0's panel opens. */
  deckName?: string;
  /** Newest first, as `listVersions` returns them. The builder draws no
   *  `Versions` tab for a deck with none and no v0, so this is empty only on a
   *  linked brew (K14). */
  versions: VersionSummary[];
  /** A linked deck's v0 (precons R3 §5): drawn last, and never current. */
  origin?: DeckOrigin | null;
  /** Drawn after the last row: an unlinked deck's `Built from a precon?` row (precons R3 K5), where
   *  v0 will land once linked. */
  foot?: ReactNode;
}) {
  const panelPrefix = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  // Every diff this visit has read, keyed on version id. Held by the rail because
  // closing a row unmounts the panel that fetched it, so A → B → A would
  // otherwise read A twice; held here and not in a module so it dies with the
  // route, which is what makes a commit elsewhere need no invalidation. See
  // AGENTS.md, "Caching a list a reader flips between". One `useState` rather than
  // a ref: the map is read while rendering the panel's initial state, which is
  // what a ref must not be used for.
  const [cache] = useState<Map<string, VersionDiffPayload>>(() => new Map());

  return (
    <div className="w-full">
      <h2 className="sr-only">{copy.heading(versions.length)}</h2>
      <div className="flex flex-col gap-[6px] px-[14px] md:px-[26px] pt-[18px] md:pt-[14px] mb-[18px] md:mb-[26px]">
        {origin && versions.length === 0 && (
          // K14: a linked brew. Nothing is committed, so nothing is current; v0 stands alone.
          <p className="m-0 mb-[4px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{historyOriginCopy.brewLine}</p>
        )}
        {versions.map((version, i) => {
          const panelId = `${panelPrefix}-${version.id}`;
          // Newest first, so the predecessor is the NEXT entry, not the previous
          // one — and the last entry has none, which is the v1 arm.
          const previous = versions[i + 1] ?? null;
          const open = openId === version.id;
          return (
            <div key={version.id} className="flex flex-col gap-[6px]">
              <RailRow
                // Over COMMITTED rows only: v0 is never in `versions` (lock 4).
                version={{ ...version, current: i === 0 }}
                // A v1 with v0 before it shows its delta against the precon.
                initial={previous === null && origin === null}
                open={open}
                panelId={panelId}
                onToggle={() => setOpenId(open ? null : version.id)}
              />
              {open && (
                <VersionDiff
                  deckId={deckId}
                  version={version}
                  previous={previous}
                  origin={origin}
                  panelId={panelId}
                  cache={cache}
                />
              )}
            </div>
          );
        })}
        {origin && (
          <>
            {versions.length > 0 && <OriginDivider />}
            <OriginRow
              origin={origin}
              open={openId === ORIGIN}
              panelId={`${panelPrefix}-${ORIGIN}`}
              onToggle={() => setOpenId(openId === ORIGIN ? null : ORIGIN)}
            />
            {openId === ORIGIN && (
              <OriginPanel
                deckId={deckId}
                deckName={deckName}
                origin={origin}
                current={versions[0] ? `v${versions[0].number}` : null}
                panelId={`${panelPrefix}-${ORIGIN}`}
              />
            )}
          </>
        )}
        {foot}
      </div>
    </div>
  );
}
