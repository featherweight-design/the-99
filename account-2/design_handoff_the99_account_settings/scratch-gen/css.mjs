import postcss from "../node_modules/.pnpm/postcss@8.5.23/node_modules/postcss/lib/postcss.mjs"; import tw from "@tailwindcss/postcss"; import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("src/app/globals.css", "utf8");
const r = await postcss([tw({ base: process.cwd() })]).process(src, { from: "src/app/globals.css" });
writeFileSync("gen/out/app.css", r.css); console.log(r.css.length);
