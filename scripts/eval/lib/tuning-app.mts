import { connectStaging } from "./staging.mjs";
import { splitDecks } from "./split.mjs";
import { applyVariant, type TuningVariant } from "../variants/tuning.mjs";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

/**
 * Deck tuning as the app runs it, opened once against staging, read-only. The runner and the
 * re-scorer both go through here, so there is one preparation path and one scoring path.
 *
 * Every `src/` import is DYNAMIC and comes after `connectStaging`, because `src/db` reads
 * DATABASE_URL when it is first imported (see `staging.mts`).
 */
export const OVERLAY_ANCHOR = Date.UTC(2026, 8, 20, 19, 0, 0);

export type OverlayDeck = {
  intent: string | null;
  games: { result: "win" | "loss" | "draw"; podSize: number; daysAgo: number; worked: string[]; hurt: string[]; note: string | null }[];
};

export async function openTuning() {
  const db = await connectStaging();
  const { sql, inArray } = await import("drizzle-orm");
  const { cards } = await import("../../../src/db/schema");
  const { tuningInputs, readOwnedOracleIds } = await import("../../../src/lib/decks/tuning-read");
  const { loadDeckProfileFromHead } = await import("../../../src/lib/profile/load");
  const { buildPlayGroup } = await import("../../../src/lib/profile/play");
  const { buildEvidencePack } = await import("../../../src/lib/tuning/evidence");
  const { buildPrompt } = await import("../../../src/lib/tuning/prompt");
  const { tuningResponseSchema } = await import("../../../src/lib/tuning/response-schema");
  const { nameResolver } = await import("../../../src/lib/tuning/resolve-names");
  const { sizeLists, validateSuggestions } = await import("../../../src/lib/tuning/validate");
  const limits = await import("../../../src/lib/tuning/limits");
  const { PROMPT_VERSION } = await import("../../../src/lib/tuning/prompt-version");
  type EvidencePack = import("../../../src/lib/tuning/evidence").EvidencePack;
  type TuningResponse = import("../../../src/lib/tuning/response-schema").TuningResponse;
  type DeckGame = import("../../../src/lib/decks/games").DeckGame;

  const deckRows = (await db.execute(sql`select id, user_id, name from decks order by id`)).rows as {
    id: string; user_id: string; name: string;
  }[];
  // Staging holds two accounts with the same twenty "HD" decks. They are NOT interchangeable (measured
  // 2026-10-12: Elves differs in its owned-only setting and card list, Zombies in its budget cap), so the
  // account is named: `TUNING_EVAL_USER_ID`, else the first by user id, which is deterministic and is what
  // every arm of the model-tiering eval used. The deck rows below are narrowed to that account.
  const hd = deckRows.filter((d) => d.name.startsWith("HD"));
  const users = [...new Set(hd.map((d) => d.user_id))].sort();
  const named = process.env.TUNING_EVAL_USER_ID;
  if (named !== undefined && !users.includes(named)) throw new Error(`eval: TUNING_EVAL_USER_ID names no account that holds an "HD" deck`);
  if (users.length === 0) throw new Error(`eval: no "HD" decks on staging`);
  const userId = named ?? users[0];
  console.error(`eval: tuning account ...${userId.slice(-6)} (${users.length} accounts hold HD decks)`);
  for (let i = deckRows.length - 1; i >= 0; i--) if (deckRows[i].user_id !== userId) deckRows.splice(i, 1);

  /** The pack and messages for each deck, by the app's own path. `overlay[i]` replaces deck i's
   *  intent and games in memory, before the pack is built. */
  async function prepare(ids: readonly string[], variant: TuningVariant, overlay: readonly OverlayDeck[] | null) {
    const out: { deckId: string; pack: EvidencePack; system: string; user: string }[] = [];
    for (const [i, deckId] of ids.entries()) {
      const inputs = await tuningInputs(deckId, userId, process.env);
      if (!inputs) throw new Error(`eval: deck ${deckId} not readable`);
      const profile = await loadDeckProfileFromHead(inputs.head);
      const owned = await readOwnedOracleIds(userId, [
        ...profile.cards.map((c) => c.oracleId),
        ...profile.skeleton.staples.map((s) => s.oracleId),
      ]);
      let intent = inputs.intent;
      let games: DeckGame[] = inputs.games;
      if (overlay) {
        const o = overlay[i];
        intent = o.intent;
        games = o.games.map((g, n) => ({
          id: `overlay-${i}-${n}`,
          result: g.result,
          podSize: g.podSize,
          playedAt: new Date(OVERLAY_ANCHOR - g.daysAgo * 86_400_000),
          versionNumber: null,
          note: g.note,
          worked: g.worked,
          hurt: g.hurt,
        })) as DeckGame[];
      }
      const pack = buildEvidencePack({
        profile, play: buildPlayGroup(games), intent, owned, now: new Date(OVERLAY_ANCHOR),
        limits: { capCents: null, sets: [], ownedOnly: false },
      });
      const { pack: shown, messages } = applyVariant(variant, pack, buildPrompt, deckId);
      out.push({ deckId, pack: shown, ...messages });
    }
    return out;
  }

  /** The real accept contract over parsed replies, with one catalog read for every name. Two lists
   *  (sub-project 8): each is validated on its own side's rules and sized to the first
   *  MAX_SUGGESTIONS survivors, exactly as `runTuning` does. */
  async function score(items: readonly { pack: EvidencePack; value: TuningResponse }[]) {
    const names = [...new Set(items.flatMap((a) => [...a.value.additions, ...a.value.cuts].map((l) => l.card)))];
    const catalogRows = names.length === 0 ? [] : await db
      .select({ oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal })
      .from(cards)
      .where(inArray(cards.name, names));
    // No real limits in this eval harness, so every candidate passes the hard filters untouched.
    const catalog = catalogRows.map((r) => ({ ...r, priceCents: null, printedInSelectedSets: true, owned: false }));
    return items.map(({ pack, value }) => {
      const inDeck = new Set(pack.cards.map((c) => c.oracleId));
      const resolve = nameResolver(catalog, inDeck);
      const { kept, droppedCount, drops } = validateSuggestions({ response: value, pack, resolveName: resolve });
      // A name the app could not use: an addition that resolves to nothing, or a cut that is no card
      // of the deck.
      const outside = value.additions.reduce((n, l) => n + (resolve(l.card) === null ? 1 : 0), 0)
        + value.cuts.reduce((n, l) => {
          const cut = resolve(l.card);
          return n + (cut === null || !inDeck.has(cut.oracleId) ? 1 : 0);
        }, 0);
      const sized = sizeLists(kept, limits.MAX_SUGGESTIONS);
      const keptAdditions = sized.filter((k) => k.addOracleId !== null).length;
      return {
        outcome: sized.length > 0 ? "survived" : "ungrounded",
        returned: value.additions.length + value.cuts.length,
        returnedAdditions: value.additions.length,
        returnedCuts: value.cuts.length,
        kept: sized.length,
        keptAdditions,
        keptCuts: sized.length - keptAdditions,
        droppedCount,
        drops: drops.map((d) => `${d.side}:${d.rule}`),
        keptSuggestions: sized,
        outsideNames: outside,
      };
    });
  }

  return {
    userId,
    split: splitDecks(deckRows.map((d) => d.id)),
    nameOf: new Map(deckRows.map((d) => [d.id, d.name])),
    prepare,
    score,
    schema: tuningResponseSchema,
    maxTokens: limits.TUNING_MAX_TOKENS,
    model: limits.TUNING_MODEL,
    promptVersion: PROMPT_VERSION,
  };
}
