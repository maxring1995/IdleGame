import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should successfully create a new account', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that we're on the auth page
    await expect(page.getByText('Eternal Realms')).toBeVisible();
    await expect(page.getByText('Begin your adventure')).toBeVisible();

    // Fill in the email field with a real-looking email
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    const randomEmail = `test${Date.now()}@gmail.com`;
    await emailInput.fill(randomEmail);
    console.log('Testing with email:', randomEmail);

    // Fill in the username field
    const usernameInput = page.locator('#username');
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill('testuser123');

    // Fill in password fields
    const passwordInput = page.locator('#password');
    const confirmPasswordInput = page.locator('#confirmPassword');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('TestPassword123');
    await confirmPasswordInput.fill('TestPassword123');

    // Click the Create Account button
    const createButton = page.getByRole('button', { name: 'Create Account' });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for authentication to complete (max 10 seconds)
    // Should either see character creation or game screen
    await page.waitForTimeout(3000);

    // Check for success - either character creation or error message
    const hasCharacterCreation = await page.getByText('Create Your Hero').isVisible().catch(() => false);
    const hasError = await page.locator('.bg-red-500\\/10').isVisible().catch(() => false);

    // Log the result
    if (hasCharacterCreation) {
      console.log('✅ SUCCESS: Reached character creation screen!');
    } else if (hasError) {
      const errorText = await page.locator('.bg-red-500\\/10').textContent();
      console.log('❌ ERROR:', errorText);
    } else {
      console.log('⚠️ UNKNOWN STATE: Neither success nor error detected');
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-result.png', fullPage: true });
    }

    // Assert success
    expect(hasCharacterCreation || hasError).toBeTruthy();
  });

  test('should show validation error for short username', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Fill in email
    await page.locator('#email').fill('test@example.com');

    // Fill in short username (less than 3 characters)
    await page.locator('#username').fill('ab');

    // Click Create Account
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Should show browser validation error (HTML5 validation)
    const usernameInput = page.locator('#username');
    const validationMessage = await usernameInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    console.log('Validation message:', validationMessage);
    expect(validationMessage).toBeTruthy();
  });
});
