import { describe, expect, it } from "vitest";

import { GAME_CHANGER_LIMIT, violationsFor } from "./rules";

describe("violationsFor", () => {
  const none = { gameChangers: 0, massLandDenial: 0, extraTurns: 0, combos: 0, loops: 0 };
  const read = (over: Partial<typeof none>) => violationsFor({ ...none, ...over });

  it("breaks nothing on a deck with none of the counted cards", () => {
    expect(read({})).toEqual({ violatesB1: false, violatesB2: false, violatesB3: false });
  });

  it("puts one Game Changer above 2 and inside 3, and a fourth above 3", () => {
    expect(read({ gameChangers: 1 })).toEqual({ violatesB1: true, violatesB2: true, violatesB3: false });
    expect(read({ gameChangers: GAME_CHANGER_LIMIT[3] })).toMatchObject({ violatesB3: false });
    expect(read({ gameChangers: GAME_CHANGER_LIMIT[3] + 1 })).toMatchObject({ violatesB3: true });
  });

  it("puts any mass land denial above 3", () => {
    expect(read({ massLandDenial: 1 })).toEqual({ violatesB1: true, violatesB2: true, violatesB3: true });
  });

  it("puts a plain extra-turn card above 1 only", () => {
    expect(read({ extraTurns: 1 })).toEqual({ violatesB1: true, violatesB2: false, violatesB3: false });
  });

  it("puts a two-card combo above 2, and only a turn loop above 3", () => {
    expect(read({ combos: 1 })).toEqual({ violatesB1: true, violatesB2: true, violatesB3: false });
    expect(read({ combos: 1, loops: 1 })).toMatchObject({ violatesB3: true });
  });
});
