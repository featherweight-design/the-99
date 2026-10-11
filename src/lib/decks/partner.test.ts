import { describe, expect, it } from "vitest";
import { canPair, partnerAbility, partnerAbilityLabel, type PartnerAbility } from "./partner";

const LEGEND = "Legendary Creature — Human Soldier";
const COMPANION_TEXT = "Doctor's companion (You can have two commanders if the other is the Doctor.)";

describe("partnerAbility", () => {
  it("reads Doctor's companion off the text, either apostrophe", () => {
    expect(partnerAbility(COMPANION_TEXT, "Legendary Creature — Human")).toEqual({ kind: "doctorsCompanion" });
    expect(partnerAbility("Doctor’s companion", "Legendary Creature — Human")).toEqual({ kind: "doctorsCompanion" });
  });

  it("reads the Doctor off the type line, whatever the text says", () => {
    expect(partnerAbility("Whenever you planeswalk...", "Legendary Creature — Time Lord Doctor")).toEqual({ kind: "doctor" });
    expect(partnerAbility(null, "Legendary Creature — Time Lord Doctor")).toEqual({ kind: "doctor" });
  });

  it("does not read a Time Lord with another type, or a non-legend, as the Doctor", () => {
    expect(partnerAbility(null, "Legendary Creature — Time Lord Doctor Rogue")).toBeNull();
    expect(partnerAbility(null, "Legendary Creature — Time Lord")).toBeNull();
    expect(partnerAbility(null, "Creature — Time Lord Doctor")).toBeNull();
    expect(partnerAbility(null, "Legendary Artifact — Time Lord Doctor")).toBeNull();
  });

  it("reads the generic ability", () => {
    expect(partnerAbility("Flying\nPartner (You can have two commanders if both have partner.)", LEGEND))
      .toEqual({ kind: "generic" });
  });

  it("reads the restricted form and keeps the printed label", () => {
    expect(
      partnerAbility(
        "Partner—Father & son (You can have two commanders if both have partner with the same label.)",
        LEGEND,
      ),
    ).toEqual({ kind: "restricted", label: "Partner—Father & son" });
  });

  it("normalises a hyphen-minus in the restricted form to the printed em dash", () => {
    expect(partnerAbility("Partner-Father & son", LEGEND)).toEqual({
      kind: "restricted",
      label: "Partner—Father & son",
    });
  });

  it("reads the named form", () => {
    expect(partnerAbility("Partner with Pir (When this creature enters, target player may...)", LEGEND))
      .toEqual({ kind: "with", name: "Pir" });
  });

  it("reads friends forever", () => {
    expect(partnerAbility("Friends forever (You can have two commanders if both have friends forever.)", LEGEND))
      .toEqual({ kind: "friendsForever" });
  });

  it("returns null for a commander with no partner ability", () => {
    expect(partnerAbility("Flying, vigilance", LEGEND)).toBeNull();
    expect(partnerAbility(null, LEGEND)).toBeNull();
  });

  it("does not mistake reminder text mentioning partner for the ability", () => {
    expect(partnerAbility("Whenever a creature you control with partner attacks, draw a card.", LEGEND))
      .toBeNull();
  });
});

