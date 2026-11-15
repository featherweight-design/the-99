import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { writeFileSync } from "node:fs";
import { flyerJoinCopy, joinCopy, signInCopy, signUpCopy } from "../src/lib/copy/join";
import { FriendCard, type CardFace } from "../src/components/social/friend-card";
import { LegalLinks } from "../src/components/legal/legal-links";
import { FLYER_MAIN, FORM, NewcomerColumn } from "../src/components/join/newcomer-column";
import { field, press } from "../src/components/join/join-parts";
import { Field, GOOGLE, GoogleMark, HINT, OR } from "../src/components/sign-in/auth-parts";
import { StrengthLine, type Strength } from "../src/components/sign-in/password-strength";
import { strengthCopy, type WeakReason } from "../src/lib/copy/strength";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const R = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/sign-up"><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
const FACE: CardFace = { name: signUpCopy.cardName, commander: null, type: joinCopy.cardType, rules: signUpCopy.cardRules, crown: { credit: signUpCopy.cardCredit, mark: flyerJoinCopy.cardMark } };
const EMAIL = "colin@example.com";
type S = { pw: string; strength: Strength; reason?: WeakReason; refusal?: string | null; legacy?: boolean };
const pwField = (label: string, s: S, top = "") => {
  const refused = !!s.refusal;
  return (<>
    <Field label={label} line={refused} locked={false} danger={refused} look={field(s.pw.length > 0, false, refused)} top={top} type="password" autoComplete="new-password" value={s.pw} onChange={() => {}} />
    {s.legacy ? (refused ? <p className="m-0 mt-[8px] text-left text-[13px] leading-[1.45] text-[color:var(--danger)]">{s.refusal}</p> : <p className={HINT}>{signInCopy.newPasswordHint}</p>) : <StrengthLine strength={s.strength} reason={s.reason} refusal={s.refusal ?? null} />}
  </>);
};
const q1 = (s: S) => (
  <main className={FLYER_MAIN}>
    <FriendCard face={FACE} up compact word={joinCopy.cardType} />
    <NewcomerColumn variant="join" title={signUpCopy.title} body={signUpCopy.body(EMAIL)} actions={
      <form noValidate className={FORM}>
        <Field label={signUpCopy.nameLabel} line={false} locked={false} look={field(true, false)} type="text" value="Colin" onChange={() => {}} />
        <p className={HINT}>{signUpCopy.nameHint}</p>
        {pwField(signInCopy.passwordLabel, s, "mt-[14px]")}
        <button type="submit" disabled={false} className={press("ready")}>{signUpCopy.make}</button>
        <div className={OR}>{signInCopy.or}</div>
        <button type="button" className={GOOGLE}><GoogleMark />{signInCopy.google}</button>
        <p className={HINT}>{signUpCopy.googleHint(EMAIL)}</p>
      </form>} />
    <LegalLinks className="mt-[14px] justify-center" />
  </main>);
const k5 = (s: S) => (
  <main className={FLYER_MAIN}>
    <FriendCard face={null} up={false} compact word={signInCopy.cardWord} />
    <NewcomerColumn variant="join" title={signInCopy.newPasswordTitle} body={signInCopy.forEmail(EMAIL)} actions={
      <form noValidate className={FORM}>
        {pwField(signInCopy.newPasswordLabel, s)}
        <button type="submit" className={press("ready")}>{signInCopy.save}</button>
      </form>} />
  </main>);
export const STATES: Record<string, S> = {
  empty: { pw: "", strength: "short" },
  short: { pw: "colin9", strength: "short" },
  weak: { pw: "colinmtg", strength: "weak", reason: "letters" },
  "weak-common": { pw: "password", strength: "weak", reason: "common" },
  "weak-date": { pw: "colin1994", strength: "weak", reason: "date" },
  "weak-run": { pw: "colin12345", strength: "weak", reason: "run" },
  "weak-other": { pw: "Colin#99", strength: "weak", reason: "other" },
  good: { pw: "tidal-rummage", strength: "good" },
  strong: { pw: "copper fox casts ninety", strength: "strong" },
  q2: { pw: "colin9", strength: "short", refusal: signInCopy.tooShort },
  q3: { pw: "colinmtg", strength: "weak", refusal: strengthCopy.tooWeak("letters") },
  q4: { pw: "Summer2024!", strength: "good", refusal: signInCopy.breached },
  shipped: { pw: "", strength: "short", legacy: true },
};
for (const [k, s] of Object.entries(STATES)) {
  writeFileSync(`hero/q1-${k}.html`, R(q1(s)));
  writeFileSync(`hero/k5-${k}.html`, R(k5(s)));
}
console.log("ok");
