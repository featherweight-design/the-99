import { afterEach, describe, expect, it } from "vitest";
import { isIosSafari } from "./install-detect";
import { DISMISSAL_KEY, dismissOnce, dismissalState } from "./install-dismissal";
import { removeRaw, writeRaw } from "../../components/ui/local-store";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const CHROME_IOS = IPHONE.replace("Version/18.0", "CriOS/129.0");
const ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

describe("isIosSafari", () => {
  it("is Safari on an iPhone, and on an iPad that reports a Mac's user agent", () => {
    expect(isIosSafari(IPHONE, 5)).toBe(true);
    expect(isIosSafari(IPAD_AS_MAC, 5)).toBe(true);
  });
  it("is not a real Mac, Chrome on iOS, or Android", () => {
    expect(isIosSafari(IPAD_AS_MAC, 0)).toBe(false);
    expect(isIosSafari(CHROME_IOS, 5)).toBe(false);
    expect(isIosSafari(ANDROID, 5)).toBe(false);
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
