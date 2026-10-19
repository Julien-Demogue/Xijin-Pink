import { pool } from "./db.js";

export async function loadTitles() {
  const [rows] = await pool.execute(
    "SELECT label, threshold_cents AS thresholdCents FROM titles ORDER BY threshold_cents ASC"
  );
  return rows.map((row) => ({
    label: row.label,
    thresholdCents: Number(row.thresholdCents),
  }));
}

export function resolveTitle(totalCents, titles) {
  let current = null;
  for (const title of titles) {
    if (totalCents >= title.thresholdCents) {
      current = title;
    }
  }
  return current ? current.label : null;
}

export function resolveNextTitle(totalCents, titles) {
  for (const title of titles) {
    if (totalCents < title.thresholdCents) {
      return {
        label: title.label,
        thresholdCents: title.thresholdCents,
        remainingCents: title.thresholdCents - totalCents,
      };
    }
  }
  return null;
}
