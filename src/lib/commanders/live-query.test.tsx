// The subscription exists for one event React cannot see: a navigation landing
// back on the route the component already occupies. It keeps the tree mounted
// with identical props, and `useSearchParams` stays silent — so without this the
// lane sits on state the URL has moved away from.
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLiveQuery } from "./live-query";

function Probe() {
  return <output data-testid="q">{useLiveQuery("a=server") || "(empty)"}</output>;
}

const shown = () => screen.getByTestId("q").textContent;

afterEach(() => window.history.replaceState(null, "", "/commanders"));

describe("useLiveQuery", () => {
  it("reads the query as it stands, without the leading ?", () => {
    window.history.replaceState(null, "", "/commanders?a=free");
    render(<Probe />);
    expect(shown()).toBe("a=free");
  });

  it("follows a pushState, which is how the router navigates", () => {
    window.history.replaceState(null, "", "/commanders?a=free");
    render(<Probe />);
    act(() => {
      window.history.pushState(null, "", "/commanders");
    });
    expect(shown()).toBe("(empty)");
  });

  it("follows a replaceState, which is how the rack mirrors itself", () => {
    render(<Probe />);
    act(() => {
      window.history.replaceState(null, "", "/commanders?c=r");
    });
    expect(shown()).toBe("c=r");
  });

  // jsdom fires `popstate` on a task of its own, so this one awaits it rather
  // than asserting inside the same tick.
  it("follows a back navigation", async () => {
    render(<Probe />);
    act(() => {
      window.history.pushState(null, "", "/commanders?a=free");
    });
    expect(shown()).toBe("a=free");

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(shown()).toBe("(empty)");
  });

  // The patch delegates rather than intercepts: whatever was there — Next's own
  // patched version, in the app — still runs, and still returns what it returned.
  it("leaves the history write itself working", () => {
    render(<Probe />);
    act(() => {
      window.history.replaceState({ marker: 1 }, "", "/commanders?q=krenko");
    });
    expect(window.location.search).toBe("?q=krenko");
    expect(window.history.state).toEqual({ marker: 1 });
  });
});
