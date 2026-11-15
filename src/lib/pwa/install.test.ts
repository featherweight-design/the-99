import { afterEach, describe, expect, it } from "vitest";
import { INSTALL_PROMPT_CAPTURE, iosBrowser, iphoneInstallBrowser, takeEarlyPrompt, type BeforeInstallPromptEvent } from "./install-detect";
import { DISMISSAL_KEY, dismissOnce, dismissalState } from "./install-dismissal";
import { removeRaw, writeRaw } from "../../components/ui/local-store";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const CHROME_IOS = IPHONE.replace("Version/18.0", "CriOS/129.0");
const ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

const FIREFOX_IOS = IPHONE.replace("Version/18.0", "FxiOS/130.0");
const EDGE_IOS = IPHONE.replace("Version/18.0", "EdgiOS/129.0");
const INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0";
const GMAIL_LIKE_WEBVIEW = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPAD = IPHONE.replace("iPhone; CPU iPhone OS", "iPad; CPU OS");

describe("iosBrowser", () => {
  it("names the browser behind an iOS user agent", () => {
    expect(iosBrowser(IPHONE)).toBe("safari");
    expect(iosBrowser(CHROME_IOS)).toBe("chrome");
    expect(iosBrowser(FIREFOX_IOS)).toBe("firefox");
    expect(iosBrowser(EDGE_IOS)).toBe("other");
    expect(iosBrowser(IPAD)).toBe("safari");
  });
  it("calls an in-app web view a web view, with or without a Safari token", () => {
    expect(iosBrowser(INSTAGRAM)).toBe("webview");
    expect(iosBrowser(GMAIL_LIKE_WEBVIEW)).toBe("webview");
    expect(iosBrowser(IPHONE.replace("Mobile/15E148", "Mobile/15E148 FBAV/450.0"))).toBe("webview");
  });
  it("is null off iOS, including an iPad on the desktop site", () => {
    expect(iosBrowser(ANDROID)).toBeNull();
    expect(iosBrowser(IPAD_AS_MAC)).toBeNull();
  });
});

describe("iphoneInstallBrowser", () => {
  it("is Safari, Chrome or Firefox on an iPhone: the browsers whose steps are sourced", () => {
    expect(iphoneInstallBrowser(IPHONE)).toBe("safari");
    expect(iphoneInstallBrowser(CHROME_IOS)).toBe("chrome");
    expect(iphoneInstallBrowser(FIREFOX_IOS)).toBe("firefox");
  });
  it("is null for an iPad, Edge, an in-app web view, or Android: no slot rather than wrong steps", () => {
    expect(iphoneInstallBrowser(IPAD_AS_MAC)).toBeNull();
    expect(iphoneInstallBrowser(IPAD)).toBeNull();
    expect(iphoneInstallBrowser(IPAD.replace("Version/18.0", "CriOS/129.0"))).toBeNull();
    expect(iphoneInstallBrowser(EDGE_IOS)).toBeNull();
    expect(iphoneInstallBrowser(INSTAGRAM)).toBeNull();
    expect(iphoneInstallBrowser(ANDROID)).toBeNull();
  });
});

describe("takeEarlyPrompt", () => {
  it("hands over the offer the head script kept, once", () => {
    const event = new Event("beforeinstallprompt") as BeforeInstallPromptEvent;
    window.__the99InstallPrompt = event;
    expect(takeEarlyPrompt()).toBe(event);
    expect(takeEarlyPrompt()).toBeNull();
  });
  it("the head script keeps the offer and cancels the browser's own banner", () => {
    new Function(INSTALL_PROMPT_CAPTURE)();
    const event = new Event("beforeinstallprompt", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(takeEarlyPrompt()).toBe(event);
  });
});

describe("install dismissal", () => {
  afterEach(() => removeRaw(DISMISSAL_KEY));
  const day = 24 * 60 * 60 * 1000;
  const t0 = new Date("2026-10-14T12:00:00Z");

  it("is quiet for 30 days after the first dismiss, then asks again", () => {
    expect(dismissalState(t0)).toBe("active");
    dismissOnce(t0);
    expect(dismissalState(new Date(t0.getTime() + 29 * day))).toBe("quiet");
    expect(dismissalState(new Date(t0.getTime() + 31 * day))).toBe("active");
  });
  it("retires for good at the second dismiss", () => {
    dismissOnce(t0);
    dismissOnce(new Date(t0.getTime() + 40 * day));
    expect(dismissalState(new Date(t0.getTime() + 400 * day))).toBe("retired");
    dismissOnce(new Date(t0.getTime() + 500 * day));
    expect(dismissalState(new Date(t0.getTime() + 600 * day))).toBe("retired");
  });
  it("reads a record it does not recognize as no dismiss at all", () => {
    for (const raw of ["not json", '{"count":"1"}', '{"count":7,"firstDismissedAt":"2026-01-01"}', '{"count":1,"firstDismissedAt":"nope"}']) {
      writeRaw(DISMISSAL_KEY, raw);
      expect(dismissalState(t0)).toBe("active");
    }
  });
});
