import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { commanderDetailHref, laneHref, useRerankAnnouncement } from "./list-nav";

describe("list-nav", () => {
  describe("laneHref", () => {
    it("carries the search to the owned lane", () => {
      expect(laneHref("owned", "atraxa")).toBe("/commanders?q=atraxa");
    });

    it("carries the search to the discover lane", () => {
      expect(laneHref("discover", "atraxa")).toBe("/discover?q=atraxa");
    });

    // A name with a space is the common case, not the exotic one.
    it("encodes the query", () => {
      expect(laneHref("owned", "atraxa, praetors' voice")).toBe(
        "/commanders?q=atraxa%2C%20praetors'%20voice",
      );
    });

    // A bare `?` is a URL the reader would see in their address bar, so nothing
    // to carry means the path travels alone.
    it("drops the query string when there is no search", () => {
      expect(laneHref("owned", "")).toBe("/commanders");
      expect(laneHref("discover", "   ")).toBe("/discover");
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
