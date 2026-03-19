import { test, expect } from '@playwright/test';

const VALID_TOKEN = 'test-token-123';

test.describe('Create page — auth', () => {
  test('GET /create without token returns 403', async ({ page }) => {
    const response = await page.goto('/create');
    expect(response.status()).toBe(403);
    await expect(page.locator('h1')).toContainText('Toegang Geweigerd');
  });

  test('GET /create with wrong token returns 403', async ({ page }) => {
    const response = await page.goto('/create?token=wrong-token');
    expect(response.status()).toBe(403);
    await expect(page.locator('.error-box')).toBeVisible();
  });

  test('GET /create with valid token renders form', async ({ page }) => {
    await page.goto(`/create?token=${VALID_TOKEN}`);
    await expect(page.locator('h1')).toHaveText('Nieuw Dictee Maken');
    await expect(page.locator('#topic1')).toBeVisible();
    await expect(page.locator('#topic2')).toBeVisible();
    await expect(page.locator('#topic3')).toBeVisible();
    await expect(page.locator('#sentenceCount')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Dictee Genereren');
  });
});

test.describe('Create page — validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/create?token=${VALID_TOKEN}`);
    // Remove HTML5 validation attributes so server-side validation is tested
    await page.evaluate(() => {
      document.querySelectorAll('input[required]').forEach(el => el.removeAttribute('required'));
      document.querySelectorAll('input[maxlength]').forEach(el => el.removeAttribute('maxlength'));
      const sc = document.querySelector('#sentenceCount');
      if (sc) { sc.removeAttribute('min'); sc.removeAttribute('max'); }
    });
  });

  test('empty topic1 shows validation error', async ({ page }) => {
    await page.fill('#topic2', 'technologie');
    await page.fill('#topic3', 'sport');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toContainText('leeg');
  });

  test('topic over 100 characters shows length error', async ({ page }) => {
    const longTopic = 'a'.repeat(101);
    await page.fill('#topic1', longTopic);
    await page.fill('#topic2', 'technologie');
    await page.fill('#topic3', 'sport');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toContainText('100 tekens');
  });

  test('invalid sentence count shows error', async ({ page }) => {
    await page.fill('#topic1', 'natuur');
    await page.fill('#topic2', 'technologie');
    await page.fill('#topic3', 'sport');
    await page.fill('#sentenceCount', '0');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toContainText('zinnen');
  });
});

test.describe('Create page — submission', () => {
  test('valid topics redirect to dictation page (mocked services)', async ({ page }) => {
    await page.goto(`/create?token=${VALID_TOKEN}`);
    await page.fill('#topic1', 'natuur');
    await page.fill('#topic2', 'technologie');
    await page.fill('#topic3', 'sport');
    await page.fill('#sentenceCount', '3');
    await page.click('button[type="submit"]');
    // Should redirect to /dictation/:id after successful creation
    await expect(page).toHaveURL(/\/dictation\/[0-9a-f]{8}/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Dictee:');
  });

  test('loading state shown on submit', async ({ page }) => {
    await page.goto(`/create?token=${VALID_TOKEN}`);
    await page.fill('#topic1', 'natuur');
    await page.fill('#topic2', 'technologie');
    await page.fill('#topic3', 'sport');
    // Fire the submit event directly to trigger JS without actually submitting the form
    await page.evaluate(() => {
      document.getElementById('createForm').dispatchEvent(new Event('submit'));
    });
    await expect(page.locator('#loading')).toBeVisible();
    await expect(page.locator('#createForm')).toBeHidden();
  });
});
