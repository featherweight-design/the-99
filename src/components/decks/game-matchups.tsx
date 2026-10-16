"use client";
// GameMatchups: the Games tab's Matchups section, between the findings and History (Social R3 plan, PR 4; the
// handoff's M1 to M5 and MP1 to MP4). Heading with its denominator, a three-way switch (Commander, Colors,
// Friend; one list at a time), and a row per opponent: a face, a name, one square per game and a count.
// Never a ratio. The rules are `lib/decks/matchup-rows.ts`; this draws them.
//
// Games exist and none has an opponent: the heading, `recorded in 0 of N games` and one dashed line, no switch.
// The section is absent with no games (the shipped empty state) and with the switch off (the panel is not given
// a `matchups`).

import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";
import { useRef, useState, type KeyboardEvent } from "react";
import { gameMatchupsCopy } from "../../lib/copy/game-matchups";
import { matchupRows, singleGameCaption, type MatchupRow, type MatchupSplit, type Thumb } from "../../lib/decks/matchup-rows";
import type { Matchups } from "../../lib/decks/matchups";
import { IdentityPips } from "../commanders/commander-art";
import { ArtLayer } from "../ui/art-layer";
import { TrophyIcon } from "./trophy-icon";

const copy = gameMatchupsCopy.matchups;
const SPLITS: { value: MatchupSplit; label: string }[] = [
  { value: "commanders", label: copy.byCommander },
  { value: "identities", label: copy.byColors },
  { value: "friends", label: copy.byFriend },
];

function ThumbView({ thumb }: { thumb: Thumb }) {
  return (
    <span
      aria-hidden
      className={
        "relative flex h-[34px] w-[48px] shrink-0 items-center justify-center gap-[2px] overflow-hidden rounded-[6px] md:h-[38px] md:w-[56px] md:rounded-[7px] " +
        (thumb.kind === "pips" ? "bg-transparent" : "bg-[color:var(--elevated)]") +
        " font-mono text-[11px] font-medium text-[color:var(--fg-muted)]"
      }
    >
      {thumb.kind === "art" && <ArtLayer src={thumb.imageUri} style={{ backgroundPosition: "50% 20%" }} />}
      {thumb.kind === "pips" && <IdentityPips colorIdentity={thumb.colorIdentity} size={8} gap={2} />}
      {thumb.kind === "initials" && thumb.text}
    </span>
  );
}

function Squares({ row }: { row: MatchupRow }) {
  if (row.squares === null) {
    return <span className="font-mono text-[12px] text-[color:var(--fg-body)]" role="img" aria-label={row.aria}>{row.counts}</span>;
  }
  return (
    <span className="flex flex-wrap gap-[4px]" role="img" aria-label={row.aria}>
      {row.squares.map((g, i) => (
        <i
          key={i}
          className={
            "box-border flex h-[20px] w-[20px] items-center justify-center rounded-[5px] border border-solid font-mono text-[10px] font-semibold not-italic md:h-[22px] md:w-[22px] md:text-[10.5px] " +
            (g === "W" ? "border-[color:var(--success)] text-[color:var(--success)]" : "border-[color:var(--border-strong)] text-[color:var(--fg-body)]")
          }
        >
          {g}
        </i>
      ))}
    </span>
  );
}

function Row({ row }: { row: MatchupRow }) {
  return (
    <li className="flex min-h-[62px] list-none items-center gap-[11px] border-0 border-b border-solid border-b-[color:var(--border)] py-[6px] last:border-b-0 lg:grid lg:min-h-[54px] lg:grid-cols-[56px_minmax(0,1fr)_300px_84px_76px] lg:gap-[14px]">
      <ThumbView thumb={row.thumb} />
      <span className="flex min-w-0 flex-1 flex-col gap-[5px] lg:contents">
        <span className="flex min-w-0 flex-col lg:min-w-0">
          <span className="truncate text-[14px] text-[color:var(--fg)]">{row.name}</span>
          {row.sub && <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{row.sub}</span>}
        </span>
        <Squares row={row} />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-[4px] lg:contents">
        <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] lg:order-last lg:text-right md:text-[11px]">{copy.games(row.games)}</span>
        <span className="flex items-center gap-[4px] font-mono text-[11px] text-[color:var(--fg)] md:text-[11.5px]">
          {row.beat > 0 && (
            <>
              <TrophyIcon size={13} />
              <span role="img" aria-label={copy.beatAria(row.beat)}>{row.beat}</span>
            </>
          )}
        </span>
      </span>
    </li>
  );
}

