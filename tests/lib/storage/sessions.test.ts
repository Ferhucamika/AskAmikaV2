import { beforeEach, describe, expect, test } from 'vitest';
import {
  saveSession,
  getSession,
  listSessions,
  deleteSession,
} from '@/lib/storage/sessions';
import { createSessionDocument } from '@/lib/storage/schemas';

beforeEach(() => {
  localStorage.clear();
});

describe('localStorage session store', () => {
  test('save then get round-trips a session', () => {
    const session = createSessionDocument('user-1', 'Hello');
    saveSession(session);

    const retrieved = getSession(session.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(session.id);
    expect(retrieved?.title).toBe('Hello');
  });

  test('get returns null for unknown id', () => {
    expect(getSession('does-not-exist')).toBeNull();
  });

  test('listSessions returns only sessions for the given user, sorted by updatedAt desc', () => {
    const a = createSessionDocument('user-1', 'A');
    const b = createSessionDocument('user-1', 'B');
    const c = createSessionDocument('user-2', 'C');
    saveSession(a);
    saveSession(b);
    saveSession(c);

    const list = listSessions('user-1');
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.title)).toEqual(expect.arrayContaining(['A', 'B']));
    expect(list.every((s) => s.userId === 'user-1')).toBe(true);
  });

  test('saveSession bumps updatedAt', async () => {
    const session = createSessionDocument('user-1', 'A');
    const original = session.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    saveSession(session);
    const retrieved = getSession(session.id);
    expect(retrieved!.updatedAt >= original).toBe(true);
  });

  test('deleteSession removes the entry', () => {
    const session = createSessionDocument('user-1', 'gone');
    saveSession(session);
    deleteSession(session.id);
    expect(getSession(session.id)).toBeNull();
  });
});
