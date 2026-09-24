import { describe, expect, it } from "vitest";

import { synopsisCopy } from "./synopsis";

// The Mulligan's fixed line (the-99-d9's copy, 2026-09-24).
describe("the land range line", () => {
  const { keep, sendBack } = synopsisCopy.modal.lands;

  it("reads a keep range, and a single count in the singular when it is one", () => {
    expect(keep(2, 4)).toBe("2 to 4 lands");
    expect(keep(3, 3)).toBe("3 lands");
    expect(keep(1, 1)).toBe("1 land");
  });

  it("reads a send-back range with 'or' for two neighbours and 'to' for more", () => {
    expect(sendBack(0, 1, 5)).toBe("0 or 1 lands, or 5 or more");
    expect(sendBack(0, 2, 6)).toBe("0 to 2 lands, or 6 or more");
  });
});
