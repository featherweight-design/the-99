"use client";
// Settings' "What's new on Home" section (menu and Home handoff, `Settings.dc.html` `.cks`; plan PR 4): one checkbox
// per news kind AVAILABLE to this reader, in `FEED_KINDS` order (`loadNewsSettings`). A kind whose switch is off for
// them is absent, never drawn disabled. Each box saves as it changes (`saveFeedKinds`, the whole checked set); a write
// that fails puts the set back to what was last saved and says so in the shared social toast, as Spares does. One
// column at both widths; the row is the press, at least 44px tall at every width.
//
// The push column (push handoff R1, calls 1 to 4 and 8; `STATES-push.md`; plan `2026-10-22-push.md` PR 4), only while
// `push` is given (`PUSH_ENABLED` and the VAPID keys): the head's right slot reads Push over a 44px column, each kind
// gains its own push box (its own press, `savePushKinds`, the account's ticks), and the device row leads the list
// (`deviceState`, this device only). The browser's prompt is asked ONLY inside a push tick's press while permission is
// `default`, never on load; a visit with permission granted and a live subscription re-saves it silently (G1). On a
// device that cannot push, the device row says so and the column and the foot's push clause leave. Without `push` the
// section is exactly as shipped.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveFeedKinds } from "../../app/settings/feed-actions";
import { savePushKinds, subscribeDevice, unsubscribeDevice } from "../../app/settings/push-actions";
import { feedCopy } from "../../lib/copy/feed";
import { pushSettingsCopy, type DeviceWord } from "../../lib/copy/push-settings";
import { DEFAULT_ON_KINDS, type FeedKind } from "../../lib/feed/kinds";
import type { NewsSetting } from "../../lib/feed/prefs";
import { applicationServerKey, devicePayload, deviceState, deviceWord, iosTooOld, type DeviceState } from "../../lib/push/device";
import { readDeviceFacts } from "../../lib/push/device-browser";
import { SECTION_HEAD } from "../social/friends-list";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { Checkbox } from "../ui/checkbox";
import { PushHowSheet } from "./push-how-sheet";

const c = feedCopy.news;
const p = pushSettingsCopy;

/** What the server hands the push column: the kinds with push on, and the VAPID PUBLIC key a browser subscribes with. */
export type PushSettings = { publicKey: string; on: FeedKind[] };

/** The device row as drawn: its state, what it calls the device, and the two iPhone variants of its lines. */
type DeviceView = { state: DeviceState; word: DeviceWord; installedIphone: boolean; oldIos: boolean };

const onOf = (kinds: readonly NewsSetting[]): FeedKind[] => kinds.filter((k) => k.on).map((k) => k.kind);

const ROW_SEP = "[&+&]:[border-top:1px_solid_var(--border)]";
const NAME = "font-sans text-[14px] font-medium text-[color:var(--fg)]";
const LINE = "text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]";
/** The push column's cell: its own 44px press, the box on the row's first line (the Home box's 8px pad plus its 1px nudge). */
const PUSH_CELL = "ml-[8px] flex min-h-[44px] w-[44px] flex-none cursor-pointer justify-center pt-[9px]";

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

function Bell() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.6 8.4a4.4 4.4 0 0 1 8.8 0c0 3.7 1.6 5.2 1.6 5.2H4s1.6-1.5 1.6-5.2z" />
      <path d="M8.3 16.2a1.8 1.8 0 0 0 3.4 0" />
    </svg>
  );
}

