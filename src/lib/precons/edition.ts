/** Which edition of a precon the page draws: its own (Regular), or the Collector's Edition twin its set printed. */
export type PreconEdition = "regular" | "collector";

/** `?edition=collector` names the Collector's Edition; anything else, absence included, is Regular. */
export function parseEdition(value: string | string[] | undefined): PreconEdition {
  return value === "collector" ? "collector" : "regular";
}
