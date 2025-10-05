import { test, expect } from '@playwright/test';

test.describe('Authentication Edge Cases', () => {
  test('should handle account creation with localStorage cleared', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Clear localStorage to simulate fresh browser
    await page.evaluate(() => localStorage.clear());

    const email = `edge${Date.now()}@example.com`;
    const password = 'EdgePassword123';

    console.log('Testing with cleared localStorage');

    // Click sign up link
    await page.getByText("Don't have an account? Sign up").click();

    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Wait for either success or error (max 10 seconds)
    const result = await Promise.race([
      page.waitForSelector('text=Create Your Hero', { timeout: 10000 }).then(() => 'success'),
      page.waitForSelector('.bg-red-900\\/50', { timeout: 10000 }).then(() => 'error'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 10000))
    ]);

    console.log('Result:', result);

    if (result === 'timeout') {
      await page.screenshot({ path: 'test-timeout.png', fullPage: true });
      console.log('⚠️ Test timed out - likely stuck in loading state');
    } else if (result === 'success') {
      console.log('✅ Successfully created account and reached character creation');
    } else if (result === 'error') {
      const errorText = await page.locator('.bg-red-900\\/50').textContent();
      console.log('❌ Error:', errorText);
    }

    expect(result).not.toBe('timeout');
  });

  test('should not get stuck on repeated signup attempts', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const email = `repeat${Date.now()}@example.com`;
    const password = 'RepeatPassword123';

    // Click sign up link
    await page.getByText("Don't have an account? Sign up").click();

    // First attempt
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Check if we got a response (success or error)
    const hasSuccess = await page.getByText('Create Your Hero').isVisible().catch(() => false);
    const hasError = await page.locator('.bg-red-900\\/50').isVisible().catch(() => false);
    const isStillLoading = await page.getByText('Please wait...').isVisible().catch(() => false);

    console.log('After signup:', { hasSuccess, hasError, isStillLoading });

    expect(isStillLoading).toBe(false);
    expect(hasSuccess || hasError).toBe(true);
  });

  test('should properly handle rapid button clicks', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const email = `rapid${Date.now()}@example.com`;
    const password = 'RapidPassword123';

    // Click sign up link
    await page.getByText("Don't have an account? Sign up").click();

    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);

    const button = page.getByRole('button', { name: 'Sign Up' });

    // Click the button multiple times rapidly
    await button.click();
    // Try to click again (may be disabled or in loading state)
    const canClickAgain = await button.isEnabled().catch(() => false);

    if (canClickAgain) {
      await button.click().catch(() => {});
    }

    // Wait for navigation or error
    await page.waitForTimeout(3000);

    // Check for any valid result
    const hasSuccess = await page.getByText('Create Your Hero').isVisible().catch(() => false);
    const hasError = await page.locator('.bg-red-900\\/50').isVisible().catch(() => false);

    console.log('Rapid click result:', { hasSuccess, hasError });

    // The test passes if we got any valid response
    expect(hasSuccess || hasError).toBe(true);
  });
});
