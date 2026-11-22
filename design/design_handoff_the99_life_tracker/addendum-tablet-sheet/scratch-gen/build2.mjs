import * as esbuild from "esbuild";
const W = "<repo>", G = "<scratch>";
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: G + "/stubs/next-navigation.ts" }));
  b.onResolve({ filter: /^next\/link$/ }, () => ({ path: G + "/stubs/next-link.tsx" }));
  b.onResolve({ filter: /result-actions$/ }, () => ({ path: G + "/stubs/result-actions.ts" }));

}};
await esbuild.build({ entryPoints: [G + "/" + (process.env.ENTRY ?? "entry.tsx")], bundle: true, outfile: G + "/out/" + (process.env.JS ?? "app.js"), format: "esm", jsx: "automatic", nodePaths: [G + "/node_modules"], plugins: [stub], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", alias: { "@": G + "/src2" } });
console.log("built");
