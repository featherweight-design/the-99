import { creditsPageCopy } from "../credits-page";
import { PACKS } from "../../payments/packs";
import { PAID_DAILY_LIMIT } from "../../model/allowance-rule";
import { WELCOME_DAYS, WELCOME_UNITS } from "../../payments/welcome";
import { ENTITY, LEGAL_UPDATED, type LegalDoc } from "./shared";

const pack = PACKS.pack40;
const packPrice = `$${pack.priceCents / 100}`;

export const termsDoc: LegalDoc = {
  title: "Terms",
  updated: LEGAL_UPDATED,
  intro: [
    { kind: "p", text: `These are the rules for using The 99, run by ${ENTITY}. By making an account you agree to them.` },
  ],
  sections: [
    {
      id: "who-can-use-it",
      title: "Who can use it",
      blocks: [{ kind: "p", text: "You need to be 18 or older. The 99 is invite-only for now: you join through an invite from someone already on it." }],
    },
    {
      id: "your-account",
      title: "Your account",
      blocks: [{ kind: "p", text: "Keep your sign-in to yourself; what happens on your account is on you. You can delete it whenever you like (see Privacy)." }],
    },
    {
      id: "what-you-put-in",
      title: "What you put in",
      blocks: [{ kind: "p", text: "Your Collection, decks and notes are yours. You let The 99 store them and use them to run the app for you: reading your decks, building from your Collection, and running the smart tools you ask for." }],
    },
    {
      id: "credits",
      title: "Credits",
      blocks: [
        { kind: "p", text: "One credit is one run of a smart tool: Analysis, the Overview, Suggested changes, Help me choose’s Look deeper, and the others marked with a cost. Every card, deck and Collection view stays free." },
        {
          kind: "list",
          items: [
            { text: `A pack is ${pack.units} credits for ${packPrice}, and pack credits don’t expire.` },
            { text: `New accounts get ${WELCOME_UNITS} welcome credits, which expire ${WELCOME_DAYS} days after the account is made.` },
            { text: "Credits are spent in this order: your free allowance, then welcome credits, then plan credits, then pack credits." },
            { text: `You can spend up to ${PAID_DAILY_LIMIT} paid credits a day.` },
            { text: "A run that fails gives its credit back on its own." },
            { text: "Credits can’t be transferred or gifted, and they have no cash value." },
            { text: "Credits left on an account when it’s deleted are forfeited." },
          ],
        },
      ],
    },
    {
      id: "buying-and-refunds",
      title: "Buying and refunds",
      blocks: [
        { kind: "p", text: "Checkout is Stripe’s, and it takes US cards only. You need a verified email to buy. Tax is added at checkout. Your receipt is Stripe’s, and “Purchase history” on Credits links to it." },
        // One definition with the Credits page: the same three parts it draws, so a change there moves both.
        { kind: "p", text: `${creditsPageCopy.refunds.before}{email}${creditsPageCopy.refunds.after}` },
        { kind: "p", text: "If a payment is disputed with the card issuer, we may pause buying on the account and take back the credits that payment bought." },
      ],
    },
    {
      id: "what-the-smart-tools-tell-you",
      title: "What the smart tools tell you",
      blocks: [{ kind: "p", text: "The smart tools are AI, and they can be wrong: about a card, about a combo, about a bracket. The bracket readings are partial by design; they flag what they can detect and say so. Treat every suggestion as a suggestion." }],
    },
    {
      id: "no-warranty",
      title: "No warranty",
      blocks: [{ kind: "p", text: `The 99 and its smart tools are provided “as is”, without warranties of any kind, express or implied. ${ENTITY} doesn’t promise the app will be uninterrupted, error-free, or right about any card, deck or bracket.` }],
    },
    {
      id: "limit-of-liability",
      title: "Limit of liability",
      blocks: [{ kind: "p", text: `To the extent the law allows, ${ENTITY}’s total liability to you for anything to do with The 99 is limited to what you paid it in the 12 months before the claim.` }],
    },
    {
      id: "ground-rules",
      title: "Ground rules",
      blocks: [{ kind: "p", text: "Don’t try to break, overload or scrape The 99, get around its credit limits, or use someone else’s account. If an account abuses the tools, we may limit or suspend it. A suspension never takes unused paid credits without a refund." }],
    },
    {
      id: "changes",
      title: "Changes",
      blocks: [{ kind: "p", text: "We’ll update these terms as The 99 changes. When we do, the date at the top moves and a short note goes in What’s new on the About page." }],
    },
    {
      id: "law",
      title: "Law",
      blocks: [{ kind: "p", text: `These terms are governed by the laws of the State of Colorado, where ${ENTITY} is organized. Any dispute goes to the state or federal courts in Colorado.` }],
    },
    {
      id: "questions",
      title: "Questions",
      blocks: [{ kind: "p", text: "Email {email}." }],
    },
  ],
};
