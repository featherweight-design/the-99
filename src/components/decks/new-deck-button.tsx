import Link from "next/link";

/**
 * "New Deck" CTA — server component, pure Link.
 * §New Deck button: IBM Plex Sans 600 14px #14110E on #C9A24B brass.
 * Mobile: full-width 11px 0 padding. Desktop: auto-width 11px 20px.
 */
export function NewDeckButton() {
  return (
    <Link
      href="/decks/new"
      className="block w-full text-center md:inline-block md:w-auto rounded-[8px] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: 14,
        color: "#14110E",
        background: "#C9A24B",
        border: "none",
        padding: "11px 0",
      }}
    >
      <span className="md:hidden">New Deck</span>
      <span className="hidden md:inline" style={{ padding: "0 20px" }}>New Deck</span>
    </Link>
  );
}
