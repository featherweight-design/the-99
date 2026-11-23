"use client";
// The reader's store as a control holds it (store choice, design #3200): Settings' Store section and the first-run
// store row both save through this, so they behave alike. The press shows at once and is written in the background,
// one write at a time (a press while a write is in flight is refused); a write that fails puts the last saved store
// back and raises the shared social toast. A fresh server value always wins over what the control holds.

import { useEffect, useRef, useState } from "react";
import { savePreferredStore } from "../../app/settings/store-actions";
import { storeCopy } from "../../lib/copy/store";
import type { Store } from "../../lib/stores/rows";
import type { SocialToastState } from "../social/social-toast";

export function useStoreChoice(store: Store) {
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);

  // The chosen store, held from the press; a fresh server value always wins (adjusted during render).
  const [on, setOn] = useState(store);
  const [served, setServed] = useState(store);
  if (served !== store) {
    setServed(store);
    setOn(store);
  }
  // What the server last accepted: a failure puts this back.
  const saved = useRef(store);
  useEffect(() => {
    saved.current = store;
  }, [store]);
  const [saving, setSaving] = useState(false);

  async function save(next: Store) {
    if (saving || next === on) return;
    setOn(next);
    setSaving(true);
    const fail = () => {
      setOn(saved.current);
      setToast({ id: ++toastSeq.current, text: storeCopy.settings.failed });
    };
    try {
      const r = await savePreferredStore(next);
      if (r.ok) saved.current = next;
      else fail();
    } catch {
      fail();
    } finally {
      setSaving(false);
    }
  }

  return { on, saving, save, toast, clearToast: () => setToast(null) };
}
