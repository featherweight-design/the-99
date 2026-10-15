"use server";

// The card-scan lab's "What card was it?" step, after a ✗ tap: the name search it picks from and
// the write that saves the pick. Both re-check the session and `SCAN_LAB_ENABLED` for the reader.

import { requireUserId } from "../../../lib/auth";
import { searchCollectionCatalog } from "../../../lib/collection/catalog-read";
import { labelResult } from "../../../lib/scan-lab/label";
import { scanLabEnabled } from "../../../lib/scan-lab/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { isUuid } from "../../../lib/uuid";

export type ScanLabCardHit = { oracleId: string; name: string; flavorName: string | null; imageUri: string | null };

async function labReader(): Promise<string | null> {
  const userId = await requireUserId();
  return scanLabEnabled(await requestSwitchEnv(userId)) ? userId : null;
}

/** Every game card whose name (or Secret Lair name) matches, with its art. */
export async function searchScanLabCards(query: unknown): Promise<ScanLabCardHit[]> {
  const userId = await labReader();
  if (!userId || typeof query !== "string" || query.length > 100) return [];
  const hits = await searchCollectionCatalog(userId, query);
  return hits.map(({ oracleId, name, flavorName, imageUri }) => ({ oracleId, name, flavorName, imageUri }));
}

/** Saves the card a ✗ tap really showed onto that tap's row. */
export async function labelScanLabResult(resultId: unknown, oracleId: unknown): Promise<boolean> {
  const userId = await labReader();
  if (!userId || !isUuid(resultId) || !isUuid(oracleId)) return false;
  return labelResult(userId, resultId as string, oracleId as string);
}
