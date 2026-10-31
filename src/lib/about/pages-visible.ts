// Which parts of the six About pages a reader can see, and which of those they have not been told about yet
// (About visual build, plan `2026-10-27-about-visual.md`, PR 1).
//
// The announced unit is a label or a rule (audit option B). A unit carries the old entry ids its words came from
// (`legacy`), so a reader who met those entries is not told again. The rules, in order:
//
//   - a unit is seen when the reader holds its own key;
//   - else when they hold a SWITCHED legacy entry's id, or a legacy variant id (the only legacy ids ever written:
//     `switchedIds` in `visible.ts`). An `@` id naming a switch of the entry's caption lines, not a variant, is never
//     written: it only carries that switch, so its sentences are announced rather than seen by the floor;
//   - a unit that is a switched entry's own announcement (a legacy entry carries the unit's switch) is seen by id
//     alone, as that entry was;
//   - a unit every one of whose legacy entries was switched is seen by those ids alone, never by the floor;
//   - else by the version floor (`since <= version`), for an unswitched unit AND for a switched unit none of whose
//     legacy entries carried its switch. That second case was a switched line inside an unswitched entry, shown whenever its
//     switch resolved on and seen with that entry by the floor; this unit is only drawn while its switch resolves on
//     for the reader (env and `flag_overrides`), so the floor reproduces what they were shown. Production turns lines on
//     through app-wide overrides, so reading it any other way would re-tell every production reader.
//
// A switched SENTENCE of a unit is announced on its own, as `<key>@<SWITCH>`, by the same rules over the legacy entries
// carrying that switch: a variant (`upload-choice@COLLECTION_SYNC_ENABLED`) or a switched entry of that switch.

import { ABOUT_VERSION, type AboutLineSwitch, type AboutLineSwitchOne, type AboutSwitch } from "../copy/about";
import {
  ABOUT_RULES, ABOUT_SECTIONS, type AboutArea, type AboutDiagramPart, type AboutLabel, type AboutRule, type AboutRuleDiagram,
  type AboutRuleId, type AboutSection,
} from "../copy/about-pages";
import { aboutEntries } from "../copy/about-entries";
import { isFirstRun, lineKept, type SeenState } from "./visible";

export const labelKey = (section: Pick<AboutSection, "area" | "id">, label: Pick<AboutLabel, "id">) =>
  `${section.area}/${section.id}/${label.id}`;
export const ruleKey = (id: AboutRuleId) => `rule/${id}`;
export const sentenceKey = (key: string, sw: AboutSwitch) => `${key}@${sw}`;

/** A label or a rule as a reader is drawn it: its sentences resolved, with what decides whether it is new. */
export interface VisibleUnit {
  key: string;
  area: AboutArea;
  section: string;
  kind: "label" | "rule";
  /** `rest` for a label, `text` for a rule, with every sentence whose switch is off removed. */
  text: string;
  lead?: string;
  /** The unit's own switch, or null when it always draws. */
  switch: AboutLineSwitch | null;
  since: number;
  legacy: readonly string[];
  /** The switches of the kept sentences that announce on their own (a negated switch never announces). */
  sentenceSwitches: readonly AboutSwitch[];
  /** A rule's diagram, with every part (and chip) whose switch is off removed, as its sentences are. */
  diagram?: AboutRuleDiagram;
}

export interface VisibleSection extends Omit<AboutSection, "labels" | "rules"> {
  labels: VisibleUnit[];
  rules: VisibleUnit[];
}

const ENTRY_SWITCH = new Map(aboutEntries.map((e) => [e.id, e.switch ?? null]));

function resolveText(text: string, sentences: AboutLabel["sentences"], env: NodeJS.ProcessEnv): [string, AboutSwitch[]] {
  let out = text;
  const announced: AboutSwitch[] = [];
  for (const [sentence, sw] of Object.entries(sentences ?? {})) {
    if (!sw) continue;
    if (!lineKept(sw, env)) out = out.replace(sentence, "");
    else announced.push(...positiveSwitches(sw));
  }
  // A label's `rest` opens with a space after its lead and keeps it; text whose first sentence was cut loses the one
  // that sentence left behind.
  const kept = text.startsWith(" ") ? out.trimEnd() : out.trim();
  return [kept, [...new Set(announced)]];
}

