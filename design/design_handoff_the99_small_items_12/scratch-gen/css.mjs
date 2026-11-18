import postcss from "postcss"; import tw from "@tailwindcss/postcss"; import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("src/app/globals.css", "utf8");
const r = await postcss([tw({ base: process.cwd() })]).process(src, { from: "src/app/globals.css" });
writeFileSync("hero/app.css", r.css); console.log(r.css.length);