export function GameMatchups({ matchups }: { matchups: Matchups }) {
  const [split, setSplit] = useState<MatchupSplit>("commanders");
  // M10 (discovery R1): the switch is the moment's control from the deck's third logged game.
  const splitMoment = useMomentAnchor("matchups", { eligible: matchups.games >= 3, copy: momentsCopy.matchups });
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const rows = matchups.recorded === 0 ? [] : matchupRows(matchups, split);
  const caption = singleGameCaption(rows);

  // One tab stop with arrows inside it, selection following focus: the same pattern every radiogroup answers.
  function onKey(from: number) {
    return (event: KeyboardEvent) => {
      const dir = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (dir === 0) return;
      event.preventDefault();
      const next = (from + dir + SPLITS.length) % SPLITS.length;
      refs.current[next]?.focus();
      setSplit(SPLITS[next].value);
    };
  }

  return (
    <section aria-labelledby="game-matchups-heading" className="mt-[22px] md:mt-[26px]">
      <div className="mb-[8px] flex flex-wrap items-baseline gap-x-[8px] gap-y-[8px] md:mb-[10px] md:min-h-[44px] md:items-center md:gap-x-[10px]">
        <h2 id="game-matchups-heading" className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-faint">{copy.heading}</h2>
        <span className="font-mono text-[10px] text-fg-locked">{copy.recorded(matchups.recorded, matchups.games)}</span>
        {matchups.recorded > 0 && (
          // One group at both widths: full width under the heading on the phone, at the heading's right from md.
          <div {...splitMoment} role="radiogroup" aria-label={copy.split} className="order-last flex w-full gap-[2px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[3px] md:order-none md:ml-auto md:w-auto md:rounded-[9px]">
            {SPLITS.map((s, i) => (
              <SplitButton key={s.value} on={split === s.value} label={s.label} buttonRef={(node) => { refs.current[i] = node; }} onKeyDown={onKey(i)} onPick={() => setSplit(s.value)} className="h-[38px] flex-1 text-[13px] md:h-[32px] md:flex-none md:px-[14px] md:text-[12.5px]" />
            ))}
          </div>
        )}
      </div>
      {matchups.recorded === 0 ? (
        <p className="m-0 rounded-[10px] border border-dashed border-[color:var(--border-dashed)] p-[14px] text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)] md:rounded-[11px] md:px-[18px] md:py-[16px]">{copy.empty}</p>
      ) : (
        <div className="rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] px-[12px] pb-[10px] pt-[4px] md:rounded-[11px] md:px-[18px] md:pb-[12px] md:pt-[6px]">
          {caption && <p className="m-0 mb-[2px] mt-[8px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-muted)] md:text-[11px]">{caption === "allOne" ? copy.allOne : copy.mostlyOne}</p>}
          <ul className="m-0 list-none p-0">{rows.map((r) => <Row key={r.key} row={r} />)}</ul>
          <p className="m-0 mt-[10px] flex items-center gap-[7px] font-mono text-[10px] leading-[1.5] text-[color:var(--fg-faint)] md:text-[10.5px]">
            <span className="md:hidden">{copy.legendPhone}</span>
            <span className="hidden md:inline">{copy.legend}</span>
            <span className="hidden items-center gap-[5px] md:inline-flex"><TrophyIcon size={12} />{copy.legendBeat}</span>
          </p>
        </div>
      )}
    </section>
  );
}

function SplitButton({ on, label, buttonRef, onKeyDown, onPick, className }: {
  on: boolean; label: string; buttonRef: (node: HTMLButtonElement | null) => void;
  onKeyDown: (e: KeyboardEvent) => void; onPick: () => void; className: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={on}
      tabIndex={on ? 0 : -1}
      onKeyDown={onKeyDown}
      onClick={onPick}
      className={`cursor-pointer rounded-[7px] border-0 font-medium ${on ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "bg-transparent text-[color:var(--fg-muted)]"} ${className}`}
    >
      {label}
    </button>
  );
}
