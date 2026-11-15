# Design Brief: Steer new players to install The 99

**Date:** 2026-11-15 · **Branch:** `brief/install-onboarding`
**Ask (Hugh, 2026-11-15):** "Can we add something about the PWA download to the onboarding? IMO it's the better experience and we should direct users to setting it up if they haven't already."
**Verified against `origin/main` at `88d0fd6e1`.** Paths below were read on that commit.

---

## §1 Goal

A new player is told, once and at a calm moment, that The 99 works best on their home screen, and is shown how for their browser. A player who already installed, or who cannot, is never asked.

## §2 What exists today (do not redraw)

| Surface | Where | Notes |
|---|---|---|
| Install slot | `src/components/pwa/install-slot.tsx`, mounted in the phone header (`nav.tsx`) | Phone only. Shows when the browser holds a `beforeinstallprompt` (Android Chrome), or on an iPhone in Safari, Chrome or Firefox. Hides when standalone or dismissed (30 days, then retired at the second dismiss: `src/lib/pwa/install-dismissal.ts`). |
| How-to sheet | `src/components/pwa/ios-install-sheet.tsx`, copy `src/lib/copy/pwa-install.ts` | Three steps and Got it. Step 1 differs by browser. Lane 02's PR "iPhone install: the slot and the push sheet cover Chrome and Firefox" (branch `feat/ios-install-browsers`) adds the non-Safari variants; this brief assumes it. |
| Push device row and sheet | `src/components/settings/news-section.tsx`, `push-how-sheet.tsx`; drawn in `design/design_handoff_the99_push/` (`iPhone.dc.html`, `STATES-push.md`) | iOS sends web push only to an installed app, so this is already an install prompt, but only inside Settings. |
| Installed-app detection | `isStandalone()` in `src/lib/pwa/install-detect.ts` | `display-mode: standalone` or `navigator.standalone`. True only inside the installed app. |
| First-run checklist | `src/components/home/first-run.tsx`, mounted from `src/app/page.tsx` while the collection is unread and there are no decks | Handoff `design/design_handoff_the99_first_run_onboarding/`, brief `2026-09-28-first-run-onboarding.md`. |
| First-run tour | `src/app/tour-actions.ts` (claims `tour_seen_at`) | Handoff `design/design_handoff_the99_discovery_onboarding/` (`STATES-tour-and-need.md`). |
| Welcome | handoff `design/design_handoff_the99_welcome_credits/`, brief `2026-10-18-welcome-credits-onboarding.md` | |

## §3 Facts that constrain the design

- **Browsers.** Since iOS 16.4, Chrome and Firefox on iPhone can Add to Home Screen from their Share menus, and a site with a standalone manifest then opens as a web app whichever browser added it (WebKit, "Web Push for Web Apps on iOS and iPadOS", webkit.org/blog/13878). Edge and other iPhone browsers are not sourced yet, so they get no install affordance. In-app web views (Instagram, Facebook and similar) cannot add at all.
- **Push from a non-Safari install is unconfirmed.** Copy must not promise push from a Chrome or Firefox install. Safari is the sure way.
- **A browser session cannot see the installed app.** The installed app and the browser tab are separate storage on iOS. `isStandalone()` answers only inside the app.
- **Where an install prompt is possible:** iPhone (Safari, Chrome, Firefox: steps sheet), Android Chrome (the browser's own prompt), desktop (the browser's own button; no slot, by d9's call 1). iPad is excluded today because Share sits at the top there.
- **Audience** is Hugh and friends; keep it small.

## §4 Open for Design

**4.1 Where it sits.** A step in the first-run checklist, a step in the tour, a line on Welcome, or a Home card after the first deck. Draw the one you pick at 390 and 1300, and say what a player who skips it sees later (the header slot already stays for 30 days).

**4.2 What it says and shows.** Placeholder copy is fine; `/copy-review` sets the words. It should reuse the how-to sheet rather than draw new steps, and show the right browser's step 1. Say what an Android player, a desktop player, an iPad player and an in-app web view see (nothing, or a different line).

**4.3 How we know they installed (open: Design and Hugh decide).** Options:
- **A. Server-side flag.** Set it when the standalone app is first opened while signed in; a browser session then reads it and stops asking. Accurate across devices only for the device that installed. Needs a small write on the standalone launch and a column or flag row.
- **B. Local dismissal only.** No flag. The ask stops when the player dismisses it (the existing `install-dismissal.ts`). Cheapest, but a player who installed in another browser or on another device may still be asked.
- Either way, the browser session cannot tell by itself that the app is installed, so "they already have" is approximate under B.

**4.4 Weight.** One quiet ask, not a gate: it never blocks the checklist, and one dismiss ends it for good (not the 30-day return the header slot uses). Design confirms.

**States to draw, in sum:** the ask on iPhone Safari, Chrome, Firefox (390); Android with the held prompt (390); the ask absent for desktop, iPad, in-app view and the installed app; after a dismiss; if A is chosen, the first launch from the installed app.

**About entry.** Design and Hugh decide; the default is none (About is image pages now).

## §5 Existing handoffs to mirror

- `design/design_handoff_the99_first_run_onboarding/`: step cards and the checklist. **Closest folder.**
- `design/design_handoff_the99_push/` (`iPhone.dc.html`): the Add to Home Screen sheet and the "needs Home Screen" row.
- `design/design_handoff_the99_discovery_onboarding/`: the tour, if the ask lives there.

**Suggested target:** `design/design_handoff_the99_install_onboarding/`.
