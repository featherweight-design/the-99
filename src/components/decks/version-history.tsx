"use client";

// §Surfaces 4 — the version rail. One row per committed version, newest first,
// and the newest wears `current` because it is the list the deck is sleeved as.
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
import { useId, useState } from "react";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { formatDeckDate } from "../../lib/decks/format";
// Type only: `versions.ts` reaches `src/db`, which throws at module init in a
// browser. See `src/lib/client-bundle-safety.test.ts`.
import type { VersionSummary } from "../../lib/decks/versions";
import { VersionDiff } from "./version-diff";

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
    <div
      className={`font-mono text-[10px] text-[color:var(--fg-faint)] ${
        phone ? "mt-[4px]" : "mt-[2px]"
      }`}
    >
      {parts.join(" · ")}
    </div>
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
      aria-controls={panelId}
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

/**
 * The rail, and the one open diff beneath it.
 *
 * One open row at a time. Two open panels would put two card lists on a page
 * whose point is the rail, and the reader would be scrolling past a diff to reach
 * the row they wanted rather than reading the rail.
 */
export function VersionHistory({
  deckId,
  deckName,
  versions,
}: {
  deckId: string;
  /** The deck's own name, for the one way off this route. A bare "Back" would
   *  make the reader remember which deck they were reading to know where the
   *  link goes — the review page's own reasoning, and its own header. */
  deckName: string;
  /** Newest first, as `listVersions` returns them. The route refuses an empty
   *  list before this renders — an empty rail reads as a bug. */
  versions: VersionSummary[];
}) {
  const panelPrefix = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto" style={{ maxWidth: 1180 }}>
      {/* The review page's header, verbatim in structure: its own ruled block on
          the phone, and on desktop the heading simply opens the page. The two
          routes are siblings off one deck and land the same way. */}
      <header className="px-[14px] pt-[38px] pb-[12px] border-b border-solid border-[color:var(--border)] md:px-[26px] md:pt-[24px] md:pb-0 md:border-b-0">
        <Link
          href={`/decks/${deckId}`}
          className="font-mono text-[10px] md:text-[11px] text-[color:var(--fg-faint)]"
        >
          {`← ${deckName}`}
        </Link>
        <h1 className="font-display font-bold text-[18px] md:text-[24px] mt-[9px] mb-0 md:mt-[12px] md:mb-[8px] text-[color:var(--fg)]">
          {copy.heading(versions.length)}
        </h1>
      </header>
      <div className="flex flex-col gap-[6px] px-[14px] md:px-[26px] pt-[18px] md:pt-[14px] mb-[18px] md:mb-[26px]">
        {versions.map((version, i) => {
          const panelId = `${panelPrefix}-${version.id}`;
          // Newest first, so the predecessor is the NEXT entry, not the previous
          // one — and the last entry has none, which is the v1 arm.
          const previous = versions[i + 1] ?? null;
          const open = openId === version.id;
          return (
            <div key={version.id} className="flex flex-col gap-[6px]">
              <RailRow
                version={{ ...version, current: i === 0 }}
                initial={previous === null}
                open={open}
                panelId={panelId}
                onToggle={() => setOpenId(open ? null : version.id)}
              />
              {open && (
                <VersionDiff
                  deckId={deckId}
                  version={version}
                  previous={previous}
                  panelId={panelId}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
