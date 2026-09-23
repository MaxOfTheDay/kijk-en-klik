// Builds the recap as plain data, separate from how it is drawn. A future
// "save as image" or share feature can render the same structure.

import { foundCount } from "./state.js";

export function buildRecap(run, hunt) {
  const items = [];
  const missing = [];
  for (const challenge of hunt.challenges) {
    const find = run.finds[challenge.id];
    if (find) items.push({ challengeId: challenge.id, label: challenge.title, photoId: find.photoId, foundAt: find.foundAt });
    else missing.push(challenge.title);
  }
  return {
    huntId: hunt.id,
    title: hunt.title,
    accent: hunt.accent,
    date: run.finishedAt ?? run.startedAt,
    dateLabel: formatDate(run.startedAt),
    found: foundCount(run),
    total: hunt.challenges.length,
    items,
    missing,
  };
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}
