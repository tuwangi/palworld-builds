import { readFile } from "node:fs/promises";

const [, , kind, ...queryParts] = process.argv;
const query = queryParts.join(" ").toLowerCase();

if (!kind || !query) {
  console.error("Usage: node scripts/lookup.mjs <pal|item> <name or partial name>");
  process.exit(1);
}

const root = new URL("../data/snapshot/", import.meta.url);
const file = kind === "pal" ? "pals.json" : "items.json";
const data = JSON.parse(await readFile(new URL(file, root), "utf8"));
const list = kind === "pal" ? data.pals : data.items;

const matches = list.filter((entry) => entry.name.toLowerCase().includes(query));
if (matches.length === 0) {
  console.log("NO MATCH");
} else {
  for (const m of matches) {
    if (kind === "pal") {
      console.log(`${m.id}\t${m.name}\telements=${m.elements.join(",")}\tsource=${m.source}`);
    } else {
      console.log(`${m.id}\t${m.name}\tkind=${m.kind}\ttype=${m.itemType}/${m.subtype}`);
    }
  }
}
