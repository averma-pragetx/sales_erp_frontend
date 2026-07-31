// Shared constants & pure helpers for MIS dashboards — kept out of MisCharts.tsx
// so that file can stay component-only (react-refresh/only-export-components).

// ─── Palette (validated categorical + status roles — see dataviz skill) ────────
export const CAT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
export const STATUS_COLOR = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };
export const AXIS_TICK = { fontSize: 11, fill: '#6b6a66' };
export const GRID_STROKE = '#e5e4de';

export function countBy<T>(items: T[], keyFn: (t: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function sumByTop<T>(items: T[], keyFn: (t: T) => string, valueFn: (t: T) => number, topN = 7) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    map.set(k, (map.get(k) ?? 0) + valueFn(it));
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  if (sorted.length <= topN) return sorted;
  const top = sorted.slice(0, topN);
  const otherSum = sorted.slice(topN).reduce((s, x) => s + x.value, 0);
  return [...top, { name: 'Other', value: otherSum }];
}

export function daysUntil(dateStr: string): number {
  const due = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function daysSince(dateStr: string): number {
  return -daysUntil(dateStr);
}
