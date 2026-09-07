export function commanderSlug(name: string): string {
  return name
    .split(" // ")[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks left by NFD
    .toLowerCase()
    .replace(/['‘’]/g, "")
    // Dropped, not separated. EDHREC slugs an initialism by removing its periods —
    // "Scientist Supreme of A.I.M." is `scientist-supreme-of-aim`, not
    // `...-a-i-m` — and the separating pass below would otherwise turn each period
    // into its own hyphen, producing a URL EDHREC answers with 403 (#333). Only
    // initialisms move: a period followed by a space ("Mr. Orfeo, the Boulder")
    // already collapses into the one hyphen the space earns, with or without this
    // step.
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
