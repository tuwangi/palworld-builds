/**
 * Inverted index of the snapshot: "which Pal actually provides effect X, and
 * how much at each condensation rank".
 *
 * The catalog audit kept hitting the same question — a build claims a Pal
 * gives some buff, the Pal doesn't, so *does anything*? Answering that by
 * hand meant re-reading 262 skills. This groups the scale rows by effect so
 * the answer is one lookup, and makes "no Pal in the game provides this"
 * a checkable statement rather than an impression.
 *
 *   node scripts/effect-index.mjs                # every effect, grouped
 *   node scripts/effect-index.mjs attack dark    # only effects matching all terms
 */

import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const terms = process.argv.slice(2).map((t) => t.toLowerCase());

async function loadJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

async function main() {
  const { pals } = await loadJson("data/snapshot/pals.json");

  const index = new Map();
  for (const pal of pals) {
    const skill = pal.partnerSkill;
    if (!skill) continue;
    for (const row of skill.scaling ?? []) {
      const key = `${row.effectType}${row.target ? ` -> ${row.target}` : ""}`;
      const entry = index.get(key) ?? new Map();
      const perPal = entry.get(pal.id) ?? { skill: skill.name, values: ["", "", "", "", ""] };
      if (row.level >= 0 && row.level < 5) perPal.values[row.level] = row.effectValue;
      entry.set(pal.id, perPal);
      index.set(key, entry);
    }
  }

  const keys = [...index.keys()]
    .filter((key) => terms.every((term) => key.toLowerCase().includes(term)))
    .sort();

  if (keys.length === 0) {
    console.log(
      terms.length
        ? `No effect matches ${terms.join(" + ")}. Nothing in the game provides it.`
        : "No scaling rows in the snapshot.",
    );
    return;
  }

  for (const key of keys) {
    const providers = [...index.get(key)].sort((a, b) => a[0].localeCompare(b[0]));
    console.log(`\n=== ${key}   (${providers.length} Pal${providers.length === 1 ? "" : "s"})`);
    for (const [palId, { skill, values }] of providers) {
      console.log(`   ${palId.padEnd(20)} ${skill.padEnd(32)} ${values.map((v) => v || "—").join("  ")}`);
    }
  }
  console.log(`\n${keys.length} effect(s). Columns are condensation ranks 0★ → 4★.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
