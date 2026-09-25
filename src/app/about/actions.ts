"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { ABOUT_VERSION } from "../../lib/copy/about";
import { safeNext } from "../../lib/about/gate";
import { markAboutSeen, markAboutVisited } from "../../lib/about/read";
import { switchedIds, visibleEntries } from "../../lib/about/visible";

/**
 * The dismiss. Records the acknowledgement against the account and sends the
 * reader where they were going.
 *
 * `next` arrives from a hidden field on the form, which came from the URL the
 * gate built, so it is attacker-controlled twice over — `safeNext` is applied
 * HERE rather than trusted from the page, because this is the function that
 * hands a value to `redirect()`.
 *
 * No `revalidatePath`: nothing cached renders the acknowledged version. The
 * gate reads the row directly, and the page is rendered per request.
 */
export async function dismissAbout(formData: FormData) {
  const userId = await requireUserId();
  await markAboutSeen(userId, ABOUT_VERSION);
  redirect(safeNext(formData.get("next")?.toString()));
}

/**
 * About R6: the visit, recorded when `/about` is ACTUALLY OPEN (audit E2).
 *
 * Called from `RecordVisit`'s effect after the page has mounted in a browser,
 * never during render: `/about` is a `<Link>` in the account menu, and a write
 * at render would record a prefetch the reader never opened. The page has
 * already built its index from the pre-visit `seen`, so this changes nothing
 * on screen, which is why it neither redirects nor revalidates. A revalidation
 * would re-render the route inside this action's reply and take the index away
 * while the reader is reading it.
 */
export async function recordAboutVisit() {
  const userId = await requireUserId();
  // The switched entries THIS deployment draws, decided here and never taken from the client:
  // a visit records what the page could have shown, not what a caller claims it showed.
  await markAboutVisited(userId, ABOUT_VERSION, switchedIds(visibleEntries()));
}
