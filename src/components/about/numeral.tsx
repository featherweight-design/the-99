// The annotation numeral, in one place.
//
// "Annotation is a numeral and a line" is the handoff's grammar, and the page
// shipped with the numerals on the LINES only — a numeral with nothing to point
// at is a bullet. The figure needs the same mark on the part each line
// describes, so the mark is a component rather than two class lists that agree
// today.
export function KeyNumeral({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex h-[14px] w-[14px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] font-mono text-[9px] text-[color:var(--accent)] ${className}`}
    >
      {n}
    </span>
  );
}
