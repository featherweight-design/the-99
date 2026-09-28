import "./lib/env.mjs";
import { generateCommanderProse } from "../src/lib/prose/generate";

const MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("generate-commander-prose: ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

async function complete(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error(`generate-commander-prose: ${res.status} ${await res.text()}`);
      return null;
    }
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = body.content?.find((b) => b.type === "text")?.text;
    return text ?? null;
  } catch (err) {
    console.error(`generate-commander-prose: request failed — ${String(err)}`);
    return null;
  }
}

// `--dry-run` counts what a run would generate and calls nothing. `--max-commanders N` (or
// PROSE_MAX_COMMANDERS) is the run's spend ceiling: at most N commanders are asked for a
// sentence, the rest wait for the next run. Each commander costs up to three calls.
const dryRun = process.argv.includes("--dry-run");
const capArg = process.argv.indexOf("--max-commanders");
const capText = capArg >= 0 ? process.argv[capArg + 1] : process.env.PROSE_MAX_COMMANDERS;
const maxCommanders = capText ? Number(capText) : undefined;
if (maxCommanders !== undefined && !(Number.isInteger(maxCommanders) && maxCommanders >= 0)) {
  console.error(`generate-commander-prose: --max-commanders must be a whole number, not ${capText}`);
  process.exit(1);
}

generateCommanderProse({ complete, dryRun, maxCommanders })
  .then((r) => {
    if (dryRun) {
      console.log(`Dry run: ${r.deferred} commanders need a sentence (${r.fresh} already current, ` +
        `${r.restamped} would be re-stamped, ${r.suppressed} suppressed); at most ${r.deferred * 3} calls. Nothing was called.`);
      return;
    }
    console.log(
      `Wrote ${r.written} sentences; ${r.fresh} already current, ${r.restamped} re-stamped from the legacy hash, ` +
      `${r.suppressed} suppressed, ` +
      `${r.rejected} rejected by the contract, ${r.failed} failed to generate` +
      (r.deferred > 0 ? `, ${r.deferred} deferred by the --max-commanders ${maxCommanders} cap.` : "."),
    );
    // Per attempt, not per commander, and broken out by rule. The run that prompted this
    // rejected nearly everything it generated, and working out which of the four rules did
    // it meant counting characters by hand off a wall of warnings.
    const byRule = Object.entries(r.rejectedBy)
      .map(([reason, n]) => `${reason} ${n}`)
      .join(", ");
    console.log(`Rejected attempts by rule: ${byRule}.`);
    // A run where the model was reachable for nobody is a broken run wearing a green tick.
    if (r.written === 0 && r.failed > 0) {
      console.error("Every generation failed — the model was unreachable.");
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
