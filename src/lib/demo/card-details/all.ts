// Every card-details chunk as committed, read at once: for the exporter's merge and the committed files' test, never the demo,
// which fetches a step's chunk on a press (`card-details.ts`). Keyed by `DemoCardChunk`, so a chunk added there fails to
// compile here until its file is listed.

import type { DemoCardChunk } from "../project-cards";
import { cardDetailsJson as binder } from "./binder.generated";
import { cardDetailsJson as over } from "./over.generated";
import { cardDetailsJson as played } from "./played.generated";
import { cardDetailsJson as shared } from "./shared.generated";
import { cardDetailsJson as under } from "./under.generated";

export const committedCardChunks: Record<DemoCardChunk, unknown> = { binder, played, over, under, shared };
