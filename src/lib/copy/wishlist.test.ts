import { describe, expect, it } from "vitest";
import { wishlistCopy } from "./wishlist";

describe("the collected strip", () => {
  const { collectedLeft, collectedLeftShort } = wishlistCopy.page;

  it("joins names the app's way, with no serial comma", () => {
    expect(collectedLeft(["T’Challa, the Black Panther", "Killian, Decisive Mentor"])).toBe(
      "Collected since you last looked: T’Challa, the Black Panther and Killian, Decisive Mentor. They’ve left your wishlist.",
    );
    expect(collectedLeft(["Sol Ring", "Arcane Signet", "Rhystic Study"])).toBe(
      "Collected since you last looked: Sol Ring, Arcane Signet and Rhystic Study. They’ve left your wishlist.",
    );
  });

  it("says it, not they, of one card", () => {
    expect(collectedLeft(["Sol Ring"])).toBe("Collected since you last looked: Sol Ring. It’s left your wishlist.");
  });

  it("names a card on the phone by what comes before its comma, and a two-face card by its front", () => {
    expect(collectedLeftShort(["T’Challa, the Black Panther", "Killian, Decisive Mentor"])).toBe(
      "Collected: T’Challa and Killian. They’ve left your wishlist.",
    );
    expect(collectedLeftShort(["Delver of Secrets // Insectile Aberration"])).toBe("Collected: Delver of Secrets. It’s left your wishlist.");
  });
});
