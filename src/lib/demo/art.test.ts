import { describe, expect, it } from "vitest";

import { demoArt, fanOf } from "./art";

const card = (n: number, imageUri: string | null = `https://cards.example/${n}.jpg`) => ({ oracleId: `o${n}`, name: `Card ${n}`, imageUri });
const of = (cards: ReturnType<typeof card>[]) => ({ collection: { cards } }) as unknown as Parameters<typeof demoArt>[0];

describe("demoArt", () => {
  it("keeps the first six cards that have a picture, with their names", () => {
    const art = demoArt(of([card(1), card(2, null), ...[3, 4, 5, 6, 7, 8].map((n) => card(n))]));
    expect(art.map((a) => a.name)).toEqual(["Card 1", "Card 3", "Card 4", "Card 5", "Card 6", "Card 7"]);
  });
});

describe("fanOf", () => {
  const six = demoArt(of([1, 2, 3, 4, 5, 6].map((n) => card(n))));
  it("takes the first three for the start and the next three for the end", () => {
    expect(fanOf(six, "start").map((a) => a.name)).toEqual(["Card 1", "Card 2", "Card 3"]);
    expect(fanOf(six, "end").map((a) => a.name)).toEqual(["Card 4", "Card 5", "Card 6"]);
  });
  it("draws the first three on the end when fewer than six have art", () => {
    expect(fanOf(six.slice(0, 5), "end").map((a) => a.name)).toEqual(["Card 1", "Card 2", "Card 3"]);
  });
});
