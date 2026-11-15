// Live password strength (Small items 11 addendum R1c): the reading behind `StrengthPanel`, and its polite line.
//
// The estimator's dictionaries are large, so they load on the password field's first focus (`prime`) through a dynamic
// `import()`, never in the page's first load (`strength-lazy.test.ts`). Until it arrives, or when its chunk fails, the reading
// is `unscored` (READINESS clarification 2): length and number-or-symbol tick live, the meter shows no word, the third guide
// stays open, and the press still works. When it arrives the reading updates in place, without the field losing focus.
//
// Screen readers hear one polite line, `Weak. 1 of 3 done.`, only when the word or the count changes, once typing has paused
// for `ANNOUNCE_MS` (call 8). It stays quiet while a refusal's `role="alert"` is showing, so the two never speak together.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unscored, type StrengthReading } from "../../lib/auth/password";
import { strengthCopy } from "../../lib/copy/strength";

type Estimate = (pw: string, inputs: readonly string[]) => StrengthReading;

/** How long typing must pause before the polite line speaks. */
export const ANNOUNCE_MS = 1000;

/** The polite line for a reading: the word and the count, or the count alone under 8 (no word). */
export function announcement(reading: StrengthReading): string {
  const met = Object.values(reading.guides).filter(Boolean).length;
  return reading.strength === "short" ? strengthCopy.announceShort(met) : strengthCopy.announce(strengthCopy.word[reading.strength], met);
}

/**
 * `password` is what the field holds; `inputs` are the player's own words for the estimator (Q1: first name and email; K5:
 * the address). `quiet` is true while a refusal's alert shows in the hint's slot. Wire `prime` to the field's `onFocus`.
 */
export function usePasswordStrength(password: string, inputs: readonly string[], quiet: boolean) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const loading = useRef(false);
  const prime = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    import("../../lib/auth/strength-estimator").then(
      (mod) => setEstimate(() => mod.estimate),
      // A chunk that fails stays on `unscored` for the page's life; Clerk still judges on the press.
      () => undefined,
    );
  }, []);

  const key = inputs.join("\n");
  const reading = useMemo(
    () => (estimate ? estimate(password, key ? key.split("\n") : []) : unscored(password)),
    [estimate, password, key],
  );

  const text = announcement(reading);
  const [live, setLive] = useState("");
  // What the line last said, starting from the reading the page opened on, so nothing speaks before the player types.
  const said = useRef(text);
  useEffect(() => {
    if (quiet) return;
    const timer = setTimeout(() => {
      if (text === said.current) return;
      said.current = text;
      setLive(text);
    }, ANNOUNCE_MS);
    return () => clearTimeout(timer);
    // `password` restarts the pause on every keystroke, even one that leaves the line the same.
  }, [text, quiet, password]);

  return { reading, live, prime };
}
