// /sign-up/new: where the in-app sign-up by invitation lived while it was unlinked, before invitations were pointed at
// `/sign-up`. An invitation link already sent with this address, or a Google way back that left before the change shipped,
// still arrives here: it is sent on, its query kept, so `?ticket=`, `__clerk_ticket` and `?google=missing` read as they did.
// Public in `src/proxy.ts` (under `/sign-up(/.*)?`).

import { redirect } from "next/navigation";

export default async function OldSignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const search = query.toString();
  redirect(search ? `/sign-up?${search}` : "/sign-up");
}
