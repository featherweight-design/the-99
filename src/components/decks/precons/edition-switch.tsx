"use client";

// The open precon's edition switch: Regular or Collector's Edition, drawn only for a precon whose set
// printed both. The app's segmented switch in its compact size (the /decks `Tiles · Stats` switch's own
// segments), as a radiogroup: one tab stop, the arrows move the choice.

import { preconsCopy } from "../../../lib/copy/precons";
import { SegmentedSwitch } from "../../ui/segmented-switch";
import type { PreconEdition } from "../../../lib/precons/edition";

const copy = preconsCopy.open.edition;
const IDS = { tab: (e: PreconEdition) => `precon-edition-${e}` };

export function EditionSwitch({ edition, onEdition }: { edition: PreconEdition; onEdition: (e: PreconEdition) => void }) {
  return (
    <SegmentedSwitch
      kind="radio"
      size="compact"
      ariaLabel={copy.aria}
      value={edition}
      onChange={onEdition}
      ids={IDS}
      segments={[
        { value: "regular", label: copy.regular },
        { value: "collector", label: copy.collector },
      ]}
    />
  );
}
