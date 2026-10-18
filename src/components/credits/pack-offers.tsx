"use client";
// The "Get more credits" section: one card per pack on sale, in ONE column (P8: a second pack stacks under the
// first, it never redraws the section). Drawn from a list, so the page carries no price or size of its own; the
// list is the closed pack registry. The Buy press mints its own uuid per press (`buyPackAction`'s `actionId`) and
// sends the reader to Stripe's Checkout. Nothing is granted here.

import { useEffect, useState, type ReactNode } from "react";
import { buyPackAction, type CheckoutOutcome } from "../../app/credits/actions";
import { creditsPageCopy, type PackOffer } from "../../lib/copy/credits-page";
import { OfferArt } from "./offer-art";

const c = creditsPageCopy;

export type BuyFailure = Extract<CheckoutOutcome, { ok: false }>["reason"];

export function PackOffers({ offers, onFailure, lead }: {
  offers: readonly PackOffer[];
  onFailure: (reason: BuyFailure) => void;
  /** The plan offer (K1): the card AFTER the packs, because the pack leads (launch epic L6, Hugh 2026-10-17; the handoff drew the plan first). With it the cards sit in two columns from `md`. */
  lead?: ReactNode;
}) {
  return (
    <section aria-labelledby="credits-offers" className={lead ? "md:col-span-2" : "md:max-w-[463px]"}>
      <h2 id="credits-offers" className="mb-[10px] font-display text-[17px] font-semibold text-[color:var(--fg)] md:text-[19px]">{c.pack.heading}</h2>
      <div className={`flex flex-col gap-[14px] ${lead ? "md:grid md:grid-cols-2 md:items-stretch md:gap-[18px]" : ""}`}>
        {offers.map((offer) => <PackCard key={`${offer.id}:${offer.units}`} offer={offer} onFailure={onFailure} />)}
        {lead}
      </div>
    </section>
  );
}

function PackCard({ offer, onFailure }: { offer: PackOffer; onFailure: (reason: BuyFailure) => void }) {
  const [busy, setBusy] = useState(false);
  // Back from Stripe's Checkout can restore this page from the back/forward cache as it was left, Buy still busy and
  // disabled and nothing remounted: a persisted pageshow gives the press back.
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);
  async function buy() {
    if (busy) return;
    setBusy(true);
    let sent = false;
    try {
      // A fresh id per PRESS: a double-tap is held by `busy`, and a retry after a failure is a new press.
      const out = await buyPackAction(offer.id, crypto.randomUUID());
      if (out.ok) {
        sent = true;
        window.location.assign(out.url);
      } else {
        onFailure(out.reason);
      }
    } catch {
      onFailure("failed");
    } finally {
      // Stay busy while the browser leaves for Checkout; every other outcome gives the press back.
      if (!sent) setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-[12px] rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[16px] md:px-[22px] md:py-[20px]">
      <div className="flex items-start gap-[14px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{c.pack.k}</span>
          <h3 className="font-display text-[19px] font-bold text-[color:var(--fg)]">{c.pack.title(offer.units)}</h3>
          <span className="font-mono text-[13px] font-semibold text-[color:var(--fg)]">{offer.price}</span>
        </div>
        <OfferArt count={offer.units} />
      </div>
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{c.pack.fine}</p>
      <div className="mt-auto flex flex-col gap-[8px] md:flex-row md:items-center md:gap-[16px]">
        <button
          type="button"
          onClick={() => void buy()}
          disabled={busy}
          aria-busy={busy || undefined}
          aria-label={c.pack.buyAria(offer.units, offer.price)}
          className="flex h-[44px] cursor-pointer items-center justify-center rounded-[8px] border-0 bg-[color:var(--accent)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] disabled:cursor-default disabled:opacity-70 md:h-[40px]"
        >
          {c.pack.buy}
        </button>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{c.pack.via}</span>
      </div>
    </div>
  );
}
