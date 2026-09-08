// The lane's sort list, in one place because the rack and the sheet both mount
// an order control and two literals would drift. `lane-params.ts` owns the keys
// and which of them is a lane's default; this pairs them with their labels.

import { commandersCopy, discoverCopy } from "../../../lib/copy/lanes";
import type { Lane, LaneOrder } from "../../../lib/commanders/lane-params";

export const ORDER_OPTIONS: Record<Lane, readonly { key: LaneOrder; label: string }[]> = {
  owned: [
    { key: "fit", label: commandersCopy.order.fit },
    { key: "name", label: commandersCopy.order.name },
    { key: "added", label: commandersCopy.order.added },
  ],
  discover: [
    { key: "popularity", label: discoverCopy.order.popularity },
    { key: "name", label: discoverCopy.order.name },
    { key: "recent", label: discoverCopy.order.recent },
  ],
};
