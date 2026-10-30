import { faceInitials } from "../../lib/names/initials";
import { PersonInitials, testName, type ThirdPartyName } from "../../lib/person-name";

/**
 * The two letters a seat's face draws while it has no commander art, or `?` when the name holds no letter or digit
 * (one rule with the friend faces, `faceInitials`). Initials are part of the name, so another reader's are marked.
 */
export function OpponentInitials({ n }: { n: string | ThirdPartyName }) {
  return testName(n, (s) => faceInitials(s) === "") ? <>?</> : <PersonInitials n={n} />;
}
