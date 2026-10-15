import { describe, expect, it } from "vitest";
import { wishlistCopy, type CopyPart } from "./wishlist";

const read = (parts: CopyPart[]) => parts.map((p) => p.text).join("");
const strong = (parts: CopyPart[]) => parts.filter((p) => p.strong).map((p) => p.text);

describe("the collected strip", () => {
  const { collectedLeft, collectedLeftShort } = wishlistCopy.page;

  it("joins names the app's way, with no serial comma, each name strong", () => {
    const two = collectedLeft(["T’Challa, the Black Panther", "Killian, Decisive Mentor"]);
    expect(read(two)).toBe(
      "Collected since you last looked: T’Challa, the Black Panther and Killian, Decisive Mentor. They’ve left your wishlist.",
    );
    expect(strong(two)).toEqual(["T’Challa, the Black Panther", "Killian, Decisive Mentor"]);
    expect(read(collectedLeft(["Sol Ring", "Arcane Signet", "Rhystic Study"]))).toBe(
      "Collected since you last looked: Sol Ring, Arcane Signet and Rhystic Study. They’ve left your wishlist.",
    );
  });

  it("says it, not they, of one card", () => {
    expect(read(collectedLeft(["Sol Ring"]))).toBe("Collected since you last looked: Sol Ring. It’s left your wishlist.");
  });

  it("names a card on the phone by what comes before its comma, and a two-face card by its front", () => {
    const two = collectedLeftShort(["T’Challa, the Black Panther", "Killian, Decisive Mentor"]);
    expect(read(two)).toBe("Collected: T’Challa and Killian. They’ve left your wishlist.");
    expect(strong(two)).toEqual(["T’Challa", "Killian"]);
    expect(read(collectedLeftShort(["Delver of Secrets // Insectile Aberration"]))).toBe(
      "Collected: Delver of Secrets. It’s left your wishlist.",
    );
  });
});

describe("the tile caption", () => {
  it("reads want and have, the want strong", () => {
    const parts = wishlistCopy.tile.caption(2, 1);
    expect(read(parts)).toBe("want 2 · have 1");
    expect(strong(parts)).toEqual(["2"]);
  });
});
