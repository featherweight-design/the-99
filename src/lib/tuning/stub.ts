import type { ModelOutcome } from "../model/client";

/**
 * A held stand-in for the model call of Suggested changes and Proposed cuts, for `probe:run-after`.
 * That probe closes the page while a run is mid-call and asks whether the run still settles, which
 * needs a call that takes a known time and costs nothing.
 *
 * It is OFF unless `TUNING_STUB_DELAY_MS` is set, and never in a production build, so a deployed
 * build cannot reach it whatever its environment holds. When on, the call returns a busy failure
 * after that long, so the run ends `failed` and its credit comes back: the probe needs the run to
 * SETTLE after the page is gone, and the answer's shape is not what it measures.
 */
export const TUNING_STUB_MAX_MS = 60_000;

export function tuningStubDelayMs(env: Record<string, string | undefined>): number | null {
  if (env.NODE_ENV === "production") return null;
  const n = Number(env.TUNING_STUB_DELAY_MS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, TUNING_STUB_MAX_MS) : null;
}

/** The held failure, or null when the stub is off and the real call should be made. */
export async function heldStubOutcome(env: Record<string, string | undefined>): Promise<ModelOutcome<never> | null> {
  const ms = tuningStubDelayMs(env);
  if (ms === null) return null;
  await new Promise((r) => setTimeout(r, ms));
  return { ok: false, errorClass: "upstream_busy" };
}

/**
 * A STAGED stand-in for Suggested changes v2's streamed calls (plan PR 3), for a probe that watches the additions arrive
 * and settle before the cuts. Off unless `TUNING_V2_STUB_DELAY_MS` is set, never in a production build (the same rule as
 * `heldStubOutcome`, which stays as it is for Proposed cuts and `probe:run-after`). Each call waits the delay, then
 * streams its answer a line at a time with a fifth of the delay between lines, so the additions are saved one by one,
 * the cut call (started as call 1 settles) arrives a delay later, and a refill answers an empty list at once.
 *
 * Canned names, not a model: the caller hands the stub the cards it may name, additions a deck does not hold and cuts it
 * does, and each answer names the first `ask` of them, so the run's real validator keeps them. It bills nothing.
 */
export function v2StubDelayMs(env: Record<string, string | undefined>): number | null {
  if (env.NODE_ENV === "production") return null;
  const n = Number(env.TUNING_V2_STUB_DELAY_MS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, TUNING_STUB_MAX_MS) : null;
}

export const STUB_ADDITIONS = ["Mind Stone", "Arcane Signet", "Fellwar Stone", "Thought Vessel", "Wayfarer's Bauble", "Commander's Sphere"];

type StubCall = (req: { stage: string; ask: number }) => { deltas: AsyncIterable<string>; outcome: Promise<{ ok: true; usage?: undefined }> };

export function stagedStubOutcome(
  env: Record<string, string | undefined>,
  names: { adds: readonly string[]; cuts: readonly string[] },
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): StubCall | null {
  const delay = v2StubDelayMs(env);
  if (delay === null) return null;
  return ({ stage, ask }) => {
    const list = stage.startsWith("additions") ? "additions" : "cuts";
    const refill = stage.endsWith("Refill");
    const cards = refill ? [] : (list === "additions" ? names.adds : names.cuts).slice(0, ask);
    const line = (card: string) => JSON.stringify({
      card,
      rationale: `${card} is a staged stand-in line for the probe.`,
      rationaleShort: "A staged stand-in line",
      evidence: [{ kind: "decklist", value: "A staged stand-in citation" }],
    });
    let done!: () => void;
    const outcome = new Promise<{ ok: true; usage?: undefined }>((r) => { done = () => r({ ok: true }); });
    // The outcome settles when the answer ends, or when its reader stops early (a failed save), as a real stream's does.
    const deltas = (async function* () {
      try {
        if (!refill) await sleep(delay);
        yield `{"${list}":[`;
        for (let i = 0; i < cards.length; i++) {
          if (i > 0) await sleep(Math.round(delay / 5));
          yield `${i > 0 ? "," : ""}${line(cards[i])}`;
        }
        yield "]}";
      } finally {
        done();
      }
    })();
    return { deltas, outcome };
  };
}
