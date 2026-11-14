"use client";
// Settings' Account section (account settings handoff R1, calls 1 to 5; `Placement`, `Section-States`), last on the page.
//
// - Your name: the one name friends see, with the shipped name field (`NameField`, one name with two doors: /friends'
//   Change and this one), written through the same action. The name shows at once; a failed write puts back the name
//   the server last drew and says so in the shipped social toast.
// - Email and sign-in: what Clerk holds, read server side. Email, password and Google stay on Clerk's hosted page,
//   reached by More account options (`redirectToUserProfile`, never Clerk's prebuilt UI in the app).
// - Signed in on: the reader's active sessions, read from Clerk on the client AFTER the page draws (G4), so the page is
//   never held by Clerk's API. Sign out on every row but this device (which signs out from the account menu), through
//   `signOutDeviceAction`. The row dims while it signs out and leaves on success; a failure puts it back with a toast.
//
// The delete row joins the foot of the section with the delete flow.

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { setDisplayNameAction } from "../../app/friends/actions";
import { signOutDeviceAction } from "../../app/settings/account-actions";
import { accountCopy, type SignInMethod } from "../../lib/copy/account";
import { socialCopy } from "../../lib/copy/social";
import { deviceRows, type DeviceKind, type DeviceRow } from "../../lib/account/devices";
import { SECTION_HEAD } from "../social/friends-list";
import { NameField } from "../social/name-field";
import { SocialToast, type SocialToastState } from "../social/social-toast";

const a = accountCopy;

const ROW = "flex min-h-[44px] items-start gap-[12px] py-[10px]";
/** A device row centers its glyph, lines and Sign out (`ROW` with `items-center`; two align classes would let `items-start` win). */
const DEVICE_ROW = "flex min-h-[44px] items-center gap-[12px] py-[10px]";
const STRONG = "font-sans text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]";
const LINE = "text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]";
const LINK_BUTTON =
  "flex min-h-[44px] flex-none cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[10px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]";
const SUB = "m-0 mt-[22px] font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]";
const LI = "[&+&]:[border-top:1px_solid_var(--border)]";

export type AccountFacts = { name: string; email: string; methods: SignInMethod[] };

type Devices = { state: "loading" } | { state: "failed" } | { state: "ready"; rows: DeviceRow[] };

