import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Static by default (fast, cheap, cacheable); only the profile API route
  // and /profile/:id pages opt out via `export const prerender = false`,
  // since profile IDs are arbitrary user input and can't be pre-generated.
  output: "static",
  adapter: vercel(),
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
