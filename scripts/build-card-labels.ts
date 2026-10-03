// Labels every Commander-legal card's jobs and their LIMITS, once, with a model.
//
// The one-time backfill is ~32,000 cards; afterwards the weekly refresh labels only what the
// input hash says has moved, which is a new set and nothing else. Hugh approved this run at
// about $41 on Sonnet 4.5 with a HARD STOP at $55.
//
// Three properties carry the money, and each one exists because something already went wrong:
//
//   THE CAP binds on the worst case plus what the run's BUDGET FAMILY already spent, never on the
//   estimate. See `withinCap` and `familySpend`.
//
//   RESUME is against INTENTS, not batch ids, and an intent's key is its CONTENT, so any run id
//   can collect a batch another run paid for.
//
//   THE FLOOR is judged PER BATCH, in the transaction that publishes it, so a run stopped at its
//   cap has already published everything it collected.
//
// The build itself is `scripts/lib/card-labels-build.ts`, so `probe:card-labels-waves` can run
// it against a real Postgres with a fake provider. This file is the configuration and the one
// place the REAL Anthropic client is made.
//
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL", "ANTHROPIC_API_KEY"]);
import Anthropic from "@anthropic-ai/sdk";

import { boundedNumber } from "../src/lib/labels/plan";
import { parseScope } from "../src/lib/labels/scope";
import { runLabelBuild } from "./lib/card-labels-build";

/**
 * The cap, and the pause. Hugh's ruling: hard stop $55, and PAUSE AND REPORT if the
 * projection passes $50 rather than spending up to the stop silently.
 *
 * Both are bounded ABOVE as well as below: a fat-fingered `LABEL_CAP_USD=5500` is a plausible
 * typo and would authorise a hundred times the approved spend. The cap binds a BUDGET FAMILY
 * (`budgetFamily`): every backfill dispatch shares one, and the weekly cron another.
 */
const CAP_USD = boundedNumber("LABEL_CAP_USD", process.env.LABEL_CAP_USD, 55, 0, 100);
const REPORT_AT_USD = boundedNumber("LABEL_REPORT_AT_USD", process.env.LABEL_REPORT_AT_USD, 50, 0, 100);

/** 95% of the cards a batch asked about, per the plan. Below it the batch is held, unpublished. */
const FLOOR = boundedNumber("LABEL_FLOOR", process.env.LABEL_FLOOR, 0.95, 0, 1);

/**
 * The highest report line `card-labels.yml` will accept from a dispatch — Hugh's $65 (2026-10-03).
 *
 * Here so the PAUSE can tell the operator whether a dispatch can actually resume the run, which
 * is the one thing its previous two wordings both got wrong. It is a SECOND COPY of a figure the
 * workflow enforces, so `card-labels-workflow.test.mts` asserts the two agree; a remediation that
 * names a ceiling the form does not have is exactly the defect this replaced.
 */
const DISPATCH_REPORT_CEILING_USD = 65;

/**
 * The REAL Anthropic endpoint, overridden explicitly.
 *
 * `.env` points `ANTHROPIC_BASE_URL` at this repository's local messages proxy, which does not
 * expose `/v1/messages/batches` — so a default client sends `batches.create` to the proxy and the
 * run fails before submitting anything. A dry run never reaches the call, so nothing short of a
 * real run would show it.
 */
const client = new Anthropic({ baseURL: "https://api.anthropic.com" });

runLabelBuild({
  client: client.messages.batches,
  runId: process.env.LABEL_RUN_ID ?? `run-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  capUsd: CAP_USD,
  reportAtUsd: REPORT_AT_USD,
  floor: FLOOR,
  dispatchCeilingUsd: DISPATCH_REPORT_CEILING_USD,
  dryRun: process.argv.includes("--dry-run"),
  /** Which cards this run covers (`src/lib/labels/scope.ts`). Unset is `all`, every build's behaviour so far. */
  scope: parseScope(process.env.LABEL_SCOPE),
}).then(
  (code) => { process.exitCode = code; },
  (err) => { console.error(err); process.exit(1); },
);
