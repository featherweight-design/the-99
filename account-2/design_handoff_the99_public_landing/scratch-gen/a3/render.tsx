import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { Hero, TopBar } from "../src/components/landing/landing";
import { LaunchListProvider } from "../src/components/landing/launch-panel";
const C = [
 { name: "Jace, Multiverse Architect", slug: "jace", colorIdentity: ["W","U","B","R"], artCropUri: "a-jace.jpg", imageUri: "c-jace.jpg", prose: "Jace decks run a wall of planeswalkers: tax every attack, draw ahead each turn, and turn removal into a fresh threat." },
 { name: "Y'shtola, Night's Blessed", slug: "y", colorIdentity: ["W","U","B"], artCropUri: "a-yshtola.jpg", imageUri: "c-yshtola.jpg", prose: "Y’shtola decks cast big noncreature spells; each one drains every opponent for 2, and every big turn draws a card." },
 { name: "Tam, the Possibility", slug: "t", colorIdentity: ["G","U"], artCropUri: "a-tam.jpg", imageUri: "c-tam.jpg", prose: "Tam decks cast planeswalkers at a discount, then proliferate their loyalty several times a turn." },
];
for (const v of ["shipped","stack","scale","rec"]) { const html = renderToString(<LaunchListProvider action={async () => ({ ok: true })}><main className="flex flex-1 flex-col bg-[color:var(--bg)] text-[color:var(--fg)]"><TopBar /><Hero commanders={C} v={v} /></main></LaunchListProvider>);
writeFileSync(`hero/hero-${v}.html`, html); }
