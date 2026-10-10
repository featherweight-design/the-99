/* eslint-disable @typescript-eslint/no-require-imports */
// Preloaded (`node --require`) by probes that call code wrapped in `unstable_cache`, which raises
// outside a request ("incrementalCache missing"). It returns the real `next/cache` with the cache
// wrapper and the invalidators made pass-through, so a probe reads the DATABASE and not a cache.
const Module = require("module");
const load = Module._load;
Module._load = function (request, ...rest) {
  const mod = load.call(this, request, ...rest);
  if (request === "next/cache") {
    return Object.assign({}, mod, { unstable_cache: (fn) => fn, revalidatePath() {}, revalidateTag() {}, updateTag() {} });
  }
  return mod;
};
