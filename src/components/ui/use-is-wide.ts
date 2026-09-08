"use client";
// The lg breakpoint, named. The filter rack keeps its sheet up to 1024px rather
// than the 768px `useIsDesktop` draws at: a tablet has room for the row but not
// for five controls beside it, so it gets the phone treatment.

import { useMinWidth } from "./use-min-width";

export function useIsWide(): boolean {
  return useMinWidth("(min-width: 1024px)");
}
