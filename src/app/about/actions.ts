"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { ABOUT_VERSION } from "../../lib/copy/about";
import { safeNext } from "../../lib/about/gate";
import { markAboutSeen } from "../../lib/about/read";

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
