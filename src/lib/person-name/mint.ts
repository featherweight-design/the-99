// The ONE way a `ThirdPartyName` comes into being. Imported only by `src/lib/social/**` (the cross-user read layer,
// where another reader's name leaves the database) and by tests' fixtures: `check:third-party-names` and ESLint's
// `no-restricted-imports` fail an import anywhere else, and a re-export of it anywhere at all.
import type { ThirdPartyName } from "./brand";

/** Brands another reader's name as it leaves a social read. */
export function named(value: string): ThirdPartyName {
  return { $tp: value } as unknown as ThirdPartyName;
}
