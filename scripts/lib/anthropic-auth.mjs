// The one check local scripts make before a model call: a key OR an `ant` profile (`src/lib/model/auth.ts`). A script that
// cannot authenticate ends here with one line that names `ant auth login`, not with a stack from inside the SDK.
import { authEnv, requireAnthropicAuth } from "../../src/lib/model/auth.ts";

/** Exits 1 with the error's message when neither a key nor a profile is there; otherwise returns "key" or "profile". */
export function requireAnthropic(who) {
  try {
    return requireAnthropicAuth(who, authEnv());
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
