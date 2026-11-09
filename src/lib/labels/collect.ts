// The pure half of the label build's collect (`scripts/lib/card-labels-build.ts`, `collectBatch`): what
// one intent's replies stage, given the cards it asked about as the catalog holds them now. Pure, so
// the keyed match is tested by behaviour, without a database or a provider.
import { readKeyedReply, withoutRepeats } from "./parse";
import { labelInputHash } from "./prompt";
import type { CardRow } from "./publish";
import type { Job } from "./types";

/** What an intent recorded when it was asked: the oracle ids in key order, and each one's input hash. */
export type AskedIntent = { asked: readonly string[]; askedHashes: Readonly<Record<string, string>> | null };

export type Judged = {
  /** The answers to stage: one per asked card that came back usable and has not moved. */
  staged: { oracleId: string; labels: Job[]; inputHash: string }[];
  /** Asked cards whose inputs moved since (a rename included), or that left the catalog: not judged. */
  moved: number;
  /** What was refused or unreadable, one line each. */
  rejected: string[];
};

/**
 * Reads one intent's reply texts against what it asked.
 *
 * AN ANSWER DESCRIBES THE TEXT IT WAS ASKED ABOUT. A card whose input hash moved since the request (a
 * rename, an errata) or that left the catalog is MOVED: not staged, out of the floor, and planned
 * again. Its name is not checked either (the request sent a name the catalog no longer holds), so a
 * rename is counted as moved, never as a dropped answer. A card the model simply omitted is unchanged
 * and counts against the floor. An intent with no recorded hashes (legacy) moves nothing.
 *
 * Each reply is matched BY KEY (`readKeyedReply`), so two oracle rows sharing a name each get their own
 * answer. `model` is what a staged row's hash is written under.
 */
export function judgeReplies(intent: AskedIntent, replies: readonly string[], byId: ReadonlyMap<string, CardRow>, model: string): Judged {
  const sent = intent.askedHashes;
  const changed = new Set(sent === null ? [] : intent.asked.filter((id) => {
    const c = byId.get(id);
    return c === undefined || sent[id] !== labelInputHash(c, model);
  }));
  const asked = intent.asked.map((id) => ({ oracleId: id, name: changed.has(id) ? undefined : byId.get(id)?.name }));
  const got = new Map<string, Job[]>();
  const rejected: string[] = [];
  for (const text of replies) {
    const read = readKeyedReply(text, asked);
    if (read === null) { rejected.push("unparseable"); continue; }
    rejected.push(...read.rejected);
    for (const [id, kept] of read.byId) got.set(id, withoutRepeats([...(got.get(id) ?? []), ...kept]));
  }
  const staged = [...got].flatMap(([id, labels]) => {
    const c = byId.get(id);
    return changed.has(id) || c === undefined ? [] : [{ oracleId: id, labels, inputHash: labelInputHash(c, model) }];
  });
  return { staged, moved: changed.size, rejected };
}
