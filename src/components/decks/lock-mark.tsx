/**
 * The lock glyph (Locked, handoff R2 §The lock glyph): 11×13, drawn in CSS rather than an icon
 * font, so it takes the ink of whatever surface draws it. This is the CLOSED lock at rest, the
 * only state the climb sheet shows; the mode's open lock and its accent ink arrive with the
 * toggles that draw them.
 *
 * `aria-hidden`: the mark is never the only thing that says a card is locked. The climb names
 * the lock in its sentence, and the rows carry it in their description.
 */
export function LockMark({ title }: { title?: string }) {
  return (
    <span
      aria-hidden="true"
      title={title}
      data-testid="lock-mark"
      className="relative inline-block h-[13px] w-[11px] flex-none text-[color:var(--fg-body)]"
    >
      {/* The arch: 7 wide at left 2, no bottom edge. Closed, it is 7.5 tall so both legs meet the body. */}
      <span className="absolute left-[2px] top-0 h-[7.5px] w-[7px] rounded-t-[3.5px] border-[1.6px] border-b-0 border-current" />
      {/* The body, filled, with the keyhole punched in the page's ground. */}
      <span className="absolute left-0 top-[6.5px] h-[6.5px] w-[11px] rounded-[2px] bg-current" />
      <span className="absolute left-[4.5px] top-[8.75px] h-[2px] w-[2px] rounded-full bg-[color:var(--bg)]" />
    </span>
  );
}
