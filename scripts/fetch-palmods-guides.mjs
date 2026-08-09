import * as cheerio from "cheerio";
import { mkdir, writeFile } from "node:fs/promises";

const SLUGS = [
  "bow", "burn", "fishing", "looting", "shield-tank", "firearm", "capture", "mobility",
  "poison-blind", "knocklem-poison", "charge-rifle", "saya-selyne-hard", "mobility-melee",
  "sustain-rescue", "anubis-hard-tower", "fast-kill-exploration", "life-steal-raid",
  "bellanoir-rotation", "soak-shock-overload", "poison-barrier", "skutlass-melee",
  "death-from-above", "grass-team", "fire-team", "water-team", "electric-team",
  "ice-team", "ground-team", "dark-team", "dragon-team",
];

const OUT_DIR = process.argv[2];
if (!OUT_DIR) {
  console.error("Usage: node scripts/fetch-palmods-guides.mjs <output-dir>");
  process.exit(1);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const slug of SLUGS) {
    const url = `https://www.palmods.gg/guides/builds/${slug}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "palworld-builds-companion/0.1 (personal project)" },
    });
    if (!res.ok) {
      console.error(`FAILED ${slug}: ${res.status}`);
      continue;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer").remove();
    const text = $("main").first().text().replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
    await writeFile(`${OUT_DIR}/${slug}.txt`, `SOURCE_URL: ${url}\n\n${text}`, "utf8");
    console.log(`OK ${slug} (${text.length} chars)`);
    await sleep(500);
  }
}

main();
