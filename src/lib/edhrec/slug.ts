export function commanderSlug(name: string): string {
  return name
    .split(" // ")[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks left by NFD
    .toLowerCase()
    .replace(/['‘’]/g, "")
    // Modifier letters and symbols are dropped for the same reason apostrophes are:
    // EDHREC treats them as part of the word. `Ratonhnhaké꞉ton` carries U+A789, a
    // modifier letter COLON rather than a colon, and EDHREC serves it at
    // `ratonhnhaketon`; the separating pass below turned it into a hyphen and asked
    // for a page that does not exist (#712). One name in the catalog carries one of
    // these today, so this is the class rather than that card.
    .replace(/[\p{Lm}\p{Sk}]/gu, "")
    // Dropped, not separated. EDHREC slugs an initialism by removing its periods —
    // "Scientist Supreme of A.I.M." is `scientist-supreme-of-aim`, not
    // `...-a-i-m` — and the separating pass below would otherwise turn each period
    // into its own hyphen, producing a URL EDHREC answers with 403 (#333). Only
    // initialisms move: a period followed by a space ("Mr. Orfeo, the Boulder")
    // already collapses into the one hyphen the space earns, with or without this
    // step.
    //
    // This is the app's own `/commanders/<slug>` URL as well, so nine commanders in
    // the catalog change address — `m-o-d-o-k` becomes `modok`, `...-of-s-h-i-e-l-d`
    // becomes `...-of-shield`. No legacy alias is kept for them, deliberately. Those
    // nine are exactly the pages that were serving a commander EDHREC had refused, so
    // an old bookmark points at the reading this change exists to correct; and the
    // scheme never promised durable URLs anyway — dedup suffixes follow rank order,
    // which is why `actions.ts` revalidates `/commanders/[slug]` after every recompute.
    // A second slug rule kept alive forever to redirect nine URLs costs more than it
    // returns.
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
