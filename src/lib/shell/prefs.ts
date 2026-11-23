import { eq } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

/** `preferredStore` is the column as stored: the shell resolves it with `storeOf`, which also applies the switch. */
export type ShellPrefs = { spentMoments: string[]; installed: boolean; preferredStore: string | null };

/**
 * The shell's one `user_prefs` read: the moments this reader has spent (discovery R1, `lib/moments/spent.ts`) and
 * whether they have opened the installed app (`installed_at`, install onboarding call 7), and their stored price store
 * (the Fan Content notice names it). One primary-key row, read on
 * every signed-in page beside the credit chip. No row reads as nothing spent and never installed.
 */
export async function readShellPrefs(userId: string): Promise<ShellPrefs> {
  const rows = await db
    .select({ spent: userPrefs.momentsSpent, installedAt: userPrefs.installedAt, preferred: userPrefs.preferredStore })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return { spentMoments: rows[0]?.spent ?? [], installed: rows[0]?.installedAt != null, preferredStore: rows[0]?.preferred ?? null };
}
