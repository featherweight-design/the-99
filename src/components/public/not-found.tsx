import { twMerge } from "tailwind-merge";

import { shellCopy } from "../../lib/copy/shell";
import { NOT_FOUND_ACTION, NotFoundView } from "../shell/not-found-view";
import { BASE, PRIMARY } from "../ui/button";
import { PublicTopBar } from "./top-bar";

/**
 * The public pages' unknown address (C3): the top bar with the Scryfall hand-off, then the shipped not-found's body with ONE
 * way out, `Back home`. No `View decks` (it leads behind sign-in), no suggestions, nothing that would need a search. Drawn
 * for an address that does not resolve, an ambiguous one, and every address while the switch is off.
 *
 * `Back home` is a plain `<a>` in the shipped primary's fill, not `PrimaryButton`: every exit from a public page is a plain
 * link (plan, follow-up B), so it never depends on a soft navigation re-rendering the root layout around it.
 */
export function PublicNotFound() {
  return (
    <div data-testid="public-not-found" className="flex min-h-dvh flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
      <PublicTopBar />
      <main className="flex flex-1 flex-col">
        <NotFoundView>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a public page's exits are plain links (see above). */}
          <a href="/" className={twMerge(BASE, PRIMARY, "no-underline", NOT_FOUND_ACTION)}>
            {shellCopy.notFound.primaryCta}
          </a>
        </NotFoundView>
      </main>
    </div>
  );
}
