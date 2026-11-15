import { eq } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

export type ShellPrefs = { spentMoments: string[]; installed: boolean };

/**
 * The shell's one `user_prefs` read: the moments this reader has spent (discovery R1, `lib/moments/spent.ts`) and
 * whether they have opened the installed app (`installed_at`, install onboarding call 7). One primary-key row, so the
 * install stamp adds no query to a page. No row reads as nothing spent and never installed.
 */
export async function readShellPrefs(userId: string): Promise<ShellPrefs> {
  const rows = await db
    .select({ spent: userPrefs.momentsSpent, installedAt: userPrefs.installedAt })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return { spentMoments: rows[0]?.spent ?? [], installed: rows[0]?.installedAt != null };
}
