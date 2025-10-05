import { test, expect } from '@playwright/test';

test.describe('Sign In Flow', () => {
  test('should successfully sign in with existing user', async ({ browser }) => {
    const email = `signin${Date.now()}@gmail.com`;
    const password = 'TestPassword123';
    console.log('Creating account with email:', email);

    // First create an account in one context
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');

    // Click sign up link
    await page1.getByText("Don't have an account? Sign up").click();

    await page1.locator('#email').fill(email);
    await page1.locator('#password').fill(password);
    await page1.getByRole('button', { name: 'Sign Up' }).click();

    // Wait for character creation screen
    await page1.waitForTimeout(3000);
    const hasCharacterCreation = await page1.getByText('Create Your Hero').isVisible().catch(() => false);

    if (!hasCharacterCreation) {
      console.log('❌ Failed to create account');
      await page1.screenshot({ path: 'signin-create-failed.png', fullPage: true });
    }

    expect(hasCharacterCreation).toBeTruthy();
    console.log('✅ Account created successfully');

    await context1.close();

    // Now sign in with the same account in a new context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');

    // Should be on login page by default
    await page2.locator('#email').fill(email);
    await page2.locator('#password').fill(password);
    await page2.getByRole('button', { name: 'Log In' }).click();

    // Wait for response
    await page2.waitForTimeout(3000);

    // Check if we're signed in (should see character creation since we haven't created character yet)
    const signedIn = await page2.getByText('Create Your Hero').isVisible().catch(() => false);
    const hasError = await page2.locator('.bg-red-900\\/50').isVisible().catch(() => false);

    if (signedIn) {
      console.log('✅ Successfully signed in!');
    } else if (hasError) {
      const errorText = await page2.locator('.bg-red-900\\/50').textContent();
      console.log('❌ Sign in error:', errorText);
    } else {
      console.log('⚠️ Unknown state after sign in attempt');
      await page2.screenshot({ path: 'signin-unknown.png', fullPage: true });
    }

    expect(signedIn).toBeTruthy();

    await context2.close();
  });
});
