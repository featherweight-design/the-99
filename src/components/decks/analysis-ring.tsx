import type { Bracket } from "../../lib/profile/types";
import { BracketMark } from "./bracket-mark";

/** The ring's five marks, 1 at twelve o'clock and running clockwise: a 150px box, 50px radius, 44px marks. */
const RING: { bracket: Bracket; left: number; top: number }[] = ([1, 2, 3, 4, 5] as const).map((bracket, i) => {
  const t = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return {
    bracket,
    left: Math.round(75 + 50 * Math.cos(t) - 22),
    top: Math.round(75 + 50 * Math.sin(t) - 22),
  };
});

/**
 * The five bracket marks in a ring, on the tab's own `at-wave` light while `busy`. One drawing for
 * every state that shows it (the empty state, a reading in progress, the opening loader), so they
 * cannot drift apart. DECORATIVE and `aria-hidden`: the words beside it carry the state, which is
 * why a caller may dim it below `DIM_OPACITY`.
 */
export function AnalysisRing({
  busy,
  opacity,
  testId,
}: {
  busy: boolean;
  opacity?: number;
  testId: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className="relative mx-auto block h-[150px] w-[150px] flex-none md:mx-0"
      style={{ opacity }}
    >
      {RING.map(({ bracket, left, top }, i) => (
        <span
          key={bracket}
          className={"absolute " + (busy ? "anim-at-wave" : "")}
          style={{ left, top, animationDelay: busy ? `${i * 0.16}s` : undefined }}
        >
          <BracketMark bracket={bracket} px={44} />
        </span>
      ))}
    </span>
  );
}
