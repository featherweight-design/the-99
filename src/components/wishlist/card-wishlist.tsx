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
// the reader's switch again. A step shows at once and is put back, with the toast, if the save fails.

import { useEffect, useRef, useState } from "react";
import { addToWishlistAction, removeFromWishlistAction, setWishlistWantAction, type WantOutcome } from "../../app/collection/wishlist/actions";
import { wishlistCopy } from "../../lib/copy/wishlist";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { RECEIPT_LINK_CLASS } from "../cards/card-modal-shared";
import { WantStepper } from "./want-stepper";

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
  // Only a press of Add moves focus (to the stepper it turns into); the section as it opens never takes it.
  const [arrived, setArrived] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  // The last count the server confirmed, which a failed step goes back to; and the step in flight that may answer.
  const confirmed = useRef(initial);
  const latest = useRef(0);
  // Add and Remove run alone: each is ignored while any write is in flight, and a step is ignored while either is,
  // so no two writes ever answer over one another and a failure always has one confirmed count to go back to.
  const exclusive = useRef(false);
  const toasts = useRef(0);
  const fail = (text: string) => setToast({ id: ++toasts.current, text });

  // When the line goes (Remove, or a step down to what the collection already holds) while the stepper held focus, the
  // button that replaces it takes focus; focus anywhere else stays where it is.
  const listed = useRef(initial !== null);
  useEffect(() => {
    const was = listed.current;
    listed.current = want !== null;
    if (was && want === null && document.activeElement === document.body) addRef.current?.focus();
  }, [want]);

  function settle(out: WantOutcome) {
    if (!out.ok) return false;
    setHave(out.have);
    // `held`: the collection already holds what was wanted, so no line stands.
    const next = out.status === "wanted" ? out.want : null;
    confirmed.current = next;
    setWant(next);
    onWrite();
    return true;
  }

  async function add() {
    if (exclusive.current || pending.current > 0) return;
    exclusive.current = true;
    try {
      const out = await addToWishlistAction(oracleId);
      if (!out.ok) return fail(copy.failedAdd);
      if (out.status === "wanted") setArrived(true);
      settle(out);
    } catch {
      fail(copy.failedAdd);
    } finally {
      exclusive.current = false;
    }
  }

  // Steps still waiting on the server. The display goes back to what the server confirmed only once none is, so a
  // later step that failed does not strand the view on a count an earlier one has since moved.
  const pending = useRef(0);

  async function step(next: number) {
    if (exclusive.current) return;
    const ticket = ++latest.current;
    pending.current += 1;
    setWant(next);
    let out: WantOutcome | null = null;
    try {
      out = await setWishlistWantAction(oracleId, next);
    } catch {
      out = null;
    }
    pending.current -= 1;
    if (out?.ok) {
      confirmed.current = out.status === "wanted" ? out.want : null;
      if (ticket === latest.current) settle(out);
      else onWrite();
    } else if (ticket === latest.current) {
      fail(copy.failedSet);
    }
    if (pending.current === 0) setWant(confirmed.current);
  }

  async function remove() {
    if (exclusive.current || pending.current > 0) return;
    exclusive.current = true;
    try {
      const out = await removeFromWishlistAction(oracleId);
      if (!out.ok) return fail(copy.failedSet);
      confirmed.current = null;
      setWant(null);
      onWrite();
    } catch {
      fail(copy.failedSet);
    } finally {
      exclusive.current = false;
    }
  }

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
          <button type="button" onClick={() => void remove()} className={RECEIPT_LINK_CLASS}>
            {copy.remove}
          </button>
        )}
      </div>
      {want === null ? (
        <button
          ref={addRef}
          type="button"
          onClick={() => void add()}
          className="mt-[10px] flex h-[44px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent text-[13.5px] font-medium text-[color:var(--fg)] md:h-[34px] md:w-auto md:px-[14px] md:pointer-coarse:h-[44px]"
        >
          <Bookmark filled={false} />
          {copy.add}
        </button>
      ) : (
        <div className="mt-[8px] flex items-center gap-[10px] text-[13px]" style={{ color: "var(--fg-body)" }}>
          <span>{copy.want}</span>
          <WantStepper
            value={want}
            onChange={(next) => void step(next)}
            fewerLabel={copy.fewer}
            moreLabel={copy.more}
            countLabel={copy.want}
            focusOnMount={arrived}
          />
          <span className="font-mono" style={{ color: "var(--fg-muted)" }}>{copy.have(have)}</span>
        </div>
      )}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}
