"use client";
// A component loaded when first wanted. Shared by the card details modal and the Tuning tools, which
// both sit on every deck page and are drawn only after a press.

import { useEffect, useSyncExternalStore, type ComponentType } from "react";

/**
 * A component loaded when first wanted, drawn at once from then on. Until its code has arrived it
 * draws nothing; the owner covers the wait itself (the card modal's `modalReady`; the Analysis tab's opening
 * loader, which holds until the tools' first read settles and so cannot lift before they arrive). A download that
 * failed is forgotten, so the next `fetch` tries again, and whichever attempt lands tells every
 * mounted reader. A mounted wrapper keeps trying on its own, backing off from 1s to 30s, because a
 * view switched to inside the modal (the fits views) or a tool opened by a shortcut has no press of its own that
 * would retry it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each wrapper keeps its component's own props below
export function onDemand<P extends Record<string, any>>(load: () => Promise<ComponentType<P>>) {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<unknown> | null = null;
  const listeners = new Set<() => void>();
  const fetch = () =>
    (pending ??= load().then(
      (c) => {
        loaded = c;
        for (const l of listeners) l();
      },
      () => { pending = null; },
    ));
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  };
  const isLoaded = () => loaded !== null;
  function OnDemand(props: P) {
    const ready = useSyncExternalStore(subscribe, isLoaded, () => false);
    useEffect(() => {
      if (ready) return;
      let live = true;
      let wait = 1000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const attempt = () =>
        void fetch().then(() => {
          if (!live || isLoaded()) return;
          timer = setTimeout(attempt, wait);
          wait = Math.min(wait * 2, 30_000);
        });
      attempt();
      return () => {
        live = false;
        clearTimeout(timer);
      };
    }, [ready]);
    const Loaded = ready ? loaded : null;
    return Loaded ? <Loaded {...props} /> : null;
  }
  return Object.assign(OnDemand, { fetch, subscribe, isLoaded });
}
