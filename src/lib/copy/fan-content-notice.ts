// The Fan Content notice (launch epic A0/A1). The two passages are LOCKED (the brief's Locked 1, Hugh's L4): reproduced here
// exactly, never reworded, never sent to /copy-review. `fan-content-notice.test.ts` pins them to the brief's own text, so a
// "fix" to a comma has to change the brief first. US English, no em dashes.
//
// One ruling since (Hugh, 2026-11-23): passage two names the reader's price store where it said Mana Pool, because with
// store preference on the prices come from that store. `passageTwoFor` takes the store's name; the locked text is its
// Mana Pool reading, which is what a signed-out reader and every reader with the switch off still see, byte for byte.

/** Passage two for a price store, by the store's display name (`STORE_INFO[store].name`). */
export function passageTwoFor(storeName: string): string {
  return `Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices from ${storeName}. Not affiliated with Wizards of the Coast, Scryfall or ${storeName}.`;
}

export const fanContentNotice = {
  passageOne:
    "The 99 is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.",
  /** The locked text: passage two read for Mana Pool, the default store. */
  passageTwo: passageTwoFor("Mana Pool"),
  /** The only linked words, inside passage one. */
  policyLink: "Fan Content Policy",
} as const;

/** Wizards' Fan Content Policy. Opens in a new tab; the notice's only link. */
export const FAN_CONTENT_POLICY_URL = "https://company.wizards.com/en/legal/fancontentpolicy";

/** The link's accessible name, after the app's `newTab` pattern. The visible words stay the locked ones. */
export const policyLinkAria = "Fan Content Policy, opens in a new tab";

/** Passage one split around the link: before, the link words, after. Joined, it is `passageOne` exactly. */
export function passageOneParts(): { before: string; link: string; after: string } {
  const { passageOne, policyLink } = fanContentNotice;
  const at = passageOne.indexOf(policyLink);
  return { before: passageOne.slice(0, at), link: policyLink, after: passageOne.slice(at + policyLink.length) };
}
