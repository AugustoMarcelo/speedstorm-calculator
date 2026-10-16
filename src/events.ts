import { parseBalance } from './calculator';

export const EVENTS_KEY = 'speedstorm:events:v1';

export interface PlannedEvent {
  id: string;
  name: string;
  remainingShards: number;
  endDate: string;
}

export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function nextLocalMidnight(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export function validEndDate(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1
    && date.getDate() === day && value >= localDate(now);
}

export function validateEvent(name: string, quantity: string, endDate: string, now = new Date()) {
  const remainingShards = quantity.trim() === '' ? null : parseBalance(quantity);
  const errors = {
    name: !name.trim() || name.trim().length > 100 ? 'Enter an event name from 1 to 100 characters.' : '',
    remainingShards: remainingShards === null ? 'Enter a whole number from 0 to 9,007,199,254,740,991, without signs or separators.' : '',
    endDate: !validEndDate(endDate, now) ? 'Choose a real end date today or later.' : '',
  };
  return { errors, value: Object.values(errors).some(Boolean) ? null : { name: name.trim(), remainingShards: remainingShards!, endDate } };
}

export function activeEvents(events: PlannedEvent[], now = new Date()): PlannedEvent[] {
  return events.filter(event => event.endDate >= localDate(now));
}

// Saturate each addition before summing: multiple safe rewards can exceed safe integer precision.
export function eventContribution(events: PlannedEvent[], requirement: number): number {
  return events.reduce((sum, event) => sum + Math.min(requirement - sum, event.remainingShards), 0);
}

export function saveEvents(events: PlannedEvent[], storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    (storage ?? localStorage).setItem(EVENTS_KEY, JSON.stringify(events));
    return true;
  } catch {
    return false;
  }
}

export function loadEvents(storage?: Pick<Storage, 'getItem' | 'setItem'>, now = new Date()): { events: PlannedEvent[]; saved: boolean; readable: boolean } {
  try {
    const source = storage ?? localStorage;
    const raw = source.getItem(EVENTS_KEY);
    if (raw === null) return { events: [], saved: true, readable: true };
    let records: unknown;
    try { records = JSON.parse(raw); } catch { records = []; }
    const ids = new Set<string>();
    const events: PlannedEvent[] = [];
    if (Array.isArray(records)) {
      for (const record of records) {
        if (!record || typeof record !== 'object'
          || typeof record.id !== 'string' || !record.id.trim() || ids.has(record.id)
          || typeof record.name !== 'string' || typeof record.endDate !== 'string'
          || !Number.isSafeInteger(record.remainingShards) || record.remainingShards < 0) continue;
        const checked = validateEvent(record.name, String(record.remainingShards), record.endDate, now);
        if (!checked.value) continue;
        ids.add(record.id);
        events.push({ id: record.id, ...checked.value });
      }
    }
    const saved = JSON.stringify(events) === raw || saveEvents(events, source);
    return { events, saved, readable: true };
  } catch {
    return { events: [], saved: false, readable: false };
  }
}
