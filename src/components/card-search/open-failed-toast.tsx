"use client";
// A tool's page that did not arrive (R12 Q20: "the push fails: the row back at rest; the shipped toast"): the center alert
// the app's other failed presses use, for the shared eight seconds.

import { useRef } from "react";
import { ToastFrame, useToastClock } from "../collection/edit-toast-frame";

export function OpenFailedToast({ text, onDone }: { text: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useToastClock(ref, true, onDone);
  return <ToastFrame frameRef={ref} role="alert" placement="center" title={text} />;
}