export function NewsSection({ kinds, push = null }: { kinds: NewsSetting[]; push?: PushSettings | null }) {
  const router = useRouter();
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  const sayFailed = () => setToast({ id: ++toastSeq.current, text: c.failed });

  // The checked set, held from the press; a fresh server value always wins (adjusted during render).
  const [on, setOn] = useState<FeedKind[]>(() => onOf(kinds));
  const [served, setServed] = useState(kinds);
  // The push ticks, the same way.
  const [pushOn, setPushOn] = useState<FeedKind[]>(() => push?.on ?? []);
  const [servedPush, setServedPush] = useState(push?.on);
  if (served !== kinds) {
    setServed(kinds);
    setOn(onOf(kinds));
  }
  if (servedPush !== push?.on) {
    setServedPush(push?.on);
    setPushOn(push?.on ?? []);
  }
  // What the server last accepted: a failure puts this back, never an older press's "before".
  const saved = useRef<FeedKind[]>(onOf(kinds));
  const savedPush = useRef<FeedKind[]>(push?.on ?? []);
  useEffect(() => {
    saved.current = onOf(kinds);
  }, [kinds]);
  useEffect(() => {
    savedPush.current = push?.on ?? [];
  }, [push?.on]);
  // One save at a time, across BOTH columns: while a save is in flight every box waits, so a redraw from that save can
  // never land over a newer, still-unsaved press (the stepper's rule beside it, PR 3 review round 2).
  const [saving, setSaving] = useState(false);

  // This device: unknown until the browser has been read (the server cannot know it), then one of the six states.
  const [device, setDevice] = useState<DeviceView | null>(null);
  // A subscribe or unsubscribe in flight holds the device box.
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const subscription = useRef<PushSubscription | null>(null);
  const pushWanted = push !== null;
  const publicKey = push?.publicKey;

  useEffect(() => {
    if (!pushWanted || !publicKey) return;
    let live = true;
    void readDeviceFacts().then(({ facts, registration: reg, subscription: sub }) => {
      if (!live) return;
      registration.current = reg;
      subscription.current = sub;
      const state = deviceState(facts);
      setDevice({
        state,
        word: deviceWord(facts),
        installedIphone: facts.ios !== null && facts.standalone,
        oldIos: iosTooOld(facts),
      });
      // The heartbeat (handoff G1): permission still granted and a live subscription, so re-save it, refreshing the
      // device's zone and last seen and restoring a row the sender deleted on a 404 or 410. Never a prompt.
      if (state === "on" && sub) {
        void subscribeDevice(devicePayload(sub.toJSON(), navigator.userAgent, timeZone())).catch(() => undefined);
      }
    }).catch(() => {
      if (live) setDevice({ state: "cant", word: "browser", installedIphone: false, oldIos: false });
    });
    return () => {
      live = false;
    };
  }, [pushWanted, publicKey]);

  if (kinds.length === 0) return null;

  // The column is drawn while push is available and this device is not one that cannot push. While the device is
  // still being read the column stands, its boxes held, so a device that can push (nearly every one) never jumps.
  const column = push !== null && device?.state !== "cant";
  const offered = kinds.map((k) => k.kind);

  async function toggle(kind: FeedKind, checked: boolean) {
    if (saving) return;
    const next = offered.filter((k) => (k === kind ? checked : on.includes(k)));
    setOn(next);
    setSaving(true);
    const fail = () => {
      setOn(saved.current);
      sayFailed();
    };
    try {
      const r = await saveFeedKinds(next, offered);
      if (r.ok) {
        saved.current = next;
        // A redraw that landed while this save was pending (another section's save) carried the old choices.
        setOn(next);
      }
      else if (r.reason === "off") router.refresh();
      else {
        // Refused: the kinds this page offered may have changed under it (a switch went off), so draw the current ones.
        fail();
        router.refresh();
      }
    } catch {
      fail();
    } finally {
      setSaving(false);
    }
  }

  /**
   * Turns push on for this device. With `ask`, the browser's prompt comes first: this is called synchronously from a
   * push tick's press, so `requestPermission` runs inside that press (the user gesture the browser requires).
   * Allow subscribes and the row reads On; Block reads Blocked; closed without a choice stays Not on yet. A subscribe
   * or save that fails leaves the row as it was and says so in the shared toast.
   */
  async function turnOn(ask: boolean) {
    if (!push || !device) return;
    const was = device.state;
    setDeviceBusy(true);
    try {
      if (ask) {
        const answer = await Notification.requestPermission();
        if (answer === "denied") return setDevice((d) => d && { ...d, state: "blocked" });
        if (answer !== "granted") return setDevice((d) => d && { ...d, state: "not-on" });
      }
      const reg = registration.current;
      if (!reg) throw new Error("no service worker");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(push.publicKey) });
      let r: Awaited<ReturnType<typeof subscribeDevice>>;
      try {
        r = await subscribeDevice(devicePayload(sub.toJSON(), navigator.userAgent, timeZone()));
      } catch (e) {
        await sub.unsubscribe().catch(() => false);
        throw e;
      }
      if (!r.ok) {
        // The server did not keep it, so neither does the browser: the row stays what it said.
        await sub.unsubscribe().catch(() => false);
        if (r.reason === "off") return router.refresh();
        throw new Error(r.reason);
      }
      subscription.current = sub;
      setDevice((d) => d && { ...d, state: "on" });
    } catch {
      setDevice((d) => d && { ...d, state: was });
      sayFailed();
    } finally {
      setDeviceBusy(false);
    }
  }

  /** The device row unticked: this browser's subscription leaves, the server's row with it, and the ticks stay. */
  async function turnOff() {
    const sub = subscription.current;
    setDeviceBusy(true);
    try {
      if (sub) {
        const [server, browser] = await Promise.allSettled([unsubscribeDevice(sub.endpoint), sub.unsubscribe()]);
        if (browser.status === "rejected" || browser.value === false) throw new Error("unsubscribe");
        if (server.status === "rejected") throw new Error("server");
      }
      subscription.current = null;
      setDevice((d) => d && { ...d, state: "off-here" });
    } catch {
      sayFailed();
    } finally {
      setDeviceBusy(false);
    }
  }

  function toggleDevice(checked: boolean) {
    if (!device || deviceBusy) return;
    if (device.state === "home-screen") return setSheet(true);
    if (checked && device.state === "not-on") return void turnOn(true);
    if (checked && device.state === "off-here") return void turnOn(false);
    if (!checked && device.state === "on") return void turnOff();
  }

  async function togglePush(kind: FeedKind, checked: boolean) {
    if (saving || !device) return;
    const next = offered.filter((k) => (k === kind ? checked : pushOn.includes(k)));
    setPushOn(next);
    setSaving(true);
    // The tick is SAVED first: the save is sent before anything else happens. The prompt (or the iPhone's sheet) then
    // follows in this same press without waiting for the save's round trip, which would spend the press's user
    // activation and leave the browser refusing to ask.
    const save = savePushKinds(next, offered);
    if (checked && device.state === "not-on" && !deviceBusy) void turnOn(true);
    if (checked && device.state === "home-screen") setSheet(true);
    const fail = () => {
      setPushOn(savedPush.current);
      sayFailed();
    };
    try {
      const r = await save;
      if (r.ok) {
        savedPush.current = next;
        setPushOn(next);
      }
      else if (r.reason === "off") router.refresh();
      else {
        fail();
        router.refresh();
      }
    } catch {
      fail();
    } finally {
      setSaving(false);
    }
  }

  const deviceLine = (d: DeviceView) => {
    switch (d.state) {
      case "not-on":
        return p.device.notOn(d.installedIphone ? "iPhone" : "browser");
      case "on":
        return p.device.on;
      case "off-here":
        return p.device.offHere;
      case "blocked": {
        const b = d.installedIphone ? p.device.blocked.iPhone : p.device.blocked.browser;
        return (
          <>
            <span className="text-[color:var(--fg-body)]">{b.lead}</span>
            {b.rest && ` ${b.rest}`}
          </>
        );
      }
      case "home-screen":
        return (
          <>
            {p.device.homeScreen}{" "}
            <button type="button" onClick={() => setSheet(true)} className="cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-sans text-[12.5px] font-medium text-[color:var(--accent-text)]">
              {p.device.how}
            </button>
          </>
        );
      case "cant":
        return d.oldIos ? p.device.oldIos : p.device.cant;
    }
  };

  // The device row before the browser has been read: the space held, nothing said yet.
  const shown: DeviceView = device ?? { state: "not-on", word: "browser", installedIphone: false, oldIos: false };

  return (
    <section aria-labelledby="settings-news" className="mt-[26px] md:mt-[34px]">
      <h2 id="settings-news" className={column ? `${SECTION_HEAD} justify-between` : SECTION_HEAD}>
        {c.head}
        {column && <span aria-hidden className="w-[44px] flex-none text-center">{p.head}</span>}
      </h2>
      <ul className="m-0 mt-[4px] list-none p-0">
        {push && (
          <li data-push-device={device?.state ?? "reading"} aria-busy={device === null || undefined} className={`flex items-start ${ROW_SEP}`}>
            <div className={`flex min-h-[44px] min-w-0 flex-1 items-start gap-[12px] py-[8px]${device ? "" : " invisible"}`}>
              <span className="mt-[1px] flex h-[18px] w-[18px] flex-none items-center justify-center text-[color:var(--fg-muted)]">
                <Bell />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <b className={NAME}>{p.device.title(shown.word)}</b>
                <span className={LINE}>{deviceLine(shown)}</span>
              </span>
            </div>
            {column && (
              <label className={PUSH_CELL}>
                <Checkbox
                  checked={shown.state === "on"}
                  disabled={device === null || shown.state === "blocked"}
                  busy={deviceBusy}
                  ariaLabel={p.device.aria(shown.word)}
                  onChange={toggleDevice}
                />
              </label>
            )}
          </li>
        )}
        {kinds.map(({ kind }) => {
          const k = c.kinds[kind];
          const home = (
            <label className={`flex min-h-[44px] cursor-pointer items-start gap-[12px] py-[8px]${column ? " min-w-0 flex-1" : ""}`}>
              <Checkbox checked={on.includes(kind)} disabled={saving} onChange={(v) => toggle(kind, v)} className="mt-[1px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <b className={NAME}>{k.name}</b>
                <span className={LINE}>
                  {(DEFAULT_ON_KINDS as readonly FeedKind[]).includes(kind) ? `${k.line} ${c.defaultOn}` : k.line}
                </span>
              </span>
            </label>
          );
          return column ? (
            <li key={kind} className={`flex items-start ${ROW_SEP}`}>
              {home}
              <label className={PUSH_CELL}>
                <Checkbox
                  checked={pushOn.includes(kind)}
                  disabled={saving || device === null}
                  ariaLabel={p.kindAria(kind)}
                  onChange={(v) => togglePush(kind, v)}
                />
              </label>
            </li>
          ) : (
            <li key={kind} className={ROW_SEP}>{home}</li>
          );
        })}
      </ul>
      <p className="m-0 mt-[10px] font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">
        {column ? (
          <>
            {p.foot.home}
            <b className="font-medium text-[color:var(--fg-muted)]">{p.foot.push}</b>
            {p.foot.rest}
          </>
        ) : push !== null && device?.state === "cant" ? p.footCant : c.foot}
      </p>
      <SocialToast toast={toast} onDone={() => setToast(null)} />
      {sheet && <PushHowSheet onClose={() => setSheet(false)} />}
    </section>
  );
}
