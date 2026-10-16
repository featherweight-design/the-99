"use client";
// Card details' Wishlist section (Social R2 PR 5; boards R3 D1, D2, DP1, DP2). Its own box in the details column, at the
// same place whatever opened the card (search, Collection, Discover, Commanders, a deck, Shopping), drawn like the
// receipt boxes beside it and never folded into the deck-scoped `In this deck` box.
//
// Not on the list, the box says `Wishlist` and offers `Add to wishlist`; the press turns the button into the line IN
// PLACE: `In your wishlist`, the want stepper (it starts at one more than the collection holds), the have count and
// `Remove`. Focus follows the press to the stepper, so a keyboard reader is not dropped. A collected card leaves the
// list (R3 G5), so there is no collected state here: a want the collection reaches simply stops being a line.
//
// The caller (the modal) hands the card's want as it read it; every write goes through the PR 3 actions, which decide
// the reader's switch again. Writes run ONE AT A TIME and the line shows what the server answered: a press made while a
// write is out is ignored, and a failed one leaves the line as it was, with the toast. (Steps were once optimistic, with
// a ticket and a rollback; three review rounds went to the ways two overlapping writes can answer, so there is only ever
// one.)

import { useEffect, useRef, useState } from "react";
import { addToWishlistAction, removeFromWishlistAction, setWishlistWantAction, type WantOutcome } from "../../app/collection/wishlist/actions";
import { wishlistCopy } from "../../lib/copy/wishlist";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { RECEIPT_LINK_CLASS } from "../cards/card-modal-shared";
import { WantStepper } from "./want-stepper";
import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";
import { useMergedRef } from "../ui/use-merged-ref";

const copy = wishlistCopy.details;

function Bookmark({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

export function CardWishlist({
  oracleId,
  want: initial,
  owned,
  onWrite,
}: {
  oracleId: string;
  /** How many copies the reader wants in all, or null when the card is not on the list. */
  want: number | null;
  /** What the collection holds, for `have N` until a write answers with its own count. */
  owned: number;
  /** A write landed: the modal's cached copy of this card is stale. */
  onWrite: () => void;
}) {
  const [want, setWant] = useState(initial);
  const [have, setHave] = useState(owned);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  // Only a press of Add that still owns focus when its answer lands moves focus (to the stepper it turns into); the
  // section as it opens never takes it, and a reader who has tabbed away is left where they are.
  const [arrived, setArrived] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  // M9 (discovery R1): `Add to wishlist` is the Wishlist's moment on a card the reader does not own.
  const wishMoment = useMomentAnchor("wishlist", { eligible: want === null && have === 0, copy: momentsCopy.wishlist });
  const addButtonRef = useMergedRef(addRef, wishMoment.ref);
  const toasts = useRef(0);
  const fail = (text: string) => setToast({ id: ++toasts.current, text });

  // One write at a time: the ref refuses a second press at once, the state tells a render whether a write is out.
  const writing = useRef(false);
  const [busy, setBusy] = useState(false);
  // The provider paints a cached card and then refreshes it under the same key, so the props can move after mount. A
  // refreshed snapshot is adopted while no write is out; one that lands during a write is held, and applied when the
  // write ends without an answer to draw (a refusal or an exception). A write that succeeds answers for itself.
  const [snap, setSnap] = useState({ want: initial, owned });
  const [held, setHeld] = useState<{ want: number | null; owned: number } | null>(null);
  if (snap.want !== initial || snap.owned !== owned) {
    setSnap({ want: initial, owned });
    if (busy) {
      setHeld({ want: initial, owned });
    } else {
      setWant(initial);
      setHave(owned);
    }
  }
  if (!busy && held) {
    setHeld(null);
    setWant(held.want);
    setHave(held.owned);
  }

  // When the line goes (Remove, or a write answering that the collection now holds the want) while the stepper held focus, the
  // button that replaces it takes focus; focus anywhere else stays where it is.
  const listed = useRef(initial !== null);
  useEffect(() => {
    const was = listed.current;
    listed.current = want !== null;
    if (was && want === null && document.activeElement === document.body) addRef.current?.focus();
  }, [want]);

  async function write(run: () => Promise<WantOutcome>, failure: string) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    try {
      const out = await run();
      if (!out.ok) return fail(failure);
      setHave(out.have);
      // `held`: the collection already holds what was wanted, so no line stands.
      setWant(out.status === "wanted" ? out.want : null);
      setHeld(null);
      onWrite();
    } catch {
      fail(failure);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const add = () =>
    write(async () => {
      const out = await addToWishlistAction(oracleId);
      if (out.ok && out.status === "wanted" && document.activeElement === addRef.current) setArrived(true);
      return out;
    }, copy.failedAdd);
  const step = (next: number) => write(() => setWishlistWantAction(oracleId, next), copy.failedSet);
  // A removal answers with no count: it reads as the collection holding what was wanted, so no line stands, and
  // `have` is what the line already showed.
  const remove = () =>
    write(async () => {
      const out = await removeFromWishlistAction(oracleId);
      return out.ok ? { ok: true as const, status: "held" as const, want: 0, have } : out;
    }, copy.failedSet);

  // A press shows its pending state on the same frame: the control that was pressed (and the count) go busy and dim,
  // and a press made meanwhile is ignored where the reader can see why. Never a spinner over the section.
  const wait = busy ? " opacity-60 cursor-progress" : "";
  return (
    <section
      data-testid="card-wishlist"
      aria-label={want === null ? copy.section0 : copy.section}
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[6px] font-mono text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--fg-faint)" }}>
          {want === null ? null : <span style={{ color: "var(--accent)" }}><Bookmark filled /></span>}
          {want === null ? copy.section0 : copy.section}
        </div>
        {want === null ? null : (
          <button type="button" aria-busy={busy || undefined} onClick={() => void remove()} className={RECEIPT_LINK_CLASS + wait}>
            {copy.remove}
          </button>
        )}
      </div>
      {want === null ? (
        <button
          ref={addButtonRef}
          aria-describedby={wishMoment["aria-describedby"]}
          type="button"
          aria-busy={busy || undefined}
          onClick={() => void add()}
          className={"mt-[10px] flex h-[44px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent text-[13.5px] font-medium text-[color:var(--fg)] md:h-[34px] md:w-auto md:px-[14px] md:pointer-coarse:h-[44px]" + wait}
        >
          <Bookmark filled={false} />
          {copy.add}
        </button>
      ) : (
        <div className="mt-[8px] flex items-center gap-[10px] text-[13px]" style={{ color: "var(--fg-body)" }}>
          <span>{copy.want}</span>
          <span aria-busy={busy || undefined} className={"inline-flex" + wait}>
            <WantStepper
              value={want}
              // The want is copies in ALL, so one more than the collection holds is the least a line can want: a
              // step never removes the line, and Remove stays the one way off the list.
              min={have + 1}
              onChange={(next) => void step(next)}
              fewerLabel={copy.fewer}
              moreLabel={copy.more}
              countLabel={copy.want}
              focusOnMount={arrived}
            />
          </span>
          <span className="font-mono" style={{ color: "var(--fg-muted)" }}>{copy.have(have)}</span>
        </div>
      )}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}
