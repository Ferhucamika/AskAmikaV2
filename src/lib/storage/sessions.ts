import { SessionDocument } from './schemas';

const KEY_PREFIX = 'askamika.session.';

function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function saveSession(session: SessionDocument): void {
  if (!isAvailable()) return;
  session.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY_PREFIX + session.id, JSON.stringify(session));
}

export function getSession(sessionId: string): SessionDocument | null {
  if (!isAvailable()) return null;
  const raw = localStorage.getItem(KEY_PREFIX + sessionId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionDocument;
  } catch {
    return null;
  }
}

export function listSessions(userId: string): SessionDocument[] {
  if (!isAvailable()) return [];
  const sessions: SessionDocument[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(KEY_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const session = JSON.parse(raw) as SessionDocument;
      if (session.userId === userId) sessions.push(session);
    } catch {
      // Skip unparseable entries.
    }
  }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteSession(sessionId: string): void {
  if (!isAvailable()) return;
  localStorage.removeItem(KEY_PREFIX + sessionId);
}
