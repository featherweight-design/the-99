// The address of the Report a problem page, as the crash screen links to it (small items 8, board 6): the error's digest
// as `ref` and the page the reader was on as `from`. Pure, so `global-error.tsx` (no router, no shell) builds it on the
// client and the page's reader (`readReportParams`) takes it apart with the same rules the action stores by.

import { idOf, pageOf } from "./report-rule";

/** `/report`, with `ref` when the error carried a digest and `from` when the reader's path is a path. Both URL-encoded. */
export function reportHref(digest: string | null | undefined, pathname: string | null | undefined): string {
  const params = new URLSearchParams();
  const ref = idOf(digest);
  if (ref) params.set("ref", ref);
  const from = pageOf(pathname);
  if (from) params.set("from", from);
  const query = params.toString();
  return query ? `/report?${query}` : "/report";
}

type Query = Record<string, string | string[] | undefined>;

/** What /report takes from its query: the code (short word characters, else nothing) and the path (a path alone, else nothing). */
export function readReportParams(query: Query): { ref: string | null; from: string | null } {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined);
  return { ref: idOf(one(query.ref)), from: pageOf(one(query.from)) };
}
