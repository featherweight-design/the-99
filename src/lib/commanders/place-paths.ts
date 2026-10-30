/**
 * Where Help me choose and Discover live for a reader: on the Commanders place they are tabs at
 * `/commanders/choose` and `/commanders/discover`; off, they are the addresses they shipped at. Every door and every link
 * built for either takes its path from here, so a reader on one switch never meets the other's address.
 * Pure and client-safe: a server caller passes `true`, a client component reads the shell's context.
 */
export function choosePath(place: boolean): string {
  return place ? "/commanders/choose" : "/decks/new/choose";
}

export function discoverPath(place: boolean): string {
  return place ? "/commanders/discover" : "/discover";
}

/** A tool's shipped address, at the place the reader's switch gives it (a Try it link built from the tool table). */
export function atPlace(href: string, place: boolean): string {
  return place && href === "/decks/new/choose" ? choosePath(true) : href;
}
