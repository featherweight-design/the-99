// The device row's rule (push handoff `STATES-push.md`): facts in, one of the six states out, and the words and
// payload the column hands the server.
import { describe, expect, it } from "vitest";
import { applicationServerKey, deviceLabel, devicePayload, deviceState, deviceWord, iosTooOld, iosVersion, type DeviceFacts } from "./device";

const desktop: DeviceFacts = { ios: null, standalone: false, phone: false, pushApi: true, registration: true, permission: "default", subscribed: false };

describe("deviceState", () => {
  it("Not on yet: permission never asked", () => {
    expect(deviceState(desktop)).toBe("not-on");
  });

  it("On: granted and this browser subscribed", () => {
    expect(deviceState({ ...desktop, permission: "granted", subscribed: true })).toBe("on");
  });

  it("Off here: granted, no subscription (the reader unticked the row)", () => {
    expect(deviceState({ ...desktop, permission: "granted" })).toBe("off-here");
  });

  it("Blocked: permission denied, subscribed or not", () => {
    expect(deviceState({ ...desktop, permission: "denied" })).toBe("blocked");
    expect(deviceState({ ...desktop, permission: "denied", subscribed: true })).toBe("blocked");
  });

  it("Needs Home Screen: iOS 16.4 or later in a browser tab, whatever the browser reports of push", () => {
    expect(deviceState({ ...desktop, ios: [16, 4], pushApi: false, registration: false })).toBe("home-screen");
    expect(deviceState({ ...desktop, ios: [17, 2] })).toBe("home-screen");
  });

  it("an installed iPhone behaves as any other device", () => {
    const installed = { ...desktop, ios: [17, 0] as const, standalone: true };
    expect(deviceState(installed)).toBe("not-on");
    expect(deviceState({ ...installed, permission: "granted", subscribed: true })).toBe("on");
    expect(deviceState({ ...installed, permission: "denied" })).toBe("blocked");
  });

  it("Can't: iOS before 16.4, installed or not", () => {
    expect(deviceState({ ...desktop, ios: [16, 3] })).toBe("cant");
    expect(deviceState({ ...desktop, ios: [15, 7], standalone: true })).toBe("cant");
    expect(iosTooOld({ ios: [16, 3] })).toBe(true);
    expect(iosTooOld({ ios: [16, 4] })).toBe(false);
    expect(iosTooOld({ ios: null })).toBe(false);
  });

  it("Can't: no Push API, or no service worker registered (development, or a worker that never came)", () => {
    expect(deviceState({ ...desktop, pushApi: false })).toBe("cant");
    expect(deviceState({ ...desktop, registration: false, permission: "granted", subscribed: true })).toBe("cant");
  });
});

describe("deviceWord", () => {
  it("phone for a phone-sized touch device, browser on a computer, iPhone on iOS in Safari or installed", () => {
    expect(deviceWord({ ios: null, phone: true })).toBe("phone");
    expect(deviceWord({ ios: null, phone: false })).toBe("browser");
    expect(deviceWord({ ios: [17, 0], phone: true })).toBe("iPhone");
  });
});

describe("iosVersion", () => {
  it("reads the version from an iPhone's and an iPad's user agent, and null off iOS", () => {
    expect(iosVersion("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1")).toEqual([17, 4]);
    expect(iosVersion("Mozilla/5.0 (iPad; CPU OS 16_3 like Mac OS X) AppleWebKit/605.1.15")).toEqual([16, 3]);
    expect(iosVersion("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36")).toBeNull();
  });
});

describe("deviceLabel", () => {
  it("names the browser and the system, never the raw user agent", () => {
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36")).toBe("Chrome on Android");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1")).toBe("Safari on iPhone");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0")).toBe("Edge on Windows");
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:126.0) Gecko/20100101 Firefox/126.0")).toBe("Firefox on macOS");
  });
});

describe("devicePayload and applicationServerKey", () => {
  it("flattens the subscription's JSON into what parseDevice takes", () => {
    const json = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "P", auth: "A" } };
    expect(devicePayload(json, "Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0 Safari/537.36", "Europe/Dublin")).toEqual({
      endpoint: json.endpoint, p256dh: "P", auth: "A", userAgent: "Chrome on Linux", timeZone: "Europe/Dublin",
    });
  });

  it("decodes a base64url key to its bytes", () => {
    const bytes = Uint8Array.from([0x04, 0xff, 0xfe, 0x00, 0x3e, 0x3f]);
    const b64url = Buffer.from(bytes).toString("base64url");
    expect(Array.from(applicationServerKey(b64url))).toEqual(Array.from(bytes));
  });
});
