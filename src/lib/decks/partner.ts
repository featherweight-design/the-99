// Partner is read off the card's own words. The app never carries a partner
// table: a set that prints a new restricted label works the day the catalog
// refreshes, with no code change.
//
// `canPair` is label equality, not a rules engine. It answers the one question
// the picker and the import re-validation ask, and the spec's out-of-scope line
// covers every legality rule beyond it.

export type PartnerAbility =
  | { kind: "generic" }
  | { kind: "restricted"; label: string }
  | { kind: "with"; name: string }
  | { kind: "friendsForever" };

// The ability is always its own line on a printed card, so anchoring to a line
// start is what keeps "creature you control with partner" from matching.
const RESTRICTED = /^Partner[—-]([^(\n]+)/m;
const WITH = /^Partner with ([^(\n]+)/m;
// No lookahead here: `WITH` and `RESTRICTED` are tested first, so anything
// reaching this test is already known not to be one of them. A lookahead
// excluding a following space would reject the printed form, which is
// `Partner (You can have two commanders...)`.
const GENERIC = /^Partner\b/m;
const FRIENDS_FOREVER = /^Friends forever\b/m;

export function partnerAbility(oracleText: string | null): PartnerAbility | null {
  if (!oracleText) return null;

  const withMatch = WITH.exec(oracleText);
  if (withMatch) return { kind: "with", name: withMatch[1].trim() };

  const restricted = RESTRICTED.exec(oracleText);
  if (restricted) return { kind: "restricted", label: `Partner—${restricted[1].trim()}` };

  if (GENERIC.test(oracleText)) return { kind: "generic" };
  if (FRIENDS_FOREVER.test(oracleText)) return { kind: "friendsForever" };

  return null;
}

export function canPair(a: PartnerAbility | null, b: PartnerAbility | null): boolean {
  if (!a || !b) return false;
  if (a.kind === "generic" && b.kind === "generic") return true;
  if (a.kind === "friendsForever" && b.kind === "friendsForever") return true;
  if (a.kind === "restricted" && b.kind === "restricted") return a.label === b.label;
  // A `with` commander names a card, but the app pairs by oracle id and this
  // module has no I/O to resolve one to the other. Documented as an accepted
  // deviation from spec §3.
  if (a.kind === "with" && b.kind === "with") return true;
  return false;
}

export function partnerAbilityLabel(ability: PartnerAbility): string {
  switch (ability.kind) {
    case "generic":
      return "Partner";
    case "restricted":
      return ability.label;
    case "with":
      return `Partner with ${ability.name}`;
    case "friendsForever":
      return "Friends forever";
  }
}
