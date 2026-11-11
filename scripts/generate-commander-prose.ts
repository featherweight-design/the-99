import "./lib/env.mjs";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { cards, commanderSupport } from "../src/db/schema";
import { generateCommanderProse } from "../src/lib/prose/generate";
import { buildProsePrompt } from "../src/lib/prose/prompt";
import { diagnoseRefusal } from "../src/lib/prose/diagnose-guard";
import { describeReply, NoTextReplyError, proseText, type ProseReply } from "../src/lib/prose/reply-shape";
import { isSuppressed } from "../src/lib/prose/suppressed";
import { costUsd, rates, type Usage } from "./eval/lib/pricing.mjs";
import { recordSystemSpend } from "./lib/system-spend";
import { requireAnthropic } from "./lib/anthropic-auth.mjs";
import { MAX_TOKENS, sendProse } from "./lib/prose-request";
import { assertModelCallsOn, readModelCalls } from "./lib/model-calls-gate.mjs";

// Sonnet 5.5 since 2026-10-30 (Hugh: the 5.5 model wherever one exists); it was Sonnet 4.6.
export const MODEL = "claude-sonnet-5-5";
const ATTEMPTS = 3;

/**
 * The spend stop (Hugh, 2026-09-28): every reply's `usage` is priced as it lands, and the run stops
 * cleanly, deferring the rest to the next build, once one more commander could cross
 * PROSE_MAX_USD (default $6). "Could" is its worst case: three attempts, each a prompt priced at
 * PROMPT_TOKEN_BOUND and a reply at max_tokens. Measured prompts average ~340 tokens, so the
 * bound leaves room for the retry prompt, which quotes the rejected sentence back.
 */
const PROMPT_TOKEN_BOUND = 1_000;
// `||`, not `??`: a workflow input cleared to "" is no cap given, not a cap of zero that stops the run before its first commander.
const maxUsd = Number(process.env.PROSE_MAX_USD || "6");
if (!(Number.isFinite(maxUsd) && maxUsd >= 0)) {
  console.error(`generate-commander-prose: PROSE_MAX_USD must be a dollar amount, not ${process.env.PROSE_MAX_USD}`);
  process.exit(1);
}
const r0 = rates(MODEL);
const worstCommanderUsd = ATTEMPTS * (PROMPT_TOKEN_BOUND * r0.input + MAX_TOKENS * r0.output) / 1_000_000;
let spentUsd = 0;
let calls = 0;

// The SDK authenticates: ANTHROPIC_API_KEY, or the `ant` profile when there is none (`requireAnthropic`, after the model-call gate below,
// so a paused run needs neither). One call is one bill, so no retry.
// Built on first use, so a paused run or a dry run constructs nothing.
let client: Anthropic | null = null;
const send = <T>(prompt: string) => sendProse<T>((client ??= new Anthropic({ baseURL: "https://api.anthropic.com" })), MODEL, prompt);

async function complete(prompt: string): Promise<string | null> {
  try {
    // A non-2xx reply throws an `APIError` carrying its status and body, which the catch below reports.
    const body = await send<{ content?: { type: string; text?: string }[]; usage?: Usage }>(prompt);
    calls += 1;
    // A reply with no usage is priced at its worst case rather than at nothing, so the stop holds.
    spentUsd += body.usage ? costUsd(MODEL, body.usage, { batch: false }) : worstCommanderUsd / ATTEMPTS;
    return proseText(body);
  } catch (err) {
    // Not a failed call to retry: see `NoTextReplyError`. It reaches the run's catch, which records the spend and exits 1.
    if (err instanceof NoTextReplyError) throw err;
    console.error(`generate-commander-prose: request failed — ${String(err)}`);
    return null;
  }
}

// `--dry-run` counts what a run would generate and calls nothing. `--max-commanders N` (or
// PROSE_MAX_COMMANDERS) is the run's spend ceiling: at most N commanders are asked for a
// sentence, the rest wait for the next run. Each commander costs up to three calls.
const dryRun = process.argv.includes("--dry-run");
// `--null-only` (or PROSE_NULL_ONLY=true): fill the commanders that have no sentence and leave a stale one as it is.
const nullOnly = process.argv.includes("--null-only") || process.env.PROSE_NULL_ONLY === "true";
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

