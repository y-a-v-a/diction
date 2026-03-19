import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures', 'dictations');
const testDictationsDir = path.join(__dirname, '..', 'dictations-test');
const FIXTURE_ID = 'a1b2c3d4';

test.describe('403 forbidden page', () => {
  test('returns HTTP 403 status', async ({ page }) => {
    const response = await page.goto('/create');
    expect(response.status()).toBe(403);
  });

  test('renders the forbidden page with Dutch message', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('.error-box')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Toegang Geweigerd');
    await expect(page.locator('text=geen toegang')).toBeVisible();
  });

  test('forbidden page has link back to home', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });
});

test.describe('Delete endpoint', () => {
  test.beforeEach(() => {
    // Re-seed fixture before each delete test so it can be deleted
    const src = path.join(fixturesDir, FIXTURE_ID);
    const dest = path.join(testDictationsDir, FIXTURE_ID);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    }
  });

  test.afterEach(() => {
    // Restore fixture after delete so other tests are unaffected
    const src = path.join(fixturesDir, FIXTURE_ID);
    const dest = path.join(testDictationsDir, FIXTURE_ID);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    }
  });

  test('POST delete with valid ID redirects to home', async ({ page }) => {
    const response = await page.request.post(`/dictation/${FIXTURE_ID}/delete`);
    // 302 redirect or final 200 after following redirect
    expect([200, 302]).toContain(response.status());
  });

  test('POST delete with invalid ID format returns 400', async ({ page }) => {
    const response = await page.request.post('/dictation/INVALID/delete');
    expect(response.status()).toBe(400);
  });

  test('POST delete navigates to home page', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    // Click the delete button but intercept the confirm dialog
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button.delete').click();
    await expect(page).toHaveURL('/');
  });
});
