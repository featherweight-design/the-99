// Asks a model which of the four judgement themes (group hug, pillow fort, big mana, politics) each
// pre-filtered card serves. See scripts/lib/judged-labels-build.ts and docs/agents/judged-labels.md.
//
//   pnpm db:build:judged                     dry run, full candidate set: reads, prices, writes nothing
//   pnpm db:build:judged --sample            dry run of the ~200-card grading sample
//   pnpm db:build:judged --sample --spend    submits it (and collects a finished batch)
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
import { runJudgedBuild } from "./lib/judged-labels-build";
import { readModelCalls } from "./lib/model-calls-gate.mjs";

/** The whole programme's ceiling across every judged run; $15 covers the sample and the full run with a retry wave. */
const CAP_USD = boundedNumber("JUDGED_CAP_USD", process.env.JUDGED_CAP_USD, 15, 0, 65);

// The REAL endpoint: `.env` may point ANTHROPIC_BASE_URL at the local proxy, which has no batches route.
const client = new Anthropic({ baseURL: "https://api.anthropic.com", ...(dry ? { apiKey: "dry-run" } : {}) });

runJudgedBuild({
  client: client.messages.batches,
  runId: process.env.JUDGED_RUN_ID ?? `judged-${new Date().toISOString().slice(0, 10)}`,
  capUsd: CAP_USD,
  spend: !dry,
  sample: process.argv.includes("--sample"),
  modelCalls: () => readModelCalls(),
}).then(
  (code) => { process.exitCode = code; },
  (err) => { console.error(err); process.exit(1); },
);
