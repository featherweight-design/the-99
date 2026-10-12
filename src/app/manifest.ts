import type { MetadataRoute } from "next";

// What a phone needs to install the app to its home screen and open it full screen (speed plan,
// 2026-10-12; Hugh: "the PWA route makes sense"). Served at /manifest.webmanifest, and Next links
// it from every document's head.
//
// The ground is the default theme's `--bg`, the colour `icon.svg` is drawn on, so the splash a
// launch shows and the icon on it are one surface. `manifest.test.ts` reads it back out of
// globals.css. The icons are raster copies of `icon.svg`; `public/icons/maskable-512.png` draws the
// mark at 80% so it sits inside the circle a launcher crops a maskable icon to.
const GROUND = "#14110E";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The 99",
    short_name: "The 99",
    description: "MTG Commander companion",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: GROUND,
    theme_color: GROUND,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
