import { expect, it } from "vitest";

import { PLAYER_NAME } from "../../../scripts/lib/fictional-fixture/names";
import { DEMO_PLAYER } from "./player";

it("is the first name of the fixture's invented player", () => {
  expect(PLAYER_NAME.split(" ")[0]).toBe(DEMO_PLAYER);
});
