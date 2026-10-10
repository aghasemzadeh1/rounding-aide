// All data lives in this browser's localStorage on this device. Nothing is sent anywhere.
const KEY = 'rounding-aide.v1';

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.patients) && Array.isArray(s.notes)) return s;
  } catch {}
  return { patients: [], notes: [] };
}

export const data = () => state;

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function isValidBackup(s) {
  return !!s && Array.isArray(s.patients) && Array.isArray(s.notes);
}

export function replaceAll(s) {
  state = { patients: s.patients, notes: s.notes };
  return save();
}

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Ask the browser not to evict our storage (home-screen apps on iOS are already exempt).
navigator.storage?.persist?.().catch(() => {});
