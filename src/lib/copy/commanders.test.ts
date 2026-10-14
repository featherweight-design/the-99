import { describe, expect, it } from "vitest";
import { commandersCopy } from "./commanders";

// The mock renders one instance of each string (Boros / white-red / 24
// candidates, and 1,418 cards read). These pin the templates to it verbatim —
// the commanders surfaces sit behind Clerk auth, so there is no browser gate.

describe("commandersCopy.filteredEmpty", () => {
  it("reproduces the mock’s heading", () => {
    expect(commandersCopy.filteredEmpty.heading("Boros")).toBe("No generals in Boros.");
  });

  it("reproduces the mock’s caption", () => {
    expect(commandersCopy.filteredEmpty.caption("white-red", 24)).toBe(
      "You own 24 legal commanders, but none of them are white-red.",
    );
  });

  it("agrees in number when exactly one candidate is filtered out", () => {
    expect(commandersCopy.filteredEmpty.caption("white-red", 1)).toBe(
      "You own 1 legal commander, but it is not white-red.",
    );
  });

  it("keeps the diagnostic count straight", () => {
    expect(commandersCopy.filteredEmpty.count(24)).toBe("Showing 0 of 24");
  });
});

describe("commandersCopy.firstRun", () => {
  it("pins the first-run line, repunctuated from the mock", () => {
    expect(commandersCopy.firstRun.line(1418, 24)).toBe(
      "1,418 cards read. 24 can lead. I ranked them. You’re welcome.",
    );
  });

  it("agrees in number for a one-card, one-commander collection", () => {
    expect(commandersCopy.firstRun.line(1, 1)).toBe(
      "1 card read. 1 can lead. I ranked it. You’re welcome.",
    );
  });

  it("pins the thousands separator to en-US regardless of host locale", () => {
    expect(commandersCopy.firstRun.line(1418, 1200)).toBe(
      "1,418 cards read. 1,200 can lead. I ranked them. You’re welcome.",
    );
  });
});
