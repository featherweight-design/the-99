"use client";
// The md breakpoint, named. The subscriber itself lives in use-min-width.ts;
// this file is only the query, so that the 768px callers keep one place to read
// the number off.

import { useMinWidth } from "./use-min-width";

export function useIsDesktop(): boolean {
  return useMinWidth("(min-width: 768px)");
}
