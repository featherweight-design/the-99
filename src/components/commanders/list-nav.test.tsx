import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import {
  commanderDetailHref,
  useAvailNav,
  useRerankAnnouncement,
  useScopeAnnouncement,
  useScopeNav,
  useSortNav,
} from "./list-nav";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("list-nav", () => {
  beforeEach(() => {
    replace.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/commanders");
  });

  describe("useScopeNav", () => {
    it("writes the non-default scope and drops any sort the owned list cannot show", () => {
      window.history.replaceState(null, "", "/commanders?scope=play&sort=new&c=BG");
      const { result } = renderHook(() => useScopeNav());
      act(() => result.current.go("owned"));
      expect(replace).toHaveBeenCalledWith("?c=BG", { scroll: false });
    });

    it("keeps the discovery scope in the URL, still without a sort", () => {
      window.history.replaceState(null, "", "/commanders?sort=new");
      const { result } = renderHook(() => useScopeNav());
      act(() => result.current.go("play"));
      expect(replace).toHaveBeenCalledWith("?scope=play", { scroll: false });
    });

    // The segmented control fires on its active segment too, and that click is
    // not a flip: routing on it would clear a sort the reader had chosen.
    it("does nothing when the scope showing is already the one asked for", () => {
      window.history.replaceState(null, "", "/commanders?scope=play&sort=new");
      const { result } = renderHook(() => useScopeNav());
      act(() => result.current.go("play"));
      expect(replace).not.toHaveBeenCalled();
      expect(sessionStorage.getItem("commanders:scope-announce")).toBeNull();
    });

    // A bare `?` is a URL the reader would see in their address bar, so the last
    // parameter leaving takes the query string with it.
    it("routes to the bare path when clearing the last parameter", () => {
      window.history.replaceState(null, "", "/commanders?scope=play");
      const { result } = renderHook(() => useScopeNav());
      act(() => result.current.go("owned"));
      expect(replace).toHaveBeenCalledWith("/commanders", { scroll: false });
    });
  });

  // Both defaults serialise as absences, which is what keeps a shared link short.
  describe("useSortNav / useAvailNav", () => {
    it("writes the non-default value and removes the default", () => {
      const sort = renderHook(() => useSortNav());
      act(() => sort.result.current.go("new"));
      expect(replace).toHaveBeenLastCalledWith("?sort=new", { scroll: false });

      window.history.replaceState(null, "", "/commanders?scope=play&sort=new");
      act(() => sort.result.current.go("fit"));
      expect(replace).toHaveBeenLastCalledWith("?scope=play", { scroll: false });
    });

    // Same guard as the scope flip's: these two are server round-trips, and
    // re-choosing the active option would fetch a ranking that did not change.
    it("does nothing when the value asked for is already the active one", () => {
      window.history.replaceState(null, "", "/commanders?scope=play&sort=new");
      const sort = renderHook(() => useSortNav());
      act(() => sort.result.current.go("new"));
      const avail = renderHook(() => useAvailNav());
      act(() => avail.result.current.go("free"));
      expect(replace).not.toHaveBeenCalled();
    });

    it("reads a repeated parameter the way the server does — as an absence", () => {
      // The page compares `sp.sort` against a string, so an array falls to the
      // default. The guard has to agree, or it refuses the one flip that would
      // get the reader out of the URL they arrived on.
      window.history.replaceState(null, "", "/commanders?scope=play&sort=new&sort=fit");
      const { result } = renderHook(() => useSortNav());
      act(() => result.current.go("new"));
      expect(replace).toHaveBeenCalledWith("?scope=play&sort=new", { scroll: false });
    });

    it("leaves every parameter it does not own alone", () => {
      window.history.replaceState(null, "", "/commanders?scope=play&sort=new&c=BG");
      const { result } = renderHook(() => useAvailNav());
      act(() => result.current.go("all"));
      expect(replace).toHaveBeenCalledWith("?scope=play&sort=new&c=BG&avail=all", {
        scroll: false,
      });
    });
  });

  describe("useScopeAnnouncement", () => {
    it("speaks the parked scope once, then never again", () => {
      const announce = vi.fn();
      const { rerender } = renderHook(
        ({ count }: { count: number }) =>
          useScopeAnnouncement("play", count, "fit", announce),
        { initialProps: { count: 0 } },
      );
      expect(announce).not.toHaveBeenCalled();

      // Park and remount: the flip writes the key, and the list that lands under
      // it reads the key back.
      const nav = renderHook(() => useScopeNav());
      act(() => nav.result.current.go("play"));
      const landed = renderHook(
        ({ count }: { count: number }) =>
          useScopeAnnouncement("play", count, "fit", announce),
        { initialProps: { count: 812 } },
      );
      expect(announce).toHaveBeenCalledWith(
        discoveryCopy.scope.announce("play", 812, "fit"),
      );

      // The key is consumed on arrival, so a later render with a new count is
      // not a second flip.
      landed.rerender({ count: 40 });
      rerender({ count: 40 });
      expect(announce).toHaveBeenCalledTimes(1);
    });

    // The other list's message: reading it here would announce a flip that
    // landed somewhere else.
    it("stays silent when the parked scope is not this list's", () => {
      const announce = vi.fn();
      sessionStorage.setItem("commanders:scope-announce", "owned");
      renderHook(() => useScopeAnnouncement("play", 812, "fit", announce));
      expect(announce).not.toHaveBeenCalled();
    });

    // Consumed even when it is not spoken, so it cannot fire on a later mount.
    it("clears the parked scope whichever list reads it", () => {
      sessionStorage.setItem("commanders:scope-announce", "owned");
      renderHook(() => useScopeAnnouncement("play", 812, "fit", vi.fn()));
      expect(sessionStorage.getItem("commanders:scope-announce")).toBeNull();
    });
  });

  describe("useRerankAnnouncement", () => {
    it("fires only when the value actually changes", () => {
      const announce = vi.fn();
      const message = (v: string) => `now ${v}`;
      const { rerender } = renderHook(
        ({ value }: { value: string }) =>
          useRerankAnnouncement(value, message, announce),
        { initialProps: { value: "fit" } },
      );
      expect(announce).not.toHaveBeenCalled();

      rerender({ value: "new" });
      expect(announce).toHaveBeenCalledWith("now new");

      rerender({ value: "new" });
      expect(announce).toHaveBeenCalledTimes(1);
    });
  });

  describe("commanderDetailHref", () => {
    it("carries the free mode the list ranked in", () => {
      expect(commanderDetailHref("atraxa", "free")).toBe("/commanders/atraxa?avail=free");
    });

    // The default is an absence, the same way every other list parameter is
    // serialised — a shared link should be the short one.
    it("leaves the canonical mode out of the URL", () => {
      expect(commanderDetailHref("atraxa", "all")).toBe("/commanders/atraxa");
    });
  });

});
