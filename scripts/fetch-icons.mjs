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

async function downloadImage(url, destDir, filename) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Icon download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(filename, destDir), buf);
}

/**
 * paldb.gg's listing is the primary icon source, but it lags wiki.gg on some
 * 1.0 variants (Rayhound Cryst has a wiki.gg row and no paldb.gg page at all).
 * Rather than ship those Pals as a bare initial forever, fall back to the
 * wiki.gg file API for any Pal in the snapshot that the listing didn't cover.
 */
async function wikiIconUrl(name) {
  const title = `File:${name} icon.png`;
  const api = `https://palworld.wiki.gg/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(title)}`;
  const res = await fetch(api, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const body = await res.json();
  const pages = body?.query?.pages ?? {};
  for (const page of Object.values(pages)) {
    const url = page?.imageinfo?.[0]?.url;
    if (url) return url;
  }
  return null;
}

async function fetchPalIcons(snapshotPals) {
  const html = await fetchText("https://paldb.gg/pals/");
  const $ = cheerio.load(html);

  const entries = [];
  $('a[href^="/pal/"]').each((_, el) => {
    const $el = $(el);
    const name = $el.find("span.font-display").first().text().trim();
    const src = $el.find("img").first().attr("src");
    if (!name || !src) return;
    entries.push({ name, id: slugify(name), src: `https://paldb.gg${src}` });
  });

  // The manifest is what the app trusts to decide an icon exists. If paldb.gg
  // changes its markup this selector silently yields nothing, and writing that
  // empty result would drop every icon site-wide. Refuse instead.
  if (entries.length < 200) {
    throw new Error(
      `paldb.gg listing yielded only ${entries.length} Pal entries (expected ~288) — markup likely changed. Refusing to overwrite the icon manifest.`,
    );
  }

  const listed = new Set(entries.map((e) => e.id));
  const fallbacks = snapshotPals.filter((p) => !listed.has(p.id));

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

  for (const pal of fallbacks) {
    try {
      const url = await wikiIconUrl(pal.name);
      if (!url) {
        failed.push({ id: pal.id, name: pal.name, error: "absent from paldb.gg listing and wiki.gg has no icon file" });
        continue;
      }
      await downloadImage(url, PAL_ICON_DIR, `${pal.id}.webp`);
      ok.push(pal.id);
    } catch (err) {
      failed.push({ id: pal.id, name: pal.name, error: err.message });
    }
    await sleep(150);
  }

  return { total: entries.length + fallbacks.length, ok, failed, fallbackCount: fallbacks.length };
}

async function fetchItemIcons(itemIds, itemNamesById) {
  await mkdir(ITEM_ICON_DIR, { recursive: true });

  const ok = [];
  const missing = [];
  for (const id of itemIds) {
    let paldbReason = null;
    try {
      const html = await fetchText(`https://paldb.gg/item/${id}/`);
      const $ = cheerio.load(html);
      const src = $("img[src^='/item/']").first().attr("src");
      if (src) {
        await downloadImage(`https://paldb.gg${src}`, ITEM_ICON_DIR, `${id}.webp`);
        ok.push(id);
        await sleep(300);
        continue;
      }
      paldbReason = "no icon on paldb.gg item page";
    } catch (err) {
      paldbReason = err.message;
    }

    // Same lag as the Pal listing: paldb.gg 404s on some 1.0 weapons that
    // wiki.gg already has a file for (Assault Rifle, Three Shot Bow).
    const name = itemNamesById.get(id);
    try {
      const url = name ? await wikiIconUrl(name) : null;
      if (url) {
        await downloadImage(url, ITEM_ICON_DIR, `${id}.webp`);
        ok.push(id);
      } else {
        missing.push({ id, reason: `${paldbReason}; wiki.gg has no icon file either` });
      }
    } catch (err) {
      missing.push({ id, reason: `${paldbReason}; wiki.gg fallback failed: ${err.message}` });
    }
    await sleep(300);
  }
  return { total: itemIds.length, ok, missing };
}

async function main() {
  const catalogPath = new URL("../data/catalog.json", import.meta.url);
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const snapshotPals = JSON.parse(
    await readFile(new URL("../data/snapshot/pals.json", import.meta.url), "utf8"),
  ).pals;
  const itemIds = new Set();
  for (const build of catalog.builds) {
    for (const eq of build.equipment) {
      itemIds.add(eq.itemId);
      for (const alt of eq.alternatives ?? []) itemIds.add(alt);
    }
  }

  console.log(`Fetching Pal icons from paldb.gg (${itemIds.size} item icons also needed)...`);
  const pals = await fetchPalIcons(snapshotPals);
  console.log(
    `Pals: ${pals.ok.length}/${pals.total} downloaded (${pals.fallbackCount} attempted via wiki.gg fallback), ${pals.failed.length} failed.`,
  );

  console.log("Fetching item icons...");
  const itemNamesById = new Map(
    JSON.parse(await readFile(new URL("../data/snapshot/items.json", import.meta.url), "utf8")).items.map((i) => [i.id, i.name]),
  );
  const items = await fetchItemIcons([...itemIds], itemNamesById);
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
