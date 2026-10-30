// @vitest-environment jsdom
// What `ph-no-capture` actually does to autocapture, with the REAL posthog-js (the pinned 1.412.1) on the production
// options, not a mock: the PersonName components are only as good as this. Autocapture is on in production
// (`posthogOptions`); here every event is caught in `before_send` and never sent.
//
// What it pins (plan risk 6):
// - the class on the clicked element or a DOM ancestor drops the whole event;
// - posthog-js walks DOM PARENTS, so a React ancestor's class does NOT reach a child rendered through a portal
//   (a sheet, a menu, a deck toast): marking an ancestor is never enough, which is why `PersonName`, `PersonText` and
//   `personAttrs` put the class on the element holding the name itself;
// - a marked name nested in a clicked button is left out of the event's text and its elements chain, in a portal too.
import { fireEvent, render, screen } from "@testing-library/react";
import posthog, { type CaptureResult } from "posthog-js";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { posthogOptions } from "../analytics/posthog";
import { NO_CAPTURE, PersonName, PersonText, personAttrs, personText } from "./index";
import { named } from "./mint";

const ANA = named("Ana Example");
const events: CaptureResult[] = [];
const autocaptured = () => events.filter((e) => e.event === "$autocapture");
const chainOf = (e: CaptureResult) => String(e.properties.$elements_chain ?? "");

/** Renders `children` into `document.body` through a portal, from inside `wrapper`'s tree. */
const Portal = ({ children }: { children: ReactNode }) => createPortal(children, document.body);

beforeAll(() => {
  // Nothing leaves the test: no remote config, no flags, and `before_send` drops every event after recording it.
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  posthog.init("phc_personname_test", {
    ...posthogOptions("https://ph.invalid"),
    autocapture: true,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    rageclick: false,
    persistence: "memory",
    disable_external_dependency_loading: true,
    // jsdom's user agent reads as a bot, and a bot's events are dropped before `before_send`.
    opt_out_useragent_filter: true,
    before_send: (e) => {
      if (e) events.push(e);
      return null;
    },
  });
  // Autocapture starts only once the server has not opted the project out; say so, as `/flags` would.
  posthog.autocapture?.onRemoteConfig({ ok: true, config: { autocapture_opt_out: false } as never });
});

beforeEach(() => {
  events.length = 0;
});

describe("ph-no-capture with posthog-js autocapture", () => {
  it("records a plain click, with its text (the harness works, so a drop below is a drop)", () => {
    render(<button type="button">Open</button>);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(autocaptured()).toHaveLength(1);
    expect(autocaptured()[0].properties.$el_text).toBe("Open");
  });

  it("drops a click under a marked DOM ancestor", () => {
    render(
      <div className={NO_CAPTURE}>
        <button type="button">Ana Example</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(autocaptured()).toHaveLength(0);
  });

  it("does NOT drop a click in a portal whose React ancestor is marked: posthog-js walks the DOM, not React", () => {
    render(
      <div className={NO_CAPTURE}>
        <Portal>
          <button type="button">Ana Example</button>
        </Portal>
      </div>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(autocaptured()).toHaveLength(1);
    expect(autocaptured()[0].properties.$el_text).toBe("Ana Example");
  });

  it("keeps a PersonName out of a portalled button's event: the class is on the name's own span", () => {
    render(
      <div>
        <Portal>
          <button type="button">
            Remove <PersonName n={ANA} />
          </button>
        </Portal>
      </div>,
    );
    const button = screen.getByRole("button");
    expect(button.textContent).toBe("Remove Ana Example");
    fireEvent.click(button);
    expect(autocaptured()).toHaveLength(1);
    expect(autocaptured()[0].properties.$el_text).toBe("Remove");
    expect(chainOf(autocaptured()[0])).not.toContain("Ana");
  });

  it("drops a click that lands on the name itself", () => {
    render(
      <Portal>
        <button type="button">
          Remove <PersonName n={ANA} />
        </button>
      </Portal>,
    );
    fireEvent.click(screen.getByText("Ana Example"));
    expect(autocaptured()).toHaveLength(0);
  });

  // PersonText is held to its OWN class here, inside the clicked button: a sibling of the target never reaches the
  // event (posthog-js builds `$elements_chain` from the target and its DOM parents, and a button's or link's `$el_text`
  // from its own text and nested spans), so only a name inside the press can leak. The unmarked twin is the control:
  // the same span without `ph-no-capture` puts the name in both properties, so the first button passes only because of
  // the class.
  it("keeps a PersonText line inside a portalled button out of its event; the same span unmarked would leak", () => {
    const line = personText`Open ${ANA}’s decks`;
    render(
      <Portal>
        <button type="button" data-testid="marked"><PersonText text={line} /></button>
        <button type="button" data-testid="unmarked"><span>Open Ana Example’s decks</span></button>
      </Portal>,
    );
    fireEvent.click(screen.getByTestId("marked"));
    expect(autocaptured()).toHaveLength(1);
    expect(String(autocaptured()[0].properties.$el_text ?? "")).not.toContain("Ana");
    expect(chainOf(autocaptured()[0])).not.toContain("Ana");
    fireEvent.click(screen.getByTestId("unmarked"));
    expect(autocaptured()).toHaveLength(2);
    expect(autocaptured()[1].properties.$el_text).toBe("Open Ana Example’s decks");
    expect(chainOf(autocaptured()[1])).toContain("Ana Example");
  });

  it("drops a click on an element whose attribute names someone (personAttrs marks it)", () => {
    render(
      <Portal>
        <button type="button" {...personAttrs({ "aria-label": personText`Remove ${ANA}` }, "rounded")}>✕</button>
      </Portal>,
    );
    const button = screen.getByRole("button", { name: "Remove Ana Example" });
    expect(button.className).toBe(`rounded ${NO_CAPTURE}`);
    fireEvent.click(button);
    expect(autocaptured()).toHaveLength(0);
  });

  it("leaves the reader's own name unmarked: a plain string is drawn and captured as before", () => {
    render(
      <button type="button" {...personAttrs({ "aria-label": personText`Edit ${"Hugh"}` })}>
        <PersonName n="Hugh" />
      </button>,
    );
    const button = screen.getByRole("button", { name: "Edit Hugh" });
    expect(button.className).toBe("");
    fireEvent.click(button);
    expect(autocaptured()).toHaveLength(1);
    expect(autocaptured()[0].properties.$el_text).toBe("Hugh");
  });
});
