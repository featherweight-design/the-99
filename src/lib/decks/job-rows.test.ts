import { describe, expect, it } from "vitest";
import type { Job } from "../labels/types";
import { loadJobRows } from "./job-rows";

const job = (space: string, kind: string) => ({ space, kind }) as unknown as Job;

describe("loadJobRows", () => {
  it("converts each card's labels to its row keys", () => {
    expect(loadJobRows(new Map([["rock", [job("role", "ramp")]], ["lord", [job("theme", "pump")]]]))).toEqual({ rock: ["ramp"], lord: [] });
  });

  it("returns null, not an empty record, when the label read failed", () => {
    expect(loadJobRows(null)).toBeNull();
  });
});
