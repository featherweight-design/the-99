// The "working" mark (addendum_overview_loading, 2026-09-25): three 5px dots in `--fg-muted` on the
// tab's own `at-wave` (1.6s, 0.16s stagger). It leads a status line and never stands alone, because
// the words beside it carry the state; under reduced motion `at-wave` holds still at full ink.
// The bracket marks stay the tab's loader: this is the smaller mark for a part of the tab at work.
export function WorkPulse() {
  return (
    <span aria-hidden="true" className="inline-flex flex-none items-center gap-[4px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="anim-at-wave block h-[5px] w-[5px] rounded-full bg-[var(--fg-muted)]"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}
