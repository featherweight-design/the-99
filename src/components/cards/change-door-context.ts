"use client";
// The seam between card details' pure blocks and the Change door (Move a copy, #2980). `AvailabilityDetail` draws only
// from props and is shared with the landing demo, so the door arrives through this context: the signed-in provider
// supplies it, the demo does not, and a missing provider draws no door. Its own file so the demo's bundle never pulls
// the door's server actions in behind the type.
import { createContext, type ReactNode } from "react";

export type ChangeDoorRender = (card: { oracleId: string; name: string; owned: number }) => ReactNode;
export const ChangeDoorContext = createContext<ChangeDoorRender | null>(null);
