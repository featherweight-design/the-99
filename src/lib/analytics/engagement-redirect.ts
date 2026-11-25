import { unstable_rethrow } from "next/navigation";

/**
 * For a Server Action that ends in `redirect()`: the redirect arrives in the caller's catch as a throw, and that throw
 * is the action's success. Rethrows every framework error as `unstable_rethrow` does, and runs `onRedirect` first when
 * the error is a redirect, so a core action event is sent only for a start that went through. A real failure returns.
 */
export function rethrowAfterRedirect(err: unknown, onRedirect: () => void): void {
  try {
    unstable_rethrow(err);
  } catch (framework) {
    const digest = (framework as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      try {
        onRedirect();
      } catch {
        // An analytics call never reaches the reader.
      }
    }
    throw framework;
  }
}
