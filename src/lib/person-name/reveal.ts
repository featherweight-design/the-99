// A `ThirdPartyName` back to its string. Imported only where the string is drawn marked (`person-name.tsx`) or leaves
// the page entirely (server-only push text and feed writes, named in `check:third-party-names`' allowlist): anywhere
// else a revealed name is an unmarked name again.
import type { ThirdPartyName } from "./brand";

export function reveal(name: ThirdPartyName): string {
  return (name as unknown as { readonly $tp: string }).$tp;
}
