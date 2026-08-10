/**
 * wiki.gg Cargo returns rendered-ish wikitext, not plain prose: partner skill
 * descriptions and `PalPartnerSkillScale.effectType` values arrive wrapped in
 * `<span class="link-icon">` markup with `[[File:...]]` icon links, piped wiki
 * links and raw `&nbsp;` entities inside.
 *
 * Cleaning has to happen when the snapshot is written, not at render time:
 * the snapshot is the factual source of truth every other layer reads, and
 * leaving markup in it means every consumer (validators, the ES translation
 * key set, the UI) has to re-derive the same cleanup and can disagree.
 */

const ENTITIES = new Map([
  ["&nbsp;", " "],
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&apos;", "'"],
]);

export function cleanWikitext(value) {
  if (typeof value !== "string") return value;
  let text = value;

  // Icon-only links carry no prose — drop them before anything unwraps them
  // into their filename.
  text = text.replace(/\[\[File:[^\]]*\]\]/gi, " ");
  text = text.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  text = text.replace(/\[([^\]]+)\]\((?:[^)]*)\)/g, "$1");
  // Wikitext external links: `[https://host/page Label]` -> `Label`.
  text = text.replace(/\[(?:https?:\/\/|\/\/)\S+\s+([^\]]+)\]/g, "$1");
  text = text.replace(/\[(?:https?:\/\/|\/\/)\S+\]/g, "");

  text = text.replace(/<[^>]*>/g, " ");

  for (const [entity, replacement] of ENTITIES) {
    text = text.split(entity).join(replacement);
  }
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // Cargo escapes a literal apostrophe by doubling it, which collides with
  // wikitext's ''italic'' markup. Only the intra-word form is an escape.
  text = text.replace(/(\w)''(\w)/g, "$1'$2");
  text = text.replace(/'''([^']+)'''/g, "$1").replace(/''([^']+)''/g, "$1");

  text = text.replace(/\s+/g, " ").trim();
  // Unwrapping links and dropping icons leaves gaps in front of punctuation
  // ("applies  , dealing") and doubled separators.
  text = text.replace(/\s+([,.;:!?%])/g, "$1");
  text = text.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  return text;
}
