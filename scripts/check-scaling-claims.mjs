/**
 * Classifies every percentage a build claims about a Pal against that Pal's
 * real wiki.gg data (partner skill description + PalPartnerSkillScale rows).
 *
 * Nothing did this before, and the catalog paid for it: an audit on
 * 2026-08-10 found that of 154 slots quoting a percentage, only ~a third had
 * every figure backed by the source. The rest ranged from a wrong cap
 * (element attack buffers are +10% -> +20%, not "15% to 30%") to a Pal being
 * credited with an effect it simply does not have (Prixter's Scorpion Sonar
 * finds dungeon exits; it was written up as a +50% poison damage amplifier).
 *
 * Verdicts:
 *   OK           every claimed figure appears in the Pal's own data
 *   PARTIAL      some appear — usually a real per-stack value plus a derived
 *                total (5% x 30 stacks = 150%), which is legitimate
 *   CONTRADICTED no claimed figure appears anywhere in the Pal's data
 *   NO_DATA      wiki.gg has no partner skill row for this Pal at all
 *
 * PARTIAL and CONTRADICTED both need a human: a derived total is fine, an
 * invented effect is not. Report-only, deliberately not wired into
 * `npm run build`.
 *
 *   npm run audit:scaling            # summary + everything that isn't OK
 *   npm run audit:scaling -- --all   # include OK slots
 */

import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const SHOW_ALL = process.argv.includes("--all");

async function loadJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

const PERCENT = /[0-9]+(?:\.[0-9]+)?%/g;

function knownFigures(skill) {
  const values = new Set();
  for (const row of skill.scaling ?? []) {
    if (row.effectValue) values.add(row.effectValue.replace(/[+\s]/g, ""));
  }
  // The prose often carries a figure the scale table omits (Aqua Spout's 15%).
  for (const match of skill.description.match(PERCENT) ?? []) values.add(match);
  return values;
}

function effectSummary(skill) {
  const byEffect = new Map();
  for (const row of skill.scaling ?? []) {
    const key = `${row.effectType}${row.target ? ` -> ${row.target}` : ""}`;
    const list = byEffect.get(key) ?? [];
    list.push(row.effectValue);
    byEffect.set(key, list);
  }
  return [...byEffect].map(([key, values]) => `${key} = ${values[0]} → ${values[values.length - 1]}`);
}

async function main() {
  const catalog = await loadJson("data/catalog.json");
  const { pals } = await loadJson("data/snapshot/pals.json");
  const palIndex = new Map(pals.map((pal) => [pal.id, pal]));

  const results = [];
  for (const build of catalog.builds) {
    build.pals.forEach((slot, index) => {
      const claims = [...new Set(slot.explanation.match(PERCENT) ?? [])];
      if (claims.length === 0) return;

      const skill = palIndex.get(slot.palId)?.partnerSkill;
      if (!skill) {
        results.push({ verdict: "NO_DATA", build: build.id, index, palId: slot.palId, claims, skill: null });
        return;
      }

      const known = knownFigures(skill);
      const hits = claims.filter((claim) => known.has(claim)).length;
      const verdict = hits === claims.length ? "OK" : hits > 0 ? "PARTIAL" : "CONTRADICTED";
      results.push({
        verdict,
        build: build.id,
        index,
        palId: slot.palId,
        claims,
        skill,
        explanation: slot.explanation,
      });
    });
  }

  const counts = results.reduce((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }), {});
  console.log(`${results.length} slot(s) quote a percentage:`);
  for (const verdict of ["OK", "PARTIAL", "CONTRADICTED", "NO_DATA"]) {
    console.log(`  ${verdict.padEnd(13)} ${counts[verdict] ?? 0}`);
  }
  console.log();

  for (const r of results) {
    if (r.verdict === "OK" && !SHOW_ALL) continue;
    console.log(`[${r.verdict}] ${r.build} [${r.index}] ${r.palId} :: ${r.skill?.name ?? "no wiki.gg row"}`);
    console.log(`   claims:  ${r.claims.join(", ")}`);
    if (r.skill) {
      console.log(`   wiki:    ${r.skill.description}`);
      for (const effect of effectSummary(r.skill)) console.log(`   scale:   ${effect}`);
    }
    if (r.explanation) console.log(`   text:    ${r.explanation}`);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
