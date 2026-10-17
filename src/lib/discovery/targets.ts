import { MOMENTS, type MomentId } from "../moments/registry";

/**
 * Every control a halo can land on (discovery R2/R3, plan `2026-10-16-discovery-r2-r3.md`, decision 2): one closed set
 * for the landing (E11), Show me (C4) and the tour (E20). A moment's control is a target under the moment's own id. The
 * one tool with no moment, C2's Friends and pods, is named by the About entry that explains it (Stats for your decks
 * has one: `lineup`, M13). The tour's stops carry a `tour:` prefix.
 *
 * Client-safe: the moments registry is a constant.
 */
export const TOOL_TARGETS_WITHOUT_MOMENT = ["friends"] as const;

export const TOUR_TARGETS = [
  "tour:step-one",
  "tour:collection",
  "tour:commanders",
  "tour:decks",
  "tour:account",
  "tour:banner",
  "tour:friends",
] as const;

export type TargetId = MomentId | (typeof TOOL_TARGETS_WITHOUT_MOMENT)[number] | (typeof TOUR_TARGETS)[number];

export const TARGETS: readonly TargetId[] = [
  ...MOMENTS.map((m) => m.id),
  ...TOOL_TARGETS_WITHOUT_MOMENT,
  ...TOUR_TARGETS,
];

const KNOWN = new Set<string>(TARGETS);

export function isTargetId(v: unknown): v is TargetId {
  return typeof v === "string" && KNOWN.has(v);
}
