"use client";
// The copy editor's session: the edits waiting in this browser, their submission and whether the tray is open. It lives
// in the provider, above the lazy overlay, so the door can show the count before the overlay has ever loaded and the
// edits survive the mode turning off. It reads the light `edits-store` only: the validator stays in the overlay chunk.
import { useCallback, useEffect, useState } from "react";
import { EDITS_STORAGE_KEY, readEdits, writeEdits, type Edit } from "../../lib/copy-editor/edits-store";
import { useSubmission } from "./use-submission";

export function useEditSession() {
  // Empty on the server and on the first client render, so the markup matches; the browser's edits load right after.
  const [edits, setEdits] = useState<Edit[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the edits exist only in the browser, so they are read after mount
    setEdits(readEdits());
    // Another tab changed them: this one follows.
    const onStorage = (e: StorageEvent) => {
      if (e.key === EDITS_STORAGE_KEY || e.key === null) setEdits(readEdits());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const replaceEdits = useCallback((next: Edit[]) => {
    writeEdits(next);
    setEdits(next);
  }, []);
  /** Add or change `upsert` and drop `drop`, against what is stored now. */
  const saveEdits = useCallback((upsert: Edit[], drop: string[]) => {
    setEdits((cur) => {
      const gone = new Set([...drop, ...upsert.map((e) => e.key)]);
      const next = [...cur.filter((e) => !gone.has(e.key)), ...upsert];
      writeEdits(next);
      return next;
    });
  }, []);
  const { sub, submit, dismiss } = useSubmission(edits, replaceEdits);
  return { edits, replaceEdits, saveEdits, sub, submit, dismiss, trayOpen, setTrayOpen };
}

export type EditSession = ReturnType<typeof useEditSession>;
