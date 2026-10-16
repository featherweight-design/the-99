"use client";

import { useCallback, type Ref, type RefObject } from "react";

function assign<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as RefObject<T | null>).current = node;
}

/**
 * One callback ref that sets every ref it is given (up to three): an object ref's `current`, or a callback ref called
 * with the node. Stable while the refs are, so a control can carry its own ref and a moment's anchor
 * (`useMomentAnchor`) without re-attaching on every render.
 */
export function useMergedRef<T>(a?: Ref<T>, b?: Ref<T>, c?: Ref<T>): (node: T | null) => void {
  return useCallback(
    (node: T | null) => {
      assign(a, node);
      assign(b, node);
      assign(c, node);
    },
    [a, b, c],
  );
}
