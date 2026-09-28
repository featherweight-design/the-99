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

generateCommanderProse({ complete })
  .then((r) => {
    console.log(
      `Wrote ${r.written} sentences; ${r.fresh} already current, ${r.restamped} re-stamped from the legacy hash, ` +
      `${r.suppressed} suppressed, ` +
      `${r.rejected} rejected by the contract, ${r.failed} failed to generate.`,
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
