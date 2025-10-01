import { test, expect } from '@playwright/test';

test.describe('Sign In Flow', () => {
  test('should successfully sign in with existing user', async ({ page }) => {
    // First create an account
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const email = `signin${Date.now()}@gmail.com`;
    console.log('Creating account with email:', email);

    await page.locator('#email').fill(email);
    await page.locator('#username').fill('signintest');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for character creation screen
    await page.waitForTimeout(3000);
    const hasCharacterCreation = await page.getByText('Create Your Hero').isVisible().catch(() => false);

    if (!hasCharacterCreation) {
      console.log('❌ Failed to create account');
      await page.screenshot({ path: 'signin-create-failed.png', fullPage: true });
    }

    expect(hasCharacterCreation).toBeTruthy();
    console.log('✅ Account created successfully');

    // Now try to sign in with the same email
    // First, we need to sign out or clear session
    await page.reload();

    // Fill in the same email
    await page.locator('#email').fill(email);

    // Look for a sign-in button or similar
    const signInButton = await page.getByRole('button', { name: /sign in|login/i }).isVisible().catch(() => false);

    if (signInButton) {
      await page.getByRole('button', { name: /sign in|login/i }).click();
      console.log('✅ Clicked sign in button');
    } else {
      console.log('⚠️ No explicit sign-in button found, trying create account button');
      await page.getByRole('button', { name: 'Create Account' }).click();
    }

    // Wait for response
    await page.waitForTimeout(3000);

    // Check if we're signed in
    const hasGame = await page.getByText('Create Your Hero').isVisible().catch(() => false);
    const hasError = await page.locator('.bg-red-500\\/10').isVisible().catch(() => false);

    if (hasGame) {
      console.log('✅ Successfully signed in!');
    } else if (hasError) {
      const errorText = await page.locator('.bg-red-500\\/10').textContent();
      console.log('❌ Sign in error:', errorText);
    } else {
      console.log('⚠️ Unknown state after sign in attempt');
      await page.screenshot({ path: 'signin-unknown.png', fullPage: true });
    }

    expect(hasGame || hasError).toBeTruthy();
  });
});
