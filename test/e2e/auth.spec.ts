import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should successfully create a new account', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that we're on the auth page
    await expect(page.getByText('Eternal Realms')).toBeVisible();

    // Click sign up link
    const signupLink = page.getByText("Don't have an account? Sign up");
    await signupLink.click();

    // Should see "Create your account" text
    await expect(page.getByText('Create your account')).toBeVisible();

    // Fill in the email field with a unique email
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    const randomEmail = `test${Date.now()}@gmail.com`;
    await emailInput.fill(randomEmail);
    console.log('Testing with email:', randomEmail);

    // Fill in password field
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('TestPassword123');

    // Click the Sign Up button
    const signupButton = page.getByRole('button', { name: 'Sign Up' });
    await expect(signupButton).toBeVisible();
    await signupButton.click();

    // Wait for authentication to complete
    // Should redirect to character creation
    await page.waitForURL('**/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for success - should see character creation
    const hasCharacterCreation = await page.getByText('Create Your Hero').isVisible().catch(() => false);
    const hasError = await page.locator('.bg-red-900\\/50').isVisible().catch(() => false);

    // Log the result
    if (hasCharacterCreation) {
      console.log('✅ SUCCESS: Reached character creation screen!');
    } else if (hasError) {
      const errorText = await page.locator('.bg-red-900\\/50').textContent();
      console.log('❌ ERROR:', errorText);
    } else {
      console.log('⚠️ UNKNOWN STATE: Neither success nor error detected');
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-result.png', fullPage: true });
    }

    // Assert success
    expect(hasCharacterCreation).toBeTruthy();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Click sign up link
    const signupLink = page.getByText("Don't have an account? Sign up");
    await signupLink.click();

    // Fill in email
    await page.locator('#email').fill('test@example.com');

    // Fill in short password (less than 6 characters)
    await page.locator('#password').fill('123');

    // Click Sign Up
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Should show browser validation error (HTML5 validation) since password has minLength=6
    const passwordInput = page.locator('#password');
    const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    console.log('Validation message:', validationMessage);
    expect(validationMessage).toBeTruthy();
  });
});
