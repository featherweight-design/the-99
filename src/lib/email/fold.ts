// The one fold from an address to the mailbox it reaches. Pure, no imports, so a client file may use it too.
//
// The provider's own rule and no more: `+tag` is dropped everywhere, dots only on Gmail (elsewhere a dot is a different
// mailbox), and googlemail.com is gmail.com. A custom domain or a catch-all cannot be folded, so this stops casual
// aliasing, not a determined person with their own domain. Every comparison of two addresses goes through here: the
// welcome lot (`payments/canonical-email.ts`), the flyer's one place per inbox, the mail limits and the account mailbox
// gate (`account/mailboxes.ts`). A second fold would let them disagree about who is who.
const GMAIL = "gmail.com";

/** The address folded to the form that names one mailbox, or null when it is not an address. */
export function foldMailbox(raw: string): string | null {
  const s = raw.normalize("NFKC").trim().toLowerCase();
  const at = s.lastIndexOf("@");
  if (at < 1 || /\s/.test(s)) return null;
  let local = s.slice(0, at);
  let domain = s.slice(at + 1).replace(/\.$/, "");
  if (!domain.includes(".")) return null;
  if (domain === "googlemail.com") domain = GMAIL;
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === GMAIL) local = local.replaceAll(".", "");
  return local ? `${local}@${domain}` : null;
}
