// /lab/scan — the card-scan lab (plumbing, `SCAN_LAB_ENABLED`, staging only). A camera page that runs
// the scanning spike's pipeline on the device: corners, warp, embedding, nearest card. Every ✓/✗ tap
// records the guess, whether it was right and how long it took, so the pipeline is measured on real
// phone photos (`docs/superpowers/research/2026-10-15-card-scan-feasibility.md`). No navigation links
// here; with the switch off the route does not exist.
//
// The models load from Hugging Face at pinned commits (both MIT) and the runtime from jsDelivr at a
// pinned version. The card index is built offline and is not in the repository: it is read from
// `SCAN_LAB_INDEX_BASE`, a URL holding `scan-index.json` and `scan-index.bin`.
//
// With collection edit on for the reader (card scanning ends in its add), the lab also offers "Match on the server": the embedding goes to
// `POST /api/card-scan/match` once per steady card in place of the index on the device (card-scan plan PR 2), so the
// server path is tried in a real browser before the viewfinder exists.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { scanLabEnabled } from "../../../lib/scan-lab/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { collectionEditEnabled } from "../../../lib/collection/edit-flag";
import { SCAN_MODEL } from "../../../lib/card-scan/match";
import { ScanLab } from "../../../components/scan-lab/scan-lab";

export default async function ScanLabPage() {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!scanLabEnabled(env)) notFound();
  return <ScanLab indexBase={process.env.SCAN_LAB_INDEX_BASE ?? null} serverModel={collectionEditEnabled(env) ? SCAN_MODEL : null} />;
}
