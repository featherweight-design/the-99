import { PrimaryButton } from "@/components/ui/button";

/**
 * "New Deck" CTA — server component. `PrimaryButton` renders a next/link here
 * rather than a button, because it is given an `href`.
 * §New Deck button: IBM Plex Sans 600 14px var(--bg) on var(--accent) accent.
 * Mobile: full-width 11px 0 padding. Desktop: auto-width 11px 20px.
 */
export function NewDeckButton() {
  return (
    <PrimaryButton
      href="/decks/new"
      className="block w-full text-center text-[14px] py-[11px] px-0 md:inline-block md:w-auto md:px-[20px]"
    >
      New Deck
    </PrimaryButton>
  );
}
