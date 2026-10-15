// /lab/scan — the card-scan lab (plumbing, `SCAN_LAB_ENABLED`, staging only). A camera page that runs
// the scanning spike's pipeline on the device: corners, warp, embedding, nearest card. Every ✓/✗ tap
// records the guess, whether it was right and how long it took, so the pipeline is measured on real
// phone photos (`docs/superpowers/research/2026-10-15-card-scan-feasibility.md`). No navigation links
// here; with the switch off the route does not exist.
//
// The models load from Hugging Face at pinned commits (both MIT) and the runtime from jsDelivr at a
// pinned version. The card index is built offline and is not in the repository: it is read from
// `SCAN_LAB_INDEX_BASE`, a URL holding `scan-index.json` and `scan-index.bin`.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { scanLabEnabled } from "../../../lib/scan-lab/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { ScanLab } from "../../../components/scan-lab/scan-lab";

export default async function ScanLabPage() {
  const userId = await requireUserId();
  if (!scanLabEnabled(await requestSwitchEnv(userId))) notFound();
  return <ScanLab indexBase={process.env.SCAN_LAB_INDEX_BASE ?? null} />;
}
