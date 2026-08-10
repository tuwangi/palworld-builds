import { mkdir, writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { cargoQueryAll } from "./lib/cargo.mjs";
import { slugify } from "./lib/slug.mjs";
import { cleanWikitext } from "./lib/wikitext.mjs";

const OUT_DIR = new URL("../data/snapshot/", import.meta.url);
const CAPTURED_AT = process.env.SNAPSHOT_CAPTURED_AT ?? new Date().toISOString();

const VALID_ELEMENTS = new Set([
  "neutral", "fire", "water", "grass", "electric", "ice", "ground", "dark", "dragon",
]);

// Closed mapping verified against a live `group_by(itemType, subtype)` query on
// wiki.gg Cargo (2026-08-09), documented in docs/data-sources.md. Any pair not
// listed here is reported as unmapped rather than guessed.
const KIND_MAP = new Map([
  ["Accessory|", "accessory"],
  ["Accessory|Charm", "accessory"],
  ["Accessory|Pendant", "accessory"],
  ["Accessory|Ring", "accessory"],
  ["Accessory|Support Whistle", "accessory"],
  ["Accessory|Undershirt", "accessory"],
  ["Armor|", "armor"],
  ["Armor|Body Armor", "armor"],
  ["Armor|Head Armor", "armor"],
  ["Armor|Hat", "armor"],
  ["Armor|Shield", "shield"],
  ["Glider|", "glider"],
  ["Weapon|", "weapon"],
  ["Weapon|Grenade", "weapon"],
  ["Weapon|Melee", "weapon"],
  ["Weapon|Ranged", "weapon"],
  ["Weapon|Tool", "weapon"],
]);

const NON_EQUIPMENT_TYPES = new Set([
  "Ammo", "Consumable", "Implant", "Key Item", "Material", "Other Item", "Schematic",
  "Sphere", "Sphere Module",
]);

function normalizeElement(raw) {
  const value = raw.trim().toLowerCase();
  if (!VALID_ELEMENTS.has(value)) {
    throw new Error(`Unknown element "${raw}" — not in the schema enum. Aborting snapshot.`);
  }
  return value;
}

async function fetchWikiPals() {
  const [rawPals, elementRows, skillRows, scaleRows] = await Promise.all([
    cargoQueryAll({ tables: "Pal", fields: "palName,paldeckNumber" }),
    cargoQueryAll({ tables: "PalElement", fields: "palName,element" }),
    cargoQueryAll({ tables: "PalPartnerSkill", fields: "palName,partnerSkill,description,type" }),
    cargoQueryAll({
      tables: "PalPartnerSkillScale",
      fields: "partnerSkill,effectType,effectValue,level,target",
    }),
  ]);

  // A handful of wiki.gg rows are dev/placeholder noise with no paldeck number
  // (e.g. "BigFoxWolf", "Faleris Noct"). Treat them as absent from the wiki so
  // the paldb.gg coverage patch below can fill them in with real data instead.
  const droppedNoise = rawPals.filter((p) => !p.paldeckNumber || !p.paldeckNumber.trim());
  if (droppedNoise.length > 0) {
    console.warn(
      `Dropping ${droppedNoise.length} wiki.gg Pal row(s) with no paldeck number (treated as missing, patched from paldb.gg if present): ${droppedNoise.map((p) => p.palName).join(", ")}`,
    );
  }
  const pals = rawPals.filter((p) => p.paldeckNumber && p.paldeckNumber.trim());
  const validNames = new Set(pals.map((p) => p.palName));

  const elementsByPal = new Map();
  for (const row of elementRows) {
    if (!validNames.has(row.palName)) continue;
    if (!row.element || !row.element.trim()) {
      console.warn(`Skipping empty element value for "${row.palName}" (wiki.gg data gap).`);
      continue;
    }
    const list = elementsByPal.get(row.palName) ?? [];
    list.push(normalizeElement(row.element));
    elementsByPal.set(row.palName, list);
  }

  const scalingBySkill = new Map();
  for (const row of scaleRows) {
    const list = scalingBySkill.get(row.partnerSkill) ?? [];
    list.push({
      level: Number(row.level),
      effectType: cleanWikitext(row.effectType),
      effectValue: cleanWikitext(row.effectValue),
      target: cleanWikitext(row.target),
    });
    scalingBySkill.set(row.partnerSkill, list);
  }

  const skillByPal = new Map();
  for (const row of skillRows) {
    skillByPal.set(row.palName, {
      name: cleanWikitext(row.partnerSkill),
      description: cleanWikitext(row.description),
      workType: cleanWikitext(row.type),
      scaling: (scalingBySkill.get(row.partnerSkill) ?? []).sort((a, b) => a.level - b.level),
    });
  }

  return pals.map((row) => {
    const paldeckNumber = row.paldeckNumber;
    return {
      id: slugify(row.palName),
      name: row.palName,
      paldeckNumber,
      elements: elementsByPal.get(row.palName) ?? [],
      isVariant: /[A-Za-z]$/.test(paldeckNumber ?? ""),
      partnerSkill: skillByPal.get(row.palName) ?? null,
      source: "wiki.gg",
    };
  });
}

async function fetchPaldbPalList() {
  const res = await fetch("https://paldb.gg/pals/", {
    headers: { "User-Agent": "palworld-builds-companion/0.1 (personal project)" },
  });
  if (!res.ok) {
    throw new Error(`paldb.gg pals list failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const entries = [];
  $('a[href^="/pal/"]').each((_, el) => {
    const $el = $(el);
    const name = $el.find("span.font-display").first().text().trim();
    const paldeckNumber = $el.find("span.num").first().text().trim().replace(/^#/, "");
    if (!name || !paldeckNumber) return;
    const elements = $el
      .find(".mt-1\\.5 span")
      .map((__, span) => $(span).text().trim())
      .get()
      .filter(Boolean)
      .map(normalizeElement);
    entries.push({ name, paldeckNumber, elements });
  });
  return entries;
}

async function buildPals() {
  const wikiPals = await fetchWikiPals();
  const wikiNames = new Set(wikiPals.map((p) => p.name.toLowerCase()));

  const paldbPals = await fetchPaldbPalList();
  const paldbNames = new Set(paldbPals.map((p) => p.name.toLowerCase()));
  const missingFromWiki = paldbPals.filter((p) => !wikiNames.has(p.name.toLowerCase()));

  const patched = missingFromWiki.map((p) => ({
    id: slugify(p.name),
    name: p.name,
    paldeckNumber: p.paldeckNumber,
    elements: p.elements,
    isVariant: /[A-Za-z]$/.test(p.paldeckNumber ?? ""),
    partnerSkill: null,
    source: "paldb",
  }));

  // Pals present in wiki.gg with real data but absent from paldb.gg's own
  // current listing. Not noise (they have a real paldeck number and data) and
  // not guessed — kept, but surfaced so a human can double-check them.
  const inWikiNotPaldb = wikiPals.filter((p) => !paldbNames.has(p.name.toLowerCase()));

  const all = [...wikiPals, ...patched].sort((a, b) => a.id.localeCompare(b.id));
  return {
    pals: all,
    paldbTotal: paldbPals.length,
    patchedCount: patched.length,
    inWikiNotPaldb: inWikiNotPaldb.map((p) => ({ name: p.name, paldeckNumber: p.paldeckNumber })),
  };
}

async function buildItems() {
  const [items, equipmentRows] = await Promise.all([
    cargoQueryAll({ tables: "Item", fields: "itemName,itemType,subtype,rarity" }),
    cargoQueryAll({
      tables: "ItemEquipment",
      fields:
        "itemName,attack,defense,healthBonus,shieldValue,gliderSpeed,capturePower,ammoType",
    }),
  ]);

  const equipmentByName = new Map(equipmentRows.map((row) => [row.itemName, row]));
  const unmappedPairs = new Set();

  const result = items.map((row) => {
    const key = `${row.itemType}|${row.subtype ?? ""}`;
    let kind = null;
    if (NON_EQUIPMENT_TYPES.has(row.itemType)) {
      kind = null;
    } else if (KIND_MAP.has(key)) {
      kind = KIND_MAP.get(key);
    } else {
      unmappedPairs.add(key);
    }

    const equipRow = equipmentByName.get(row.itemName);
    const equipment = equipRow
      ? {
          ...(equipRow.attack ? { attack: Number(equipRow.attack) } : {}),
          ...(equipRow.defense ? { defense: Number(equipRow.defense) } : {}),
          ...(equipRow.healthBonus ? { healthBonus: Number(equipRow.healthBonus) } : {}),
          ...(equipRow.shieldValue ? { shieldValue: Number(equipRow.shieldValue) } : {}),
          ...(equipRow.gliderSpeed ? { gliderSpeed: Number(equipRow.gliderSpeed) } : {}),
          ...(equipRow.capturePower ? { capturePower: Number(equipRow.capturePower) } : {}),
          ...(equipRow.ammoType ? { ammoType: equipRow.ammoType } : {}),
        }
      : undefined;

    return {
      id: slugify(row.itemName),
      name: row.itemName,
      itemType: row.itemType,
      subtype: row.subtype ?? "",
      kind,
      rarity: row.rarity,
      ...(equipment && Object.keys(equipment).length > 0 ? { equipment } : {}),
      source: "wiki.gg",
    };
  });

  if (unmappedPairs.size > 0) {
    console.warn(
      `WARNING: ${unmappedPairs.size} itemType/subtype pair(s) have no kind mapping: ${[...unmappedPairs].join(", ")}`,
    );
  }

  return { items: result, unmappedPairs: [...unmappedPairs] };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log("Fetching Pal snapshot (wiki.gg + paldb.gg coverage patch)...");
  const { pals, paldbTotal, patchedCount, inWikiNotPaldb } = await buildPals();
  if (inWikiNotPaldb.length > 0) {
    console.warn(
      `${inWikiNotPaldb.length} Pal(s) exist in wiki.gg with real data but are absent from paldb.gg's current listing (kept, flagged): ${inWikiNotPaldb.map((p) => p.name).join(", ")}`,
    );
  }

  console.log("Fetching Item snapshot (wiki.gg)...");
  const { items, unmappedPairs } = await buildItems();

  const meta = {
    schemaVersion: "1.0.0",
    gameVersion: "1.0",
    capturedAt: CAPTURED_AT,
    sources: {
      "wiki.gg": "https://palworld.wiki.gg/wiki/Special:CargoTables",
      paldb: "https://paldb.gg/about/",
    },
    counts: {
      pals: pals.length,
      palsFromWiki: pals.filter((p) => p.source === "wiki.gg").length,
      palsPatchedFromPaldb: patchedCount,
      paldbReportedTotal: paldbTotal,
      items: items.length,
      itemsWithKind: items.filter((i) => i.kind !== null).length,
      itemsUnmappedKind: unmappedPairs.length,
    },
    unmappedItemKindPairs: unmappedPairs,
    palsInWikiNotInPaldbListing: inWikiNotPaldb,
  };

  await writeFile(new URL("pals.json", OUT_DIR), JSON.stringify({ pals }, null, 2) + "\n");
  await writeFile(new URL("items.json", OUT_DIR), JSON.stringify({ items }, null, 2) + "\n");
  await writeFile(new URL("meta.json", OUT_DIR), JSON.stringify(meta, null, 2) + "\n");

  console.log(`Wrote ${pals.length} pals (${patchedCount} patched from paldb.gg) and ${items.length} items.`);
  if (unmappedPairs.length > 0) {
    console.warn(`Unmapped itemType/subtype pairs: ${unmappedPairs.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
