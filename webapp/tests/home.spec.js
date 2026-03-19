import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads with page heading', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Dictees');
  });

  test('lists the fixture dictation with topics', async ({ page }) => {
    await page.goto('/');
    // Find the card specifically for the fixture dictation by its known ID
    const fixtureCard = page.locator('.dictation-card').filter({ hasText: 'a1b2c3d4' });
    await expect(fixtureCard).toHaveCount(1);
    await expect(fixtureCard).toContainText('natuur, technologie, sport');
  });

  test('shows formatted creation date', async ({ page }) => {
    await page.goto('/');
    // Fixture date is 2024-01-15 — Dutch locale renders "januari 2024"
    const fixtureCard = page.locator('.dictation-card').filter({ hasText: 'a1b2c3d4' });
    await expect(fixtureCard.locator('.dictation-date')).toContainText('2024');
  });

  test('dictation card links to playback page', async ({ page }) => {
    await page.goto('/');
    const fixtureCard = page.locator('.dictation-card').filter({ hasText: 'a1b2c3d4' });
    await fixtureCard.locator('.dictation-link').click();
    await expect(page).toHaveURL(/\/dictation\/a1b2c3d4/);
  });

  test('no empty-state message when dictations exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.empty-state')).not.toBeVisible();
  });
});
