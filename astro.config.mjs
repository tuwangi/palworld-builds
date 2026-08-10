import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Needed for absolute canonical/hreflang/OG URLs and for the sitemap.
  // Override with SITE_URL when deploying to a different domain.
  site: process.env.SITE_URL ?? "https://palworld-builds.vercel.app",
  // Static by default (fast, cheap, cacheable); only the profile API route
  // and /profile/:id pages opt out via `export const prerender = false`,
  // since profile IDs are arbitrary user input and can't be pre-generated.
  output: "static",
  adapter: vercel(),
  integrations: [
    preact(),
    sitemap({
      // /profile/:id is per-user and server-rendered; it has no place in a
      // sitemap and is already marked noindex in the layout.
      filter: (page) => !page.includes("/profile/"),
      i18n: { defaultLocale: "es", locales: { es: "es", en: "en" } },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
