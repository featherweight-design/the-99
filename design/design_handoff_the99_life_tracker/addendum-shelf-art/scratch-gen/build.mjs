import * as esbuild from "esbuild";
const W = "/home/user/work/" + (process.env.TREE ?? "base"), G = "/home/user/work";
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: G + "/stubs/next-navigation.ts" }));
  b.onResolve({ filter: /^next\/link$/ }, () => ({ path: G + "/stubs/next-link.tsx" }));
  b.onResolve({ filter: /result-actions$/ }, () => ({ path: G + "/stubs/result-actions.ts" }));
  b.onResolve({ filter: /^@3d-dice/ }, () => ({ path: G + "/stubs/result-actions.ts" }));
}};
await esbuild.build({ entryPoints: [G + "/entry.tsx"], bundle: true, outfile: G + "/out/" + (process.env.TREE ?? "base") + ".js", format: "esm", jsx: "automatic", nodePaths: [G + "/node_modules"], plugins: [stub], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error", alias: { "@": W + "/src" } });
console.log("built");
