/**
 * The lock glyph (Locked, handoff R2 §The lock glyph): 11×13, drawn in CSS rather than an icon
 * font, so it takes the ink of whatever surface draws it.
 *
 * TWO STATES. Closed: the arch is 7.5 tall, so both legs meet the body. Open: the arch is 4.5
 * tall and a 1.6×3.5 left leg runs from y 3.5 into the body, so only the right leg stops short.
 *
 * TWO TONES, and the tone is the surface's rather than the card's. At rest a closed lock is
 * `--fg-body` and an open one (the desktop hover shortcut) `--fg-faint`. In the Lock cards mode a
 * closed lock is `--accent` and an open one `--fg-muted`: accent is spent only inside the mode, the
 * same ink as its `Done`. `ink` overrides both, for the one place the glyph is an icon rather than a
 * state (the toolbar button's, `--fg-muted` at rest and `--accent` as `Done`).
 *
 * `aria-hidden`: the mark is never the only thing that says a card is locked. The climb names
 * the lock in its sentence, and the rows carry it in their description.
 */
export function LockMark({
  title,
  open = false,
  tone = "rest",
  ink,
}: {
  title?: string;
  open?: boolean;
  tone?: "rest" | "mode";
  ink?: string;
}) {
  const color =
    ink ??
    (tone === "mode"
      ? open ? "var(--fg-muted)" : "var(--accent)"
      : open ? "var(--fg-faint)" : "var(--fg-body)");
  return (
    <span
      aria-hidden="true"
      title={title}
      data-testid="lock-mark"
      data-lock-state={open ? "open" : "closed"}
      className="relative inline-block h-[13px] w-[11px] flex-none"
      style={{ color }}
    >
      {/* The arch: 7 wide at left 2, no bottom edge. Closed, it is 7.5 tall so both legs meet the
          body; open, 4.5, so both stop short and the left leg below closes the gap on its side. */}
      <span
        className={`absolute left-[2px] top-0 w-[7px] rounded-t-[3.5px] border-[1.6px] border-b-0 border-current ${
          open ? "h-[4.5px]" : "h-[7.5px]"
        }`}
      />
      {open && <span className="absolute left-[2px] top-[3.5px] h-[3.5px] w-[1.6px] bg-current" />}
      {/* The body, filled, with the keyhole punched in the page's ground. */}
      <span className="absolute left-0 top-[6.5px] h-[6.5px] w-[11px] rounded-[2px] bg-current" />
      <span className="absolute left-[4.5px] top-[8.75px] h-[2px] w-[2px] rounded-full bg-[color:var(--bg)]" />
    </span>
  );
}
