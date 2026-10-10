"use server";

import { requireUserId } from "../../lib/auth";
import { ABOUT_VERSION } from "../../lib/copy/about";
import { safeNext } from "../../lib/about/gate";
import { markAboutVisited } from "../../lib/about/read";
import { switchedIds, visibleEntries } from "../../lib/about/visible";
import { howItWorksEnabled } from "../../lib/about/how-it-works-flag";
import { HOW_IT_WORKS_ID } from "../../lib/copy/how-it-works-links";

/**
 * The dismiss. Records the acknowledgement against the account and returns
 * where the reader was going, which `DismissForm` then navigates to through the
 * navigation-pending provider: a `redirect()` here gives the page nothing to
 * report until the new page has already committed.
 *
 * `next` arrives from a hidden field on the form, which came from the URL the
 * gate built, so it is attacker-controlled twice over — `safeNext` is applied
 * HERE rather than trusted from the page, because this is the function that
 * decides the destination.
 *
 * No `revalidatePath`: nothing cached renders the acknowledged version. The
 * gate reads the row directly, and the page is rendered per request.
 */
export async function dismissAbout(formData: FormData): Promise<string> {
  const userId = await requireUserId();
  // The version AND the switched entries this deployment draws, as a visit does: the legacy gate
  // redirects on an unseen switched entry, so acknowledging only the version would send the same
  // reader back from another browser.
  await markAboutVisited(userId, ABOUT_VERSION, switchedIds(visibleEntries()));
  return safeNext(formData.get("next")?.toString());
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
  // The appendix is seen the same way, by its id, while its switch is on (plan 2026-09-28, PR C).
  const appendix = howItWorksEnabled() ? [HOW_IT_WORKS_ID] : [];
  await markAboutVisited(userId, ABOUT_VERSION, [...switchedIds(visibleEntries()), ...appendix]);
}
