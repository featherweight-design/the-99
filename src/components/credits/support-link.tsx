import { creditsPageCopy } from "../../lib/copy/credits-page";

/** The support address, as the one mailto link every /credits sentence that names it draws. */
/** The ink a link takes on each ground. On a raised surface `--accent` falls under 4.5:1 in some themes, so a dialog's
 *  link takes `--accent-hover`, which clears it there (`src/lib/theme/support-link-contrast.test.ts`). */
export const SUPPORT_LINK_INK = { page: "text-[color:var(--accent)]", raised: "text-[color:var(--accent-hover)]" } as const;

export function SupportLink({ ground = "page" }: { ground?: keyof typeof SUPPORT_LINK_INK }) {
  const email = creditsPageCopy.supportEmail;
  // Never broken across lines: a break at the address's hyphen reads as two addresses.
  return <a href={`mailto:${email}`} className={`${SUPPORT_LINK_INK[ground]} whitespace-nowrap underline`}>{email}</a>;
}
