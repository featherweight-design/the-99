import type { GradeCuts, Step } from "./types";

/** The step a value reaches: 1, plus one for each cut it meets or passes. */
export function step(value: number, cuts: GradeCuts): Step {
  return (1 + cuts.filter((cut) => value >= cut).length) as Step;
}
