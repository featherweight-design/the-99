import { describe, expect, it } from "vitest";

import { analysisTabEnabled } from "./analysis-flag";
import { initialBuilderView, readBuilderView } from "./builder-view";

// ANALYSIS_TAB_ENABLED is retired (always on, 2026-11-01): only the admin registry reads the flag, until the switch is
// deleted. Its read is pinned here so the registry's value stays what the variable says.
describe("the retired Analysis flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(analysisTabEnabled({ ANALYSIS_TAB_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(analysisTabEnabled({ ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("the view a URL can ask for", () => {
  it("parses analysis as a tab name", () => {
    expect(readBuilderView("analysis")).toBe("analysis");
  });

  it("opens on analysis, which always draws", () => {
    expect(initialBuilderView("analysis", 3)).toBe("analysis");
    expect(initialBuilderView("analysis", 0)).toBe("analysis");
  });

  it("still sends versions-on-a-brew to the decklist", () => {
    expect(initialBuilderView("versions", 0)).toBe("deck");
    expect(initialBuilderView("versions", 2)).toBe("versions");
  });
});
