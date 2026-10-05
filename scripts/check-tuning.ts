/**
 * Canary for the tuning model's contract. Touches no database; needs `ANTHROPIC_API_KEY`, and
 * costs money per run, which is why its workflow is gated on a repository variable.
 *
 * The model is upstream in exactly the way Scryfall and ManaPool are, and a silent change there
 * would otherwise sit unnoticed until players' runs started failing. So this sends the committed
 * evidence pack (`scripts/fixtures/tuning-pack.json`: a real 99-card deck with five games, two
 * notes and an intent) through the same prompt, schema, client and validator a run uses, and
 * asserts FIVE things rather than two:
 *
 *   1. the reply parses against `tuningResponseSchema`
 *   2. at least one suggestion survives `validateSuggestions`
 *   3. a survivor cites the axis the fixture marks as hurting most
 *   4. every add the model PROPOSED is inside the commander's colour identity
 *   5. every cut the model PROPOSED is a card the fixture's decklist holds
 *
 * A model returning fluent, well-formed, ungrounded answers is exactly the drift a shape-only
 * check would miss; 3 to 5 are what catch it. 4 and 5 read the model's own proposals, before the
 * validator: after it they cannot fail, because the validator drops exactly those suggestions,
 * and a model drifting off the decklist would pass so long as one proposal survived.
 *
 * Card names resolve through Scryfall's `/cards/named`, the database-free equivalent of the
 * catalog read `runTuning` makes. It prints the call's token usage, which is the figure the
 * spend cap's input ceiling (`FEATURE_CALLS` in `src/lib/model/prices.ts`) is measured against.
 *
 *   pnpm check:tuning             # one live call
 *   pnpm check:tuning --dry-run   # builds the prompt and prints its size; calls nothing
 */
import { readFileSync } from "node:fs";

import { requireEnv } from "./lib/env.mjs";
import { callModel } from "../src/lib/model/client";
import type { EvidencePack } from "../src/lib/tuning/evidence";
import { MODEL_TIMEOUT_MS, TUNING_EFFORT, TUNING_MAX_TOKENS, TUNING_MODEL, TUNING_RETRY_FLOOR_MS } from "../src/lib/tuning/limits";
import { axisLabel, buildPrompt } from "../src/lib/tuning/prompt";
import { tuningResponseSchema } from "../src/lib/tuning/response-schema";
import { validateSuggestions, type ResolvedCard } from "../src/lib/tuning/validate";

const FIXTURE = new URL("./fixtures/tuning-pack.json", import.meta.url);

type ScryfallCard = { oracle_id?: string; color_identity?: string[]; legalities?: { commander?: string } };

async function resolveAll(names: readonly string[]): Promise<Map<string, ResolvedCard>> {
  const out = new Map<string, ResolvedCard>();
  for (const name of new Set(names)) {
    const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`, {
      headers: { "User-Agent": "the-99-check-tuning", Accept: "application/json" },
    });
    // Scryfall asks for 50–100ms between requests.
    await new Promise((r) => setTimeout(r, 100));
    if (!res.ok) continue;
    const card = (await res.json()) as ScryfallCard;
    if (!card.oracle_id) continue;
    out.set(name, {
      oracleId: card.oracle_id,
      colorIdentity: card.color_identity ?? [],
      commanderLegal: card.legalities?.commander === "legal",
      priceCents: null,
      printedInSelectedSets: true,
      owned: false,
    });
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  // The fixture predates limits (H35, PR 4a) and notes (H35, PR 4b); buildPrompt now reads both
  // unconditionally, so a legacy fixture with neither needs a neutral default rather than a crash.
  const loaded = JSON.parse(readFileSync(FIXTURE, "utf8")) as Omit<EvidencePack, "limits" | "notes"> & {
    limits?: EvidencePack["limits"];
    notes?: EvidencePack["notes"];
  };
  const pack: EvidencePack = {
    ...loaded,
    limits: loaded.limits ?? { capCents: null, sets: [], ownedOnly: false },
    notes: loaded.notes ?? null,
  };
  const { system, user } = buildPrompt(pack);

  if (dryRun) {
    console.log(`Prompt: ${system.length} + ${user.length} characters, ${pack.cards.length} card rows, `
      + `${pack.staples.length} staples, ${pack.play.summary.count} games. No call made.`);
    return;
  }

  requireEnv(["ANTHROPIC_API_KEY"]);
  const failures: string[] = [];
  const outcome = await callModel({
    model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
    schema: tuningResponseSchema, deadlineMs: MODEL_TIMEOUT_MS,
    effort: TUNING_EFFORT, retryFloorMs: TUNING_RETRY_FLOOR_MS,
  });

  // 1 · It parsed. `callModel` never throws; a failed parse is `malformed`.
  if (!outcome.ok) {
    console.error(`FAIL  1 · the reply did not come back as a parsed answer: ${outcome.errorClass}`);
    process.exit(1);
  }
  console.log(`Usage (${TUNING_MODEL}): ${outcome.usage.inputTokens} input, ${outcome.usage.outputTokens} output tokens.`);

  const names = outcome.value.suggestions.flatMap((s) => [s.add, s.cut]);
  const resolved = await resolveAll(names);
  const { kept, drops } = validateSuggestions({
    response: outcome.value, pack, resolveName: (name) => resolved.get(name) ?? null,
  });
  console.log(`${outcome.value.suggestions.length} suggested, ${kept.length} kept, dropped: `
    + (drops.map((d) => `#${d.position} ${d.rule}`).join(", ") || "none"));

  // 2 · Something survives.
  if (kept.length === 0) failures.push("2 · no suggestion survived validation");

  // 3 · A survivor cites the axis the fixture marks as hurting most.
  const worst = [...pack.play.summary.axes].sort((a, b) => b.hurt - a.hurt)[0];
  if (worst) {
    const label = axisLabel(worst.key).toLowerCase();
    const cites = kept.some((s) => s.evidence.some((e) => e.kind === "games" && e.value.toLowerCase().includes(label)));
    if (kept.length > 0 && !cites) failures.push(`3 · no survivor cites the axis marked hurting most (${axisLabel(worst.key)})`);
  }

  // 4 · Every PROPOSED add is a real card inside the colour identity.
  const identity = new Set(pack.colorIdentity);
  outcome.value.suggestions.forEach((s, i) => {
    const add = resolved.get(s.add);
    if (!add || !add.colorIdentity.every((c) => identity.has(c))) {
      failures.push(`4 · proposal ${i} adds ${s.add}, which is not a card inside ${pack.colorIdentity.join("")}`);
    }
  });

  // 5 · Every PROPOSED cut is a card the decklist holds.
  const inDeck = new Set(pack.cards.map((c) => c.name));
  outcome.value.suggestions.forEach((s, i) => {
    if (!inDeck.has(s.cut)) failures.push(`5 · proposal ${i} cuts ${s.cut}, which the decklist does not hold`);
  });

  if (failures.length > 0) {
    for (const f of failures) console.error(`FAIL  ${f}`);
    process.exit(1);
  }
  console.log("The tuning contract holds.");
}

main().then(() => process.exit(0), (error) => {
  console.error(error);
  process.exit(1);
});
