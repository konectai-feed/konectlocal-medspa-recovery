import { expect, test } from '@playwright/test';

test('landing page CTA navigates to assessment', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /How Much Revenue/ })).toBeVisible();

	const cta = page.getByRole('link', { name: /Calculate My Recovery Opportunity/ });
	await expect(cta).toBeVisible();
	await cta.click();

	await expect(page).toHaveURL(/\/assessment$/);
	await expect(page.getByRole('heading', { name: /Calculate Your Revenue Recovery Opportunity/ })).toBeVisible();
});
