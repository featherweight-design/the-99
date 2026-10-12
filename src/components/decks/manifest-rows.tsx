import { deckTuningCopy } from "../../lib/copy/deck-tuning";

/**
 * What a run reads, one row per read (placement addendum v2, canvas :432-437, :459-462,
 * :600-605). The manifest is the honest disclosure of what the model is handed. Through H35
 * PR 2 a row ticked only when its read had genuinely landed, never on a timer; PR 3 replaces
 * that with a pure client-side stagger (below) — the disclosure is still honest (the figures a
 * row shows, when it shows any, are real), but the TICK itself is now presentational pacing.
 *
 * READ-ONLY, and drawn so it cannot read as a control (manifest-affordance addendum, Hugh
 * 2026-09-28). Its rows used to lead with an empty bordered box inside a bordered row, and a
 * reader pressed them as checkboxes. A read row is now a plain ruled line with no fill and no
 * border of its own, led by a status mark: a dot while pending, a ✓ once read. The one control
 * in the list is `Log a game →` on the dashed empty-games row, which sits above the ruled list.
 *
 * `count` null is a read still pending; a string is the landed count, already worded. While a
 * run is reading, every row's `count` is null — no run row carries secondary text except Your
 * games' `none logged` (H35, PR 3) — and a row ticks on the stagger's own timing, never on a
 * real read landing.
 * The one row that is shown without being read is the empty games row, drawn dashed with a way
 * to log a game: nothing is what the model is handed there, and the row says it.
 *
 * `absent` is the same dashed, pre-read treatment as `noGames`, generalised (H35, PR 3 review
 * fix): the description row, shown this way only in the never-run preview when there is no
 * description yet, with its own `Describe your deck →`. `label` names the row ("Your
 * description", matching a filled row's label) and `caption` carries its own "none yet" —
 * unlike `noGames`, which hardcodes "none logged" rather than taking it as data.
 *
 * `writing` is the final row (H35, PR 3): pending until every read row above it has ticked, then
 * active (an accent pulse) until the model call settles. It carries no `key` of its own — there
 * is only ever one.
 */
export type ManifestRow =
  | { kind: "read"; key: string; label: string; count: string | null; done: boolean }
  | { kind: "absent"; key: string; label: string; caption: string; actionLabel: string }
  | { kind: "writing"; label: string; active: boolean }
  | { kind: "noGames"; key: "games" };

const copy = deckTuningCopy.manifest;

