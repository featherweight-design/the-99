// Scryfall requires a User-Agent and returns 400 for requests without an explicit Accept
// header, so every call — bulk index, bulk download and /sets — sends both.
export const SCRYFALL_HEADERS = {
  "User-Agent": "the-99/1.0",
  Accept: "application/json",
} as const;

/** Scryfall's sets list. Here, beside the headers, so `catalog:fetch` can name it without loading `src/db`. */
export const SETS_INDEX = "https://api.scryfall.com/sets";
