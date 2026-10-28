import { describe, expect, it } from "vitest";

import { cronPausedHere, pausedResponse } from "./staging-pause";

describe("cronPausedHere", () => {
  it("pauses on the staging project", () => {
    expect(cronPausedHere("staging", undefined)).toBe(true);
    expect(cronPausedHere(" staging ", "")).toBe(true);
  });

  it("runs on production, locally, and whenever the label is unset or unknown", () => {
    for (const label of ["production", undefined, "", "Staging", "stage"]) {
      expect(cronPausedHere(label, undefined), String(label)).toBe(false);
    }
  });

  it("runs on staging when STAGING_CRONS is 'run', and only then", () => {
    expect(cronPausedHere("staging", "run")).toBe(false);
    expect(cronPausedHere("staging", " run ")).toBe(false);
    for (const v of ["1", "yes", "true", "RUN"])
      expect(cronPausedHere("staging", v), v).toBe(true);
  });

  it("answers 200 with the reason", async () => {
    const res = pausedResponse();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ paused: "staging" });
  });
});
