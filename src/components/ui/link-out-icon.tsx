/**
 * The app's one link-out mark (announcements R1b-3, Hugh: the arrow glyph was too large, and the
 * box-and-arrow is standard): an open box with an arrow leaving its corner, on a 24 grid with round caps and joins at stroke 2.4,
 * so it holds at 11px. A 0.72em square on the baseline, 0.3em after the word, in the colour of the text it follows
 * (`currentColor`, so a call site's colour class is the glyph's colour was). Decorative: a press that opens a new tab
 * says so in words (`NEW_TAB_SUFFIX` or its own label), never through the icon.
 *
 * `data-link-out` is the stable marker tests and probes find it by.
 */
export function LinkOutIcon({ className }: { className?: string }) {
  return (
    <svg
      data-link-out=""
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`ml-[.3em] inline-block h-[.72em] w-[.72em] flex-none align-[-.02em]${className ? ` ${className}` : ""}`}
    >
      <path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5" />
      <path d="M15 3h6v6" />
      <path d="M10.5 13.5 21 3" />
    </svg>
  );
}

/**
 * A label that ends in the link-out icon, bound to its last word so the icon never wraps alone: the last word and the
 * icon share one no-wrap run (the board binds it the same way, inside a no-wrap press). One inline span, so a flex
 * press sees one item and its `gap` never lands between the words or before the icon. The text is the label exactly,
 * with no added space or joiner, so the press's words read (and test) as written.
 */
export function LinkOutLabel({ children, iconClassName }: { children: string; iconClassName?: string }) {
  const cut = children.lastIndexOf(" ") + 1;
  return (
    <span data-link-out-label="">
      {cut > 0 ? children.slice(0, cut) : null}
      <span className="whitespace-nowrap">
        {children.slice(cut)}
        <LinkOutIcon className={iconClassName} />
      </span>
    </span>
  );
}
