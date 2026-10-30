"use client";

import { useEffect, useState } from "react";
import { checkInDue } from "../../app/check-in-actions";
import { captureSurveyShown } from "../../lib/analytics/posthog";
import { CheckInForm } from "./check-in-form";

// Mounted on Home for a signed-in reader whose FEEDBACK_ENABLED is on (flyer trial PR 6). Home is cached whole, so the due
// test cannot ride its payload: about a second and a half after hydration this asks `checkInDue`, which counts today's
// visit once per UTC day and answers whether the check-in is due. Draws nothing until it is. A failed ask is silence.

/** After the page settles: the sheet never opens over the first paint. */
export const CHECK_IN_DELAY_MS = 1500;

export function CheckInPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      checkInDue()
        .then((due) => {
          if (live && due) setOpen(true);
        })
        .catch(() => {});
    }, CHECK_IN_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (open) captureSurveyShown();
  }, [open]);

  return open ? <CheckInForm onClose={() => setOpen(false)} /> : null;
}
