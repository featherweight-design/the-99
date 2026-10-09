// Dollars by origin and feature from `model_calls`, over a window. READ-ONLY.
//
//   pnpm tsx scripts/report-model-spend.mts [--days N | --month]
//
// Default window: the current UTC month. Point DATABASE_URL at staging to measure real use.
import "./lib/env.mjs";
import { gte } from "drizzle-orm";
import { db } from "../src/db";
import { modelCalls } from "../src/db/schema";
import { formatSpend, groupSpend } from "./lib/model-spend";

const i = process.argv.indexOf("--days");
const now = new Date();
let since: Date;
if (i >= 0) {
  const days = Number(process.argv[i + 1]);
  if (!(Number.isInteger(days) && days > 0)) {
    console.error("report-model-spend: --days needs a positive whole number");
    process.exit(1);
  }
  since = new Date(now.getTime() - days * 86_400_000);
} else {
  since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const rows = await db
  .select({ origin: modelCalls.origin, feature: modelCalls.feature, status: modelCalls.status, costMicroUsd: modelCalls.costMicroUsd })
  .from(modelCalls)
  .where(gte(modelCalls.createdAt, since));
console.log(`model_calls since ${since.toISOString()}\n`);
console.log(formatSpend(groupSpend(rows)));
process.exit(0);
