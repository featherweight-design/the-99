// /sign-in/new: where the in-app sign-in lived while it was unlinked, before the cutover moved it to `/sign-in`. A bookmark, or
// a Google way back that left before the cutover shipped, still arrives here: it is sent on permanently, its query kept, so
// `?google=…` and `redirect_url` read as they did. Public in `src/proxy.ts` for the same reason.

import { permanentRedirect } from "next/navigation";

export default async function OldSignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const search = query.toString();
  permanentRedirect(search ? `/sign-in?${search}` : "/sign-in");
}
