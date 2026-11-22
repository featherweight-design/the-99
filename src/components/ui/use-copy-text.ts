"use client";

// The clipboard write the export dialog shipped, shared (store choice, call 6): `navigator.clipboard` first, the
// hidden-textarea `execCommand("copy")` when it is missing or refuses, then a 1.5s `copied` swap. `onDone` hears
// whether it worked, so each caller announces in its own words.

import { useEffect, useRef, useState } from "react";

export const COPIED_MS = 1500;

export function useCopyText(onDone: (ok: boolean) => void, onReset?: () => void) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the swap's timer on unmount, so no state is set on an unmounted component.
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function copy(text: string) {
    function onSuccess() {
      onDone(true);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        onReset?.();
      }, COPIED_MS);
    }

    function legacyCopy() {
      // A temporary textarea, so the copy never depends on which DOM tree is visible.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      if (ok) onSuccess();
      else onDone(false);
    }

    if (navigator.clipboard) navigator.clipboard.writeText(text).then(onSuccess).catch(legacyCopy);
    else legacyCopy();
  }

  return { copied, copy };
}
