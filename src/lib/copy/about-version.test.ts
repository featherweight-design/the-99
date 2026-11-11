import { describe, expect, it } from "vitest";
import { ABOUT_VERSION } from "./about";
import pin from "./about.version.json";

describe("about.version.json", () => {
  // The probe scripts read this file for the number they raise `about_version_seen` to (they are plain JS and cannot
  // import `ABOUT_VERSION`), so the two must stay equal.
  it("holds ABOUT_VERSION", () => {
    expect(pin.version).toBe(ABOUT_VERSION);
  });
});
