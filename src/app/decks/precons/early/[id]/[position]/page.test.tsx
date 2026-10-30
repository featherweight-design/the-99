import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The early list's wiring (announcements STATES 3.3 to 3.5, G4): the switch, the address, the redirect to the release
// list once it is in, and what it hands the open precon's view.
const h = vi.hoisted(() => ({
  env: { ANNOUNCEMENTS_ENABLED: "true" } as Record<string, string>,
  read: null as unknown,
  calls: [] as unknown[][],
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn((to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); }),
}));
vi.mock("../../../../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => h.env }));
vi.mock("../../../../../../lib/announcements/early-list-read", () => ({
  loadEarlyList: async (...args: unknown[]) => { h.calls.push(args); return h.read; },
}));

import EarlyListPage from "./page";
import { OpenPreconView } from "../../../../../../components/decks/precons/open-precon-view";

const visit = (id: string, position: string) => EarlyListPage({ params: Promise.resolve({ id, position }) });

const early = (over: Record<string, unknown> = {}) => ({
  kind: "early",
  precon: { kind: "precon", row: {}, setName: null, cards: [], hasCollection: true, decks: [], addedOn: null, collector: null },
  postUrl: "https://magic.wizards.com/en/news/announcements/x",
  postedAt: "2026-10-29T16:00:00.000Z",
  releasedOn: null,
  unmatched: [{ name: "Seraph of the Dawnfire", count: 1 }],
  ...over,
});

beforeEach(() => {
  h.env = { ANNOUNCEMENTS_ENABLED: "true" };
  h.read = early();
  h.calls = [];
});

describe("/decks/precons/early/[id]/[position]", () => {
  it("is not found while the announcements switch is off, and reads nothing", async () => {
    h.env = {};
    await expect(visit("post1", "0")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.calls).toEqual([]);
  });

  it.each(["x", "1.5", "-1", ""])("is not found at position %j", async (position) => {
    await expect(visit("post1", position)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.calls).toEqual([]);
  });

  it("is not found for an unknown post or position", async () => {
    h.read = null;
    await expect(visit("nope", "3")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.calls).toEqual([["u1", "nope", 3]]);
  });

  it("sends the reader to the release list once it is in (STATES 3.4)", async () => {
    h.read = { kind: "release", fileName: "Calling All Angels_FDC" };
    await expect(visit("post1", "0")).rejects.toThrow("NEXT_REDIRECT /decks/precons/Calling%20All%20Angels_FDC");
  });

  it("draws the open precon's view, view-only, with the early band and the unmatched lines", async () => {
    const el = (await visit("post1", "0")) as ReactElement<Record<string, unknown>>;
    expect(el.type).toBe(OpenPreconView);
    expect(el.props.early).toEqual({
      lead: "Early list, from Wizards’ post on Oct 29.",
      tail: "The release list replaces it when it arrives; then you can start a deck from this precon.",
      postUrl: "https://magic.wizards.com/en/news/announcements/x",
      unmatched: [{ name: "Seraph of the Dawnfire", count: 1 }],
    });
    expect(el.props.overview).toBeUndefined();
  });

  it("says the set is out and the release list is not in yet (STATES 3.5)", async () => {
    h.read = early({ releasedOn: "2026-11-13" });
    const el = (await visit("post1", "0")) as ReactElement<{ early: { lead: string; tail: string } }>;
    expect(el.props.early.lead).toBe("Out Nov 13, but this is still Wizards’ early list:");
    expect(el.props.early.tail).toBe("you can start a deck from this precon once the release list is in.");
  });

  it("links out only to Wizards' own site", async () => {
    h.read = early({ postUrl: "https://evil.example/post" });
    const el = (await visit("post1", "0")) as ReactElement<{ early: { postUrl: string | null } }>;
    expect(el.props.early.postUrl).toBeNull();
  });
});
