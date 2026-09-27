import { describe, expect, it } from "vitest";

import { listCacheEnabled } from "./list-cache-flag";

describe("the list cache switch", () => {
  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(listCacheEnabled({ LIST_CACHE_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(listCacheEnabled({ LIST_CACHE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
