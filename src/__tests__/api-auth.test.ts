import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, clearAuthStorage } from '../utils/api';

// Unit coverage for the refresh-token retry logic in api.ts (audit S1).
// The server-side rotation flow is covered by e2e/api/auth.spec.ts.

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as Response;
}

describe('api.ts refresh-token handling', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('on 401, refreshes once and retries the original request', async () => {
    localStorage.setItem('auth_token', 'expired-token');
    localStorage.setItem('auth_refresh_token', 'valid-refresh');

    fetchMock
      // original request → expired access token
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Token expired' }))
      // refresh call → rotated tokens
      .mockResolvedValueOnce(
        jsonResponse(200, { token: 'new-token', refreshToken: 'new-refresh', user: { id: 1, username: 'u' } })
      )
      // retried request → success
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await api.getRecords();

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem('auth_token')).toBe('new-token');
    expect(localStorage.getItem('auth_refresh_token')).toBe('new-refresh');

    // the retried request must carry the NEW access token
    const retryCall = JSON.stringify(fetchMock.mock.calls[2]);
    expect(retryCall).toContain('new-token');
    // the refresh call presented the rotating refresh token
    const refreshCall = JSON.stringify(fetchMock.mock.calls[1]);
    expect(refreshCall).toContain('valid-refresh');
    expect(refreshCall).toContain('/auth/refresh');
  });

  it('clears auth storage when refresh fails', async () => {
    localStorage.setItem('auth_token', 'expired-token');
    localStorage.setItem('auth_refresh_token', 'stale-refresh');

    const authChangeSpy = vi.fn();
    window.addEventListener('auth-change', authChangeSpy);

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { error: 'invalid' })); // refresh rejected

    await expect(api.getRecords()).rejects.toThrow();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_refresh_token')).toBeNull();
    expect(authChangeSpy).toHaveBeenCalled();
  });

  it('does not attempt refresh when no refresh token exists', async () => {
    localStorage.setItem('auth_token', 'expired-token');

    fetchMock.mockResolvedValue(jsonResponse(401, {}));

    await expect(api.getRecords()).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the original request
  });

  it('logout revokes the server-side session and clears local state', async () => {
    localStorage.setItem('auth_token', 't');
    localStorage.setItem('auth_refresh_token', 'r');

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await api.logout();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(fetchMock.mock.calls[0])).toContain('/auth/logout');
    expect(JSON.stringify(fetchMock.mock.calls[0])).toContain('r');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('clearAuthStorage empties all auth keys', () => {
    localStorage.setItem('auth_token', 't');
    localStorage.setItem('auth_refresh_token', 'r');
    localStorage.setItem('auth_user', '{}');
    clearAuthStorage();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_refresh_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});
