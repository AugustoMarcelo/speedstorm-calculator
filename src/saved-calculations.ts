import { calculate, type CalculatorInput } from './calculator';
import { activeEvents, validateEvent, type PlannedEvent } from './events';
import { parseMpl } from './planning';

export const CALCULATIONS_KEY = 'speedstorm:calculations:v1';
export interface SavedInputs extends CalculatorInput {
  targetSteps: number;
  currentMpl: number | null;
  events: PlannedEvent[];
}
export interface SavedCalculation extends SavedInputs {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
type CalculationStorage = Pick<Storage, 'getItem' | 'setItem'>;
export interface CollectionResult { records: SavedCalculation[]; error: string }

export function checkedInputs(value: unknown, now = new Date()): SavedInputs | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as SavedInputs;
  try { calculate(input); } catch { return null; }
  if (input.targetSteps === undefined || (input.currentMpl !== null
    && (typeof input.currentMpl !== 'number' || parseMpl(String(input.currentMpl)) == null))
    || !Array.isArray(input.events)) return null;
  const events: PlannedEvent[] = [];
  const ids = new Set<string>();
  const earliest = new Date(0);
  earliest.setFullYear(1, 0, 1);
  for (const event of input.events) {
    if (!event || typeof event.id !== 'string' || !event.id.trim() || ids.has(event.id)
      || typeof event.name !== 'string' || typeof event.endDate !== 'string'
      || !Number.isSafeInteger(event.remainingShards) || event.remainingShards < 0) return null;
    const checked = validateEvent(event.name, String(event.remainingShards), event.endDate, earliest);
    if (!checked.value) return null;
    ids.add(event.id);
    events.push({ id: event.id, ...checked.value });
  }
  return {
    currentStars: input.currentStars, completedSteps: input.completedSteps,
    targetStars: input.targetStars, targetSteps: input.targetSteps,
    balance: input.balance, tuneCoinBalance: input.tuneCoinBalance,
    currentMpl: input.currentMpl, events: activeEvents(events, now),
  };
}

export function readCalculations(storage?: CalculationStorage, now = new Date()): CollectionResult {
  try {
    const raw = (storage ?? localStorage).getItem(CALCULATIONS_KEY);
    if (raw === null) return { records: [], error: '' };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== 1) {
      return { records: [], error: 'Saved calculations use an unsupported storage version. Stored data has not been changed.' };
    }
    if (!Array.isArray(data.records)) throw new Error('Invalid collection');
    const records: SavedCalculation[] = [];
    const ids = new Set<string>();
    for (const record of data.records) {
      if (!record || typeof record.id !== 'string' || !record.id.trim() || ids.has(record.id)
        || typeof record.name !== 'string' || !record.name.trim() || record.name.trim().length > 100
        || typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt))
        || typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) continue;
      const input = checkedInputs(record, now);
      if (!input) continue;
      ids.add(record.id);
      records.push({ id: record.id, name: record.name.trim(), createdAt: record.createdAt, updatedAt: record.updatedAt, ...input });
    }
    return { records, error: '' };
  } catch {
    return { records: [], error: 'Saved calculations could not be read. Stored data has not been changed.' };
  }
}

export function writeCalculation(
  action: { type: 'save'; id: string | null; name: string; input: SavedInputs } | { type: 'delete'; id: string },
  storage?: CalculationStorage, now = new Date(), makeId: () => string = () => crypto.randomUUID(),
): CollectionResult & { record?: SavedCalculation } {
  const loaded = readCalculations(storage, now);
  if (loaded.error) return loaded;
  let records = loaded.records;
  let record: SavedCalculation | undefined;
  if (action.type === 'save') {
    const name = action.name.trim();
    const input = checkedInputs(action.input, now);
    if (!name || name.length > 100 || !input) return { ...loaded, error: 'Enter a calculation name from 1 to 100 characters and valid calculator values.' };
    const previous = records.find(item => item.id === action.id);
    if (action.id !== null && !previous) return { ...loaded, error: 'This calculation was deleted in another tab. Use Save as new to keep your changes.' };
    const timestamp = now.toISOString();
    record = { ...input, id: previous?.id ?? makeId(), name, createdAt: previous?.createdAt ?? timestamp, updatedAt: timestamp };
    records = previous ? records.map(item => item.id === previous.id ? record! : item) : [...records, record];
  } else {
    records = records.filter(item => item.id !== action.id);
  }
  try {
    (storage ?? localStorage).setItem(CALCULATIONS_KEY, JSON.stringify({ version: 1, records }));
    return { records, record, error: '' };
  } catch {
    return { ...loaded, error: 'Calculations could not be saved in this browser. Your working edits remain available; retry saving.' };
  }
}
