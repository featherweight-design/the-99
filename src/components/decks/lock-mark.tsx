/**
 * The lock glyph at a deck site (Locked, handoff R2 §The lock glyph), 11×14: the shared `Lock` at `md`, in the ink
 * its tone rules pick, so it takes the colour of whatever surface draws it.
 *
 * TWO STATES. Closed: both legs meet the body. Open: the right leg is lifted.
 *
 * TWO TONES, and the tone is the surface's rather than the card's. At rest a closed lock is
 * `--fg-body` and an open one `--fg-faint` (drawn by nothing since the desktop hover shortcut was
 * retired, 2026-09-25). In the Lock cards mode a
 * closed lock is `--accent` and an open one `--fg-muted`: accent is spent only inside the mode, the
 * same ink as its `Done`. `ink` overrides both, for the one place the glyph is an icon rather than a
 * state (the toolbar button's, `--fg-muted` at rest and `--accent` as `Done`).
 *
 * `aria-hidden`: the mark is never the only thing that says a card is locked. The climb names
 * the lock in its sentence, and the rows carry it in their description.
 */
import { Lock } from "../ui/lock";

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
      className="inline-flex h-[14px] w-[11px] flex-none"
      style={{ color }}
    >
      <Lock size="md" open={open} />
    </span>
  );
}
