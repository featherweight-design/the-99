import { readEvidence, refIndex } from "./claims";
import { deckNameIndex, normalizeName, type SynopsisFacts } from "./facts";
import type { StagesOption } from "./prompt";
import {
  checkAlternateLine, checkLandKeep, dedupeSections, docFromChecked, docFromStagesReply, docShownNew, i3RepairTargets, landKeepNumber,
  STAGES_LIMITS, stagesChecks, type StagesReply,
} from "./stages";
import { SECTION_COUNTS } from "./limits";
import type { CheckedSynopsis, RefusalReason, SectionId, SectionVerdict } from "./types";
import { marksIn } from "./validate";

/**
 * Contract 13 in production: the stages shape (`stages.ts`, iteration 3 of the eval harness
 * `scripts/eval/overview-stages.mts`) for a PLAYER's deck and, with `alternates`, for a precon's
 * (`scripts/build-precon-overviews.ts`; the alternate line is a precon's alone). Everything here is pure, so the write
 * path in `generate.ts` stays a thin caller and the rules are unit-tested without a database.
 *
 * WHICH CHECKS REFUSE, following the harness's precedent. The harness reports `allChecksPass`
 * and shows the content whatever it says; only the contract-8 validator ever hides a section there.
 * Production keeps that, and adds exactly what the stored shape cannot do without:
 *  - HARD (a section is refused, `wrong_count`): the Primer without exactly three stage lines and
 *    exactly two tips (the labels come from the position, so a fourth line would carry none); Key
 *    cards left under their minimum once the explained-once pass has dropped the ones a stage
 *    explains. A refused section refunds the unit, and the one repair is sent to fix it.
 *  - HARD (the line is left out, the section stays): the land line (`landKeep`) when it fails
 *    `checkLandKeep` (a wrong number, a range, a stray figure, no reason, over budget), cites a ref
 *    that resolves to nothing, or marks a card the deck does not hold. The row then draws the fixed
 *    land range, exactly as a contract-12 row does.
 *  - REPAIR TARGETS (`i3RepairTargets`): a Key cards section short after the pass, a tip left with
 *    no subject, a card still explained in two sections. They add their sections to the ONE repair
 *    (contract B); whatever the repair leaves is shown, as the harness shows it.
 *  - ADVISORY, never gating: cards-in-list, turn numbers, stage fit, stages-name-cards, mulligan
 *    specificity, deck kind and the commander repeating in the overview and Early. Length is not
 *    judged either: it compares against the Overview being replaced, which a write does not hold.
 * No new refusal reason: `wrong_count` already has its copy.
 */

/**
 * The prompt's stages option: the iteration-3 shape and the deck's own land number. A player's deck
 * has no alternates (the default); a precon passes its box's (`precons/alternates.ts`).
 */
export function stagesPromptOption(facts: SynopsisFacts, alternates: readonly string[] = []): StagesOption {
  return { alternates, shape: 3, landKeep: landKeepNumber(facts) };
}

function refuse(content: CheckedSynopsis, section: SectionId, reason: RefusalReason): CheckedSynopsis {
  const verdicts = content.verdicts.map((v): SectionVerdict =>
    v.section === section && v.status === "ok" ? { section, status: "refused", reason, failed: 0, total: v.total } : v);
  const out: CheckedSynopsis = { ...content, verdicts };
  const e = content.evidence;
  if (section === "primer") {
    out.primer = null;
    if (e) out.evidence = { ...e, strategy: [], keep: [], sendBack: [], tips: [] };
  } else if (section === "keyCards") {
    out.keyCards = null;
    if (e) out.evidence = { ...e, keyCards: [] };
  }
  return out;
}

/**
 * A contract-8 check's result made a contract-13 one: the Primer's counts the stages shape needs,
 * the land line taken from the reply when it passes its check, and, for a precon whose box carries
 * `alternates`, the alternate-commander line under the same terms (`checkAlternateLine`). Run on
 * every reply, the repair's included, so a merge never holds a section the shape cannot draw.
 */
export function applyStagesShape(checked: CheckedSynopsis, reply: StagesReply, facts: SynopsisFacts, alternates: readonly string[] = []): CheckedSynopsis {
  let out = checked;
  const p = out.primer;
  if (p && (p.strategy.length !== STAGES_LIMITS.stages || p.tips.length < STAGES_LIMITS.tips.min || p.tips.length > STAGES_LIMITS.tips.max)) {
    out = refuse(out, "primer", "wrong_count");
  }
  const land = reply.landKeep;
  if (land && checkLandKeep(docFromStagesReply(reply, 3), facts, landKeepNumber(facts)).pass) {
    out = withLine(out, land, facts, "landKeep");
  }
  const alt = reply.alternate;
  if (alt && alternates.length > 0 && checkAlternateLine({ alternate: [{ text: alt.text }] }, alternates).pass) {
    out = withLine(out, alt, facts, "alternate");
  }
  return out;
}

/**
 * One reply line stored on the content (`landKeep` or `alternate`), with the cards its marks open
 * and the oracle ids its evidence cites; `content` unchanged when a mark names a card the deck does
 * not hold or a ref resolves to nothing, so the line is left out rather than half stored.
 */
