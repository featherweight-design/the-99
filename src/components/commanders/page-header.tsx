// The lane header — the title bar over both /commanders and /discover.
//
// It used to carry the `I own` / `To play` scope toggle and a subtitle that
// reported what the toggle had selected. The two-lane split retires both: the
// scope is now the route, the nav is the switch, and the counts the subtitle
// reported have moved onto the rack's result line, which is the one place on
// either lane that says how many rows a filter left.
//
// What is left is a title and a fixed gloss on it. Desktop reads them as one
// row (Cinzel 20px beside mono 11px, 12px apart, over a hairline); the phone
// stacks them (22px over 10.5px, 4px apart, no rule — the rack below draws its
// own). One subtree with responsive classes, not a mobile branch beside a
// desktop one.

import type { Lane } from "../../lib/commanders/lane-params";
import { commandersCopy, discoverCopy } from "../../lib/copy/lanes";

export function PageHeader({ lane }: { lane: Lane }) {
  const copy = lane === "owned" ? commandersCopy : discoverCopy;

  return (
    <div
      className={[
        "flex flex-col px-4 pt-3",
        "sm:flex-row sm:items-center sm:gap-3 sm:border-b sm:border-b-[color:var(--border)] sm:border-[color:var(--border)]",
        "sm:px-[22px] sm:py-4",
      ].join(" ")}
    >
      <h1
        className="font-display font-bold m-0 text-[22px] text-[color:var(--fg)] sm:text-[20px]"
      >
        {copy.title}
      </h1>
      <p className="font-mono m-0 mt-1 text-[10.5px] text-[color:var(--fg-faint)] sm:mt-0 sm:text-[11px]">
        {copy.subtitle}
      </p>
    </div>
  );
}
