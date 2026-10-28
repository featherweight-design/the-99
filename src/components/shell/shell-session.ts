import { auth } from "@clerk/nextjs/server";

/**
 * The shell's reader, or null signed out. The proxy's matcher skips every path with a dot (static
 * files), so a request for a dotted path that is not a file (`robots.txt` before it existed,
 * `apple-touch-icon-precomposed.png`, a bot's `elmah.axd`) reaches the root layout's 404 with no
 * `clerkMiddleware()` run, and `auth()` throws (Sentry THE-99-1). Nothing is known of the session
 * there, so that one error draws the signed-out shell, and the 404 renders. Any other error throws.
 */
export async function shellUserId(read: typeof auth = auth): Promise<string | null> {
  try {
    return (await read()).userId;
  } catch (error) {
    if (error instanceof Error && error.message.includes("can't detect usage of clerkMiddleware()")) return null;
    throw error;
  }
}
