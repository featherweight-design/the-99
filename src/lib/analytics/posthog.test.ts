import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { posthog } = vi.hoisted(() => ({
  posthog: { init: vi.fn(), register: vi.fn(), identify: vi.fn(), reset: vi.fn(), get_property: vi.fn() },
}));
vi.mock("posthog-js", () => ({ default: posthog }));

type Module = typeof import("./posthog");
async function load(): Promise<Module> {
  vi.resetModules();
  return import("./posthog");
}
const SHA = "0123456789abcdef0123456789abcdef01234567";
const LIVE = { key: "phc_test", host: undefined, commitSha: SHA, hostname: "the-99.dev" };
/** The identify/reset calls chain on the started client: let its promise settle. */
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("startAnalytics", () => {
  it("is a no-op without a key, an empty key included", async () => {
    for (const key of [undefined, "", "  "]) {
      const m = await load();
      expect(await m.startAnalytics({ ...LIVE, key })).toBeNull();
    }
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("is a no-op off the production hostname, even with a key", async () => {
    for (const hostname of ["staging.the-99.dev", "localhost", "the-99-git-main.vercel.app"]) {
      const m = await load();
      expect(await m.startAnalytics({ ...LIVE, hostname })).toBeNull();
    }
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("inits once on production with usage basics and no replay", async () => {
    const m = await load();
    await m.startAnalytics(LIVE);
    await m.startAnalytics({ ...LIVE, hostname: "www.the-99.dev" });
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith("phc_test", {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      mask_all_text: false,
      mask_all_element_attributes: false,
      capture_pageview: "history_change",
      capture_pageleave: true,
      disable_session_recording: true,
      respect_dnt: true,
      person_profiles: "identified_only",
      before_send: m.redactCapture,
      advanced_disable_flags: true,
    });
  });

  it("pauses clicks but keeps pageviews and pageleaves", async () => {
    const { posthogOptions } = await load();
    const options = posthogOptions("https://us.i.posthog.com");
    expect(options.autocapture).toBe(false);
    expect(options.capture_pageview).toBe("history_change");
    expect(options.capture_pageleave).toBe(true);
  });

  it("can identify or reset before the SDK's first pageview, which waits on a timer", async () => {
    vi.useFakeTimers();
    try {
      posthog.get_property.mockReturnValue("identified");
      const m = await load();
      const started = m.startAnalytics(LIVE);
      m.resetReader();
      await started;
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
      // No timer has run, so posthog-js's deferred initial pageview would still be ahead of the reset.
      expect(posthog.init).toHaveBeenCalledTimes(1);
      expect(posthog.reset).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("honours NEXT_PUBLIC_POSTHOG_HOST", async () => {
    const m = await load();
    await m.startAnalytics({ ...LIVE, host: "https://eu.i.posthog.com" });
    expect(posthog.init).toHaveBeenCalledWith("phc_test", expect.objectContaining({ api_host: "https://eu.i.posthog.com" }));
  });

  it("registers the short commit SHA as `release`", async () => {
    const m = await load();
    await m.startAnalytics(LIVE);
    expect(posthog.register).toHaveBeenCalledWith({ release: "0123456" });
  });

  it("resolves to null rather than throwing when init fails", async () => {
    posthog.init.mockImplementationOnce(() => {
      throw new Error("blocked storage");
    });
    const m = await load();
    expect(await m.startAnalytics(LIVE)).toBeNull();
    m.identifyReader("user_1", "Ada");
    await settle();
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

describe("identifyReader and resetReader", () => {
  it("do nothing while dormant", async () => {
    const m = await load();
    await m.startAnalytics({ ...LIVE, key: undefined });
    m.identifyReader("user_1", "Ada");
    m.resetReader();
    await settle();
    expect(posthog.identify).not.toHaveBeenCalled();
    expect(posthog.reset).not.toHaveBeenCalled();
  });

  it("identify with the display name as `name`, or the id alone", async () => {
    const m = await load();
    void m.startAnalytics(LIVE);
    m.identifyReader("user_1", "Ada Lovelace");
    m.identifyReader("user_2", null);
    await settle();
    expect(posthog.identify).toHaveBeenCalledWith("user_1", { name: "Ada Lovelace" });
    expect(posthog.identify).toHaveBeenCalledWith("user_2");
  });

  it("reset an identified browser and leave an anonymous one alone", async () => {
    const m = await load();
    void m.startAnalytics(LIVE);
    posthog.get_property.mockReturnValueOnce("anonymous");
    m.resetReader();
    await settle();
    expect(posthog.reset).not.toHaveBeenCalled();
    posthog.get_property.mockReturnValueOnce("identified");
    m.resetReader();
    await settle();
    expect(posthog.get_property).toHaveBeenCalledWith("$user_state");
    expect(posthog.reset).toHaveBeenCalledTimes(1);
  });

  it("re-register `release` after a reset clears it", async () => {
    const m = await load();
    void m.startAnalytics(LIVE);
    await settle();
    posthog.register.mockClear();
    posthog.get_property.mockReturnValueOnce("identified");
    m.resetReader();
    await settle();
    expect(posthog.register).toHaveBeenCalledWith({ release: "0123456" });
    expect(posthog.reset.mock.invocationCallOrder[0]).toBeLessThan(posthog.register.mock.invocationCallOrder[0]);
  });

  it("never throw when the SDK does", async () => {
    posthog.identify.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const m = await load();
    void m.startAnalytics(LIVE);
    expect(() => m.identifyReader("user_1", "Ada")).not.toThrow();
    await settle();
  });
});

describe("posthogCspHosts", () => {
  it("names nothing without a key", async () => {
    const { posthogCspHosts } = await load();
    expect(posthogCspHosts(undefined, undefined)).toEqual([]);
    expect(posthogCspHosts("", "https://us.i.posthog.com")).toEqual([]);
  });
  it("names the ingest host and its assets twin on PostHog's cloud", async () => {
    const { posthogCspHosts } = await load();
    expect(posthogCspHosts("phc_x", undefined)).toEqual(["https://us.i.posthog.com", "https://us-assets.i.posthog.com"]);
    expect(posthogCspHosts("phc_x", "https://eu.i.posthog.com")).toEqual(["https://eu.i.posthog.com", "https://eu-assets.i.posthog.com"]);
  });
  it("names a custom https host alone and refuses anything else", async () => {
    const { posthogCspHosts } = await load();
    expect(posthogCspHosts("phc_x", "https://e.the-99.dev")).toEqual(["https://e.the-99.dev"]);
    expect(posthogCspHosts("phc_x", "http://e.the-99.dev")).toEqual([]);
    expect(posthogCspHosts("phc_x", "not a url")).toEqual([]);
  });
});

describe("releaseProperties", () => {
  it("leaves `release` off when there is no SHA", async () => {
    const { releaseProperties } = await load();
    expect(releaseProperties(undefined)).toEqual({});
    expect(releaseProperties("")).toEqual({});
  });
});

describe("redactCapture", () => {
  const TOKEN = "f7Kq2LmZ9xYw";
  const base = { uuid: "u1", event: "$pageview", properties: {} };

  it("passes null through", async () => {
    const { redactCapture } = await load();
    expect(redactCapture(null)).toBeNull();
  });

  it("takes the join and friend link tokens out of every URL property", async () => {
    const { redactCapture } = await load();
    for (const route of ["join", "friend"]) {
      const url = `https://the-99.dev/${route}/${TOKEN}?ref=x#top`;
      const out = redactCapture({
        ...base,
        properties: { $current_url: url, $pathname: `/${route}/${TOKEN}`, $referrer: url },
        $set: { $current_url: url },
        $set_once: { $initial_current_url: url },
      });
      expect(JSON.stringify(out)).not.toContain(TOKEN);
      expect(out?.properties.$current_url).toBe(`https://the-99.dev/${route}/[redacted]`);
      expect(out?.properties.$pathname).toBe(`/${route}/[redacted]`);
    }
  });

  it("takes the token out of an autocaptured link and keeps its text", async () => {
    const { redactCapture } = await load();
    const out = redactCapture({
      ...base,
      event: "$autocapture",
      properties: {
        $elements_chain: `a:attr__href="/friend/${TOKEN}"text="Open"`,
        $elements: [{ tag_name: "a", attr__href: `/friend/${TOKEN}`, $el_text: "Open" }],
      },
    });
    expect(JSON.stringify(out)).not.toContain(TOKEN);
    expect(out?.properties.$elements_chain).toBe(`a:attr__href="/friend/[redacted]"text="Open"`);
    expect(out?.properties.$elements[0].$el_text).toBe("Open");
  });

  it("cuts a URL at its first ? or #, an apostrophe included, and keeps plain text", async () => {
    const { redactAnalyticsString, redactElementsChain, redactCapture } = await load();
    expect(redactAnalyticsString("https://the-99.dev/discover?q=atraxa")).toBe("https://the-99.dev/discover");
    expect(redactAnalyticsString("https://the-99.dev/discover#q=O'Brien-private")).toBe("https://the-99.dev/discover");
    expect(redactAnalyticsString("/collection?q=sol+ring#top")).toBe("/collection");
    expect(redactAnalyticsString("Ready? and/or later?")).toBe("Ready? and/or later?");
    expect(
      redactElementsChain(`a:attr__href="/join/${TOKEN}"href="/discover?q=O'Brien-private"nth-child="1"text="O'Brien";div:nth-child="2"`),
    ).toBe(`a:attr__href="/join/[redacted]"href="/discover"nth-child="1"text="O'Brien";div:nth-child="2"`);
    expect(redactElementsChain('button:text="Say \\"hi\\""')).toBe('button:text="Say \\"hi\\""');
    expect(redactCapture({ ...base, properties: { n: 3, ok: true, none: null } })?.properties).toEqual({ n: 3, ok: true, none: null });
  });
});