describe("canPair", () => {
  // The name only decides the named form, so every other case states one that
  // cannot be the reason the answer came out the way it did.
  const side = (ability: PartnerAbility | null, name = "Somebody, of Somewhere") => ({
    name,
    ability,
  });

  // The three Doctor Who precons' pairs, read the way every caller reads them: off each card's
  // own text and type line. Card text is the catalog's; only the first line matters.
  const card = (name: string, oracleText: string | null, typeLine: string) =>
    ({ name, ability: partnerAbility(oracleText, typeLine) });
  const fourth = card("The Fourth Doctor", "Would You Like a...? — At the beginning of your upkeep, ...", "Legendary Creature — Time Lord Doctor");
  const tenth = card("The Tenth Doctor", "Allons-y! — Whenever The Tenth Doctor attacks, ...", "Legendary Creature — Time Lord Doctor");
  const thirteenth = card("The Thirteenth Doctor", "Paradox — Whenever you cast a spell from anywhere other than your hand, ...", "Legendary Creature — Time Lord Doctor");
  const sarah = card("Sarah Jane Smith", "Whenever you cast a historic spell, ...\n" + COMPANION_TEXT, "Legendary Creature — Human");
  const rose = card("Rose Tyler", "Bad Wolf — ...\n" + COMPANION_TEXT, "Legendary Creature — Human");
  const yasmin = card("Yasmin Khan", "{T}: Exile the top card of your library. ...\n" + COMPANION_TEXT, "Legendary Creature — Human");

  it("pairs each Doctor Who precon's Doctor with its companion, in either order", () => {
    for (const [doctor, companion] of [[fourth, sarah], [thirteenth, yasmin], [tenth, rose]]) {
      expect(canPair(doctor, companion)).toBe(true);
      expect(canPair(companion, doctor)).toBe(true);
    }
  });

  it("does not pair two Doctors, two companions, or a companion with a generic partner", () => {
    expect(canPair(fourth, tenth)).toBe(false);
    expect(canPair(sarah, rose)).toBe(false);
    expect(canPair(sarah, side({ kind: "generic" }))).toBe(false);
    expect(canPair(fourth, side({ kind: "generic" }))).toBe(false);
  });

  it("does not pair a companion with a Time Lord that is not only a Doctor", () => {
    const rogue = card("A Rogue Time Lord", null, "Legendary Creature — Time Lord Rogue");
    expect(canPair(sarah, rogue)).toBe(false);
  });

  it("pairs two generics", () => {
    expect(canPair(side({ kind: "generic" }), side({ kind: "generic" }))).toBe(true);
  });

  it("pairs two restricted commanders carrying the same label", () => {
    const a = { kind: "restricted", label: "Partner—Father & son" } as const;
    expect(canPair(side(a), side({ ...a }))).toBe(true);
  });

  it("refuses restricted commanders carrying different labels", () => {
    expect(
      canPair(
        side({ kind: "restricted", label: "Partner—Father & son" }),
        side({ kind: "restricted", label: "Partner—Survivors" }),
      ),
    ).toBe(false);
  });

  it("refuses a generic paired with a restricted", () => {
    expect(
      canPair(side({ kind: "generic" }), side({ kind: "restricted", label: "Partner—Survivors" })),
    ).toBe(false);
  });

  it("pairs two friends forever", () => {
    expect(canPair(side({ kind: "friendsForever" }), side({ kind: "friendsForever" }))).toBe(true);
  });

  it("refuses friends forever paired with generic", () => {
    expect(canPair(side({ kind: "friendsForever" }), side({ kind: "generic" }))).toBe(false);
  });

  it("refuses when either side has no ability", () => {
    expect(canPair(side(null), side({ kind: "generic" }))).toBe(false);
    expect(canPair(side({ kind: "generic" }), side(null))).toBe(false);
  });

  // `Partner with` is the one form that names a specific card, so two cards
  // carrying it are a legal pair only when each is the card the other names.
  it("pairs a named form only when each commander names the other", () => {
    const pir = side({ kind: "with", name: "Toothy, Imaginary Friend" }, "Pir, Imaginative Rascal");
    const toothy = side({ kind: "with", name: "Pir, Imaginative Rascal" }, "Toothy, Imaginary Friend");
    expect(canPair(pir, toothy)).toBe(true);
    expect(canPair(toothy, pir)).toBe(true);
  });

  it("refuses two named commanders that name someone else", () => {
    const pir = side({ kind: "with", name: "Toothy, Imaginary Friend" }, "Pir, Imaginative Rascal");
    const khorvath = side({ kind: "with", name: "Sylvia Brightspear" }, "Khorvath Brightflame");
    expect(canPair(pir, khorvath)).toBe(false);
  });

  it("ignores case and surrounding space in the named form", () => {
    expect(
      canPair(
        side({ kind: "with", name: "toothy, imaginary friend " }, "Pir, Imaginative Rascal"),
        side({ kind: "with", name: " PIR, IMAGINATIVE RASCAL" }, "Toothy, Imaginary Friend"),
      ),
    ).toBe(true);
  });
});

describe("partnerAbilityLabel", () => {
  it("prints the ability verbatim, as the picker caption does", () => {
    expect(partnerAbilityLabel({ kind: "generic" })).toBe("Partner");
    expect(partnerAbilityLabel({ kind: "restricted", label: "Partner—Father & son" })).toBe(
      "Partner—Father & son",
    );
    expect(partnerAbilityLabel({ kind: "with", name: "Pir" })).toBe("Partner with Pir");
    expect(partnerAbilityLabel({ kind: "friendsForever" })).toBe("Friends forever");
    expect(partnerAbilityLabel({ kind: "doctorsCompanion" })).toBe("Doctor’s companion");
    expect(partnerAbilityLabel({ kind: "doctor" })).toBe("Time Lord Doctor");
  });
});
