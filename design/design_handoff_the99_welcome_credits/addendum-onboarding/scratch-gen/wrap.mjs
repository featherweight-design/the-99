import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { page } from "./page.mjs";
const still = `<style>*,*::before,*::after{animation:none!important;transition:none!important}.anim-sheet-in,.anim-gentle-in{opacity:1!important;transform:none!important}</style>`;
for (const f of readdirSync(".").filter((f) => /^(home|sheet|tour)-.*\.html$/.test(f))) writeFileSync(`q-${f}`, page(still + readFileSync(f, "utf8"), "amonkhet"));
