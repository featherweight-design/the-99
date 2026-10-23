# Push notifications · states (R1)

## The device row (Settings, first row of What's new on Home)

| State | Trigger | Row line (placeholder) | Box |
|---|---|---|---|
| Not on yet | `Notification.permission === "default"`, no subscription | Not on yet. Tick here or beside a kind, and your browser asks first. | empty, live: a tick asks |
| On | permission granted, this device subscribed | On. Sends what you tick under Push. Your other devices have their own switch. | ticked |
| Off here | granted, reader unticked the row (unsubscribed) | Off on this device. Your ticks are kept. | empty; ticking re-subscribes, no prompt |
| Blocked | permission `denied` | Blocked in this browser. Allow notifications for the-99.dev in the browser's site settings, then come back. (Installed iPhone: Turned off in iPhone Settings › Notifications › The 99.) | disabled (shipped 50%) |
| Needs Home Screen | iOS ≥16.4, not standalone (`navigator.standalone` false / no PushManager) | On iPhone, push works once The 99 is on your Home Screen. How › | empty; tick or How › opens the sheet |
| Can't | no `PushManager` / iOS <16.4 | This browser can't get push notifications. Home still shows everything. (iOS <16.4: Needs iOS 16.4 or later.) | none; push column hidden |
| Switch off | `PUSH_ENABLED` off | — | section as shipped |

Words *phone* / *browser* / *iPhone*: phone-sized touch device, desktop browser, installed iOS app.

## A kind's push box

| State | Trigger | What happens |
|---|---|---|
| Off → on, device on | tick | saved; nothing else |
| Off → on, device not on yet | tick | saved, then the browser's prompt in the same press |
| Off → on, iPhone in Safari | tick | saved, then the Add to Home Screen sheet |
| Off → on, blocked | tick | saved; row stays blocked |
| Save fails | write error | box returns, shipped toast "We couldn't save that. Try again." |
| Default | unset prefs | spare-request on, the rest off |

## The prompt's outcomes

| Outcome | Result |
|---|---|
| Allow | subscribe; device row → On |
| Block / Don't allow | device row → Blocked; ticks kept |
| Dismissed | device row stays Not on yet; next tick asks again (browser may auto-block after repeats → Blocked) |
| Subscribe fails after allow | shipped toast; row stays Not on yet |

## Delivery (recommended A)

| Case | Result |
|---|---|
| Event 09:00–21:00 device time | push at once |
| Event 21:00–09:00 | held; at 09:00 one push per kind (collapsed copy if more than one) |
| Several of one kind from one job | one push, collapsed copy, lands on Home's What's new |
| Spare request | never collapsed; still held overnight |
| App open and focused | no push; badge/feed as shipped |
| Tap | lands per kind (README table); marks nothing (only Home and /friends move the seen cursor) |
| Opening Home | closes delivered notifications for items it marks seen |
| Subscription 404/410 | row deleted; re-subscribe silently on next visit if still granted |
| Sign out | this device's subscription deleted |
