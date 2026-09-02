import { test, expect } from '@playwright/test';

// Browser-level smoke test (requires `npx playwright install chromium`).
// The backend serves the built SPA from dist/, so one origin covers UI + API.

test.describe('UI smoke', () => {
  test('login via the UI reaches the authenticated app', async ({ page }) => {
    await page.goto('/');

    // Unauthenticated visit shows the login form
    await page.waitForSelector('#username', { timeout: 15_000 });

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Login form disappears and the session is persisted
    await page.waitForFunction(() => !!localStorage.getItem('auth_token'), { timeout: 15_000 });
    await expect(page.locator('#username')).toBeHidden({ timeout: 15_000 });
    const user = await page.evaluate(() => localStorage.getItem('auth_user'));
    expect(user).toContain('admin');
  });
});