/**
 * `--diagnose "<commander name>"` (2026-11-09): ONE call for that commander, nothing written to commander_support, and the reply
 * described without the key or any header: the status, the content block types, `stop_reason`, the usage and its price, and
 * the sentence if there is one. It exists because the 2026-11-03 run's 1,017 calls were priced and none carried a text block.
 * Bounded by PROSE_MAX_USD like a run, against the worst case of a single call.
 */
const diagIdx = process.argv.indexOf("--diagnose");
// A function, not top-level statements: tsx loads this file as CJS, which has no top-level await, and the first version of
// this block took the whole script down (2026-11-09, run 42584822354) even for a run without the flag.
async function diagnose(): Promise<never> {
  const name = process.argv[diagIdx + 1];
  const oneCallUsd = worstCommanderUsd / ATTEMPTS;
  const early = diagnoseRefusal({ name, dryRun, oneCallUsd, maxUsd, matches: 1, suppressed: false });
  if (early && !early.includes("commanders are named") && !early.includes("suppressed")) {
    console.error(`generate-commander-prose: --diagnose ${early}.`);
    process.exit(1);
  }
  await assertModelCallsOn();
  requireAnthropic("generate-commander-prose");
  const rows = await db.select({ oracleId: cards.oracleId, name: cards.name, tags: commanderSupport.tags })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .where(eq(cards.name, name!));
  const refusal = diagnoseRefusal({ name, dryRun, oneCallUsd, maxUsd, matches: rows.length, suppressed: rows.length === 1 && isSuppressed(rows[0].oracleId) });
  if (refusal) {
    console.error(`generate-commander-prose: --diagnose ${refusal}.`);
    process.exit(1);
  }
  let status: number;
  let body: ProseReply & { usage?: Usage };
  try {
    const sent = await send<ProseReply & { usage?: Usage }>(buildProsePrompt(rows[0].name, rows[0].tags)).withResponse();
    status = sent.response.status;
    body = sent.data;
    if (body === null || typeof body !== "object") throw new Error("the reply body was not an object");
  } catch (err) {
    // A non-2xx reply was not billed: say so and stop, recording nothing (as the raw fetch did).
    if (err instanceof Anthropic.APIError && err.status !== undefined && err.status >= 400) {
      console.error(`generate-commander-prose: diagnose got HTTP ${err.status}: ${err.message}`);
      process.exit(1);
    }
    // A reply that was billed but could not be read still counts against the cap, at its worst case.
    console.error(`generate-commander-prose: diagnose could not read the reply — ${String(err)}`);
    await recordSystemSpend({ feature: "prose", model: MODEL, usd: oneCallUsd });
    process.exit(1);
  }
  const shape = describeReply(body);
  const usd = body.usage ? costUsd(MODEL, body.usage, { batch: false }) : worstCommanderUsd / ATTEMPTS;
  console.log(`Diagnose "${name}": HTTP ${status}, model ${shape.model}, stop_reason ${shape.stopReason}, ` +
    `blocks [${shape.blockTypes.join(", ")}], text ${shape.textChars} chars, ` +
    `usage in ${shape.inputTokens} / out ${shape.outputTokens}, max_tokens ${MAX_TOKENS}, cost $${usd.toFixed(4)} of the $${maxUsd.toFixed(2)} cap.`);
  console.log(`Reply text: ${body.content?.find((b) => b.type === "text")?.text ?? "(none)"}`);
  await recordSystemSpend({ feature: "prose", model: MODEL, usd });
  process.exit(0);
}

if (diagIdx >= 0) {
  diagnose().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  // The app-wide model-call switch, before the key is required and before any call
  // (`model-calls-gate.mjs`): off exits 0, unconfirmed exits non-zero. A dry run calls nothing, so it
  // still counts while the switch is off.
  (dryRun ? Promise.resolve() : assertModelCallsOn())
    .then(() => {
      requireAnthropic("generate-commander-prose");
      if (!dryRun) watchSwitch();
      return generateCommanderProse({
        complete, dryRun, nullOnly, maxCommanders, attempts: ATTEMPTS,
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
        (nullOnly ? `${r.stale} stale left as they are, ` : "") +
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
}
