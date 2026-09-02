import { test, expect } from '@playwright/test';

const uniq = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

test.describe('authentication', () => {
  test('logs in with seeded admin credentials', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.username).toBe('admin');
  });

  test('rejects wrong password with 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'definitely-wrong' },
    });
    expect(res.status()).toBe(401);
  });

  test('rejects unauthenticated access to protected routes', async ({ request }) => {
    const res = await request.get('/api/records');
    expect(res.status()).toBe(401);
  });

  test('/me returns the token identity', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    const { token } = await login.json();
    const res = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).username).toBe('admin');
  });

  test('locks an account after repeated failed logins (429) with no user enumeration', async ({ request }) => {
    const username = uniq();
    const reg = await request.post('/api/auth/register', {
      data: { username, password: 'goodpass1' },
    });
    expect(reg.status()).toBe(200);

    // 5 failed attempts trigger the lockout
    for (let i = 0; i < 5; i++) {
      const res = await request.post('/api/auth/login', {
        data: { username, password: 'wrong-password' },
      });
      expect(res.status()).toBe(401);
    }

    // Correct password is rejected while locked
    const locked = await request.post('/api/auth/login', {
      data: { username, password: 'goodpass1' },
    });
    expect(locked.status()).toBe(429);
    expect((await locked.json()).code).toBe('ACCOUNT_LOCKED');

    // Unknown usernames never reveal lockout state (no enumeration)
    const unknown = await request.post('/api/auth/login', {
      data: { username: uniq(), password: 'whatever1' },
    });
    expect(unknown.status()).toBe(401);
  });
});