function positiveSwitches(sw: AboutLineSwitch): AboutSwitch[] {
  const all = (Array.isArray(sw) ? sw : [sw]) as readonly AboutLineSwitchOne[];
  return all.filter((one) => !one.startsWith("!")) as AboutSwitch[];
}

function unit(
  key: string, section: AboutSection, kind: VisibleUnit["kind"], u: AboutLabel | AboutRule, env: NodeJS.ProcessEnv,
): VisibleUnit | null {
  if (u.switch && !lineKept(u.switch, env)) return null;
  const [text, sentenceSwitches] = resolveText("rest" in u ? u.rest : u.text, u.sentences, env);
  return {
    key, area: section.area, section: section.id, kind, text,
    ...("lead" in u ? { lead: u.lead } : {}),
    switch: u.switch, since: u.since, legacy: u.legacy, sentenceSwitches,
    ...("diagram" in u ? { diagram: resolveDiagram(u.diagram, env) } : {}),
  };
}

/** A diagram as this reader is drawn it: a part or chip whose switch is off is gone, and an emptied column with it. */
export function resolveDiagram(d: AboutRuleDiagram, env: NodeJS.ProcessEnv): AboutRuleDiagram {
  const kept = (parts: readonly AboutDiagramPart[]) =>
    parts.flatMap((p): AboutDiagramPart[] => {
      if (p.switch && !lineKept(p.switch, env)) return [];
      if (p.part !== "chips") return [p];
      const chips = p.chips.filter((c) => !c.switch || lineKept(c.switch, env));
      return chips.length ? [{ ...p, chips }] : [];
    });
  // A head or foot keeps its shape: a parts list stays a list, a full column stays a column.
  const keptEnd = (x: NonNullable<AboutRuleDiagram["foot"]>) => ("parts" in x ? { ...x, parts: kept(x.parts) } : kept(x));
  return {
    kind: d.kind,
    ...(d.gap === undefined ? {} : { gap: d.gap }),
    ...(d.head ? { head: keptEnd(d.head) } : {}),
    columns: d.columns.map((c) => ({ ...c, parts: kept(c.parts) })).filter((c) => c.parts.length > 0),
    ...(d.foot ? { foot: keptEnd(d.foot) } : {}),
  };
}

/**
 * The sections this reader is drawn, in page order: a label or rule whose switch is off is gone (never greyed, call 8),
 * and a sentence whose switch is off is cut from it. A section is kept with no labels, so its screen is still listed.
 */
export function visibleSections(
  env: NodeJS.ProcessEnv, sections: readonly AboutSection[] = ABOUT_SECTIONS,
): VisibleSection[] {
  return sections.map((s) => ({
    ...s,
    // A sub-line's switched sentence is cut as a label's is; a sub-line is never announced, so its switches are not kept.
    sub: resolveText(s.sub, s.subSentences, env)[0],
    labels: s.labels.flatMap((l) => unit(labelKey(s, l), s, "label", l, env) ?? []),
    rules: s.rules.flatMap((id) => unit(ruleKey(id), s, "rule", ABOUT_RULES[id], env) ?? []),
  }));
}

const switchedLegacy = (legacy: readonly string[]) =>
  legacy.filter((id) => id.includes("@") || ENTRY_SWITCH.get(id) != null);

/** Whether the reader has been told about this unit, by the rules at the top of this file. */
export function unitSeen(u: Pick<VisibleUnit, "key" | "since" | "legacy" | "switch">, seen: SeenState): boolean {
  if (seen.ids.includes(u.key)) return true;
  if (switchedLegacy(u.legacy).some((id) => seen.ids.includes(id))) return true;
  // A unit that IS a switched entry's announcement (a legacy entry carries the unit's own switch) is seen by id alone,
  // as that entry was: the floor says nothing about whether the switch was on when the reader passed it.
  const own = u.switch ? positiveSwitches(u.switch) : [];
  if (u.legacy.some((id) => own.some((sw) => carries(id, sw)))) return false;
  // The floor speaks only for unswitched entries: a unit whose every source was switched was seen by id or not at all,
  // and a switched unit with no source at all is new, so its switch turning on announces it.
  if (u.legacy.length > 0 ? !u.legacy.some(isUnswitchedEntry) : u.switch !== null) return false;
  return u.since <= seen.version;
}

const isUnswitchedEntry = (id: string) => !id.includes("@") && ENTRY_SWITCH.has(id) && ENTRY_SWITCH.get(id) === null;