function withLine(content: CheckedSynopsis, line: { text: string; evidence: string[] }, facts: SynopsisFacts, key: "landKeep" | "alternate"): CheckedSynopsis {
  const deck = deckNameIndex(facts.cards);
  const added: CheckedSynopsis["cards"] = {};
  for (const m of marksIn(line.text)) {
    const card = deck.get(normalizeName(m));
    if (!card) return content;
    added[normalizeName(m)] = { oracleId: card.oracleId, name: card.name };
  }
  const read = readEvidence(line.evidence, refIndex(facts.cards), false);
  if (read.reason) return content;
  return {
    ...content,
    [key]: line.text.trim(),
    cards: { ...content.cards, ...added },
    ...(content.evidence ? { evidence: { ...content.evidence, [key]: read.ids } } : {}),
  };
}

/**
 * What the post-pass and the checks leave for the write's one repair, beyond the sections the
 * validator refused: the sections to rewrite and why (`i3RepairTargets`, run exactly as the harness
 * runs it, on what a reader would be shown and on the reply the checks read).
 */
export function stagesRepairTargets(content: CheckedSynopsis, reply: StagesReply, facts: SynopsisFacts, precon?: { alternates: readonly string[] }): { sections: SectionId[]; reasons: string[] } {
  const shown = dedupeSections(docShownNew(content, reply, 3), facts).doc;
  const checks = stagesChecks({ reply, shownNew: shown, oldDoc: shown, facts, alternates: precon?.alternates ?? [], shape: 3, kind: precon ? "precon" : "player deck", postPass: true });
  return i3RepairTargets(checks);
}

/** The line added to the repair's user message for the explained-once failures, as the harness words it. */
export function repairNote(reasons: readonly string[]): string {
  return `These also broke the rule that each card is explained in one section only: ${reasons.join("; ")}.`;
}

/** The oracle ids of the cards whose `[[mark]]` `before` holds and `after` no longer does. */
function droppedIds(before: string, after: string, cards: CheckedSynopsis["cards"]): Set<string> {
  const kept = new Set(marksIn(after).map(normalizeName));
  const out = new Set<string>();
  for (const m of marksIn(before)) {
    const key = normalizeName(m);
    const id = cards[key]?.oracleId;
    if (!kept.has(key) && id) out.add(id);
  }
  return out;
}

/**
 * The explained-once post-pass applied to what is stored, so a reader is shown what the harness
 * showed (`dedupeSections`): a Key card a stage already explains is dropped, and a tip or Key card
 * job loses the mark of a card an earlier section explains (its words stay), and the evidence that
 * card carried with it, so "Based on" never links a card the text no longer names. A Key cards
 * section the drop leaves under its minimum is refused (`wrong_count`), since nothing refills it.
 * Idempotent. `scope` limits it to the sections a section retry rewrote: a section that already
 * passed is never changed by the retry, so a new stage that names a kept Key card leaves that card
 * as it was and the conflict is resolved inside the rewritten section alone.
 */
export function settleStages(content: CheckedSynopsis, facts: SynopsisFacts, scope?: readonly SectionId[]): CheckedSynopsis {
  const { doc } = dedupeSections(docFromChecked(content), facts);
  let out = content;
  const old = content.keyCards;
  if (old && (!scope || scope.includes("keyCards"))) {
    const kept: { at: number; job: string }[] = [];
    old.forEach((k, at) => {
      const next = doc.keyCards[kept.length];
      if (next && next.card === k.card) kept.push({ at, job: next.job.text });
    });
    if (kept.length !== old.length || kept.some((k) => k.job !== old[k.at].job)) {
      const ev = out.evidence;
      out = {
        ...out,
        keyCards: kept.map((k) => ({ ...old[k.at], job: k.job })),
        ...(ev ? {
          evidence: {
            ...ev,
            keyCards: kept.map((k) => {
              const ids = ev.keyCards[k.at] ?? [];
              const gone = droppedIds(old[k.at].job, k.job, content.cards);
              return gone.size === 0 ? ids : ids.filter((id) => !gone.has(id));
            }),
          },
        } : {}),
      };
    }
    if ((out.keyCards?.length ?? 0) < SECTION_COUNTS.keyCards.min) out = refuse(out, "keyCards", "wrong_count");
  }
  const p = out.primer;
  if (p && (!scope || scope.includes("primer"))) {
    const byFullName = new Map(Object.values(content.cards).map((c) => [normalizeName(c.name), c.oracleId]));
    const idOf = (name: string) => content.cards[normalizeName(name)]?.oracleId ?? byFullName.get(normalizeName(name));
    const gone: Set<string>[] = [];
    const tips = p.tips.map((t, i) => {
      const text = doc.tips[i]?.text ?? t.text;
      gone[i] = droppedIds(t.text, text, content.cards);
      if (text === t.text) return t;
      // By oracle id, never by spelling: a mark may be a face's name ("Fire") for a card listed under its full one ("Fire // Ice").
      const marked = new Set(marksIn(text).map((m) => content.cards[normalizeName(m)]?.oracleId ?? normalizeName(m)));
      return { text, cards: t.cards.filter((c) => marked.has(idOf(c) ?? normalizeName(c))) };
    });
    if (tips.some((t, i) => t !== p.tips[i])) {
      const ev = out.evidence;
      out = {
        ...out,
        primer: { ...p, tips },
        ...(ev ? { evidence: { ...ev, tips: ev.tips.map((ids, i) => (gone[i]?.size ? ids.filter((id) => !gone[i].has(id)) : ids)) } } : {}),
      };
    }
  }
  return out;
}
