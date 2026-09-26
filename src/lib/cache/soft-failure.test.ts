import { describe, expect, it } from "vitest";

import { recordSoftFailure, watchSoftFailures } from "./soft-failure";

describe("watchSoftFailures", () => {
  it("hears a fallback recorded anywhere beneath it, across awaits", async () => {
    const deep = async () => {
      await Promise.resolve();
      recordSoftFailure();
      return 1;
    };
    expect(await watchSoftFailures(async () => (await deep()) + 1)).toEqual({ value: 2, fellBack: true });
  });

  it("reports a clean load as clean", async () => {
    expect(await watchSoftFailures(async () => "ok")).toEqual({ value: "ok", fellBack: false });
  });

  it("keeps two loads running at once apart", async () => {
    const [a, b] = await Promise.all([
      watchSoftFailures(async () => { await new Promise((r) => setTimeout(r, 5)); recordSoftFailure(); }),
      watchSoftFailures(async () => { await new Promise((r) => setTimeout(r, 10)); }),
    ]);
    expect([a.fellBack, b.fellBack]).toEqual([true, false]);
  });

  it("does nothing when nobody is watching", () => {
    expect(() => recordSoftFailure()).not.toThrow();
  });
});