/** Whether a legacy id carried a switch: a switched entry of it, or a variant drawn under it. */
const carries = (id: string, sw: AboutSwitch) => id === `${id.split("@")[0]}@${sw}` || ENTRY_SWITCH.get(id) === sw;

/** Whether the reader has been told about one switched sentence of a unit. */
export function sentenceSeen(u: Pick<VisibleUnit, "key" | "since" | "legacy">, sw: AboutSwitch, seen: SeenState): boolean {
  if (seen.ids.includes(sentenceKey(u.key, sw))) return true;
  const carriers = u.legacy.filter((id) => carries(id, sw));
  if (carriers.some((id) => seen.ids.includes(id))) return true;
  // A sentence no legacy entry carried was a switched line inside an unswitched entry, seen with it by the floor. A
  // unit with no legacy at all is new, and its sentences are seen by their keys alone.
  return carriers.length === 0 && u.legacy.length > 0 && u.since <= seen.version;
}

export interface UnseenUnit {
  key: string;
  area: AboutArea;
  section: string;
  /** What acknowledging this announcement writes: a whole unit's key and the keys of the sentences drawn with it (so
   *  they are not announced on their own next), or a sentence's key alone. A sentence not drawn is not acknowledged. */
  ack: readonly string[];
}

const unitsOf = (visible: readonly VisibleSection[]) => visible.flatMap((s) => [...s.labels, ...s.rules]);

/** The announce keys of the given units the reader has not been told about, in page order. A first-run reader is
 *  introduced to the pages rather than told about each part of them, so nothing is new to them. */
export function unseenUnits(visible: readonly VisibleSection[], seen: SeenState): UnseenUnit[] {
  if (isFirstRun(seen)) return [];
  return unitsOf(visible).flatMap((u) => {
    // A unit told as a whole carries its sentences with it; a sentence is told on its own only inside a seen unit.
    if (!unitSeen(u, seen)) return [{ key: u.key, area: u.area, section: u.section, ack: unitKeys(u) }];
    return u.sentenceSwitches.filter((sw) => !sentenceSeen(u, sw, seen)).map((sw) => {
      const key = sentenceKey(u.key, sw);
      return { key, area: u.area, section: u.section, ack: [key] };
    });
  });
}

/** Every unit the reader is drawn, each as a whole announcement carrying its sentences: what a first-run reader's
 *  line stands for, and what its ✕ and first visit take as their baseline. */
export function everyAnnouncement(visible: readonly VisibleSection[]): UnseenUnit[] {
  return unitsOf(visible).map((u) => ({ key: u.key, area: u.area, section: u.section, ack: unitKeys(u) }));
}

/** Every announce key of one page's units, which a visit to that page records. A visit never raises the floor, and
 *  never writes another page's keys: a visit to Decks must not mark a new unit on Friends seen. */
export function seenKeysOf(visible: readonly VisibleSection[], area: AboutArea): string[] {
  return unitsOf(visible.filter((s) => s.area === area)).flatMap(unitKeys);
}

const unitKeys = (u: VisibleUnit) => [u.key, ...u.sentenceSwitches.map((sw) => sentenceKey(u.key, sw))];

/**
 * The seen state after a visit to one page. A first-run reader is being introduced to the pages, so their first visit
 * takes everything they are drawn, on every page, as their baseline: this build's floor and every drawn key. Only what
 * arrives later is ever announced to them. Anyone else keeps their floor, and gains only this page's keys.
 */
export function afterVisit(visible: readonly VisibleSection[], area: AboutArea, seen: SeenState): SeenState {
  if (isFirstRun(seen)) return { version: ABOUT_VERSION, ids: unitsOf(visible).flatMap(unitKeys) };
  return { version: seen.version, ids: [...new Set([...seen.ids, ...seenKeysOf(visible, area)])] };
}

/** The label a tool's Show me lights for this reader: the first of its `labels` they are drawn, or null. */
export function showMeLabel(labels: readonly string[], visible: readonly VisibleSection[]): string | null {
  const drawn = new Set(visible.flatMap((s) => s.labels.map((l) => l.key)));
  return labels.find((l) => drawn.has(l)) ?? null;
}

/** No claim names more keys than the pages hold (every unit's ack with every switch on is under a hundred); a longer
 *  claim is not one a page drew, and is cut here. */
export const MAX_CLAIMED = 200;

