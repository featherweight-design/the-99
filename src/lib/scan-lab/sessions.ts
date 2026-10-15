type Releasable = { release(): Promise<void> | void };

/**
 * Holds the lab's onnxruntime sessions so every one is released: onnxruntime-web keeps a session's
 * model in the WASM heap until `release()`, and the runtime outlives the page across client
 * navigations. A session is released when the holder closes (unmount, or a failed start), when it
 * finishes loading after the holder closed (the page was left, or its sibling failed to load), and
 * never while an inference on it is in flight: `use` counts runs, and a close waits for the last.
 */
export function sessionHolder<S extends Releasable>() {
  const held = new Set<S>();
  let open = true;
  let busy = 0;
  const release = (s: S) => {
    void Promise.resolve().then(() => s.release()).catch(() => {});
  };
  const releaseAll = () => {
    held.forEach(release);
    held.clear();
  };
  return {
    /** Re-arm on mount (React's dev double mount closes and re-opens). */
    open() {
      open = true;
    },
    /** Keep `s`, or release it at once and answer false when the holder is closed. */
    accept(s: S): boolean {
      if (!open) {
        release(s);
        return false;
      }
      held.add(s);
      return true;
    },
    /** Run an inference; refused once closed, and a close waits for it to finish. */
    async use<T>(run: () => Promise<T>): Promise<T> {
      if (!open) throw new Error("left the page");
      busy++;
      try {
        return await run();
      } finally {
        busy--;
        if (!open && busy === 0) releaseAll();
      }
    },
    /** Release what is held (after any run in flight) and refuse anything that arrives later. */
    close() {
      open = false;
      if (busy === 0) releaseAll();
    },
  };
}
