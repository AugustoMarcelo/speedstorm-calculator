import { describe, expect, it, vi } from 'vitest';
import { CALCULATIONS_KEY, checkedInputs, readCalculations, writeCalculation, type SavedInputs } from './saved-calculations';

const now = new Date('2026-11-17T12:00:00Z');
const input: SavedInputs = {
  currentStars: 2, completedSteps: 3, targetStars: 4, targetSteps: 1,
  balance: 5, tuneCoinBalance: 750, currentMpl: null,
  events: [{ id: 'event', name: 'Finale', remainingShards: 4, endDate: '2099-12-31' }],
};
function memory(raw: string | null = null) {
  let value = raw;
  return { getItem: vi.fn(() => value), setItem: vi.fn((_key: string, next: string) => { value = next; }) };
}
function create(storage: ReturnType<typeof memory>, id = 'one', name = ' McQueen ') {
  return writeCalculation({ type: 'save', id: null, name, input }, storage, now, () => id);
}

describe('saved calculations', () => {
  it('round trips normalized inputs only, with copied events and trimmed names', () => {
    const storage = memory();
    const saved = create(storage);
    expect(saved.error).toBe('');
    expect(saved.record).toEqual({ ...input, id: 'one', name: 'McQueen', createdAt: now.toISOString(), updatedAt: now.toISOString() });
    saved.record!.events[0].remainingShards = 999;
    expect(input.events[0].remainingShards).toBe(4);
    expect(readCalculations(storage, now).records[0].events[0].remainingShards).toBe(4);
    expect(JSON.parse(storage.getItem()!).version).toBe(1);
    expect(storage.setItem).toHaveBeenCalledWith(CALCULATIONS_KEY, expect.any(String));
  });

  it('updates and deletes by ID, merging latest siblings and retaining creation time', () => {
    const storage = memory();
    create(storage);
    create(storage, 'two');
    const later = new Date('2026-11-18T12:00:00Z');
    const updated = writeCalculation({ type: 'save', id: 'one', name: 'Updated', input: { ...input, balance: 9, events: [] } }, storage, later);
    expect(updated.records).toHaveLength(2);
    expect(updated.records[0]).toMatchObject({ name: 'Updated', balance: 9, events: [], createdAt: now.toISOString(), updatedAt: later.toISOString() });
    expect(updated.records[1]).toMatchObject({ id: 'two', balance: 5, events: input.events });
    expect(writeCalculation({ type: 'delete', id: 'one' }, storage, now).records.map(record => record.id)).toEqual(['two']);
    const raw = storage.getItem();
    expect(writeCalculation({ type: 'save', id: 'one', name: 'Gone', input }, storage, now).error).toContain('Save as new');
    expect(storage.getItem()).toBe(raw);
  });

  it.each([
    { ...input, currentStars: 6, completedSteps: 1 },
    { ...input, targetStars: 6, targetSteps: 1 },
    { ...input, balance: -1 }, { ...input, balance: Number.MAX_SAFE_INTEGER + 1 },
    { ...input, tuneCoinBalance: 1.5 }, { ...input, currentMpl: 41 },
    { ...input, currentMpl: '' }, { ...input, events: [{}] },
    { ...input, events: [{ ...input.events[0], endDate: '2099-02-30' }] },
    { ...input, events: [input.events[0], input.events[0]] },
  ])('rejects invalid inputs without replacing an existing record: %j', invalid => {
    const storage = memory();
    create(storage);
    const raw = storage.getItem();
    expect(writeCalculation({ type: 'save', id: 'one', name: 'McQueen', input: invalid as SavedInputs }, storage, now).error).not.toBe('');
    expect(storage.getItem()).toBe(raw);
  });

  it.each(['', ' '.repeat(3), 'x'.repeat(101)])('rejects invalid name %j without mutation', name => {
    const storage = memory();
    create(storage);
    const raw = storage.getItem();
    expect(writeCalculation({ type: 'save', id: 'one', name, input }, storage, now).error).not.toBe('');
    expect(storage.getItem()).toBe(raw);
  });

  it('ignores malformed records and duplicate IDs while keeping valid siblings', () => {
    const record = create(memory()).record!;
    const storage = memory(JSON.stringify({ version: 1, records: [null, {}, { ...record, id: 'bad', balance: '5' }, record, record] }));
    expect(readCalculations(storage, now)).toEqual({ error: '', records: [record] });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(['{', 'null', '{"version":2,"records":[]}', '{"version":1,"records":null}'])('preserves unreadable or unsupported data: %s', raw => {
    const storage = memory(raw);
    expect(readCalculations(storage, now).error).not.toBe('');
    expect(create(storage).error).not.toBe('');
    expect(writeCalculation({ type: 'delete', id: 'one' }, storage, now).error).not.toBe('');
    expect(storage.getItem()).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('filters expired events, keeps inclusive today, never credits inventory', () => {
    const today = new Date(2026, 10, 17, 12);
    const events = [
      { ...input.events[0], id: 'past', endDate: '2026-11-16' },
      { ...input.events[0], id: 'today', endDate: '2026-11-17' },
    ];
    expect(checkedInputs({ ...input, events }, today)).toEqual({ ...input, events: [events[1]] });
    const storage = memory();
    create(storage);
    expect(readCalculations(storage, new Date(2100, 0, 1)).records[0]).toMatchObject({ balance: 5, events: [] });
  });

  it('reports blocked reads and failed writes without reporting success', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: vi.fn() };
    expect(readCalculations(blocked).error).toContain('could not be read');
    expect(writeCalculation({ type: 'delete', id: 'one' }, blocked).error).toContain('could not be read');
    const storage = memory();
    create(storage);
    const raw = storage.getItem();
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    const result = writeCalculation({ type: 'save', id: 'one', name: 'Changed', input }, storage, now);
    expect(result.error).toContain('could not be saved');
    expect(result.record).toBeUndefined();
    expect(storage.getItem()).toBe(raw);
  });
});