export function AccountSection({ facts }: { facts: AccountFacts }) {
  const clerk = useClerk();
  const { user } = useUser();
  const [toast, setToast] = useState<(SocialToastState & { role: "alert" | "status" }) | null>(null);
  const toastSeq = useRef(0);
  // A failure is an alert; a device signed out is a receipt (status).
  const say = (text: string, role: "alert" | "status" = "alert") => setToast({ id: ++toastSeq.current, text, role });

  // --- Your name ---------------------------------------------------------------------------------------------------
  // A fresh server value wins when it changes (adjusted during render). `saved` is the name last known stored: the
  // server's, or this section's own successful write, since the write redraws /friends and not this page. A failure
  // puts it back.
  const [name, setName] = useState(facts.name);
  const [served, setServed] = useState(facts.name);
  const saved = useRef(facts.name);
  if (served !== facts.name) {
    setServed(facts.name);
    setName(facts.name);
  }
  useEffect(() => {
    saved.current = facts.name;
  }, [facts.name]);
  const [editing, setEditing] = useState(false);
  // One write at a time: while one is on its way, Change does not open the field, so no second name can be typed and lost.
  const [saving, setSaving] = useState(false);
  const change = useRef<HTMLButtonElement>(null);

  async function closeName(next: string | null) {
    setEditing(false);
    // Focus back on the Change that opened the field, a frame on, unless the blur moved it somewhere.
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if (at === null || at === document.body) change.current?.focus();
    });
    if (next === null) return;
    setSaving(true);
    setName(next);
    const r = await setDisplayNameAction(next).catch(() => null);
    setSaving(false);
    // The server's cleaned form is the name of record.
    if (r?.ok) {
      saved.current = r.displayName;
      setName(r.displayName);
    } else {
      setName(saved.current);
      say(socialCopy.page.nameField.failed);
    }
  }

  // --- Signed in on ------------------------------------------------------------------------------------------------
  const [devices, setDevices] = useState<Devices>({ state: "loading" });
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const currentId = clerk.session?.id ?? null;
  const [readSeq, setReadSeq] = useState(0);
  // Sessions this section signed out: clerk-js keeps the last `getSessions()` answer, so a later read can still list one.
  const revoked = useRef(new Set<string>());
  // The user resource is replaced on every Clerk update; the read is keyed on WHO it is, never on that object.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  });
  const userId = user?.id ?? null;

  useEffect(() => {
    const u = userRef.current;
    if (!u) return;
    let live = true;
    u.getSessions().then(
      (sessions) => {
        if (!live) return;
        const rows = deviceRows(sessions, currentId, Date.now()).filter((r) => !revoked.current.has(r.id));
        setDevices({ state: "ready", rows });
      },
      // A failed re-read keeps a list already drawn; only a first read (or Try again) shows the failure.
      () => live && setDevices((d) => (d.state === "ready" ? d : { state: "failed" })),
    );
    return () => {
      live = false;
    };
  }, [userId, currentId, readSeq]);
  // Clerk loaded and no user: there is nothing to read, so the list says so rather than load for ever.
  const shown: Devices = clerk.loaded && !userId ? { state: "failed" } : devices;

  function retry() {
    setDevices({ state: "loading" });
    setReadSeq((n) => n + 1);
  }

  async function signOut(row: DeviceRow) {
    if (pending.has(row.id)) return;
    setPending((p) => new Set(p).add(row.id));
    const ok = await signOutDeviceAction(row.id).then((r) => r.ok, () => false);
    setPending((p) => {
      const next = new Set(p);
      next.delete(row.id);
      return next;
    });
    if (ok) {
      revoked.current.add(row.id);
      setDevices((d) => (d.state === "ready" ? { state: "ready", rows: d.rows.filter((r) => r.id !== row.id) } : d));
      say(a.devices.signedOut(a.devices.name(row.browser, row.device)), "status");
    } else say(a.devices.failed);
  }

  const count = shown.state === "ready" ? shown.rows.length : null;

  return (
    <section aria-labelledby="settings-account" className="mt-[26px] md:mt-[34px]">
      <h2 id="settings-account" className={SECTION_HEAD}>{a.head}</h2>
      <ul className="m-0 mt-[4px] list-none p-0">
        <li className={LI}>
          {editing ? (
            <NameField name={name} onClose={closeName} className="w-full py-[12px] md:w-[420px] md:max-w-full" />
          ) : (
            <div data-account-row="name" className={ROW}>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className={LINE}>{a.name.label}</span>
                <b className={STRONG}>{name}</b>
                <span className={LINE}>{a.name.line}</span>
              </span>
              <button ref={change} type="button" aria-disabled={saving || undefined} onClick={() => !saving && setEditing(true)} className={`${LINK_BUTTON} -mr-[10px] -mt-[8px]`}>
                {a.name.change}
              </button>
            </div>
          )}
        </li>
        <li className={LI}>
          <div data-account-row="sign-in" className={ROW}>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className={LINE}>{a.signIn.label}</span>
              {facts.email ? <b className={STRONG}>{facts.email}</b> : null}
              {facts.methods.length > 0 ? <span className={LINE}>{a.signIn.methods(facts.methods)}</span> : null}
              <span className="mt-[2px] flex flex-wrap items-center gap-x-[6px]">
                <button
                  type="button"
                  onClick={() => void clerk.redirectToUserProfile()}
                  className="-ml-[2px] flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent px-[2px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] md:min-h-[28px]"
                >
                  {a.signIn.more} ›
                </button>
                <span className="hidden text-[12.5px] text-[color:var(--fg-faint)] md:inline">{a.signIn.moreLine}</span>
              </span>
            </span>
          </div>
        </li>
      </ul>

      <h3 className={SUB}>{a.devices.head(count)}</h3>
      <p className="m-0 mt-[6px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{a.devices.explain}</p>
      {shown.state === "loading" ? (
        <p role="status" className="m-0 mt-[12px] flex min-h-[44px] items-center font-mono text-[11px] text-[color:var(--fg-faint)]">
          {a.devices.loading}
        </p>
      ) : shown.state === "failed" ? (
        <p role="alert" className="m-0 mt-[6px] flex min-h-[44px] flex-wrap items-center gap-x-[4px] text-[13px] text-[color:var(--fg-muted)]">
          {a.devices.readFailed}
          <button type="button" onClick={retry} className={`${LINK_BUTTON} px-[6px]`}>{a.devices.retry}</button>
        </p>
      ) : (
        <ul data-account-devices="" className="m-0 mt-[6px] list-none p-0">
          {shown.rows.map((d) => {
            const label = a.devices.name(d.browser, d.device);
            const signingOut = pending.has(d.id);
            return (
              <li key={d.id} data-device-row={d.current ? "this" : "other"} className={`${LI} ${signingOut ? "opacity-[.55]" : ""}`}>
                <div className={DEVICE_ROW}>
                  <DeviceGlyph kind={d.kind} />
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <b className={STRONG}>{label}</b>
                    <span className={LINE}>
                      {d.current ? (
                        <span className="font-medium text-[color:var(--accent-text)]">{a.devices.thisDevice}</span>
                      ) : d.ago === null ? (
                        a.devices.activeNow
                      ) : (
                        a.devices.lastActive(d.ago)
                      )}
                      {d.place ? ` · ${d.place}` : null}
                    </span>
                  </span>
                  {d.current ? null : signingOut ? (
                    <span className="flex min-h-[44px] flex-none items-center px-[10px] font-mono text-[11px] text-[color:var(--fg-faint)] md:min-h-[32px]">
                      {a.devices.signingOut}
                    </span>
                  ) : (
                    <button type="button" aria-label={a.devices.signOutAria(label)} onClick={() => void signOut(d)} className={`${LINK_BUTTON} -mr-[10px]`}>
                      {a.devices.signOut}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <SocialToast toast={toast} role={toast?.role ?? "alert"} onDone={() => setToast(null)} />
    </section>
  );
}

function DeviceGlyph({ kind }: { kind: DeviceKind }) {
  const parts =
    kind === "phone" ? (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </>
    ) : kind === "tablet" ? (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M11 18h2" />
      </>
    ) : (
      <>
        <rect x="3" y="5" width="18" height="12" rx="1.5" />
        <path d="M2 20h20" />
      </>
    );
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-[1px] flex-none text-[color:var(--fg-muted)]">
      {parts}
    </svg>
  );
}
