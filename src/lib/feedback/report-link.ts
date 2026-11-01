// What the Report a problem page (/report) takes from its address (small items 8, board 6): the error's code as `ref` and
// the page the reader was on as `from`, read with the same rules the action stores them by.

import { idOf, pageOf } from "./report-rule";

type Query = Record<string, string | string[] | undefined>;

/** What /report takes from its query: the code (short word characters, else nothing) and the path (a path alone, else nothing). */
export function readReportParams(query: Query): { ref: string | null; from: string | null } {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined);
  return { ref: idOf(one(query.ref)), from: pageOf(one(query.from)) };
}
