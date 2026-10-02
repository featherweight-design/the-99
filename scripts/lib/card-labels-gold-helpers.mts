// The gold set's row builders, shared by every gold module so each can be written on its own.
import {
  METHOD_KINDS, TO_KINDS,
  type Affects, type Destination, type Job, type LabelRole, type LabelTheme, type Method, type RampKind,
  type Recurrence, type Space, type Threshold, type ThresholdOp, type Trigger,
} from "../../src/lib/labels/types.js";

/**
 * One job. `rt` restrictedTo, `af` affects, `dest` to, `meth` method, `tr` trigger, `rec` recurrence,
 * `th` threshold, `rk` rampKind (required on role:ramp, may be null meaning no kind fits).
 *
 * `af` has NO default, and neither do `dest` on a kind that carries a `to` nor `meth` on one that
 * carries a `method` (the vocabulary plan's Task 4). Each is a judgement about the card, and a
 * default would record an answer nobody gave: a row that omits one is reported by `validateGold`
 * as missing it. On every other kind `to` and `method` are null, which is the schema's rule.
 */
type Opts = {
  rt?: string | null; af?: Affects | null; dest?: Destination | null; meth?: Method | null;
  tr?: Trigger; rec?: Recurrence; th?: Threshold | null; modal?: boolean; rk?: RampKind | null;
};

export const j = (space: Space, kind: LabelRole | LabelTheme, o: Opts = {}): Job => {
  // A field the row did not state is LEFT OUT, so `validateJob` names it missing, rather than defaulted.
  const stated = (field: "affects" | "to" | "method", opt: "af" | "dest" | "meth", applies: boolean) =>
    !applies ? { [field]: null } : opt in o ? { [field]: o[opt] } : {};
  const base = {
    space, kind,
    restrictedTo: o.rt ?? null,
    ...stated("affects", "af", true),
    ...stated("to", "dest", TO_KINDS.includes(kind)),
    ...stated("method", "meth", METHOD_KINDS.includes(kind)),
    trigger: o.tr ?? "none",
    recurrence: o.rec ?? "repeatable",
    threshold: o.th ?? null,
    modal: o.modal ?? false,
  };
  // `rk` is ABSENT rather than null when not given, which is the wire rule the validator
  // enforces off the ramp role. The assertion is narrow and deliberate: `space` and `kind`
  // are independent parameters here, so TypeScript cannot see which arm of `Job` this is,
  // and `validateGold` below is what actually proves every fixture — it must keep
  // REPORTING a bad fixture rather than throwing at import, so this cannot narrow through
  // `isJob` without changing what the test on it can observe.
  return ("rk" in o ? { ...base, rampKind: o.rk } : base) as Job;
};
export const mv = (n: number, op: ThresholdOp = ">="): Threshold => ({ stat: "mv", op, value: n });

/** One gold row: a card by its exact catalog name, the jobs it does, and why. */
export type GoldRow = { name: string; klass: string; jobs: Job[]; why: string };
