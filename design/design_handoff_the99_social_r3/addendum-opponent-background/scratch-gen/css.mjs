import postcss from "postcss"; import tw from "@tailwindcss/postcss"; import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const W = "<repo>", G = "<scratch>";
let src = readFileSync(W + "/src/app/globals.css", "utf8").replace('@import "./bracket-marks.css";', '@import "' + W + '/src/app/bracket-marks.css";').replace(/@source not "[^"]+";/, "").replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "' + W + '/src";\n@source "' + G + '/entry.tsx";');
mkdirSync(G + "/css", { recursive: true }); writeFileSync(G + "/css/in.css", src);
const r = await postcss([tw({ base: G })]).process(src, { from: G + "/css/in.css" });
writeFileSync(G + "/out/app.css", r.css); console.log(r.css.length);
