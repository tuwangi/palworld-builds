/**
 * Exact per-element hex values as used by paldb.gg (this project's own
 * canonical data source for elements) — reused rather than invented, so the
 * app's color coding matches the convention players already recognize.
 */
export const ELEMENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  neutral: { border: "#cbbeae55", bg: "#cbbeae1a", text: "#cbbeae" },
  grass: { border: "#6ede6a55", bg: "#6ede6a1a", text: "#6ede6a" },
  water: { border: "#56b6f555", bg: "#56b6f51a", text: "#56b6f5" },
  fire: { border: "#ff8a4c55", bg: "#ff8a4c1a", text: "#ff8a4c" },
  electric: { border: "#f2cf3555", bg: "#f2cf351a", text: "#f2cf35" },
  dark: { border: "#b78cf555", bg: "#b78cf51a", text: "#b78cf5" },
  ground: { border: "#dfa56555", bg: "#dfa5651a", text: "#dfa565" },
  ice: { border: "#62c8d555", bg: "#62c8d51a", text: "#62c8d5" },
  dragon: { border: "#e08cf055", bg: "#e08cf01a", text: "#e08cf0" },
};

export const ELEMENT_BADGE_CLASS =
  "inline-flex items-center rounded-full border py-1 px-2.5 text-xs font-medium border-(--el-border) bg-(--el-bg) text-(--el-text)";

export function elementBadgeStyle(element: string): Record<string, string> {
  const colors = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.neutral;
  return { "--el-border": colors.border, "--el-bg": colors.bg, "--el-text": colors.text };
}
