import { STRATEGY_GLYPHS } from "./strategy-icon";

/**
 * The tokens mark (`◎` in the handoff's status line): the strategy ring's own Tokens drawing, at the size the status
 * line's combos glyph is set (13px), in the label's ink. Decorative: the press carries the words.
 */
export function TokenGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-token-glyph
    >
      {STRATEGY_GLYPHS.tokens}
    </svg>
  );
}
