/**
 * The device row's state (push handoff `STATES-push.md`, "The device row"), as a pure rule over facts the browser
 * reports: facts in, state out. The component gathers the facts (`readDeviceFacts` in `device-browser.ts`, the one place that touches
 * `window`) and this decides, so every state is tested without a browser.
 *
 * Client-safe: nothing here imports a server module.
 */
import type { DeviceWord } from "../copy/push-settings";

export type Permission = "default" | "granted" | "denied";

export type DeviceFacts = {
  /** The iOS version on an iPhone, iPod or iPad that says so (`[major, minor]`), else null. */
  ios: readonly [number, number] | null;
  /** Running as the installed app (`display-mode: standalone`, or Safari's `navigator.standalone`). */
  standalone: boolean;
  /** A phone-sized touch device. */
  phone: boolean;
  /** `Notification`, `PushManager` and `navigator.serviceWorker` all exist. */
  pushApi: boolean;
  /** The app's service worker is registered (production only; none means push cannot work here). */
  registration: boolean;
  permission: Permission;
  /** This browser holds a push subscription. */
  subscribed: boolean;
};

export type DeviceState = "not-on" | "on" | "off-here" | "blocked" | "home-screen" | "cant";

/** iOS sends web push from 16.4, and only to an app on the Home Screen. */
export const IOS_PUSH_FROM: readonly [number, number] = [16, 4];

const before = (v: readonly [number, number], floor: readonly [number, number]) => v[0] < floor[0] || (v[0] === floor[0] && v[1] < floor[1]);

/** An iOS before 16.4, which cannot get web push at all (its Can't line names the version). */
export const iosTooOld = (f: Pick<DeviceFacts, "ios">): boolean => f.ios !== null && before(f.ios, IOS_PUSH_FROM);

export function deviceState(f: DeviceFacts): DeviceState {
  if (f.ios) {
    if (iosTooOld(f)) return "cant";
    if (!f.standalone) return "home-screen";
  }
  if (!f.pushApi || !f.registration) return "cant";
  if (f.permission === "denied") return "blocked";
  if (f.permission === "granted") return f.subscribed ? "on" : "off-here";
  return "not-on";
}

/** What the row calls this device. An iOS device is an iPhone, in Safari or installed (board iPhone draws both). */
export const deviceWord = (f: Pick<DeviceFacts, "ios" | "phone">): DeviceWord => (f.ios ? "iPhone" : f.phone ? "phone" : "browser");

/**
 * An iOS version from a user agent (`iPhone OS 17_4`, `CPU OS 16_3`), or null off iOS. An iPad asking for the desktop site
 * says "Macintosh": a touch screen (`maxTouchPoints` over 1, which no Mac has) gives it away, and its version is Safari's
 * (`Version/17.4`).
 */
export function iosVersion(ua: string, maxTouchPoints = 0): [number, number] | null {
  if (/iPhone|iPod|iPad/.test(ua)) {
    const m = /OS (\d+)_(\d+)/.exec(ua);
    return m ? [Number(m[1]), Number(m[2])] : [0, 0];
  }
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) {
    const m = /Version\/(\d+)\.(\d+)/.exec(ua);
    return m ? [Number(m[1]), Number(m[2])] : [0, 0];
  }
  return null;
}

/** A short label for the reader's own device list: `Chrome on Android`. Never the raw user agent. */
export function deviceLabel(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\/|FxiOS/.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPod/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux|CrOS/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

/** The VAPID public key as the bytes `pushManager.subscribe` takes (base64url in, `Uint8Array` out). */
export function applicationServerKey(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** What `subscribeDevice` takes (`parseDevice`, `lib/push/endpoint.ts`): the subscription's JSON flattened, plus the label and the zone. */
export function devicePayload(json: PushSubscriptionJSON, ua: string, timeZone: string) {
  return { endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, userAgent: deviceLabel(ua), timeZone };
}
