import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const TRACKING_FILE = 'docs/data/tracking.json';

async function ensureDir() {
  await mkdir('docs/data', { recursive: true });
}

export async function loadTracking() {
  await ensureDir();
  try {
    const data = await readFile(TRACKING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { summarizedPmids: [], dailyReports: [] };
  }
}

export async function saveTracking(tracking) {
  await ensureDir();
  await writeFile(TRACKING_FILE, JSON.stringify(tracking, null, 2), 'utf-8');
}

export function filterNewArticles(articles, tracking) {
  const summarizedSet = new Set(tracking.summarizedPmids);
  return articles.filter(a => a.pmid && !summarizedSet.has(a.pmid));
}

export function updateTracking(tracking, newPmids, dateStr, fileName, count) {
  tracking.summarizedPmids.push(...newPmids);

  const existingIdx = tracking.dailyReports.findIndex(r => r.date === dateStr);
  const reportEntry = { date: dateStr, file: fileName, count };
  if (existingIdx >= 0) {
    tracking.dailyReports[existingIdx] = reportEntry;
  } else {
    tracking.dailyReports.unshift(reportEntry);
  }

  tracking.dailyReports.sort((a, b) => b.date.localeCompare(a.date));

  return tracking;
}
