import { describe, expect, it, vi, beforeEach } from "vitest";
import { envViewWith } from "@/test/env-view";

const requireUserId = vi.fn(async () => "user_1");
const markAboutSeen = vi.fn(async () => {});
const markAboutVisited = vi.fn(async () => {});
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock("../../lib/auth", () => ({ requireUserId }));
vi.mock("../../lib/about/read", () => ({ markAboutSeen, markAboutVisited }));
vi.mock("next/navigation", () => ({ redirect }));
// The reader's switches as the proxy resolved them for this request.
const resolved = vi.hoisted(() => ({ env: {} as Record<string, string> }));
const requestSwitchEnv = vi.fn(async () => envViewWith(resolved.env));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv }));
// What this deployment draws. The real rule, handed a catalog with a switched entry in it when a
// test sets one: no shipped entry has a switch yet, and the write must still name them.
const extraEntries: { id: string; switch?: string }[] = [];
vi.mock("../../lib/about/visible", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/about/visible")>();
  return {
    ...real,
    visibleEntries: (env: NodeJS.ProcessEnv) => [...real.visibleEntries(env), ...extraEntries] as ReturnType<typeof real.visibleEntries>,
  };
});

const { dismissAbout, recordAboutVisit } = await import("./actions");
const { ABOUT_VERSION } = await import("../../lib/copy/about");

/** The dismiss RETURNS where the reader goes; the page navigates there itself. */
async function dismiss(next?: string, shown: string[] = []): Promise<string> {
  const form = new FormData();
  if (next !== undefined) form.set("next", next);
  for (const id of shown) form.append("shown", id);
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

  it("records the switched entries the page showed too, so the legacy gate asks once", async () => {
    extraEntries.push({ id: "switched-a", switch: "NEVER_CUT_ENABLED" });
    try {
      await dismiss("/decks", ["switched-a"]);
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["switched-a"]);
    } finally {
      extraEntries.length = 0;
    }
  });

  it("records an entry the reader's own override shows them, which the gate counts as unseen", async () => {
    resolved.env = { DECK_NOTES_ENABLED: "true" };
    try {
      await dismiss("/decks", ["notes"]);
      expect(requestSwitchEnv).toHaveBeenCalledWith("user_1");
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["notes"]);
    } finally {
      resolved.env = {};
    }
  });

  it("does not mark seen an entry switched on after the page rendered", async () => {
    resolved.env = { DECK_NOTES_ENABLED: "true" };
    try {
      await dismiss("/decks", []);
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
    } finally {
      resolved.env = {};
    }
  });

  it("refuses an id the reader's switches do not draw: a caller can drop one, never add one", async () => {
    await dismiss("/decks", ["notes", "made-up"]);
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
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
  it("records the current version and the switched entries the page showed", async () => {
    await recordAboutVisit([]);
    expect(requireUserId).toHaveBeenCalledOnce();
    // No shipped entry has a switch yet, so the ids are empty; the entry-level rule is
    // `visible.test.ts`'s, and the stored union is `read.test.ts`'s.
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
  });

  it("records every switched entry the page showed that the reader's switches draw, and only those", async () => {
    extraEntries.push({ id: "locked-cards", switch: "NEVER_CUT_ENABLED" });
    try {
      await recordAboutVisit(["locked-cards", "made-up"]);
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["locked-cards"]);
    } finally {
      extraEntries.length = 0;
    }
  });

  // The appendix is seen by its id too, while its switch is on (plan 2026-09-28, PR C).
  it("records the appendix's id while HOW_IT_WORKS_ENABLED is on, and not while it is off", async () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    try {
      await recordAboutVisit(["how-it-works"]);
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["how-it-works"]);
    } finally {
      delete process.env.HOW_IT_WORKS_ENABLED;
    }
    markAboutVisited.mockClear();
    await recordAboutVisit(["how-it-works"]);
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
  });

  it("never redirects, so the index stays where the reader is reading it", async () => {
    await recordAboutVisit([]);
    expect(redirect).not.toHaveBeenCalled();
  });
});
