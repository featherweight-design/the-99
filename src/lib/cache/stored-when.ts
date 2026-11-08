import { unstable_cache } from "next/cache";

/**
 * Next's data cache, storing an answer only when `keep` says so: the public loaders' one pattern (`cached-card.ts`,
 * `cached-commander.ts`, `landing-stats.ts`, `precon-overview.ts`). An answer `keep` refuses (not found, a failed count) is
 * returned to this caller and never stored, so the next request reads again. A read that throws, or a wrapper that throws
 * (`unstable_cache` raises outside a request), throws through: nothing is stored and the caller decides.
 */
class NotStored<T> {
  constructor(readonly value: T) {}
}

export async function cachedWhen<T>(
  key: string[],
  read: () => Promise<T>,
  keep: (value: T) => boolean,
  revalidate: number,
): Promise<T> {
  const stored = unstable_cache(async () => {
    const value = await read();
    // Thrown, because `unstable_cache` stores whatever is returned and stores nothing that throws.
    if (!keep(value)) throw new NotStored(value);
    return value;
  }, key, { revalidate });
  try {
    return await stored();
  } catch (e) {
    if (e instanceof NotStored) return e.value as T;
    throw e;
  }
}
