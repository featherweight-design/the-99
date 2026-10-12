"use client";

// The suggestion line (R3 addendum, STATES K1, K1d, K2, K15): an unlinked deck that shares a
// precon's list under the shared rule is told so, in the arrival strip's band (audit finding 5),
// between the deck header and its tabs. A count of cards and never a verdict. `Link it` opens the
// confirm (K3); ✕ hides it for this deck and precon in this browser (G-R3-2), and writes nothing.

import { useState } from "react";
import { preconMonth, preconsCopy } from "../../../lib/copy/precons";
import { suggestionDismissKey, type PreconMatch } from "../../../lib/precons/link";
import { ArrivalBandShell } from "../arrival-strip";
import { useLocalFlag } from "../use-local-flag";
import { ConfirmLinkDialog } from "./precon-link-dialogs";

const copy = preconsCopy.link.suggestion;

const LINK =
  "inline-flex h-[44px] flex-none cursor-pointer items-center justify-center rounded-[8px] border border-solid "
  + "border-[color:var(--accent)] bg-transparent px-[14px] font-sans text-[13.5px] font-semibold text-[color:var(--accent)] md:h-[36px]";
const CLOSE =
  "flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 "
  + "text-[13px] text-[color:var(--fg-muted)] md:hover:text-[color:var(--accent)]";

export function PreconSuggestion({ deckId, deckName, suggestions }: {
  deckId: string;
  deckName: string;
  /** At most two, same commanders first (`pickSuggestions`). */
  suggestions: PreconMatch[];
}) {
  // One flag per precon, so a different precon crossing the rule later can still suggest. Two hooks
  // always: the strip names at most two.
  const [firstGone, dismissFirst] = useLocalFlag(suggestionDismissKey(deckId, suggestions[0]?.fileName ?? ""));
  const [secondGone, dismissSecond] = useLocalFlag(suggestionDismissKey(deckId, suggestions[1]?.fileName ?? ""));
  const [confirming, setConfirming] = useState<PreconMatch | null>(null);
  const shown = suggestions.filter((_, i) => !(i === 0 ? firstGone : secondGone)).slice(0, 2);
  if (shown.length === 0 && confirming === null) return null;

  // ✕ dismisses every precon the strip names (K15).
  const dismiss = () => {
    if (suggestions[0]) dismissFirst();
    if (suggestions[1]) dismissSecond();
  };
  const dialog = confirming && (
    <ConfirmLinkDialog deckId={deckId} deckName={deckName} match={confirming} onDismiss={() => setConfirming(null)} />
  );

  if (shown.length === 1) {
    const m = shown[0];
    return (
      <>
        <ArrivalBandShell align="start">
          <div className="flex min-w-0 flex-1 flex-col gap-[8px] md:flex-row md:items-center md:gap-[14px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
              <p className="m-0 text-[13.5px] leading-[1.45] text-[color:var(--fg)]">
                {m.sameCommanders ? copy.lead(m.name) : copy.leadOtherCommander(m.name)}
              </p>
              <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
                {m.sameCommanders ? copy.metaSame(m.shared, m.of) : copy.metaOther(m.shared, m.of, m.commanders.join(" + "))}
              </p>
            </div>
            <button type="button" onClick={() => setConfirming(m)} className={`${LINK} self-start md:self-auto`}>{copy.link}</button>
          </div>
          <button type="button" onClick={dismiss} aria-label={copy.dismissAria(m.name)} className={CLOSE}>✕</button>
        </ArrivalBandShell>
        {dialog}
      </>
    );
  }

  if (shown.length === 0) return dialog;
  return (
    <>
      <ArrivalBandShell align="start">
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <div className="flex flex-col gap-[3px]">
            <p className="m-0 text-[13.5px] leading-[1.45] text-[color:var(--fg)]">{copy.leadTwo}</p>
            <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.metaTwo}</p>
          </div>
          {shown.map((m) => (
            <div key={m.fileName} className="flex items-center gap-[12px] border-x-0 border-b-0 border-t-[1px] border-solid border-t-[color:var(--border)] pt-[8px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="font-display text-[15px] text-[color:var(--fg)]">{m.name}</span>
                <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-muted)]">
                  {copy.rowMeta(m.setCode, preconMonth(m.releaseDate), m.sameCommanders ? copy.sameClause : copy.ledBy(m.commanders.join(" + ")), m.shared, m.of)}
                </span>
              </div>
              <button type="button" onClick={() => setConfirming(m)} aria-label={copy.linkOneAria(m.name)} className={LINK}>{copy.linkOne}</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={dismiss} aria-label={copy.dismissAriaTwo(shown[0].name, shown[1].name)} className={CLOSE}>✕</button>
      </ArrivalBandShell>
      {dialog}
    </>
  );
}
