"use client";

// The shell tells every client component whether the Commanders place is on for this reader, so a door
// or a link built there names the address the reader's switch gives (`lib/commanders/place-paths.ts`).
// Off by default: a tree with no provider (a test, a signed-out page) draws today's addresses.
import { createContext, useContext } from "react";
import { choosePath, discoverPath } from "../../lib/commanders/place-paths";

const PlaceContext = createContext(false);

export function PlacePathsProvider({ place, children }: { place: boolean; children: React.ReactNode }) {
  return <PlaceContext.Provider value={place}>{children}</PlaceContext.Provider>;
}

export const usePlace = () => useContext(PlaceContext);
export const useChoosePath = () => choosePath(useContext(PlaceContext));
export const useDiscoverPath = () => discoverPath(useContext(PlaceContext));
