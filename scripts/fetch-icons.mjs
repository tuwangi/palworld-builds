import * as cheerio from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { slugify } from "./lib/slug.mjs";

const PAL_ICON_DIR = new URL("../public/icons/pals/", import.meta.url);
const ITEM_ICON_DIR = new URL("../public/icons/items/", import.meta.url);
const REPORT_PATH = new URL("../data/snapshot/icons-report.json", import.meta.url);
const MANIFEST_PATH = new URL("../data/snapshot/icons-manifest.json", import.meta.url);

const USER_AGENT = "palworld-builds-companion/0.1 (personal project)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.text();
}

async function downloadImage(path, destDir, filename) {
  const url = `https://paldb.gg${path}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Icon download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(filename, destDir), buf);
}

async function fetchPalIcons() {
  const html = await fetchText("https://paldb.gg/pals/");
  const $ = cheerio.load(html);

  const entries = [];
  $('a[href^="/pal/"]').each((_, el) => {
    const $el = $(el);
    const name = $el.find("span.font-display").first().text().trim();
    const src = $el.find("img").first().attr("src");
    if (!name || !src) return;
    entries.push({ name, id: slugify(name), src });
  });

  await mkdir(PAL_ICON_DIR, { recursive: true });

  const ok = [];
  const failed = [];
  for (const entry of entries) {
    try {
      await downloadImage(entry.src, PAL_ICON_DIR, `${entry.id}.webp`);
      ok.push(entry.id);
    } catch (err) {
      failed.push({ id: entry.id, name: entry.name, error: err.message });
    }
    await sleep(150);
  }
  return { total: entries.length, ok, failed };
}

async function fetchItemIcons(itemIds) {
  await mkdir(ITEM_ICON_DIR, { recursive: true });

  const ok = [];
  const missing = [];
  for (const id of itemIds) {
    const url = `https://paldb.gg/item/${id}/`;
    try {
      const html = await fetchText(url);
      const $ = cheerio.load(html);
      const src = $("img[src^='/item/']").first().attr("src");
      if (!src) {
        missing.push({ id, reason: "no icon on paldb.gg item page" });
        continue;
      }
      await downloadImage(src, ITEM_ICON_DIR, `${id}.webp`);
      ok.push(id);
    } catch (err) {
      missing.push({ id, reason: err.message });
    }
    await sleep(300);
  }
  return { total: itemIds.length, ok, missing };
}

async function main() {
  const catalogPath = new URL("../data/catalog.json", import.meta.url);
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const itemIds = new Set();
  for (const build of catalog.builds) {
    for (const eq of build.equipment) {
      itemIds.add(eq.itemId);
      for (const alt of eq.alternatives ?? []) itemIds.add(alt);
    }
  }

  console.log(`Fetching Pal icons from paldb.gg (${itemIds.size} item icons also needed)...`);
  const pals = await fetchPalIcons();
  console.log(`Pals: ${pals.ok.length}/${pals.total} downloaded, ${pals.failed.length} failed.`);

  console.log("Fetching item icons...");
  const items = await fetchItemIcons([...itemIds]);
  console.log(`Items: ${items.ok.length}/${items.total} downloaded, ${items.missing.length} missing.`);

  const report = {
    generatedAt: new Date().toISOString(),
    pals: { total: pals.total, downloaded: pals.ok.length, failed: pals.failed },
    items: { total: items.total, downloaded: items.ok.length, missing: items.missing },
  };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

  // Statically importable list of which ids have a downloaded icon. The app
  // reads this instead of checking the filesystem at runtime/build time —
  // an `existsSync` relative to a source file's `import.meta.url` breaks
  // once Vite bundles that file into dist/, since the bundled chunk no
  // longer lives next to public/icons/. A plain JSON import has no such
  // path dependency.
  const manifest = { pals: pals.ok.sort(), items: items.ok.sort() };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  if (pals.failed.length > 0) {
    console.warn(`Pals without a downloaded icon: ${pals.failed.map((f) => f.id).join(", ")}`);
  }
  if (items.missing.length > 0) {
    console.warn(`Items without a downloaded icon: ${items.missing.map((m) => m.id).join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