export function ManifestRows({
  rows,
  onLogGame,
  onDescribe,
  writingLong,
}: {
  rows: readonly ManifestRow[];
  onLogGame?: () => void;
  /** The description row's own link, drawn only while its row is absent (H35, PR 3). */
  onDescribe?: () => void;
  /** The mono line under the writing row past 20s (STATES §3 state 7). */
  writingLong?: string | null;
}) {
  // `manifestRows` always puts the empty-games row first, so it is drawn above the ruled list.
  const noGames = rows.find((r) => r.kind === "noGames");
  const absent = rows.filter((r): r is Extract<ManifestRow, { kind: "absent" }> => r.kind === "absent");
  const reads = rows.filter(
    (r): r is Extract<ManifestRow, { kind: "read" } | { kind: "writing" }> => r.kind === "read" || r.kind === "writing",
  );
  return (
    <div className="mt-[14px] flex flex-col gap-[8px]">
      {noGames ? (
        <div
          data-testid="manifest-row"
          data-kind="no-games"
          className={`flex min-h-[46px] items-center gap-[10px] rounded-[8px] pl-[12px] md:min-h-[40px] ${onLogGame ? "pr-0" : "pr-[12px]"}`}
          style={{ border: "1px dashed var(--border-dashed)" }}
        >
          <Mark kind="none" />
          <span className="flex min-w-0 flex-1 flex-col gap-[1px] md:flex-row md:items-center md:gap-[10px]">
            <span className="text-[12.5px] md:flex-1 md:text-[13px]" style={{ color: "var(--fg-faint)" }}>
              {copy.games}
            </span>
            <span className="font-mono text-[10px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {copy.noneLogged}
            </span>
          </span>
          {onLogGame ? (
            <button
              type="button"
              onClick={onLogGame}
              className="flex h-[44px] flex-none items-center rounded-[6px] px-[12px] text-[12.5px] font-semibold text-[color:var(--accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:h-[38px] transition-colors"
            >
              {copy.logGame}
            </button>
          ) : null}
        </div>
      ) : null}
      {absent.map((row) => (
        <div
          key={row.key}
          data-testid="manifest-row"
          data-kind="absent"
          className={`flex min-h-[46px] items-center gap-[10px] rounded-[8px] pl-[12px] md:min-h-[40px] ${onDescribe ? "pr-0" : "pr-[12px]"}`}
          style={{ border: "1px dashed var(--border-dashed)" }}
        >
          <Mark kind="none" />
          <span className="flex min-w-0 flex-1 flex-col gap-[1px] md:flex-row md:items-center md:gap-[10px]">
            <span className="text-[12.5px] md:flex-1 md:text-[13px]" style={{ color: "var(--fg-faint)" }}>
              {row.label}
            </span>
            <span className="font-mono text-[10px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {row.caption}
            </span>
          </span>
          {onDescribe ? (
            <button
              type="button"
              onClick={onDescribe}
              className="flex h-[44px] flex-none items-center rounded-[6px] px-[12px] text-[12.5px] font-semibold text-[color:var(--accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:h-[38px] transition-colors"
            >
              {row.actionLabel}
            </button>
          ) : null}
        </div>
      ))}
      {reads.length > 0 ? (
        <ul className="flex flex-col" style={{ borderTop: "1px solid var(--border)" }}>
          {reads.map((row) =>
            row.kind === "writing" ? (
              <li
                key="writing"
                data-testid="manifest-row"
                data-kind="writing"
                data-active={row.active || undefined}
                className="flex min-h-[36px] cursor-default items-center gap-[10px] px-[2px] py-[8px] md:min-h-[32px] md:py-0"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <Mark kind={row.active ? "writing" : "pending"} />
                <span
                  className="min-w-0 flex-1 text-[12.5px] leading-[1.35] md:text-[13px]"
                  style={{ color: row.active ? "var(--fg)" : "var(--fg-body)" }}
                >
                  {row.label}
                </span>
              </li>
            ) : (
              <li
                key={row.key}
                data-testid="manifest-row"
                data-kind="read"
                data-done={row.done || undefined}
                className="flex min-h-[36px] cursor-default items-center gap-[10px] px-[2px] py-[8px] md:min-h-[32px] md:py-0"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <Mark kind={row.done ? "read" : "pending"} />
                <span
                  className="min-w-0 flex-1 text-[12.5px] leading-[1.35] md:text-[13px]"
                  style={{ color: row.done ? "var(--fg)" : "var(--fg-body)" }}
                >
                  {row.label}
                  <span className="sr-only"> {row.done ? copy.rowRead : copy.rowUnread}</span>
                </span>
                {row.count !== null ? (
                  <span className="flex-none font-mono text-[10px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
                    {row.count}
                  </span>
                ) : null}
              </li>
            ),
          )}
        </ul>
      ) : null}
      {writingLong ? (
        <p className="mt-[2px] font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>
          {writingLong}
        </p>
      ) : null}
    </div>
  );
}

/** The row's status: a dot pending, a ✓ read, a pulsing dot writing, a dash for the games row
 *  there is nothing to read in. `.anim-dots` already carries its own reduced-motion fallback
 *  (globals.css) — dropping to a still dot rather than a frozen pulse. */
function Mark({ kind }: { kind: "pending" | "read" | "none" | "writing" }) {
  return (
    <span aria-hidden data-testid="manifest-mark" data-mark={kind} className="flex w-[14px] flex-none justify-center">
      {kind === "pending" ? (
        <span className="size-[5px] rounded-full" style={{ background: "var(--fg-locked)" }} />
      ) : kind === "read" ? (
        <span className="text-[12px] font-semibold leading-none" style={{ color: "var(--accent)" }}>
          ✓
        </span>
      ) : kind === "writing" ? (
        <span className="anim-dots size-[5px] rounded-full" style={{ background: "var(--accent)" }} />
      ) : (
        <span className="font-mono text-[12px] leading-none" style={{ color: "var(--fg-locked)" }}>
          –
        </span>
      )}
    </span>
  );
}
