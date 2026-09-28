import { deckTuningCopy } from "../../lib/copy/deck-tuning";

/**
 * What a run reads, one row per read (placement addendum v2, canvas :432-437, :459-462,
 * :600-605). The manifest is the honest disclosure of what the model is handed: a row ticks when
 * its read has genuinely landed, never on a timer, and a row with nothing to read says so.
 *
 * READ-ONLY, and drawn so it cannot read as a control (manifest-affordance addendum, Hugh
 * 2026-09-28). Its rows used to lead with an empty bordered box inside a bordered row, and a
 * reader pressed them as checkboxes. A read row is now a plain ruled line with no fill and no
 * border of its own, led by a status mark: a dot while pending, a ✓ once read. The one control
 * in the list is `Log a game →` on the dashed empty-games row, which sits above the ruled list.
 *
 * `count` null is a read still pending; a string is the landed count, already worded.
 * The one row that is shown without being read is the empty games row, drawn dashed with a way
 * to log a game: nothing is what the model is handed there, and the row says it.
 */
export type ManifestRow =
  | { kind: "read"; key: string; label: string; count: string | null; done: boolean }
  | { kind: "noGames"; key: "games" };

const copy = deckTuningCopy.manifest;

export function ManifestRows({ rows, onLogGame }: { rows: readonly ManifestRow[]; onLogGame?: () => void }) {
  // `manifestRows` always puts the empty-games row first, so it is drawn above the ruled list.
  const noGames = rows.find((r) => r.kind === "noGames");
  const reads = rows.filter((r): r is Extract<ManifestRow, { kind: "read" }> => r.kind === "read");
  return (
    <div className="mt-[14px] flex flex-col gap-[8px]">
      {noGames ? (
        <div
          data-testid="manifest-row"
          data-kind="no-games"
          className="flex min-h-[46px] items-center gap-[10px] rounded-[8px] pl-[12px] pr-0 md:min-h-[40px]"
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
              className="flex h-[44px] flex-none items-center rounded-[6px] px-[12px] text-[12.5px] font-semibold text-[color:var(--accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:h-[38px]"
            >
              {copy.logGame}
            </button>
          ) : null}
        </div>
      ) : null}
      {reads.length > 0 ? (
        <ul className="flex flex-col" style={{ borderTop: "1px solid var(--border)" }}>
          {reads.map((row) => (
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
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The row's status: a dot pending, a ✓ read, a dash for the games row there is nothing to read in. */
function Mark({ kind }: { kind: "pending" | "read" | "none" }) {
  return (
    <span aria-hidden data-testid="manifest-mark" data-mark={kind} className="flex w-[14px] flex-none justify-center">
      {kind === "pending" ? (
        <span className="size-[5px] rounded-full" style={{ background: "var(--fg-locked)" }} />
      ) : kind === "read" ? (
        <span className="text-[12px] font-semibold leading-none" style={{ color: "var(--accent)" }}>
          ✓
        </span>
      ) : (
        <span className="font-mono text-[12px] leading-none" style={{ color: "var(--fg-locked)" }}>
          –
        </span>
      )}
    </span>
  );
}
