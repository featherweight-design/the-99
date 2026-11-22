// Asks a model which of the four judgement themes (group hug, pillow fort, big mana, politics) each
// pre-filtered card serves. See scripts/lib/judged-labels-build.ts and docs/agents/judged-labels.md.
//
//   Every run needs --branch=<br-id>: the database reached must report that Neon branch (require-branch.mjs).
//   pnpm db:build:judged --branch=<id>       dry run, full candidate set: reads, prices, writes nothing
//   pnpm db:build:judged --sample            dry run of the ~200-card grading sample
//   pnpm db:build:judged --sample --spend    submits it (and collects a finished batch)
//   --sample --fresh                         a new sample: only cards with no judged_labels row, so it cannot overlap the last
//   --deep=<theme>:<n>,...                   with --sample: draw n cards for a rare theme instead of 40
//   --retry-failed                           asks again the cards whose request failed (otherwise they are left out)
//   --model=<id>                             overrides the model (Hugh ruled claude-sonnet-5-5 for the judged themes, 2026-11-21)
//
// NOTHING IS SUBMITTED WITHOUT `--spend`, and Hugh approves the spend before anyone passes it.
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireAnthropic } from "./lib/anthropic-auth.mjs";
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
const dry = !process.argv.includes("--spend");
if (!dry) requireAnthropic("build-judged-labels");
import Anthropic from "@anthropic-ai/sdk";

import { boundedNumber } from "../src/lib/labels/plan";
import { JUDGED_THEMES, type JudgedTheme } from "../src/lib/labels/judged";
import { runJudgedBuild } from "./lib/judged-labels-build";
import { readModelCalls } from "./lib/model-calls-gate.mjs";
import { requireBranch } from "./lib/require-branch.mjs";

/** The whole programme's ceiling across every judged run. $20 is the hard cap Hugh approved (2026-11-21): the env var may lower it, never raise it. */
const CAP_USD = boundedNumber("JUDGED_CAP_USD", process.env.JUDGED_CAP_USD, 20, 0, 20);

/** `--deep=pillowFort:160,bigMana:240`: more cards drawn for the named themes in a sample. */
function parseDeep(arg: string | undefined): Partial<Record<JudgedTheme, number>> {
  const out: Partial<Record<JudgedTheme, number>> = {};
  for (const part of (arg ?? "").split(",").filter(Boolean)) {
    const [theme, n] = part.split(":");
    if (!(JUDGED_THEMES as readonly string[]).includes(theme) || !(Number(n) >= 0)) throw new Error(`--deep: bad entry "${part}"`);
    out[theme as JudgedTheme] = Number(n);
  }
  return out;
}

// The REAL endpoint: `.env` may point ANTHROPIC_BASE_URL at the local proxy, which has no batches route.
const client = new Anthropic({ baseURL: "https://api.anthropic.com", ...(dry ? { apiKey: "dry-run" } : {}) });

// --branch=<br-id> is required and must be the branch DATABASE_URL really reaches (a worktree .env overrides an exported URL).
requireBranch(process.env.DATABASE_URL, "build-judged-labels").then(() => runJudgedBuild({
  client: client.messages.batches,
  runId: process.env.JUDGED_RUN_ID ?? `judged-${new Date().toISOString().slice(0, 10)}`,
  capUsd: CAP_USD,
  spend: !dry,
  model: process.argv.find((a) => a.startsWith("--model="))?.slice(8),
  retryFailed: process.argv.includes("--retry-failed"),
  fresh: process.argv.includes("--fresh"),
  deep: parseDeep(process.argv.find((a) => a.startsWith("--deep="))?.slice(7)),
  sample: process.argv.includes("--sample"),
  modelCalls: () => readModelCalls(),
})).then(
  (code) => { process.exitCode = code; },
  (err) => { console.error(err); process.exit(1); },
);
