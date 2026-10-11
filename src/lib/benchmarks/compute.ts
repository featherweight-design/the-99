import { dependencies, type Dependency, type DependencyCuts } from "./dependencies";
import { flow, type Flow } from "./flow";
import { step } from "./grade";
import { interaction, type Interaction } from "./interaction";
import type { BenchCard, BenchLine, GradeCuts, Step } from "./types";
import { velocity, type Velocity } from "./velocity";
import { winSpeed, type WinSpeed } from "./win-speed";

export type BenchmarkCuts = {
  grades: { velocity: GradeCuts; flow: GradeCuts; interaction: GradeCuts; win: GradeCuts };
  dependencies: DependencyCuts;
};

/** What one reading needs: its cards, its assembled lines, and the Overview's cast-turn ramp. */
export type BenchmarkInput = { cards: BenchCard[]; lines: BenchLine[]; castRamp: number };

export type Benchmarks = {
  velocity: Velocity & { step: Step };
  flow: Flow & { step: Step };
  interaction: Interaction & { step: Step };
  /** Null when the deck assembles no line: "No combo line", never a grade. */
  win: (WinSpeed & { step: Step }) | null;
  dependencies: Dependency[];
};

/** Every benchmark for one reading. Pure: the same input and cuts always give the same answer. */
export function computeBenchmarks(input: BenchmarkInput, cuts: BenchmarkCuts): Benchmarks {
  const v = velocity(input.cards, input.castRamp);
  const f = flow(input.cards);
  const i = interaction(input.cards);
  const w = winSpeed(input.cards, input.lines);
  return {
    velocity: { ...v, step: step(v.index, cuts.grades.velocity) },
    flow: { ...f, step: step(f.points, cuts.grades.flow) },
    interaction: { ...i, step: step(i.weighted, cuts.grades.interaction) },
    win: w && { ...w, step: step(w.odds, cuts.grades.win) },
    dependencies: dependencies(input.cards, input.lines.length, cuts.dependencies),
  };
}
