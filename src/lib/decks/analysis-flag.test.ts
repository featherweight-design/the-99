import { describe, expect, it } from "vitest";

import { analysisTabEnabled } from "./analysis-flag";
import { initialBuilderView, readBuilderView } from "./builder-view";

describe("the Analysis flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    // DEFAULTS OFF is the whole safety property: production must be unaffected until the
    // variable is set deliberately, rather than by a deploy that happened to carry this code.
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

  it("lands on the decklist when the flag is off", () => {
    // A bookmark made against staging, opened against production. Landing on `analysis`
    // there would leave every cell unselected above a panel that is not in the document.
    expect(initialBuilderView("analysis", 3, false)).toBe("deck");
  });

  it("opens on analysis when the flag is on", () => {
    expect(initialBuilderView("analysis", 3, true)).toBe("analysis");
  });

  it("still sends versions-on-a-brew to the decklist, flag or no flag", () => {
    expect(initialBuilderView("versions", 0, true)).toBe("deck");
    expect(initialBuilderView("versions", 0, false)).toBe("deck");
  });

  it("defaults analysisEnabled to false, so an un-updated caller cannot draw the tab", () => {
    // Every existing call site passes two arguments. The default is what keeps them honest.
    expect(initialBuilderView("analysis", 3)).toBe("deck");
  });
});
