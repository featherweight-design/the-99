"use client";
// The one toast the /credits page draws: a Buy press that did not start Checkout (an alert, centered), and a
// failed return re-read (R6, a status with its mono detail line, bottom of the page). The shared `ToastFrame`
// and its clock, as `SocialToast` uses them.

import { useEffect, useRef } from "react";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

export type CreditsToastState = { id: number; text: string; detail?: string };

export function CreditsToast({ toast, onDone }: { toast: CreditsToastState | null; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { restart } = useToastClock(ref, toast !== null, onDone);
  // A new toast gets the whole window, whatever the last one spent.
  useEffect(() => restart(), [toast?.id, restart]);
  if (!toast) return null;
  return toast.detail ? (
    <ToastFrame key={toast.id} frameRef={ref} role="status" placement="credits" title={toast.text} detail={toast.detail} />
  ) : (
    <ToastFrame key={toast.id} frameRef={ref} role="alert" title={toast.text} />
  );
}
