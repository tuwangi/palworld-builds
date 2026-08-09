const API_BASE = "https://palworld.wiki.gg/api.php";
const PAGE_LIMIT = 500;
const THROTTLE_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cargoQueryPage({ tables, fields, where, groupBy, limit, offset }) {
  const params = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables,
    fields,
    limit: String(limit),
    offset: String(offset),
  });
  if (where) params.set("where", where);
  if (groupBy) params.set("group_by", groupBy);

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "palworld-builds-companion/0.1 (personal project)" },
  });
  if (!res.ok) {
    throw new Error(`Cargo query failed (${res.status} ${res.statusText}) for ${url}`);
  }
  const body = await res.json();
  if (body.error) {
    throw new Error(`Cargo API error: ${JSON.stringify(body.error)} for ${url}`);
  }
  return (body.cargoquery ?? []).map((row) => row.title);
}

/**
 * Pulls every row from a Cargo table, paginating past the 500-row page limit.
 */
export async function cargoQueryAll({ tables, fields, where, groupBy }) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const page = await cargoQueryPage({ tables, fields, where, groupBy, limit: PAGE_LIMIT, offset });
    rows.push(...page);
    if (page.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
    await sleep(THROTTLE_MS);
  }
  return rows;
}
