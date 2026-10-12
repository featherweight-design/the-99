// Partner is read off the card's own words. The app never carries a partner
// table: a set that prints a new restricted label works the day the catalog
// refreshes, with no code change.
//
// `canPair` matches abilities — label equality for the generic and restricted
// forms, mutual naming for `Partner with` — not a rules engine. It answers the
// one question the picker and the import re-validation ask, and the spec's
// out-of-scope line covers every legality rule beyond it.

export type PartnerAbility =
  | { kind: "generic" }
  | { kind: "restricted"; label: string }
  | { kind: "with"; name: string }
  | { kind: "friendsForever" }
  // Doctor Who's pairing (CR 702.124): a card with Doctor's companion pairs with a legendary Time
  // Lord Doctor creature that has no other creature types. The Doctor prints no ability at all,
  // so that side is read off its type line.
  | { kind: "doctorsCompanion" }
  | { kind: "doctor" };

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
const DOCTORS_COMPANION = /^Doctor['’]s companion\b/m;

/**
 * A legendary creature whose creature types are exactly `Time Lord Doctor` ("Time Lord" is one
 * subtype). A changeling, or a Doctor with another type, is not one (the 2023-10-13 rulings).
 * The front face only: no double-faced Doctor exists, and the type line of a back face is not
 * what the commander is.
 */
function isTheDoctor(typeLine: string | null): boolean {
  if (!typeLine) return false;
  const [types, subtypes] = typeLine.split(" // ")[0].split(/\s+[—-]\s+/);
  if (subtypes === undefined) return false;
  const words = types.split(/\s+/);
  return words.includes("Legendary") && words.includes("Creature") && subtypes.trim() === "Time Lord Doctor";
}

export function partnerAbility(oracleText: string | null, typeLine: string | null): PartnerAbility | null {
  if (!oracleText) return isTheDoctor(typeLine) ? { kind: "doctor" } : null;

  const withMatch = WITH.exec(oracleText);
  if (withMatch) return { kind: "with", name: withMatch[1].trim() };

  const restricted = RESTRICTED.exec(oracleText);
  if (restricted) return { kind: "restricted", label: `Partner—${restricted[1].trim()}` };

  if (GENERIC.test(oracleText)) return { kind: "generic" };
  if (FRIENDS_FOREVER.test(oracleText)) return { kind: "friendsForever" };
  if (DOCTORS_COMPANION.test(oracleText)) return { kind: "doctorsCompanion" };
  if (isTheDoctor(typeLine)) return { kind: "doctor" };

  return null;
}

/** A commander as `canPair` reads it: the card's name, and the ability it prints. */
export type PartnerSide = { name: string; ability: PartnerAbility | null };

/**
 * The named form is legal only when each card names the other, so the printed
 * name is compared against the other side's card name rather than assumed.
 * Case- and space-insensitive because both strings come from the catalog and
 * only their letters carry the claim.
 */
function names(declared: string, cardName: string): boolean {
  return declared.trim().toLowerCase() === cardName.trim().toLowerCase();
}

export function canPair(a: PartnerSide, b: PartnerSide): boolean {
  const x = a.ability;
  const y = b.ability;
  if (!x || !y) return false;
  if (x.kind === "generic" && y.kind === "generic") return true;
  if (x.kind === "friendsForever" && y.kind === "friendsForever") return true;
  if (x.kind === "restricted" && y.kind === "restricted") return x.label === y.label;
  if (x.kind === "with" && y.kind === "with") {
    return names(x.name, b.name) && names(y.name, a.name);
  }
  // One of each: two companions, or two Doctors, do not pair.
  if (x.kind === "doctorsCompanion" && y.kind === "doctor") return true;
  if (x.kind === "doctor" && y.kind === "doctorsCompanion") return true;
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
    case "doctorsCompanion":
      return "Doctor’s companion";
    case "doctor":
      return "Time Lord Doctor";
  }
}
