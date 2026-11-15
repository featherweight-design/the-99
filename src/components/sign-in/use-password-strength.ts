// Live password strength (Small items 11 addendum R1c): the reading behind `StrengthPanel`, and its polite line.
//
// The estimator's dictionaries are large, so they load through a dynamic `import()`, never in the page's first load
// (`strength-lazy.test.ts`): on the password field's first focus (`prime`), or on its first character, whichever comes first
// (a password manager can fill the field without focusing it). Until it arrives, or while its chunk fails, the reading is
// `unscored` (READINESS clarification 2): length and number-or-symbol tick live, the meter shows no word, the third guide
// stays open, and the press still works. A failed load is tried again on a later focus or keystroke, at most once per
// `RETRY_MS`. When it arrives the reading updates in place, without the field losing focus. Each check reads a deferred
// copy of the password, so a slow check never holds up typing.
//
// Screen readers hear one polite line, `Weak. 1 of 3 done.`, only when the word or the count changes, once typing has paused
// for `ANNOUNCE_MS` (call 8). It stays quiet while any line's `role="alert"` shows, so the two never speak together. An
// empty field resets it: nothing speaks for it, and the next reading is compared with the empty one, so a field that comes
// back (K5, then the email, then K5 again) speaks as it would the first time.

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { unscored, type StrengthReading } from "../../lib/auth/password";
import { strengthCopy } from "../../lib/copy/strength";

type Estimate = (pw: string, inputs: readonly string[]) => StrengthReading;

/** How long typing must pause before the polite line speaks. */
export const ANNOUNCE_MS = 1000;
/** The least time between two tries at loading the estimator after one failed. */
export const RETRY_MS = 5000;

/** The polite line for a reading: the word and the count, or the count alone under 8 (no word). */
export function announcement(reading: StrengthReading): string {
  const met = Object.values(reading.guides).filter(Boolean).length;
  return reading.strength === "short" ? strengthCopy.announceShort(met) : strengthCopy.announce(strengthCopy.word[reading.strength], met);
}

/**
 * `password` is what the field holds; `inputs` are the player's own words for the estimator (Q1: first name and email; K5:
 * the address). `quiet` is true while any line's alert shows (Q1: Clerk's refusal in the slot or the failed line under the
 * press; K5: any line in the slot). Wire `prime` to the field's `onFocus`.
 */
export function usePasswordStrength(password: string, inputs: readonly string[], quiet: boolean) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const loading = useRef(false);
  const failedAt = useRef<number | null>(null);
  const prime = useCallback(() => {
    if (loading.current) return;
    if (failedAt.current !== null && Date.now() - failedAt.current < RETRY_MS) return;
    loading.current = true;
    import("../../lib/auth/strength-estimator").then(
      (mod) => setEstimate(() => mod.estimate),
      // A chunk that fails leaves the panel `unscored`; Clerk still judges on the press. A later focus or keystroke tries
      // again once `RETRY_MS` has passed.
      () => {
        failedAt.current = Date.now();
        loading.current = false;
      },
    );
  }, []);
  // The first character loads it too, for a field filled without a focus.
  useEffect(() => {
    if (password && !estimate) prime();
  }, [password, estimate, prime]);

  const typed = useDeferredValue(password);
  const key = inputs.join("\n");
  const reading = useMemo(
    () => (estimate ? estimate(typed, key ? key.split("\n") : []) : unscored(typed)),
    [estimate, typed, key],
  );

  const text = announcement(reading);
  // Each write is a fresh object, so a write always renders: the `said` check below is what keeps a pause that changes
  // neither the word nor the count from writing (and rendering) the line again.
  const [live, setLive] = useState<{ text: string }>({ text: "" });
  // What the line last said, starting from the empty field's reading, so nothing speaks before the player types.
  const said = useRef(text);
  useEffect(() => {
    if (!password) {
      said.current = text;
      return;
    }
    if (quiet) return;
    const timer = setTimeout(() => {
      if (text === said.current) return;
      said.current = text;
      setLive({ text });
    }, ANNOUNCE_MS);
    return () => clearTimeout(timer);
    // `password` restarts the pause on every keystroke, even one that leaves the line the same.
  }, [text, quiet, password]);

  return { reading, live: password ? live.text : "", prime };
}
