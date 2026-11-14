// PROPOSAL (account settings handoff R1): Settings' Account section, last on the page. Drawn from fixtures for the boards;
// the build wires Clerk (`useUser`, `user.getSessions()`, `session.revoke()`) and the shipped name write.
import { accountCopy } from "../../lib/copy/account";
import { socialCopy } from "../../lib/copy/social";
import { SECTION_HEAD } from "../social/friends-list";
import { TextField } from "../ui/text-field";

const a = accountCopy;
const nf = socialCopy.page.nameField;

export type Device = { id: string; browser: string; device: string; kind: "phone" | "desktop" | "tablet"; place: string; ago: string | null; current?: boolean; pending?: boolean };
export type AccountFx = {
  name: string;
  email: string;
  methods: ("google" | "password" | "code")[];
  editing?: string | null;
  devices: Device[] | "loading" | "failed";
};

const ROW = "flex min-h-[44px] items-start gap-[12px] py-[10px]";
const B = "font-sans text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]";
const LINE = "text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]";
const LINKBTN = "flex min-h-[44px] flex-none cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[10px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]";
const SUB = "m-0 mt-[22px] font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]";
const LI = "[&+&]:[border-top:1px_solid_var(--border)]";

function Glyph({ kind }: { kind: Device["kind"] }) {
  const p = kind === "phone" ? <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>
    : kind === "tablet" ? <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M11 18h2" /></>
    : <><rect x="3" y="5" width="18" height="12" rx="1.5" /><path d="M2 20h20" /></>;
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-[1px] flex-none text-[color:var(--fg-muted)]">{p}</svg>
  );
}

function methodsLine(m: AccountFx["methods"]) {
  const w = m.map((x) => (x === "google" ? a.signIn.google : x === "password" ? a.signIn.password : a.signIn.code));
  return w.length > 1 ? `${w.slice(0, -1).join(", ")} and ${w[w.length - 1]}` : w[0];
}

export function AccountSection({ fx }: { fx: AccountFx }) {
  const editing = fx.editing != null;
  return (
    <section aria-labelledby="settings-account" data-new="" className="mt-[26px] md:mt-[34px]">
      <h2 id="settings-account" className={SECTION_HEAD}>{a.head}</h2>
      <ul className="m-0 mt-[4px] list-none p-0">
        <li className={LI}>
          {editing ? (
            // The shipped name field (friends-head.tsx), as one name with two doors: Friends' Change and this one.
            <form className="flex w-full flex-col gap-[8px] py-[12px] md:w-[420px] md:max-w-full">
              <label className="text-[13px] font-semibold text-[color:var(--fg)]">{nf.label}</label>
              <TextField value={fx.editing ?? ""} readOnly className="h-[44px] px-[12px] text-[16px] md:h-[40px] [@media(pointer:fine)]:md:text-[14px]" />
              <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">{nf.hint}</p>
              <div className="flex gap-[8px] max-md:[&>button]:h-[44px] max-md:[&>button]:flex-1 max-md:[&>button]:text-[14px]">
                <button type="button" className="h-[32px] cursor-pointer rounded-[6px] bg-transparent px-[14px] font-sans text-[12.5px] text-[color:var(--fg-body)] [border:1px_solid_var(--border)]">{nf.cancel}</button>
                <button type="submit" className="h-[32px] cursor-pointer rounded-[6px] border-0 bg-[color:var(--accent)] px-[14px] font-sans text-[12.5px] font-semibold text-[color:var(--bg)]">{nf.save}</button>
              </div>
            </form>
          ) : (
            <div className={ROW}>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className={LINE}>{a.name.label}</span>
                <b className={B}>{fx.name}</b>
                <span className={LINE}>{a.name.line}</span>
              </span>
              <button type="button" className={`${LINKBTN} -mr-[10px] -mt-[8px]`}>{a.name.change}</button>
            </div>
          )}
        </li>
        <li className={LI}>
          <div className={ROW}>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className={LINE}>{a.signIn.label}</span>
              <b className={B}>{fx.email}</b>
              <span className={LINE}>{`Signs in with ${methodsLine(fx.methods)}.`}</span>
              <span className="mt-[2px] flex flex-wrap items-center gap-x-[6px]">
                <a className="-ml-[2px] flex min-h-[44px] cursor-pointer items-center px-[2px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] no-underline md:min-h-[28px]">{a.signIn.more} ›</a>
                <span className="hidden text-[12.5px] text-[color:var(--fg-faint)] md:inline">{a.signIn.moreLine}</span>
              </span>
            </span>
          </div>
        </li>
      </ul>

      <h3 className={SUB}>{a.devices.head(Array.isArray(fx.devices) ? fx.devices.length : 0).replace(/ · 0$/, "")}</h3>
      <p className="m-0 mt-[6px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{a.devices.explain}</p>
      {fx.devices === "loading" ? (
        <p role="status" className="m-0 mt-[12px] flex min-h-[44px] items-center font-mono text-[11px] text-[color:var(--fg-faint)]">{a.devices.loading}</p>
      ) : fx.devices === "failed" ? (
        <p role="alert" className="m-0 mt-[6px] flex min-h-[44px] flex-wrap items-center gap-x-[4px] text-[13px] text-[color:var(--fg-muted)]">
          {a.devices.readFailed}
          <button type="button" className={`${LINKBTN} px-[6px]`}>{a.devices.retry}</button>
        </p>
      ) : (
        <ul className="m-0 mt-[6px] list-none p-0">
          {fx.devices.map((d) => {
            const name = a.devices.name(d.browser, d.device);
            return (
              <li key={d.id} className={`${LI} ${d.pending ? "opacity-[.55]" : ""}`}>
                <div className={`${ROW} items-center`}>
                  <Glyph kind={d.kind} />
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <b className={B}>{name}</b>
                    <span className={LINE}>
                      {d.current ? <span className="font-medium text-[color:var(--accent-text)]">{a.devices.thisDevice}</span> : d.ago === null ? a.devices.activeNow : a.devices.lastActive(d.ago)}
                      {` · ${d.place}`}
                    </span>
                  </span>
                  {d.current ? null : d.pending ? (
                    <span className="flex min-h-[44px] flex-none items-center px-[10px] font-mono text-[11px] text-[color:var(--fg-faint)] md:min-h-[32px]">{a.devices.signingOut}</span>
                  ) : (
                    <button type="button" aria-label={a.devices.signOutAria(name)} className={`${LINKBTN} -mr-[10px]`}>{a.devices.signOut}</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-[22px] [border-top:1px_solid_var(--border)]">
        <div className="flex flex-col gap-[12px] pt-[14px] md:flex-row md:items-center md:gap-[24px]">
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <b className={B}>{a.del.label}</b>
            <span className={LINE}>{a.del.line}</span>
          </span>
          <button type="button" className="h-[44px] flex-none cursor-pointer rounded-[8px] bg-transparent px-[16px] font-sans text-[14px] font-medium text-[color:var(--danger)] [border:1px_solid_var(--border-strong)] md:h-[36px] md:text-[13.5px]">
            {a.del.open}
          </button>
        </div>
      </div>
    </section>
  );
}
