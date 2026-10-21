import { creditsPageCopy } from "../../lib/copy/credits-page";

/** The support address, as the one mailto link every sentence that names it draws. The words take `--fg` on every ground
 *  (10.60:1 at the lowest, on a band's `--surface`), because `--accent` falls under 4.5:1 there in Oil Haze and First Frost;
 *  the underline carries the accent, so it still marks a link and reads as the app's own
 *  (`src/lib/theme/support-link-contrast.test.ts`). */
export function SupportLink() {
  const email = creditsPageCopy.supportEmail;
  // Never broken across lines: a break at the address's hyphen reads as two addresses.
  return <a href={`mailto:${email}`} className="whitespace-nowrap text-[color:var(--fg)] underline decoration-[color:var(--accent)]">{email}</a>;
}
