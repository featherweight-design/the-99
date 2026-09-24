import { deckTuningCopy } from "../../lib/copy/deck-tuning";

/**
 * What a run reads, one row per read (placement addendum v2, canvas :432-437, :459-462,
 * :600-605). The manifest is the honest disclosure of what the model is handed: a row ticks when
 * its read has genuinely landed, never on a timer, and a row with nothing to read says so.
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
  return (
    <ul className="mt-[14px] flex flex-col gap-[6px]">
      {rows.map((row) =>
        row.kind === "noGames" ? (
          <li
            key={row.key}
            data-testid="manifest-row"
            className="flex min-h-[44px] items-center gap-[10px] rounded-[8px] px-[12px] md:min-h-[38px]"
            style={{ border: "1px dashed var(--border-dashed)" }}
          >
            <Box dashed />
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
                className="flex-none py-[12px] text-[12.5px] font-semibold text-[color:var(--accent)] hover:underline md:py-0"
              >
                {copy.logGame}
              </button>
            ) : null}
          </li>
        ) : (
          <li
            key={row.key}
            data-testid="manifest-row"
            data-done={row.done || undefined}
            className="flex min-h-[44px] items-center gap-[10px] rounded-[8px] px-[12px] md:min-h-[38px]"
            style={{
              background: row.done ? "var(--elevated)" : "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <Box done={row.done} />
            <span className="min-w-0 flex-1 py-[6px] text-[12.5px] leading-[1.35] md:py-0 md:text-[13px]" style={{ color: "var(--fg-body)" }}>
              {row.label}
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
  );
}

function Box({ done = false, dashed = false }: { done?: boolean; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      className="flex size-[18px] flex-none items-center justify-center rounded-[4px] text-[10px] md:size-[16px]"
      style={{
        border: dashed
          ? "1px dashed var(--border-dashed)"
          : `1px solid ${done ? "var(--accent)" : "var(--border-strong)"}`,
        color: "var(--accent)",
      }}
    >
      {done ? "✓" : null}
    </span>
  );
}
