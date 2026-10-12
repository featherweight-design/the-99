// The credit press and the failed band's mark: Proposed cuts' Look deeper, and Find a deck's read.
// A filled (or outlined) button whose credit is a segment inside it after a rule, the segment
// dropped when no credit is left (tuning hub, Mana Balance feedback).

export function CreditButton({ label, credit, filled, blocked, spent, onPress, ariaLabel }: {
  label: string;
  /** The segment after the drawn ◆: `1 credit`. */
  credit: string;
  filled: boolean; blocked: boolean; spent: boolean; onPress: () => void;
  /** In place of the label-derived name, for a press whose label is a question. */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={blocked}
      aria-label={ariaLabel ?? (spent ? `${label}. No credits left.` : `${label}. Uses 1 credit.`)}
      className={`flex h-[44px] w-full flex-none items-stretch overflow-hidden rounded-[8px] border border-[color:var(--accent)] text-[13px] font-semibold disabled:opacity-50 md:h-[38px] md:w-auto ${filled ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-transparent text-[color:var(--accent)]"}`}
    >
      <span className="flex flex-1 items-center justify-center px-[16px]">{label}</span>
      {spent ? null : (
        <span
          aria-hidden
          className={`flex items-center gap-[5px] border-l px-[11px] font-mono text-[11px] ${filled ? "[border-left-color:color-mix(in_srgb,var(--bg)_35%,transparent)]" : "border-[color:var(--accent)]"}`}
        >
          <span>{"◆"}</span>{credit}
        </span>
      )}
    </button>
  );
}

export function FailMark({ label }: { label: string }) {
  return (
    <svg role="img" aria-label={label} width="18" height="18" viewBox="0 0 16 16" className="flex-none">
      {/* A filled disc with the `!` cut out (even-odd), so whatever is behind it shows through. */}
      <path fill="var(--danger)" fillRule="evenodd" clipRule="evenodd" d="M8 1.2 A6.8 6.8 0 1 0 8 14.8 A6.8 6.8 0 1 0 8 1.2 Z M7.05 4 H8.95 L8.6 9.3 H7.4 Z M8 10.5 A1.15 1.15 0 1 0 8 12.8 A1.15 1.15 0 1 0 8 10.5 Z" />
    </svg>
  );
}
