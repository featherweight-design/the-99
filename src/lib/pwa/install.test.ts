import { afterEach, describe, expect, it } from "vitest";
import { INSTALL_PROMPT_CAPTURE, isIphoneSafari, takeEarlyPrompt, type BeforeInstallPromptEvent } from "./install-detect";
import { DISMISSAL_KEY, dismissOnce, dismissalState } from "./install-dismissal";
import { removeRaw, writeRaw } from "../../components/ui/local-store";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const CHROME_IOS = IPHONE.replace("Version/18.0", "CriOS/129.0");
const ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

describe("isIphoneSafari", () => {
  it("is Safari on an iPhone", () => {
    expect(isIphoneSafari(IPHONE)).toBe(true);
  });
  it("is not an iPad, Chrome on iOS, or Android: the sheet's steps are the iPhone's", () => {
    expect(isIphoneSafari(IPAD_AS_MAC)).toBe(false);
    expect(isIphoneSafari(IPHONE.replace("iPhone; CPU iPhone OS", "iPad; CPU OS"))).toBe(false);
    expect(isIphoneSafari(CHROME_IOS)).toBe(false);
    expect(isIphoneSafari(ANDROID)).toBe(false);
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
