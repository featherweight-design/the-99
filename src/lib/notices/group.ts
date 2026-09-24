/**
 * The Notices sheet's groups, in order (HANDOFF §2 with readiness F8): legality first, then the
 * findings' own kinds IN THE FINDINGS ROW'S ORDER, read from `FINDING_ORDER` rather than restated,
 * then the rules. An empty group is absent. Pure: the read decides what is pending, this decides
 * where it goes.
 */
import { FINDING_ORDER, type FindingId } from "../bracket/findings";
import type { ChangeKind } from "./log";

export type NoticeGroup = "notLegal" | "outsideColors" | FindingId | "rules";

/** Which finding each data kind reports under. `tutors` has no log kind (brief §6). */
const KIND_GROUP: Record<Exclude<ChangeKind, "notLegal" | "rules">, FindingId> = {
  gameChanger: "gameChangers",
  massLandDenial: "massLandDenial",
  extraTurns: "extraTurns",
  combo: "twoCardCombos",
};

export const GROUP_ORDER: readonly NoticeGroup[] = ["notLegal", "outsideColors", ...FINDING_ORDER, "rules"];

/**
 * The group a DATA entry is listed under. A `notLegal` entry only dates a ban, and the ban itself
 * is listed from the live legality read, so it has no data group of its own.
 */
export function dataGroup(kind: ChangeKind): NoticeGroup | null {
  if (kind === "rules") return "rules";
  if (kind === "notLegal") return null;
  return KIND_GROUP[kind];
}

/** Items bucketed by group, in `GROUP_ORDER`, empty groups dropped. */
export function inGroupOrder<T>(items: readonly T[], groupOf: (t: T) => NoticeGroup): { group: NoticeGroup; items: T[] }[] {
  return GROUP_ORDER
    .map((group) => ({ group, items: items.filter((t) => groupOf(t) === group) }))
    .filter((g) => g.items.length > 0);
}
