// Tests only (`check:third-party-names` fails an import of this anywhere else): copy that names someone, as the plain
// text a reader sees, for a test to find it by. Fixtures mint their names with `named()` (`mint.ts`).
import type { PersonParts, ThirdPartyName } from "./brand";
import { reveal } from "./reveal";

export function plain(text: string | PersonParts | ThirdPartyName): string {
  if (typeof text === "string") return text;
  if (!Array.isArray(text)) return reveal(text as ThirdPartyName);
  return (text as PersonParts).map((p) => (typeof p === "string" ? p : reveal(p))).join("");
}
