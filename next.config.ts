import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every page here is dynamic — `requireUserId()` calls Clerk's `auth()` —
    // and /collection and /commanders both carry a loading.tsx. Next holds
    // nothing in the client cache for that combination by default (the
    // `dynamic` stale time defaults to 0 seconds), so bouncing between the two
    // refetched and re-rendered the whole payload each way: the full card list,
    // the ranked commanders, the availability rollup.
    //
    // 30s is short enough that a stale read heals within one train of thought,
    // and every write that could invalidate these pages calls revalidatePath,
    // which purges the client cache outright — so the window only ever covers
    // reads. Deck writes did not reach /collection or /commanders before this;
    // see claimSurfaces in src/lib/decks/revalidate.ts.
    // `static` is left alone: its default is already 5 minutes, and the
    // regression is entirely about dynamic pages.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
