/**
 * How a process reaches Anthropic: `ANTHROPIC_API_KEY` (deployed apps, CI), or an `ant` profile (`ant auth login`, local
 * scripts), which the SDK resolves itself when no key is set (`@anthropic-ai/sdk` 0.128 `core/credentials`: the
 * `ANTHROPIC_PROFILE` variable, else `<config dir>/active_config`). This only answers "is there any way to authenticate",
 * so a script can fail early with a message that names the fix; the SDK still does the authenticating.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AnthropicAuth = "key" | "profile" | "none";
type AuthEnv = Record<string, string | undefined>;

/** The SDK's config directory: `ANTHROPIC_CONFIG_DIR`, else `$XDG_CONFIG_HOME/anthropic`, else `~/.config/anthropic`. */
function configDir(env: AuthEnv): string {
  if (env.ANTHROPIC_CONFIG_DIR) return env.ANTHROPIC_CONFIG_DIR;
  if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, "anthropic");
  return join(homedir(), ".config", "anthropic");
}

/** The variables the answer depends on, read here so no caller hands the whole environment on (`check:flag-reads`). */
export const authEnv = (): AuthEnv => ({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_PROFILE: process.env.ANTHROPIC_PROFILE,
  ANTHROPIC_CONFIG_DIR: process.env.ANTHROPIC_CONFIG_DIR,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
});

/** The key wins when both are there (the SDK's own order). Never reads a credential, only whether one could be found. */
export function anthropicAuth(env: AuthEnv, exists: (path: string) => boolean = existsSync): AnthropicAuth {
  if (env.ANTHROPIC_API_KEY?.trim()) return "key";
  if (env.ANTHROPIC_PROFILE?.trim() || exists(join(configDir(env), "active_config"))) return "profile";
  return "none";
}

/** Throws, naming `ant auth login`, when there is no key and no profile. Returns how the caller will authenticate. */
export function requireAnthropicAuth(who: string, env: AuthEnv, exists?: (path: string) => boolean): "key" | "profile" {
  const how = anthropicAuth(env, exists);
  if (how === "none") {
    throw new Error(`${who}: no way to reach Anthropic. Run \`ant auth login\` (browser sign-in, The 99 workspace), or set ANTHROPIC_API_KEY.`);
  }
  return how;
}
