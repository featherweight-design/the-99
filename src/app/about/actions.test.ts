import { describe, expect, it, vi, beforeEach } from "vitest";

const requireUserId = vi.fn(async () => "user_1");
const markAboutSeen = vi.fn(async () => {});
const markAboutVisited = vi.fn(async () => {});
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock("../../lib/auth", () => ({ requireUserId }));
vi.mock("../../lib/about/read", () => ({ markAboutSeen, markAboutVisited }));
vi.mock("next/navigation", () => ({ redirect }));
// What this deployment draws. The real rule, handed a catalog with a switched entry in it when a
// test sets one: no shipped entry has a switch yet, and the write must still name them.
const extraEntries: { id: string; switch?: string }[] = [];
vi.mock("../../lib/about/visible", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/about/visible")>();
  return {
    ...real,
    visibleEntries: () => [...real.visibleEntries(), ...extraEntries] as ReturnType<typeof real.visibleEntries>,
  };
});

const { dismissAbout, recordAboutVisit } = await import("./actions");
const { ABOUT_VERSION } = await import("../../lib/copy/about");

/** The dismiss RETURNS where the reader goes; the page navigates there itself. */
async function dismiss(next?: string): Promise<string> {
  const form = new FormData();
  if (next !== undefined) form.set("next", next);
  const to = await dismissAbout(form);
  // It never redirects: a server redirect would give the page nothing to report as pending.
  expect(redirect).not.toHaveBeenCalled();
  return to;
}

beforeEach(() => {
  requireUserId.mockClear();
  markAboutSeen.mockClear();
  markAboutVisited.mockClear();
  redirect.mockClear();
});

describe("dismissAbout", () => {
  it("authenticates, records the current version, and returns the reader", async () => {
    const to = await dismiss("/decks?sort=name");
    expect(requireUserId).toHaveBeenCalledOnce();
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, expect.any(Array));
    expect(to).toBe("/decks?sort=name");
  });

  it("records the switched entries this deployment draws too, so the legacy gate asks once", async () => {
    extraEntries.push({ id: "switched-a", switch: "NEVER_CUT_ENABLED" });
    try {
      await dismiss("/decks");
      const ids = (markAboutVisited.mock.calls.at(-1) as unknown as [string, number, string[]])[2];
      expect(ids).toContain("switched-a");
    } finally {
      extraEntries.length = 0;
    }
  });

  it("validates `next` HERE, because this is what decides the destination", async () => {
    // The page validates it too, but the field is a hidden input in a form the
    // reader's browser owns — the page's copy of the value proves nothing about
    // what arrives.
    expect(await dismiss("//evil.example")).toBe("/");
    expect(await dismiss("https://evil.example/decks")).toBe("/");
    expect(await dismiss()).toBe("/");
  });

  it("records the acknowledgement even when the destination is refused", async () => {
    await dismiss("//evil.example");
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, expect.any(Array));
  });
});

describe("recordAboutVisit (R6)", () => {
  it("records the current version and the switched entries this deployment draws", async () => {
    await recordAboutVisit();
    expect(requireUserId).toHaveBeenCalledOnce();
    // No shipped entry has a switch yet, so the ids are empty; the entry-level rule is
    // `visible.test.ts`'s, and the stored union is `read.test.ts`'s.
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
  });

  it("records every switched entry the deployment draws, and only those", async () => {
    extraEntries.push({ id: "locked-cards", switch: "NEVER_CUT_ENABLED" });
    try {
      await recordAboutVisit();
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["locked-cards"]);
    } finally {
      extraEntries.length = 0;
    }
  });

  // The appendix is seen by its id too, while its switch is on (plan 2026-09-28, PR C).
  it("records the appendix's id while HOW_IT_WORKS_ENABLED is on, and not while it is off", async () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    try {
      await recordAboutVisit();
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["how-it-works"]);
    } finally {
      delete process.env.HOW_IT_WORKS_ENABLED;
    }
    markAboutVisited.mockClear();
    await recordAboutVisit();
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
  });

  it("never redirects, so the index stays where the reader is reading it", async () => {
    await recordAboutVisit();
    expect(redirect).not.toHaveBeenCalled();
  });
});
