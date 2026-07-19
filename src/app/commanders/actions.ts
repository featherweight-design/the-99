"use server";

import { revalidatePath } from "next/cache";

/**
 * Retry action for the commanders recommendations page.
 * Failed EDHREC fetches are not negatively cached, so revalidating
 * the path causes a fresh server render that re-fetches all data.
 * Submit via: <form action={retryRecs}><button type="submit">Retry</button></form>
 */
export async function retryRecs() {
  revalidatePath("/commanders");
}
