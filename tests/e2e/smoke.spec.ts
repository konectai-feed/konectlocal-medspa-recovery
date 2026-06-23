import { expect, test } from '@playwright/test';
test('landing page renders', async ({ page }) => { await page.goto('/'); await expect(page.getByRole('heading', { name: /How Much Revenue/ })).toBeVisible(); await expect(page.getByRole('button', { name: /Calculate My Recovery Opportunity/ })).toBeVisible(); });
