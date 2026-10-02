import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { useStoredView } from "./use-stored-view";

const KEY = "the99:test-view";

type Segment = "list" | "card";
const isSegment = (value: string): value is Segment => value === "list" || value === "card";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("useStoredView", () => {
  it("reports no choice until this browser has made one", () => {
    const { result } = renderHook(() => useStoredView(KEY, isSegment));
    expect(result.current[0]).toBeNull();
  });

  it("reports the choice a past visit stored", () => {
    localStorage.setItem(KEY, "card");
    const { result } = renderHook(() => useStoredView(KEY, isSegment));
    expect(result.current[0]).toBe("card");
  });

  it("keeps a choice, and tells the caller about it in the same pass", () => {
    const { result } = renderHook(() => useStoredView(KEY, isSegment));
    act(() => result.current[1]("card"));
    expect(result.current[0]).toBe("card");
    expect(localStorage.getItem(KEY)).toBe("card");
  });

  // A view that was renamed, or a key some other build wrote, is absence — the
  // caller's own default — rather than a value passed through to a component
  // that has no such segment to draw.
  it("treats a stored value that is no longer a view as no choice", () => {
    localStorage.setItem(KEY, "gallery");
    const { result } = renderHook(() => useStoredView(KEY, isSegment));
    expect(result.current[0]).toBeNull();
  });

  // Two surfaces carry the toggle and each keeps its own habit, so the keys
  // have to be independent of one another.
  it("keeps one key's choice out of another's", () => {
    localStorage.setItem(KEY, "card");
    const { result } = renderHook(() => useStoredView("the99:other-view", isSegment));
    expect(result.current[0]).toBeNull();
  });

  // The store the hook reads through holds a session fallback for a storage
  // that refuses the write — Safari private mode, a full quota. The choice has
  // to settle for this tab whatever storage did with it.
  it("settles the choice even when storage refuses to keep it", () => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      const { result } = renderHook(() => useStoredView(KEY, isSegment));
      act(() => result.current[1]("card"));
      expect(result.current[0]).toBe("card");
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});

// The cookie mirror, opt-in for `/collection` (its rows-then-grid flash). The deck callers pass
// nothing and must behave exactly as before: no cookie written, and no choice at the server.
describe("useStoredView's cookie mirror", () => {
  const COOKIE = "test_view";
  const clearCookie = () => {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0`;
  };
  const cookieValue = () =>
    document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.split("=")[1] ?? null;
  beforeEach(clearCookie);
  afterEach(clearCookie);

  function Probe({ mirror }: { mirror?: { cookie: string; serverValue: Segment | null } }) {
    const [chosen] = useStoredView(KEY, isSegment, mirror);
    return <span>{chosen ?? "none"}</span>;
  }

  it("leaves a caller with no mirror exactly as it was", () => {
    expect(renderToString(<Probe />)).toContain("none");
    localStorage.setItem(KEY, "card");
    const { result } = renderHook(() => useStoredView(KEY, isSegment));
    act(() => result.current[1]("list"));
    expect(result.current[0]).toBe("list");
    expect(cookieValue()).toBeNull();
  });

  it("draws the cookie's choice at the server, where storage cannot reach", () => {
    expect(renderToString(<Probe mirror={{ cookie: COOKIE, serverValue: "card" }} />)).toContain("card");
  });

  it("mirrors every choice into the cookie", () => {
    const { result } = renderHook(() => useStoredView(KEY, isSegment, { cookie: COOKIE, serverValue: null }));
    act(() => result.current[1]("card"));
    expect(cookieValue()).toBe("card");
  });

  // A reader who chose before the mirror existed: the choice is in storage and the server read
  // no cookie. Writing it once is what lets the next visit draw it.
  it("writes a stored choice the cookie does not carry yet", () => {
    localStorage.setItem(KEY, "card");
    renderHook(() => useStoredView(KEY, isSegment, { cookie: COOKIE, serverValue: null }));
    expect(cookieValue()).toBe("card");
  });

  it("keeps the cookie's answer when storage is empty, so nothing flips after hydration", () => {
    const { result } = renderHook(() => useStoredView(KEY, isSegment, { cookie: COOKIE, serverValue: "card" }));
    expect(result.current[0]).toBe("card");
  });
});