/** The keys a browser sent back as what its page drew, bounded and typed, or null for anything that is not a list. */
export function claimedKeys(claimed: unknown): ReadonlySet<string> | null {
  if (!Array.isArray(claimed)) return null;
  return new Set(claimed.slice(0, MAX_CLAIMED).filter((k): k is string => typeof k === "string"));
}

const baseOf = (key: string) => key.split("@")[0];

/**
 * What acknowledging the claimed announcements writes: `current` is what the reader is announced NOW (read again on the
 * server), `named` what the page RENDERED (sent back by the browser). The two are intersected key by key, never widened
 * to the current state: an announcement is acknowledged only when its key was rendered, and of its `ack` only the keys
 * that were rendered too, so a sentence whose switch turned on after the render is not marked seen unread with its unit.
 *
 * The floor rises to `version` when every announcement standing now was claimed whole. When one was not (a deploy or a
 * switch added it, or a sentence of it, after the render, or the client dropped it), it rises only to just under the
 * oldest such one's `since`, never past the reader's own, so it stays new. Null when there is nothing to write.
 */
export function claimWrite(
  named: ReadonlySet<string>,
  current: readonly UnseenUnit[],
  seen: SeenState,
  visible: readonly VisibleSection[],
  version: number = ABOUT_VERSION,
): SeenState | null {
  const valid = current.filter((u) => named.has(u.key));
  if (valid.length === 0) return null;
  const since = new Map(unitsOf(visible).map((u) => [u.key, u.since]));
  const open = current.filter((u) => !u.ack.every((k) => named.has(k)));
  const floor = open.length === 0
    ? version
    : Math.max(seen.version, Math.min(...open.map((u) => since.get(baseOf(u.key)) ?? 0)) - 1);
  const ids = [...new Set(valid.flatMap((u) => u.ack.filter((k) => named.has(k))))];
  if (floor <= seen.version && ids.every((id) => seen.ids.includes(id))) return null;
  return { version: Math.max(floor, seen.version), ids };
}

/**
 * What a visit to `area` writes, re-decided on the server from the keys the page RENDERED (`claimed`, which
 * `afterVisit` named at render): a returning reader gains this page's keys that were rendered and are still drawn; a
 * first-run reader's baseline is the rendered keys still drawn, by `claimWrite`, so a unit or sentence switched on
 * between the render and the visit stays new. Null when there is nothing to write.
 */
export function visitWrite(
  claimed: unknown,
  visible: readonly VisibleSection[],
  area: AboutArea,
  seen: SeenState,
  version: number = ABOUT_VERSION,
): SeenState | null {
  const named = claimedKeys(claimed);
  if (!named) return null;
  if (isFirstRun(seen)) return claimWrite(named, everyAnnouncement(visible), seen, visible, version);
  const held = new Set(seen.ids);
  const ids = seenKeysOf(visible, area).filter((k) => named.has(k) && !held.has(k));
  return ids.length > 0 ? { version: seen.version, ids } : null;
}

/**
 * Every announce key the reader at `seen` has been told about: what a write leaving them at `seen` answers on a banner
 * drawn before it (the Reference's visit, which writes legacy ids and the floor, answers the units those cover). A
 * first-run state answers nothing; past it, every unit's key and its drawn sentences' keys that `unseenUnits` does not
 * name.
 */
export function answeredKeys(visible: readonly VisibleSection[], seen: SeenState): string[] {
  if (isFirstRun(seen)) return [];
  const open = new Set(unseenUnits(visible, seen).flatMap((u) => u.ack));
  return unitsOf(visible).flatMap(unitKeys).filter((k) => !open.has(k));
}

/**
 * What every About write answers the browser with (review rounds 6 and 7): the state the reader is left at, `seen`
 * merged with `write` as `markAboutVisited` merges (a union, the floor by `greatest`), as the ids it holds plus every
 * launch key that state answers. Answered from the RESULTING state on the write and the no-write path alike, so a key
 * another tab wrote after Home was cached is acknowledged too, and a reader past their first run always gets a
 * non-empty answer that ends it in this document.
 */
export function heldAnswer(visible: readonly VisibleSection[], seen: SeenState, write: SeenState | null): string[] {
  const after = write
    ? { version: Math.max(seen.version, write.version), ids: [...new Set([...seen.ids, ...write.ids])] }
    : seen;
  return [...new Set([...after.ids, ...answeredKeys(visible, after)])];
}
