// Settings' push column (push handoff R1, calls 1 to 4 and 8; `STATES-push.md`; boards Settings, Device-States,
// The-Ask, iPhone). Every string is a placeholder for `/copy-review`, in the board's own words.
import type { FeedKind } from "../feed/kinds";
import { feedCopy } from "./feed";

/** What the device row calls this device: a phone-sized touch device, a computer's browser, or an iPhone. */
export type DeviceWord = "phone" | "browser" | "iPhone";

export const pushSettingsCopy = {
  /** The section head's right slot, over the push column. */
  head: "Push",
  /** Each kind's push box, by name (the row's text is the Home box's press). */
  kindAria: (kind: FeedKind) => `Push: ${feedCopy.news.kinds[kind].name}`,
  device: {
    title: (word: DeviceWord) => `Push on this ${word}`,
    /** The device box's own name. */
    aria: (word: DeviceWord) => `Push on this ${word}`,
    /** `asker` is who shows the prompt: the browser, or the installed iPhone. */
    notOn: (asker: "browser" | "iPhone") => `Not on yet. Tick here or beside a kind, and your ${asker} asks first.`,
    on: "On. Sends what you tick under Push. Your other devices have their own switch.",
    offHere: "Off on this device. Your ticks are kept.",
    /** The lead is drawn in body ink, the rest muted. */
    blocked: {
      browser: { lead: "Blocked in this browser.", rest: "Allow notifications for the-99.dev in the browser’s site settings, then come back." },
      iPhone: { lead: "Turned off in iPhone Settings › Notifications › The 99.", rest: "" },
    },
    homeScreen: "On iPhone, push works once The 99 is on your Home Screen.",
    how: "How ›",
    cant: "This browser can’t get push notifications. Home still shows everything.",
    oldIos: "Needs iOS 16.4 or later.",
  },
  /** The guidance sheet (board iPhone, frame 2): the shared sheet box with a ✕. */
  sheet: {
    title: "Add The 99 to your Home Screen",
    close: "Close",
    line: "iPhone sends push only to apps on the Home Screen. It takes a moment, and your ticks are kept.",
    steps: [
      { lead: "Tap", glyph: "share", strong: "", rest: " Share in Safari’s bar.", small: "" },
      { lead: "Choose", glyph: "add", strong: "Add to Home Screen", rest: ".", small: "Scroll the list if you don’t see it." },
      { lead: "Open The 99 from your Home Screen.", glyph: null, strong: "", rest: "", small: "Then come back here and tick Push. Your iPhone asks once." },
    ],
    foot: "Needs iOS 16.4 or later.",
  },
  /** The foot where push is possible (call 8); `feedCopy.news.foot` where it is not. `push` is drawn bold. */
  foot: { home: "Home: in the app, a count on Home and the list. ", push: "Push", rest: ": only to devices you turn on, and never 9pm to 9am. No email, ever." },
  /** The shared toast, for a push save or a subscribe that failed. */
  failed: feedCopy.news.failed,
} as const;
