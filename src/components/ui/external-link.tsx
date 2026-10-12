import { twMerge } from "tailwind-merge";

// The shared outbound-link primitive (design table: "StoreLink"). Text only —
// no box, no padding, no margin of its own, so the container it sits in owns
// its spacing and the focus ring is an `outline` that takes no layout space.

/** Lives here rather than in a copy file because every instance renders it and
 *  no call site may vary it. */
const NEW_TAB_SUFFIX = " (opens in a new tab)";

const LINK =
  "inline rounded-[6px] text-[14px] font-medium leading-[1.45] text-[color:var(--accent-hover)] " +
  "underline decoration-1 underline-offset-[3px] " +
  "decoration-[color-mix(in_srgb,var(--accent-hover)_45%,transparent)] " +
  "hover:text-[color:var(--fg)] hover:decoration-[color:var(--fg)] transition-colors " +
  "active:text-[color:var(--fg)] active:decoration-[color:var(--fg)] active:decoration-2 transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

type ExternalLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export function ExternalLink({ href, label, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={twMerge("group", LINK, className)}
    >
      {label}
      {/* The nbsp binds the glyph to the last word so it can never wrap alone.
          It belongs here and not in the copy string. */}
      <span
        aria-hidden="true"
        className="text-[0.85em] text-[color:var(--fg-muted)] group-hover:text-[color:var(--fg)] group-active:text-[color:var(--fg)] transition-colors"
      >
        {" ↗"}
      </span>
      <span className="sr-only">{NEW_TAB_SUFFIX}</span>
    </a>
  );
}
