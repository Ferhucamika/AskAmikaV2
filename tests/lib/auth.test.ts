import { describe, expect, test } from 'vitest';
import { extractUserFromToken } from '@/lib/auth';

describe('auth utilities', () => {
  test('should extract user from token', () => {
    const token = {
      oid: 'user-123',
      preferred_username: 'user@company.com',
      name: 'Test User',
    };
    const user = extractUserFromToken(token);
    expect(user.id).toBe('user-123');
    expect(user.email).toBe('user@company.com');
    expect(user.name).toBe('Test User');
  });
});
