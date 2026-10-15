"use client";

// After a ✗ tap, the lab asks which card it really was. Optional: Skip is one tap, and the camera
// keeps running underneath, so a miss never holds up the next shot. One pick saves the card's
// oracle id onto that tap's row (`labelScanLabResult`).

import { useEffect, useRef, useState } from "react";
import { labelScanLabResult, searchScanLabCards, type ScanLabCardHit } from "../../app/lab/scan/actions";
import { scanLabCopy as copy } from "../../lib/copy/scan-lab";
import { ArtLayer } from "../ui/art-layer";
import { SearchField } from "../ui/text-field";

const SEARCH_DEBOUNCE_MS = 150;

export function TrueCardStep({ resultId, onDone }: { resultId: string; onDone: (note: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScanLabCardHit[]>([]);
  const [searched, setSearched] = useState("");
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const ticket = useRef(0);
  // A save that lands after a newer tap closed this step reports nothing: the row is saved, and the
  // step on screen (if any) belongs to another miss.
  const alive = useRef(true);
  // Set in the setup too: Strict Mode runs setup, cleanup, setup, and a cleanup-only ref would stay false.
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const trimmed = query.trim();

  // The debounced search. A ticket drops an answer that a newer keystroke has outdated.
  useEffect(() => {
    const mine = ++ticket.current;
    if (trimmed === "") return;
    const t = setTimeout(() => {
      searchScanLabCards(trimmed)
        .then((r) => {
          if (mine !== ticket.current) return;
          setResults(r);
          setSearched(trimmed);
          setFailed(false);
        })
        .catch(() => {
          if (mine !== ticket.current) return;
          setResults([]);
          setSearched(trimmed);
          setFailed(true);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed]);

  const pick = async (hit: ScanLabCardHit) => {
    setSaving(true);
    setSaveFailed(false);
    const ok = await labelScanLabResult(resultId, hit.oracleId).catch(() => false);
    if (!alive.current) return;
    setSaving(false);
    if (ok) onDone(copy.labelled(hit.name));
    else setSaveFailed(true);
  };

  const pending = trimmed !== "" && trimmed !== searched;
  // Only the answer to what is typed now: an older query's list is never tappable, or a pick could
  // save a card the player has already typed past.
  const shown = trimmed === "" || pending ? [] : results;

  return (
    <section aria-label={copy.whatCard} className="flex flex-col gap-[8px] rounded-[8px] border p-[12px]">
      <div className="flex items-baseline justify-between gap-[8px]">
        <strong className="text-[15px]">{copy.whatCard}</strong>
        <button type="button" onClick={() => onDone(null)} className="rounded-[8px] border px-[12px] py-[6px] text-[14px]">
          {copy.skip}
        </button>
      </div>
      <span className="text-[12px] text-[color:var(--fg-muted)]">{copy.whatCardHint}</span>
      <SearchField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
        placeholder={copy.whatCardField}
        aria-label={copy.whatCardField}
        autoComplete="off"
        enterKeyHint="search"
        disabled={saving}
        containerClassName="min-h-[44px] py-[8px]"
        className="text-[16px]"
      />
      {pending && <span className="text-[12px] text-[color:var(--fg-muted)]">{copy.searching}</span>}
      {!pending && failed && <span className="text-[12px]">{copy.searchFailed}</span>}
      {!pending && !failed && trimmed !== "" && shown.length === 0 && <span className="text-[12px]">{copy.noMatch}</span>}
      {saveFailed && <span className="text-[12px]">{copy.labelFailed}</span>}
      {shown.length > 0 && (
        <ul className="m-0 flex max-h-[264px] list-none flex-col gap-[6px] overflow-y-auto p-0">
          {shown.map((hit) => (
            <li key={hit.oracleId}>
              <button
                type="button"
                disabled={saving}
                onClick={() => void pick(hit)}
                className="flex min-h-[56px] w-full items-center gap-[12px] rounded-[8px] border px-[10px] py-[6px] text-left"
              >
                <span aria-hidden className="relative h-[45px] w-[32px] shrink-0 overflow-hidden rounded-[4px] bg-[color:var(--surface-inset)]">
                  {hit.imageUri ? <ArtLayer src={hit.imageUri} /> : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] font-semibold">{hit.flavorName ?? hit.name}</span>
                  {hit.flavorName ? <span className="truncate text-[12px] text-[color:var(--fg-muted)]">{hit.name}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
