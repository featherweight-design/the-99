import { creditsPageCopy } from "../../lib/copy/credits-page";

/** The support address, as the one mailto link every /credits sentence that names it draws. */
export function SupportLink() {
  const email = creditsPageCopy.supportEmail;
  return <a href={`mailto:${email}`} className="text-[color:var(--accent)] underline">{email}</a>;
}
