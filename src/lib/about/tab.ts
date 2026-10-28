// About's `?tab=` as the URL names it (discovery R2·5, R2·6b). The Tools tab retired with About visual PR 6a, so the
// one tab left is the Reference, until PR 7b. A plain module, not a client component's: `/about`'s server page reads
// `?tab=` through `aboutTabOf`, and a function exported from a "use client" module is a client reference on the
// server, which throws when called.

export type AboutTab = "index" | "reference";

/** `?tab=` as the page reads it: `reference` is the Reference; anything else (`tools` included) is the index. */
export function aboutTabOf(value: unknown): AboutTab {
  return value === "reference" ? "reference" : "index";
}
