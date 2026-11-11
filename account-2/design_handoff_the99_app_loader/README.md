# The 99 · App loader (R1)

Canvas: https://claude.ai/artifact/SX3a4cEcy2bAjs4yR4N2Zh  
Requested by Hugh 2026-11-11: a ~1 second animated loader for the installed app, in the spirit of Concert Crawl's launch animation.

## What's shared by all options
- Plays on the installed app's cold start only (display-mode standalone). Never in a browser tab, never on later navigations.
- Never holds the app: Home loads underneath, and the hand-off starts when the mark lands (~0.85 s), Home fully in by 0.95 s.
- The system splash (Android, from the manifest) and the iPhone startup image are one static picture: the icon on Low Sun's ground #14110E. iPhone startup images are not shipped today (owed).
- First paint = that icon in the same spot. The whole loader runs in Low Sun (continues the splash), then Home fades up in the saved theme (boards: Neon Rain and Eldraine).
- The mark is icon.svg's lockup (Cinzel 900 outlined), landing on the mobile header's Crowned99 spot (crown centre 66.75, 24.75).
- Reduced motion: a straight cut from splash to Home. In-app loading screen keeps today's still crown.

## Options
- **A · Crown lights**: grows, the three diamonds light left, right, centre; the centre glows; THE NINETY-NINE rises; flies to the header. In app: LoadingScreen's crown lights instead of blinking (1.2 s).
- **B · The flip**: a card back (The 99's own diamond lattice, not Wizards' back) fills in under the mark with a −5° tilt, flips face up, foil glint crosses, the mark lifts off into the header. In app: a small crown card flips every 1.6 s.
- **C · Count to 99**: the crown lifts off, the numeral counts to 99, diamonds drop back at 33, 66 and 99, glow, fly to header. In app: crown builds one diamond at a time (1.4 s).

- **D · The flip, then the crown lights (R1b, Hugh 2026-11-11: combine A and B, "a bit more magic")**: card back grows tilted −6°, flips face up (350–570 ms), the crown lights left, right, centre on the face; as the centre lights the card edge glows, a bloom opens and eight four-point sparkles (pale gold + shipped foil colours) burst and fade while the foil glint crosses; the mark lifts into the header (760–920), Home in by 1.04 s. In app: a small card flips, its crown lights, turns back (2 s).

- **A2 · Crown lights with sparkles (R1c, Hugh: "add the sparkles to A")**: A unchanged, plus D's eight sparkles bursting as the centre diamond lights (475 ms), gone by ~700 ms. Same 0.95 s.
- **D2 · D slowed to 1.6 s (R1c, Hugh: D "too much to see at that speed")**: every beat of D stretched 1.6×, Home in at 1.66 s.

- **D3 · D2 without the sparkles (R1d, Hugh: "D2 is my favorite, but can I see it without the added sparkles?")**: 1.66 s, card glow, bloom and glint stay. Hugh 2026-11-11: the 1.66 s timing is fine (cold start only; otherwise they'd watch the app load).

Status: R1d (D3 added), awaiting Hugh's pick between D2 and D3.
