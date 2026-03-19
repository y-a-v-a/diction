import { test, expect } from '@playwright/test';

const FIXTURE_ID = 'a1b2c3d4';

test.describe('Dictation playback page', () => {
  test('loads for existing fixture dictation', async ({ page }) => {
    const response = await page.goto(`/dictation/${FIXTURE_ID}`);
    expect(response.status()).toBe(200);
  });

  test('shows dictation id in heading', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    await expect(page.locator('h1')).toContainText(FIXTURE_ID);
  });

  test('shows all fixture topics', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    await expect(page.locator('.topics-line')).toContainText('natuur');
    await expect(page.locator('.topics-line')).toContainText('technologie');
    await expect(page.locator('.topics-line')).toContainText('sport');
  });

  test('shows creation date', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    await expect(page.locator('.date-text')).toContainText('2024');
  });

  test('renders correct number of sentence items', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    // Fixture has 2 sentences
    await expect(page.locator('.sentence-item')).toHaveCount(2);
  });

  test('each sentence item has an audio player', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    const audioElements = page.locator('.sentence-item audio');
    await expect(audioElements).toHaveCount(2);
  });

  test('sentence text is hidden by default', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    const sentenceTexts = page.locator('.sentence-text');
    // All sentence texts should be hidden (display: none via CSS)
    for (let i = 0; i < await sentenceTexts.count(); i++) {
      await expect(sentenceTexts.nth(i)).toBeHidden();
    }
  });

  test('clicking "Toon Tekst" reveals sentence text', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    await page.locator('#showTextBtn').click();
    const sentenceTexts = page.locator('.sentence-text');
    for (let i = 0; i < await sentenceTexts.count(); i++) {
      await expect(sentenceTexts.nth(i)).toBeVisible();
    }
  });

  test('clicking "Toon Tekst" hides the button', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    await page.locator('#showTextBtn').click();
    await expect(page.locator('#showTextBtn')).toBeHidden();
  });

  test('delete form targets correct endpoint', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    const deleteForm = page.locator('form.delete-form');
    await expect(deleteForm).toHaveAttribute('action', `/dictation/${FIXTURE_ID}/delete`);
  });

  test('warning banner shown with ?warning=audio-incomplete', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}?warning=audio-incomplete`);
    // Warning div with yellow background should appear
    await expect(page.locator('text=Niet alle audio bestanden')).toBeVisible();
  });

  test('no warning banner on normal page load', async ({ page }) => {
    await page.goto(`/dictation/${FIXTURE_ID}`);
    await expect(page.locator('text=Niet alle audio bestanden')).not.toBeVisible();
  });
});

test.describe('Dictation page — error cases', () => {
  test('invalid ID format returns 400', async ({ page }) => {
    const response = await page.goto('/dictation/INVALID');
    expect(response.status()).toBe(400);
  });

  test('non-existent ID returns 404', async ({ page }) => {
    const response = await page.goto('/dictation/00000000');
    expect(response.status()).toBe(404);
  });
});
