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

Status: R1, awaiting Hugh's pick.
