import "./lib/env.mjs";
import { generateCommanderProse } from "../src/lib/prose/generate";
import { costUsd, rates, type Usage } from "./eval/lib/pricing.mjs";
import { recordSystemSpend } from "./lib/system-spend";
import { assertModelCallsOn, readModelCalls } from "./lib/model-calls-gate.mjs";

// Sonnet 5.5 since 2026-10-30 (Hugh: the 5.5 model wherever one exists); it was Sonnet 4.6.
export const MODEL = "claude-sonnet-5-5";
const API_URL = "https://api.anthropic.com/v1/messages";

const MAX_TOKENS = 200;
const ATTEMPTS = 3;

/**
 * The spend stop (Hugh, 2026-09-28): every reply's `usage` is priced as it lands, and the run stops
 * cleanly, deferring the rest to the next build, once one more commander could cross
 * PROSE_MAX_USD (default $6). "Could" is its worst case: three attempts, each a prompt priced at
 * PROMPT_TOKEN_BOUND and a reply at max_tokens. Measured prompts average ~340 tokens, so the
 * bound leaves room for the retry prompt, which quotes the rejected sentence back.
 */
const PROMPT_TOKEN_BOUND = 1_000;
const maxUsd = Number(process.env.PROSE_MAX_USD ?? "6");
if (!(Number.isFinite(maxUsd) && maxUsd >= 0)) {
  console.error(`generate-commander-prose: PROSE_MAX_USD must be a dollar amount, not ${process.env.PROSE_MAX_USD}`);
  process.exit(1);
}
const r0 = rates(MODEL);
const worstCommanderUsd = ATTEMPTS * (PROMPT_TOKEN_BOUND * r0.input + MAX_TOKENS * r0.output) / 1_000_000;
let spentUsd = 0;
let calls = 0;

// Required after the model-call gate below, so a paused run needs no key.
const apiKey = process.env.ANTHROPIC_API_KEY;

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
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error(`generate-commander-prose: ${res.status} ${await res.text()}`);
      return null;
    }
    const body = (await res.json()) as { content?: { type: string; text?: string }[]; usage?: Usage };
    calls += 1;
    // A reply with no usage is priced at its worst case rather than at nothing, so the stop holds.
    spentUsd += body.usage ? costUsd(MODEL, body.usage, { batch: false }) : worstCommanderUsd / ATTEMPTS;
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
// The flag without a value would read as no cap at all, silently. A spend ceiling asked for and
// not given is refused rather than dropped.
if (capArg >= 0 && (!capText || capText.startsWith("--"))) {
  console.error("generate-commander-prose: --max-commanders needs a whole number after it");
  process.exit(1);
}
const maxCommanders = capText ? Number(capText) : undefined;
if (maxCommanders !== undefined && !(Number.isInteger(maxCommanders) && maxCommanders >= 0)) {
  console.error(`generate-commander-prose: --max-commanders must be a whole number, not ${capText}`);
  process.exit(1);
}

// Billed calls are recorded once, on the success path or when a later step throws, never twice.
let spendRecorded = false;
async function recordSpend() {
  if (dryRun || calls === 0 || spendRecorded) return;
  spendRecorded = true;
  await recordSystemSpend({ feature: "prose", model: MODEL, usd: spentUsd });
}

/**
 * The model-call switch, RE-READ while the run goes: a run can take hours, and the read before it
 * starts must not authorize every call after. Polled every minute (health holds its answer 30s), and
 * once it reads anything but on, `shouldStop` stops before the next commander, as the spend cap does.
 */
const SWITCH_POLL_MS = 60_000;
let halted: { state: "off" | "unconfirmed"; line: string } | null = null;
let poll: ReturnType<typeof setInterval> | undefined;
function watchSwitch() {
  poll = setInterval(() => {
    void readModelCalls().then((v) => {
      if (v.state !== "on" && halted === null) halted = v;
    });
  }, SWITCH_POLL_MS);
  poll.unref();
}

// The app-wide model-call switch, before the key is required and before any call
// (`model-calls-gate.mjs`): off exits 0, unconfirmed exits non-zero. A dry run calls nothing, so it
// still counts while the switch is off.
(dryRun ? Promise.resolve() : assertModelCallsOn())
  .then(() => {
    if (!apiKey) {
      console.error("generate-commander-prose: ANTHROPIC_API_KEY is not set.");
      process.exit(1);
    }
    if (!dryRun) watchSwitch();
    return generateCommanderProse({
      complete, dryRun, maxCommanders, attempts: ATTEMPTS,
      shouldStop: () => halted !== null || spentUsd + worstCommanderUsd > maxUsd,
    });
  })
  .then(async (r) => {
    clearInterval(poll);
    if (dryRun) {
      console.log(`Dry run: ${r.deferred} commanders need a sentence (${r.fresh} already current, ` +
        `${r.restamped} would be re-stamped, ${r.suppressed} suppressed); at most ${r.deferred * 3} calls. Nothing was called.`);
      return;
    }
    console.log(
      `Wrote ${r.written} sentences; ${r.fresh} already current, ${r.restamped} re-stamped from the legacy hash, ` +
      `${r.suppressed} suppressed, ` +
      `${r.rejected} rejected by the contract, ${r.failed} failed to generate` +
      (r.deferred > 0 ? `, ${r.deferred} deferred to the next run by a cap.` : "."),
    );
    const asked = r.written + r.rejected + r.failed;
    console.log(`Spent $${spentUsd.toFixed(2)} of the $${maxUsd.toFixed(2)} cap, measured from each reply's usage: ` +
      `${calls} calls for ${asked} commanders (${asked > 0 ? (calls / asked).toFixed(2) : "0"} per commander).`);
    await recordSpend();
    // Per attempt, not per commander, and broken out by rule. The run that prompted this
    // rejected nearly everything it generated, and working out which of the four rules did
    // it meant counting characters by hand off a wall of warnings.
    const byRule = Object.entries(r.rejectedBy)
      .map(([reason, n]) => `${reason} ${n}`)
      .join(", ");
    console.log(`Rejected attempts by rule: ${byRule}.`);
    // Stopped mid-run by the switch: what was written stays; off is a pause, unconfirmed a failure to look at.
    const stoppedBy = halted as { state: "off" | "unconfirmed"; line: string } | null;
    if (stoppedBy) {
      if (stoppedBy.state === "off") console.log(`Stopped early: ${stoppedBy.line}`);
      else {
        console.error(`Stopped early: ${stoppedBy.line}`);
        process.exit(1);
      }
      return;
    }
    // A run where the model was reachable for nobody is a broken run wearing a green tick.
    if (r.written === 0 && r.failed > 0) {
      console.error("Every generation failed — the model was unreachable.");
      process.exit(1);
    }
  })
  .catch(async (err) => {
    clearInterval(poll);
    console.error(err);
    await recordSpend();
    process.exit(1);
  });
