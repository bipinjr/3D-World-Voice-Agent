// Top-10 leaderboard kept on this device (the expo laptop). Pure logic + safe storage.
const key = mode => (mode === 'story' ? 'ctf.leaderboard.v1' : `ctf.leaderboard.${mode}`);

export const cleanName = s => String(s ?? '').replace(/[^\p{L}\p{N} .'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20) || 'Explorer';

// Higher score wins; ties go to the faster time. Returns { list, place } (place is 1-based, 0 = not in top 10).
export function addScore(list, entry, max = 10) {
  const e = { ...entry, name: cleanName(entry.name), id: entry.id ?? Date.now() + Math.random() };
  const next = [...list, e].sort((a, b) => b.score - a.score || a.secs - b.secs).slice(0, max);
  return { list: next, place: next.indexOf(e) + 1 };
}

export function loadBoard(mode = 'story') {
  try {
    const data = JSON.parse(localStorage.getItem(key(mode)) || '[]');
    return Array.isArray(data) ? data.filter(e => e && typeof e.score === 'number').slice(0, 10) : [];
  } catch { return []; }
}
export function saveBoard(list, mode = 'story') { try { localStorage.setItem(key(mode), JSON.stringify(list)); } catch { /* private mode: board lives in memory */ } }
