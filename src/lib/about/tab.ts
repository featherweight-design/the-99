// About's two tabs as the URL names them (discovery R2·5, R2·6b). A plain module, not the client
// component's: `/about`'s server page reads `?tab=` through `aboutTabOf`, and a function exported
// from a "use client" module is a client reference on the server, which throws when called.

export const ABOUT_TABS = ["tools", "reference"] as const;
export type AboutTab = (typeof ABOUT_TABS)[number];
export const TAB_PARAM = "tab";

/** `?tab=` as the page reads it: anything but `reference` is Tools. */
export function aboutTabOf(value: unknown): AboutTab {
  return value === "reference" ? "reference" : "tools";
}
