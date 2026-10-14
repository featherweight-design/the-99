"use client";
// Help me choose's loading screen, drawn by the route's own `choose/loading.tsx` on a navigation
// and by the shell's page-load fallback (`ShellLoading`) on a direct load or refresh. Neither is
// handed params, so this reads the address itself.
//
// On a results address it draws the handoff's 5c: the results header and *Finding commanders…*
// over five skeleton rows, which breathe like every loader's. The results bar is NOT drawn here, and neither is the order line's sub:
// both name the answers by labels that come from the database (theme labels are EDHREC tag names,
// and `a` is an id), so they arrive with the page, above a skeleton already standing, rather than
// as words this screen would invent. The form's address keeps the shell's screen.
import { useSearchParams } from "next/navigation";

import { LoadingScreen } from "../shell/loading-screen";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import { shellCopy } from "../../lib/copy/shell";
import { parseChooseParams, serializeChooseParams } from "../../lib/intake/params";
import { CHOOSE_PATH } from "../../lib/intake/submit";
import { ChooseHeader, RESULTS_COLUMN } from "./choose-header";
import { ResultsSkeleton } from "./choose-results";

// Its loading screens move like every other loader's (Hugh, 2026-10-12, superseding the STATES
// invariant that held Help me choose still): the crown pulses, the skeleton breathes.
export function ChooseLoading() {
  const p = parseChooseParams(new URLSearchParams(useSearchParams().toString()));
  if (!p.results) return <LoadingScreen copy={shellCopy.loading.deckNew} />;
  // The page's own way back: a change of answers carries neither the read nor its marks.
  const changeHref = `${CHOOSE_PATH}${serializeChooseParams({ ...p, notUsed: [], readId: null, deeper: [], results: false })}`;
  return (
    <div data-testid="choose-loading" className="flex flex-col">
      <ChooseHeader back={{ href: changeHref, label: copy.results.back }} title={copy.results.title} sub={copy.results.sub} subPhone={copy.results.subPhone} />
      <div className={RESULTS_COLUMN}>
        <ResultsSkeleton />
      </div>
    </div>
  );
}
