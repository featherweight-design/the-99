// Hidden from friends (friend decks handoff, README 4, `Hide-Switch.dc.html`): the Friends nav glyph one unit right,
// struck through, at 1.6. ONE drawing for the deck header's mark, the /decks tile's glyph and the /decks key.

import { socialCopy } from "../../lib/copy/social";

export function HiddenFromFriendsGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-hidden-from-friends-glyph
      className="flex-none"
    >
      <circle cx="8.6" cy="7.4" r="2.7" />
      <path d="M3.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5" />
      <path d="M13.4 4.9a2.4 2.4 0 1 1 1.3 4.5" />
      <path d="M15.6 11.6c1.5.5 2.4 1.9 2.7 4" />
      <path d="M2.6 2.6l14.8 14.8" />
    </svg>
  );
}

/** The deck header's mark, in its chips row after the bracket chip: the glyph and its words. A mark, not a press. */
export function HiddenFromFriendsMark() {
  return (
    <span
      data-hidden-from-friends
      className="inline-flex h-[24px] flex-none items-center gap-[6px] font-mono text-[11px] text-[color:var(--fg-muted)]"
    >
      <HiddenFromFriendsGlyph size={14} />
      {socialCopy.hideDeck.mark}
    </span>
  );
}
