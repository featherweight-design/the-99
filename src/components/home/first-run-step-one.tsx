"use client";
// First run's step-1 card, the one live step. It is its own client component because the card
// changes while its review is open (first-run redesign D11, 5a; design table
// first-run-calm-replace.md §3a): on the phone the fan and the body step aside, the card goes
// left-aligned, and a mono `Reviewing · file · rows` line under the title says what is under
// review, since the review itself draws no header when embedded. From `md` the card keeps its
// rest state: 5a is drawn at 390 only, and Hugh ruled (2026-09-28) that the fan stays
// top-aligned beside a growing review.
//
// The fan is handed in from the server file rather than drawn here, so this module carries the
// state and nothing else.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AddCardsSheet } from "../collection/add-cards-sheet";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { ReplaceFlow } from "../collection/replace-flow";
import { refreshCopy } from "../../lib/copy/refresh";

export function FirstRunStepOne({ fan, addByHand = false }: { fan: React.ReactNode; addByHand?: boolean }) {
  const c = refreshCopy.firstRun;
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const saved = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const [reviewing, setReviewing] = useState<{ file: string; rows: number } | null>(null);

  return (
    <>
    <div
      // While reviewing, the phone's card drops its padding and clips to its corners, so the
      // review's confirm bar runs flush to the card's sides and foot (5a, §3.3 and §3.8); the
      // title block and the review content carry the 14px inset themselves.
      // Every reviewing override stops at `md`, where the review draws its own filename line and
      // its desktop bar; below that the card carries the file itself (640px included).
      className={`flex flex-none flex-col gap-[12px] rounded-[14px] border border-[color:var(--accent)] bg-[color:var(--surface-inset)] sm:flex-row sm:items-start sm:gap-[18px] sm:text-left ${
        reviewing ? "items-start overflow-hidden p-0 text-left md:overflow-visible md:p-[18px]" : "items-center p-[18px_16px] text-center sm:p-[18px]"
      }`}
      data-reviewing={reviewing ? "" : undefined}
      // The nav's "Go to step 1" lands here when the review has replaced the upload entry.
      data-step1-card=""
      tabIndex={-1}
    >
      {/* `sm:items-start` on the card above keeps this pinned while the text
          column grows by a paste panel or a whole review screen. The
          handoff's `align-items: center` was drawn for the rest state only;
          Hugh ruled on 2026-09-28 that the fan stays top-aligned throughout. */}
      <div className={reviewing ? "hidden md:contents" : "contents"}>{fan}</div>
      <div
        className={`flex w-full min-w-0 flex-col gap-[12px] sm:w-auto sm:flex-auto sm:items-stretch sm:gap-[7px] ${
          reviewing ? "items-stretch" : "items-center"
        }`}
      >
        <div className={`flex flex-col ${reviewing ? "px-[14px] pt-[14px] md:p-0" : ""}`}>
          {/* 17px on the phone while reviewing (5a, §3.5); 19px everywhere else. */}
          <span className={`font-display font-semibold text-[color:var(--fg)] ${reviewing ? "text-[17px] md:text-[19px]" : "text-[19px]"}`}>
            {c.step1Title}
          </span>
          {reviewing && (
            <span className="mt-[4px] font-mono text-[10px] tracking-[0.04em] uppercase [overflow-wrap:anywhere] text-[color:var(--fg-faint)] md:hidden">
              {c.step1Reviewing(reviewing.file, reviewing.rows)}
            </span>
          )}
        </div>
        {/* One paragraph, two strings: the phone gets the copy file's own
            short variant rather than a second copy of the subtree. While a
            review is open the phone's gives way to the REVIEWING line. */}
        <p className={`m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-muted)] sm:text-[13px] ${reviewing ? "hidden md:block" : ""}`}>
          <span className="sm:hidden">{addByHand ? collectionEditCopy.firstRun.bodyShort : c.step1BodyShort}</span>
          <span className="hidden sm:inline">{c.step1Body}</span>
        </p>
        {/* ReplaceFlow rather than UploadEntry: preview and confirm are its
            steps to own, and first run reaches them by the same route the
            replace page does.

            The wrapper undoes this card's centring for everything the flow
            draws after its buttons. The card is `items-center` and, on the
            phone, `text-center`, both drawn for the rest state; left to leak,
            they shrank the paste panel to its content (a narrow textarea) and
            centred the review screen's `Unmatched` / `Parse errors` headings
            over lists that are not. Prod walk 2026-09-28, items 9 and 10. */}
        <div className="w-full self-stretch text-left">
          <ReplaceFlow
            currentCardCount={0}
            entry="buttons"
            embedded
            onReviewing={setReviewing}
            onAddByHand={
              addByHand
                ? (el) => {
                    trigger.current = el;
                    saved.current = false;
                    setAdding(true);
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
      {adding ? (
        <AddCardsSheet
          mode="add"
          returnFocusRef={trigger}
          totalCards={0}
          // The first save turns Home from first run into the dashboard, which would unmount the
          // sheet and its saved state; the refresh waits for the close.
          onSaved={() => {
            saved.current = true;
          }}
          onClose={() => {
            setAdding(false);
            if (saved.current) router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
