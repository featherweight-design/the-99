// History's two links on the route: the form's way in (right end of its back line, phone only) and
// the History view's way back to the form. Server-renderable: no state.
import Link from "next/link";

const HISTORY_GLYPH = (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="flex-none">
    <path d="M8 2.2a5.8 5.8 0 1 1-5.6 4.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2 2.6v3.6h3.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 5v3.3l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function HistoryLink({ href, label, back = false }: { href: string; label: string; back?: boolean }) {
  if (back) {
    return (
      <Link href={href} className="flex min-h-[44px] items-center px-[18px] text-[12.5px] font-medium text-[color:var(--fg-muted)] no-underline">
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex min-h-[44px] items-center gap-[6px] px-[2px] text-[12.5px] font-medium text-[color:var(--accent)] no-underline md:hidden"
    >
      {HISTORY_GLYPH}
      {label}
    </Link>
  );
}
