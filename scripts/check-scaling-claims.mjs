/**
 * Cross-checks the percentages a build claims about a Pal against that Pal's
 * real `PalPartnerSkillScale` rows in the snapshot.
 *
 * Nothing did this before, which is how a build could state "raises Dark Pal
 * attack by 10% to 30%" for a skill wiki.gg caps at 20%, or credit a Pal with
 * a party-wide buff when its skill only works while mounted. The condensation
 * table added to the Pal modal shows both numbers side by side to a reader —
 * this script is the same comparison, ahead of time.
 *
 * Report-only, and deliberately NOT part of `npm run build`: a build's prose
 * legitimately contains derived figures (5% x 30 stacks = 150%) that no scale
 * row will ever match, so a human has to read the output. Treat every line as
 * "look at this", not "this is wrong".
 *
 *   node scripts/check-scaling-claims.mjs
 */

import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function loadJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

const PERCENT = /[0-9]+(?:\.[0-9]+)?%/g;
/** Only prose that talks about ranks is making a per-rank claim worth checking. */
const RANK_TALK = /\brank\b|\bcondens|\bmax\b/i;

function scaleValues(pal) {
  const values = new Set();
  for (const row of pal?.partnerSkill?.scaling ?? []) {
    if (row.effectValue) values.add(row.effectValue.replace(/[+\s]/g, ""));
  }
  return values;
}

function effectSummary(pal) {
  const byEffect = new Map();
  for (const row of pal?.partnerSkill?.scaling ?? []) {
    const key = `${row.effectType}${row.target ? ` -> ${row.target}` : ""}`;
    const list = byEffect.get(key) ?? [];
    list.push(row.effectValue);
    byEffect.set(key, list);
  }
  return [...byEffect].map(([key, values]) => `${key}: ${values.join(" / ")}`);
}

async function main() {
  const catalog = await loadJson("data/catalog.json");
  const { pals } = await loadJson("data/snapshot/pals.json");
  const palIndex = new Map(pals.map((pal) => [pal.id, pal]));

  const findings = [];
  for (const build of catalog.builds) {
    for (const slot of build.pals) {
      const pal = palIndex.get(slot.palId);
      if (!pal?.partnerSkill?.scaling?.length) continue;
      if (!RANK_TALK.test(slot.explanation)) continue;

      const claimed = [...new Set(slot.explanation.match(PERCENT) ?? [])];
      if (claimed.length === 0) continue;

      const known = scaleValues(pal);
      const unmatched = claimed.filter((value) => !known.has(value));
      if (unmatched.length === 0) continue;

      findings.push({
        build: build.id,
        palId: slot.palId,
        skill: pal.partnerSkill.name,
        unmatched,
        effects: effectSummary(pal),
        explanation: slot.explanation,
      });
    }
  }

  if (findings.length === 0) {
    console.log("No claimed percentage is unaccounted for by the snapshot scale tables.");
    return;
  }

  console.log(`${findings.length} slot(s) claim a figure the scale table doesn't contain:\n`);
  for (const f of findings) {
    console.log(`[${f.build} / ${f.palId}] ${f.skill}`);
    console.log(`  unaccounted: ${f.unmatched.join(", ")}`);
    for (const effect of f.effects) console.log(`  wiki.gg:     ${effect}`);
    console.log(`  claim:       ${f.explanation}\n`);
  }
  console.log("Derived totals (per-stack value x stack count) are expected here — read before editing.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
