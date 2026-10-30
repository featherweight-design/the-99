import { ENTITY, LEGAL_UPDATED, type LegalDoc } from "./shared";

export const privacyDoc: LegalDoc = {
  title: "Privacy",
  updated: LEGAL_UPDATED,
  intro: [
    {
      kind: "p",
      text: `The 99 is a small app for Commander players, run by ${ENTITY}. This page says what it keeps about you, who else touches it, and how to make it all go away.`,
    },
  ],
  sections: [
    {
      id: "what-the-99-keeps",
      title: "What The 99 keeps",
      blocks: [
        { kind: "p", lead: "Your account.", text: "Sign-in is handled by Clerk, so your email, name and password live with them. The 99 keeps your Clerk account id and builds everything else around it. Your first name becomes your display name for friends: at sign-up if you join through an invite, and otherwise when you first use Friends. You can change it." },
        { kind: "p", lead: "Your Collection.", text: "When you upload a CSV or paste a list, we keep the cards it matched: each card, how many, which printing, its finish and condition. For each upload we also keep its filename, a few totals, and any lines we couldn’t match, so you can fix them. The file itself isn’t stored. Every later change to your Collection is kept as history for 90 days, so you can undo it within that time." },
        { kind: "p", lead: "Your decks.", text: "Lists, versions, proxies, locks, folders and notes, plus what you write about a deck: its intent, your notes, and the notes on games you log." },
        { kind: "p", lead: "Your games.", text: "When you log a game with a friend, your record keeps their display name and deck name as they were that day, so your history still reads right if they rename things later." },
        { kind: "p", lead: "Smart tools.", text: "Analysis, the Overview, Suggested changes, Help me choose and the other tools that use a credit keep what they produced, so you can read it again. Each run also records which tool ran, how many tokens it used, and what it cost." },
        { kind: "p", lead: "Wishlist, friends and pods.", text: "The cards you want and how many; who you’re friends with; your pods and what you share in them." },
        { kind: "p", lead: "Credits and purchases.", text: "Your credit balance and where each credit came from. For a purchase we keep Stripe’s ids, the amount, the tax, the currency, the billing country and the status. Your card number never reaches The 99: you type it into Stripe’s checkout." },
        { kind: "p", lead: "Invites.", text: `When you invite someone by email, we hold their address only while the invite is waiting. An invite is valid for up to 7 days, and we erase the address once the invite is resolved or has expired. If that cleanup is delayed, the next sweep does it.` },
        { kind: "p", lead: "Card scanning.", text: "The scanner turns what your camera sees into a short list of numbers on your phone, and only those numbers are sent to match the card. No photo leaves your device." },
        { kind: "p", lead: "Small things.", text: "Your theme and a few view choices (grid or list, a sort) are kept in cookies and your browser’s storage. Which About entries you’ve seen is kept with your account, so clearing your browser doesn’t reset it. Recent card searches are kept on your device and cleared when you sign out. The 99 has no advertising trackers." },
      ],
    },
    {
      id: "who-else-handles-it",
      title: "Who else handles it",
      blocks: [
        { kind: "p", text: "The 99 runs on a handful of services. Each gets only what its job needs:" },
        {
          kind: "list",
          items: [
            { lead: "Clerk:", text: "sign-in, your account page, and email invitations. Clerk may load its bot check from Cloudflare." },
            { lead: "Neon:", text: "the database where everything above is stored." },
            { lead: "Vercel:", text: "hosting, and the server logs." },
            { lead: "Stripe:", text: "checkout, tax and receipts. Stripe gets your email and your account id when you buy, plus the billing address you enter at checkout." },
            { lead: "Resend:", text: "sends the six-digit code when someone joins by QR code." },
            { lead: "PostHog (US Cloud):", text: "usage analytics. It records the pages you open and when you leave them, tagged with your account id and the version of the app. It records no clicks, no session replays, no name and no email. It stays silent if your browser sends Do Not Track. Like any site, it sees your IP address when your browser sends these." },
            { lead: "Sentry:", text: "error reports. When something breaks, Sentry gets the kind of error and where in the code it happened, the page address without its query, and a short trail of your page changes and clicks without their text. It gets no names, emails, deck or card text, and none of the error messages." },
            { lead: "Anthropic:", text: "the AI model behind the smart tools. A run sends the deck or the cards it is about, your game records where the tool reads them, and the words you typed for it (a deck’s intent, a run’s notes). It sends no account id, email or name." },
            { lead: "Scryfall:", text: "card images load straight from Scryfall into your browser, so Scryfall sees your IP address, like any site serving an image." },
            { lead: "jsDelivr and Hugging Face:", text: "the card scanner downloads its software and models from these when you start the camera." },
          ],
        },
        { kind: "p", text: "Card prices come from Mana Pool, combos from Commander Spellbook, and deck data from EDHREC and MTGJSON. The 99 reads those on its own servers. Mana Pool and Commander Spellbook only hear from you when you press a link to their sites." },
      ],
    },
    {
      id: "what-friends-see",
      title: "What friends see",
      blocks: [
        { kind: "p", text: "Friends are added only by an invite link or QR code. There’s no search and no directory. While an invite link is open, whoever holds it sees your display name and your commander." },
        { kind: "p", text: "A friend sees your display name and the commander you picked as your face. They also see:" },
        {
          kind: "list",
          items: [
            { text: "your spares, if you share them with a pod you’re both in;" },
            { text: "your wishlist: the card and how many you want;" },
            { text: "a deck’s name and commanders, so you can seat it at a game." },
          ],
        },
        { kind: "p", text: "Your email and your Collection’s counts stay yours." },
      ],
    },
    {
      id: "admins",
      title: "Admins",
      blocks: [{ kind: "p", text: "Admins can see account emails for support and access, and each view is logged." }],
    },
    {
      id: "deleting-your-account",
      title: "Deleting your account",
      blocks: [
        { kind: "p", text: "Delete your account from “Manage account” in the account menu, on Clerk’s account page. If that doesn’t work for you, email {email} and we’ll do it. Within minutes, The 99 deletes everything it keeps about you, with a final pass within a day: your Collection, decks, games, notes, wishlist, friendships, invites, tool results, credits and preferences. Your Stripe customer record is deleted too, and any unspent credits go with the account." },
        { kind: "p", text: "A few things stay, without your account attached:" },
        {
          kind: "list",
          items: [
            { text: "purchase records (amount, tax, country), because tax and dispute records have to outlive an account;" },
            { text: "a one-way scrambled form of your account id and the date it was deleted, so a deletion can’t be undone by accident;" },
            { text: "your name and deck name in friends’ game logs, as they were the day they logged the game." },
          ],
        },
      ],
    },
    {
      id: "getting-a-copy",
      title: "Getting a copy",
      blocks: [{ kind: "p", text: "Want a copy of what The 99 keeps about you? Email {email} and we’ll send it." }],
    },
    {
      id: "age",
      title: "Age",
      blocks: [{ kind: "p", text: "You need to be 18 or older to use The 99." }],
    },
    {
      id: "questions",
      title: "Questions",
      blocks: [{ kind: "p", text: "Email {email}." }],
    },
  ],
};
