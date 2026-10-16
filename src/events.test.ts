import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeEvents, eventContribution, EVENTS_KEY, loadEvents, localDate, nextLocalMidnight, saveEvents, validateEvent, validEndDate } from './events';

const now = new Date(2026, 9, 16, 12);
const event = { id: 'one', name: 'Season finale', remainingShards: 4, endDate: '2026-10-16' };
function storage(raw: string | null) {
  return { getItem: vi.fn(() => raw), setItem: vi.fn() };
}
afterEach(() => vi.unstubAllEnvs());

describe('event validation', () => {
  it('trims names, accepts zero rewards and today', () => {
    expect(validateEvent(' Finale ', '0', event.endDate, now).value).toEqual({ name: 'Finale', remainingShards: 0, endDate: event.endDate });
    expect(validateEvent('x'.repeat(100), '9007199254740991', event.endDate, now).value).not.toBeNull();
  });
  it.each(['', '   ', 'x'.repeat(101)])('rejects invalid name', name => {
    expect(validateEvent(name, '1', event.endDate, now).errors.name).not.toBe('');
  });
  it.each(['', ' ', '-1', '+1', '1.5', '1e2', '9,000', '9007199254740992', 'Infinity'])('rejects quantity %j', quantity => {
    expect(validateEvent('Finale', quantity, event.endDate, now).errors.remainingShards).not.toBe('');
  });
  it.each(['', '2026-10-15', '2027-02-29', '2026-13-01', '2026-11-31', '0000-12-31', '2026-1-1'])('rejects date %j', date => {
    expect(validEndDate(date, now)).toBe(false);
  });
  it('accepts leap days', () => expect(validEndDate('2028-02-29', now)).toBe(true));
});

describe('calendar lifecycle', () => {
  it('keeps events until exactly the next local midnight', () => {
    expect(activeEvents([event], new Date(2026, 9, 16, 23, 59, 59, 999))).toEqual([event]);
    expect(activeEvents([event], new Date(2026, 9, 17))).toEqual([]);
  });
  it.each(['America/Los_Angeles', 'Asia/Tokyo'])('uses local calendar instead of UTC in %s', zone => {
    vi.stubEnv('TZ', zone);
    const local = new Date(2026, 9, 16, zone === 'Asia/Tokyo' ? 0 : 23, 30);
    expect(local.toISOString().slice(0, 10)).not.toBe('2026-10-16');
    expect(localDate(local)).toBe('2026-10-16');
    expect(validEndDate(event.endDate, local)).toBe(true);
    expect(activeEvents([event], local)).toEqual([event]);
  });
  it.each([[2, 8, 23], [10, 1, 25]])('schedules calendar midnight across DST', (month, day, hours) => {
    vi.stubEnv('TZ', 'America/New_York');
    const start = new Date(2026, month, day);
    const next = nextLocalMidnight(start);
    expect(next.getDate()).toBe(day + 1);
    expect(next.getHours()).toBe(0);
    expect(next.getTime() - start.getTime()).toBe(hours * 3600000);
  });
});

describe('guarded storage', () => {
  it('leaves empty storage and unrelated keys alone', () => {
    const source = storage(null);
    expect(loadEvents(source, now)).toMatchObject({ events: [], saved: true });
    expect(source.getItem).toHaveBeenCalledWith(EVENTS_KEY);
    expect(source.setItem).not.toHaveBeenCalled();
  });
  it('loads valid records, ignores malformed/duplicate records and prunes expired events', () => {
    const source = storage(JSON.stringify([event, event, null, {}, { ...event, id: 'past', endDate: '2026-10-15' },
      { ...event, id: 'string', remainingShards: '5' }, { ...event, id: 'negative', remainingShards: -1 },
      { ...event, id: 'unsafe', remainingShards: Number.MAX_SAFE_INTEGER + 1 }, { ...event, id: 'bad', endDate: '2026-02-30' }]));
    expect(loadEvents(source, now).events).toEqual([event]);
    expect(source.setItem).toHaveBeenCalledExactlyOnceWith(EVENTS_KEY, JSON.stringify([event]));
  });
  it.each(['broken', '{}', 'null', '42'])('repairs corrupted data %s', raw => {
    const source = storage(raw);
    expect(loadEvents(source, now)).toMatchObject({ events: [], saved: true });
    expect(source.setItem).toHaveBeenCalledWith(EVENTS_KEY, '[]');
  });
  it('keeps validated records on failed cleanup writes and reports failure', () => {
    const source = storage(JSON.stringify([event, {}]));
    source.setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(loadEvents(source, now)).toEqual({ events: [event], saved: false, readable: true });
    expect(saveEvents([event], source)).toBe(false);
  });
  it('handles blocked reads and localStorage access', () => {
    expect(loadEvents({ getItem() { throw new Error('blocked'); }, setItem() {} }, now)).toMatchObject({ saved: false });
    expect(loadEvents()).toMatchObject({ saved: false });
    expect(saveEvents([event])).toBe(false);
  });
});

it('saturates multiple large rewards at the actual remaining requirement', () => {
  expect(eventContribution([event, { ...event, id: 'two', remainingShards: 3 }], 10)).toBe(7);
  expect(eventContribution([{ ...event, remainingShards: Number.MAX_SAFE_INTEGER }, { ...event, remainingShards: Number.MAX_SAFE_INTEGER }], 260)).toBe(260);
  expect(eventContribution([event], 0)).toBe(0);
});
