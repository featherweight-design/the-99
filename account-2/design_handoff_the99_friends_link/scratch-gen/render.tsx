// Friend links R1 (account 2, 2026-11-12): every frame is the shipped shell and the shipped Friends page, rendered
// with the shipped CSS, with this round's proposal applied (waiting-on-you friend-request rows, friend-link-body.tsx,
// the avatar override). Writes dz/frames/<id>.html fragments plus frames.json (id, device, page).
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { FriendsView } from "../src/components/social/friends-view";
import { WaitingOnYou } from "../src/components/social/waiting-on-you";
import { SocialModal } from "../src/components/social/social-modal";
import { FriendLinkBody, type CodeEntry, type ResetState } from "../src/components/social/friend-link-body";
import { FriendCard } from "../src/components/social/friend-card";
import { LandingColumn } from "../src/components/social/friend-landing";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../src/components/social/friend-landing-buttons";
import { named } from "../src/lib/person-name/mint";
import { socialCopy } from "../src/lib/copy/social";

(globalThis as any).__STATIC = true;
mkdirSync("dz/frames", { recursive: true });
const NOW = new Date("2026-11-12T18:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const C = (name: string, art: string | null) => ({ oracleId: name, name, artCropUri: art });
const ART = {
  wren: C("Master, Transcendent", "art/hero-master.png"),
  colin: C("Sokka, Tenacious Tactician", "art/hero-sokka.png"),
  peter: C("Avatar Aang", "art/resume-aang.png"),
  max: C("Omnath, Locus of Creation", "art/resume-omnath.png"),
};
const P = {
  colin: { name: named("Colin"), commander: ART.colin },
  peter: { name: named("Peter"), commander: ART.peter },
  max: { name: named("Max"), commander: ART.max },
  chris: { name: named("Chris"), commander: null },
  wren: { name: named("Wren Calloway"), commander: ART.wren },
};
const friend = (k: keyof typeof P, days: number) => ({ publicId: k, displayName: P[k].name, since: ago(days * 24), commander: P[k].commander });
const req = (k: keyof typeof P, h: number, via: "link" | "code", answered?: "accept" | "decline") =>
  ({ key: `fr-${k}`, kind: "friend-request", createdAt: ago(h), unseen: true, from: { displayName: P[k].name, commander: P[k].commander }, via, answered }) as any;
const ME: any = { publicId: "me", displayName: "Wren Calloway", commander: ART.wren };
const URL_ = "https://the99.app/f/wren-k7q4xm";
const CODE = "K7Q4XM";

type Dev = "phone" | "desk";
const frames: { id: string; dev: Dev; vh?: number; page: "app" | "bare"; path?: string }[] = [];
function app(id: string, dev: Dev, badge: number, main: ReactNode, over?: ReactNode, opts: { vh?: number; path?: string; av?: any } = {}) {
  (globalThis as any).__PATH = opts.path ?? "/friends";
  (globalThis as any).__AV = opts.av ?? { initials: "WC", art: null };
  const badges = { friends: 0, friendsWaiting: badge, friendsAt: NOW.toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  const html = renderToString(
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col">{main}</main>
      </div>
      <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
      {over}
    </div>,
  );
  writeFileSync(`dz/frames/${id}.html`, html);
  frames.push({ id, dev, vh: opts.vh, page: "app" });
}
function bare(id: string, dev: Dev, el: ReactNode, vh?: number) {
  writeFileSync(`dz/frames/${id}.html`, renderToString(<>{el}</>));
  frames.push({ id, dev, vh, page: "bare" });
}

const friendsPage = (rows: any[], friends: any[], accepted: any = null) => (
  <FriendsView profile={ME} friends={friends} links={[]} accepted={accepted} origin="https://the99.app" nowMs={NOW.getTime()} maxLinks={10}
    invites={null} decksSeen={{ seeDecks: true, seeUnfinished: false } as any} waiting={rows.length ? <WaitingOnYou rows={rows} now={NOW} /> : undefined} />
);
const FRIENDS2 = [friend("peter", 30), friend("max", 12)];
const FRIENDS4 = [friend("colin", 0), friend("max", 12), friend("peter", 30)];

for (const dev of ["phone", "desk"] as Dev[]) {
  // F · the Friends page with 0, 1 and several requests
  app(`F0-${dev}`, dev, 0, friendsPage([], FRIENDS2));
  app(`F1-${dev}`, dev, 1, friendsPage([req("colin", 0.2, "link")], FRIENDS2));
  app(`F3-${dev}`, dev, 3, friendsPage([req("colin", 0.2, "link"), req("chris", 3, "code"), req("max", 26, "link")].map((r, i) => i === 2 ? { ...r, unseen: false } : r), [friend("peter", 30)]), undefined, { vh: dev === "phone" ? 1100 : undefined });
  app(`F4-${dev}`, dev, 1, friendsPage([req("colin", 0.2, "link", "accept"), req("chris", 3, "code", "decline"), req("max", 26, "link")], FRIENDS4, null), undefined, { vh: dev === "phone" ? 1100 : undefined });
  app(`F5-${dev}`, dev, 0, friendsPage([], []));

  // A · Add a friend: link, QR and code; the code typed in; the invites line at 3 and 0
  const sheet = (id: string, left: number, entry: CodeEntry, reset: ResetState = "idle", newCode = false, vh = 1500) =>
    app(id, dev, 0, friendsPage([], FRIENDS2), (
      <SocialModal title={socialCopy.dialog.title} sub="Show the QR code at the table, or send the link or code. Anyone who uses it sends you a friend request." closeLabel="Close" onClose={() => {}}>
        <FriendLinkBody url={newCode ? "https://the99.app/f/wren-r2m8tv" : URL_} code={newCode ? "R2M8TV" : CODE} left={left} share={dev === "phone"} reset={reset} entry={entry} newCode={newCode} />
      </SocialModal>
    ), { vh: dev === "phone" ? vh : 1340 });
  sheet(`A1-${dev}`, 3, { kind: "empty" });
  sheet(`A2-${dev}`, 0, { kind: "empty" });
  sheet(`A3-${dev}`, 3, { kind: "typing", chars: "P4K" });
  sheet(`A4-${dev}`, 3, { kind: "typing", chars: "P4K9WD" });
  sheet(`A5-${dev}`, 3, { kind: "sent", name: P.colin.name, commander: ART.colin });
  sheet(`A6-${dev}`, 3, { kind: "wrong", chars: "P4K9WB" });
  sheet(`A7-${dev}`, 3, { kind: "own", chars: CODE });
  sheet(`A8-${dev}`, 3, { kind: "friends", name: P.peter.name, commander: ART.peter });
  sheet(`A9-${dev}`, 3, { kind: "accepted", name: P.max.name, commander: ART.max });
  // R · reset
  sheet(`R1-${dev}`, 3, { kind: "empty" }, "confirm");
  sheet(`R2-${dev}`, 3, { kind: "empty" }, "busy");
  sheet(`R3-${dev}`, 3, { kind: "empty" }, "idle", true);

  // L · the landing, signed in (Colin opens Wren's link)
  const colinAv = { initials: null, art: "art/hero-sokka.png" };
  const wrenFace = (type: string, rules: any) => ({ name: P.wren.name, commander: ART.wren, type, rules });
  const landing = (id: string, card: ReactNode, col: ReactNode) =>
    app(id, dev, 0, (
      <div className="flex min-h-full flex-1 justify-center bg-[radial-gradient(420px_300px_at_50%_28%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_70%)] px-[16px] py-[22px] md:bg-[radial-gradient(700px_420px_at_50%_30%,color-mix(in_oklab,var(--accent)_6%,transparent),transparent_70%)] md:p-0">
        <div className="flex w-full flex-col items-center gap-[16px] md:mt-[110px] md:w-auto md:flex-row md:items-center md:gap-[56px] md:self-start">{card}{col}</div>
      </div>
    ), undefined, { path: "/friend", av: colinAv, vh: dev === "phone" ? 1000 : undefined });
  const sentRules = (n: any) => [ "Your request is with ", n, ". When ", n, " accepts, each of you sees the other’s name and signature card, and nothing else until one of you shares more." ];
  const quiet = "min-h-[44px] cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--fg-muted)] underline decoration-[color:var(--border-dashed)] underline-offset-[3px] md:min-h-[32px]";
  landing(`L1-${dev}`, <FriendCard face={wrenFace("Friend request · sent", sentRules(P.wren.name) as any)} up signature />,
    <LandingColumn kicker="Friend request" title={["Request sent to ", P.wren.name] as any} body={[P.wren.name, " sees it on Friends. You’re friends once ", P.wren.name, " accepts. Nothing is shared before then."] as any}
      actions={<><a className={SECONDARY_BUTTON}>Go to Friends</a><button type="button" className={quiet}>Withdraw request</button></>} />);
  landing(`L2-${dev}`, <FriendCard face={wrenFace("Friend request · sent", sentRules(P.wren.name) as any)} up signature />,
    <LandingColumn kicker="Friend request" title={["Request sent to ", P.wren.name] as any} body={[P.wren.name, " sees it on Friends. You’re friends once ", P.wren.name, " accepts. Nothing is shared before then."] as any}
      actions={<><a className={SECONDARY_BUTTON}>Go to Friends</a><button type="button" className={quiet}>Withdraw request</button></>} fine="Sent Nov 10. Opening the link again doesn’t send another." />);
  landing(`L3-${dev}`, <FriendCard face={wrenFace("Friend request · withdrawn", sentRules(P.wren.name) as any)} up={false} signature />,
    <LandingColumn kicker="Friend request" title="Request withdrawn" body={[P.wren.name, " isn’t told. The link still works if you change your mind."] as any}
      actions={<><button type="button" className={PRIMARY_BUTTON}>Send it again</button><a className={SECONDARY_BUTTON}>Go to Home</a></>} />);
  landing(`L4-${dev}`, <FriendCard face={wrenFace("Friend · since today", socialCopy.landing.friendRules(P.wren.name))} up signature />,
    <LandingColumn kicker="Friend request" title={["You and ", P.wren.name, " are friends"] as any} body={[P.wren.name, " had already sent you a request, so opening this link answered it."] as any}
      actions={<a className={SECONDARY_BUTTON}>Go to Friends</a>} />);
  landing(`L5-${dev}`, <FriendCard face={wrenFace("Friend · since Oct 2", socialCopy.landing.friendRules(P.wren.name))} up signature />,
    <LandingColumn kicker="Friend request" title={socialCopy.landing.alreadyTitle(P.wren.name)} body="Nothing to send."
      actions={<a className={SECONDARY_BUTTON}>Go to Friends</a>} />);
  landing(`L7-${dev}`, <FriendCard face={null} up={false} />,
    <LandingColumn kicker="Friend request" title={socialCopy.landing.endedTitle} body="Its owner may have reset it. Ask them for their new link or code."
      actions={<a className={SECONDARY_BUTTON}>Go to Friends</a>} />);
  // Wren opens their own link
  app(`L6-${dev}`, dev, 0, (
    <div className="flex min-h-full flex-1 justify-center bg-[radial-gradient(420px_300px_at_50%_28%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_70%)] px-[16px] py-[22px] md:bg-[radial-gradient(700px_420px_at_50%_30%,color-mix(in_oklab,var(--accent)_6%,transparent),transparent_70%)] md:p-0">
      <div className="flex w-full flex-col items-center gap-[16px] md:mt-[110px] md:w-auto md:flex-row md:items-center md:gap-[56px] md:self-start">
        <FriendCard face={{ name: "Wren Calloway", commander: ART.wren, type: socialCopy.landing.typeOwn, rules: "This is what a friend sees when they open your link: your name, your signature card, and a request on its way to you." }} up signature />
        <LandingColumn kicker="Friend request" title={socialCopy.landing.selfTitle} body="Send it to anyone you want to add. Each person who opens it sends you a friend request."
          actions={<button type="button" className={PRIMARY_BUTTON}>Copy link</button>} />
      </div>
    </div>
  ), undefined, { path: "/friend", av: { initials: null, art: "art/hero-master.png" }, vh: dev === "phone" ? 1000 : undefined });

  // S · signed out (the public page: no shell)
  const signedOut = (id: string, left: boolean) => bare(id, dev, (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[16px] bg-[color:var(--bg)] bg-[radial-gradient(600px_360px_at_50%_22%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] px-[24px] py-[28px] md:flex-row md:gap-[56px] md:px-0 md:bg-[radial-gradient(1000px_520px_at_50%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]">
      <FriendCard face={wrenFace("Friend request", (left ? ["Join, or sign in, and your request goes to ", P.wren.name, ". You’re friends once ", P.wren.name, " accepts."] : ["Sign in and your request goes to ", P.wren.name, ". You’re friends once ", P.wren.name, " accepts."]) as any)} up signature />
      <LandingColumn signedOut kicker="The Ninety-Nine" title={[P.wren.name, " wants to be friends on The 99"] as any}
        body={(left ? ["New to The 99? Join with one of ", P.wren.name, "’s invites. Already playing? Sign in, and your request goes to ", P.wren.name, "."] : ["Already playing? Sign in, and your request goes to ", P.wren.name, "."]) as any}
        actions={left ? <><a className={PRIMARY_BUTTON}>Join The 99</a><button type="button" className={SECONDARY_BUTTON}>Sign in</button></> : <button type="button" className={PRIMARY_BUTTON}>Sign in</button>}
        fine={(left ? ["Joining uses one of ", P.wren.name, "’s invites, only once your account is made."] : [P.wren.name, " is out of invites, so someone new can’t join through this link yet. The 99 is invite-only: ask ", P.wren.name, " again when they have more."]) as any} />
    </main>
  ), dev === "phone" ? 1000 : 860);
  signedOut(`S1-${dev}`, true);
  signedOut(`S2-${dev}`, false);

  // S3 · the newcomer (Chris) lands on Friends after joining through Wren's link: the request went (Q1)
  app(`S3-${dev}`, dev, 0, <FriendsView profile={{ publicId: "chris", displayName: "Chris", commander: null } as any} friends={[]} links={[]} accepted={friend("wren", 0)} origin="https://the99.app" nowMs={NOW.getTime()} maxLinks={10} invites={null} decksSeen={{ seeDecks: true, seeUnfinished: false } as any} />, undefined, { av: { initials: "CH", art: null } });
  // V · the header avatar (Wren with a signature card; a player with none)
  app(`V1-${dev}`, dev, 0, friendsPage([], FRIENDS2), undefined, { av: { initials: null, art: "art/hero-master.png" } });
}
for (const d of ["phone","desk"]) { const f = `dz/frames/S3-${d}.html`; const { readFileSync } = require("node:fs"); writeFileSync(f, readFileSync(f, "utf8").replace(/You and (<span[^>]*>)?Wren Calloway(<\/span>)? are friends\./, "Your friend request went to $1Wren Calloway$2.")); }
writeFileSync("dz/frames.json", JSON.stringify(frames, null, 1));
console.log(frames.length, "frames");
