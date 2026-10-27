"use client";
// Home's held lead (spare requests PR 3d, Copilot round 1): an answered spare request stays as its receipt in the lead's
// place for the visit (`LeadSlot`), while the action's redraw has moved the server's lead on. `splitLead` has already
// taken that NEW lead out of What's new's list, so without this it would show nowhere, and the visit would mark it
// seen unread. The slot publishes the held story's key here, and What's new puts a displaced server lead back among
// its rows (`displaceLead`) until the next visit draws it as the lead.

import { createContext, useContext, useState, type ReactNode } from "react";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import { feedOrder } from "../../lib/feed/kinds";

type Held = { key: string | null; setKey: (key: string | null) => void };

const HeldLeadContext = createContext<Held | null>(null);

export function HeldLeadProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(null);
  return <HeldLeadContext.Provider value={{ key, setKey }}>{children}</HeldLeadContext.Provider>;
}

/** The held story's key and its setter; null outside a provider (the slot then holds alone). */
export const useHeldLead = (): Held | null => useContext(HeldLeadContext);

const asItem = (v: FeedView) => ({ kind: v.kind, key: v.key, createdAt: new Date(v.at), answer: v.answer });

/**
 * The feed What's new draws while the lead slot holds `heldKey`: a server lead that is NOT the held story is no longer
 * drawn as the lead, so it joins the list in the feed's own order. Pure, for the tests.
 */
export function displaceLead(feed: HomeFeed, heldKey: string | null): HomeFeed {
  if (!feed.chosen || heldKey === null || !feed.lead || feed.lead.key === heldKey) return feed;
  const items = [...feed.items, feed.lead].sort((a, b) => feedOrder(asItem(a), asItem(b)));
  return { ...feed, items, lead: null };
}
