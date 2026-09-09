// The lane's sort list, in one place because the rack and the sheet both mount
// an order control and two literals would drift. `lane-params.ts` owns the keys
// and which of them is a lane's default; this pairs them with their labels.

import { commandersCopy, discoverCopy } from "../../../lib/copy/lanes";
import type { Lane, LaneOrder } from "../../../lib/commanders/lane-params";

export const ORDER_OPTIONS: Record<
  Lane,
  readonly { key: LaneOrder; label: string; gloss?: string }[]
> = {
  owned: [
    { key: "fit", label: commandersCopy.order.fit },
    { key: "name", label: commandersCopy.order.name },
  ],
  // The two rankings lead, and in that order: they decide which commanders the
  // list holds, and the other three only arrange what they left.
  discover: [
    {
      key: "bestfit",
      label: discoverCopy.order.bestFit,
      gloss: discoverCopy.order.bestFitGloss,
    },
    {
      key: "new",
      label: discoverCopy.order.somethingNew,
      gloss: discoverCopy.order.somethingNewGloss,
    },
    {
      key: "popularity",
      label: discoverCopy.order.popularity,
      gloss: discoverCopy.order.popularityGloss,
    },
    { key: "name", label: discoverCopy.order.name, gloss: discoverCopy.order.nameGloss },
    {
      key: "recent",
      label: discoverCopy.order.recent,
      gloss: discoverCopy.order.recentGloss,
    },
  ],
};
