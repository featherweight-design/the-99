import { connectStaging } from "./staging.mjs";
import { splitDecks } from "./split.mjs";
import { applySynopsisVariant, type SynopsisVariant } from "../variants/synopsis.mjs";

/**
 * The deck overview (code name "synopsis") as the app writes it, opened once against staging,
 * read-only. Imported, never restated: `loadProfileHead` and `loadDeckProfileFromHead` build the
 * reading an Analyze press stores, `factsFor` reads the rules text and builds the facts exactly as
 * `writeSynopsisFor` does, `buildSynopsisPrompt` writes the messages, and `catalogFor` with
 * `validateSynopsis` is the accept contract.
 *
 * One difference from the app, stated rather than hidden: the app writes from the STORED reading,
 * and this builds the reading fresh from the deck's head. Both are `loadDeckProfileFromHead` over
 * the same head, so they agree unless the stored reading is stale, which is a state the app
 * refuses to write from anyway.
 */
export async function openSynopsis() {
  const db = await connectStaging();
  const { sql } = await import("drizzle-orm");
  const { loadProfileHead, loadDeckProfileFromHead } = await import("../../../src/lib/profile/load");
  const { factsFor, catalogFor, outcomeOf } = await import("../../../src/lib/synopsis/generate");
  const { buildSynopsisPrompt } = await import("../../../src/lib/synopsis/prompt");
  const { synopsisResponseSchema } = await import("../../../src/lib/synopsis/response-schema");
  const { validateSynopsis } = await import("../../../src/lib/synopsis/validate");
  const { SYNOPSIS_MAX_TOKENS, SYNOPSIS_CONTRACT_VERSION } = await import("../../../src/lib/synopsis/limits");
  const { SYNOPSIS_MODEL } = await import("../../../src/lib/synopsis/model");
  type SynopsisFacts = import("../../../src/lib/synopsis/facts").SynopsisFacts;
  type SynopsisResponse = import("../../../src/lib/synopsis/response-schema").SynopsisResponse;

  const deckRows = (await db.execute(sql`select id, user_id, name from decks order by id`)).rows as {
    id: string; user_id: string; name: string;
  }[];
  const users = [...new Set(deckRows.map((d) => d.user_id))];
  if (users.length !== 1) throw new Error(`eval: expected one staging account, found ${users.length}`);
  const userId = users[0];

  async function prepare(ids: readonly string[], variant: SynopsisVariant) {
    const out: { deckId: string; facts: SynopsisFacts; system: string; user: string }[] = [];
    for (const deckId of ids) {
      const head = await loadProfileHead(deckId, userId);
      if (!head) throw new Error(`eval: deck ${deckId} not readable`);
      const facts = await factsFor(await loadDeckProfileFromHead(head));
      const { facts: shown, messages } = applySynopsisVariant(variant, facts, (f) => buildSynopsisPrompt(f));
      out.push({ deckId, facts: shown, ...messages });
    }
    return out;
  }

  /** The accept contract, with the app's own catalog read for names Weaknesses uses. */
  async function score(facts: SynopsisFacts, reply: SynopsisResponse) {
    const checked = validateSynopsis(reply, facts, await catalogFor(reply, facts));
    return {
      outcome: outcomeOf(checked.verdicts),
      verdicts: checked.verdicts,
      sectionsPassed: checked.verdicts.filter((v) => v.status === "ok").length,
      // Names the model gave that resolve to no card: the `unknown_card` refusals' failed marks.
      outsideNames: checked.verdicts.reduce((n, v) => n + (v.status === "refused" && v.reason === "unknown_card" ? v.failed : 0), 0),
      shown: checked,
    };
  }

  return {
    userId,
    split: splitDecks(deckRows.map((d) => d.id)),
    nameOf: new Map(deckRows.map((d) => [d.id, d.name])),
    prepare,
    score,
    schema: synopsisResponseSchema,
    maxTokens: SYNOPSIS_MAX_TOKENS,
    model: SYNOPSIS_MODEL,
    contractVersion: SYNOPSIS_CONTRACT_VERSION,
  };
}
