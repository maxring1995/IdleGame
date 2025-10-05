import { test, expect } from '@playwright/test';

test.describe('Password-Based Authentication', () => {
  const testEmail = `passwordtest${Date.now()}@example.com`;
  const testPassword = 'SecurePass123';

  test('should create account and sign in from different session', async ({ browser }) => {
    // Create account in first context (simulates one browser/device)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');

    console.log('Creating account with:', { email: testEmail });

    // Click sign up link
    await page1.getByText("Don't have an account? Sign up").click();

    // Sign up
    await page1.locator('#email').fill(testEmail);
    await page1.locator('#password').fill(testPassword);
    await page1.getByRole('button', { name: 'Sign Up' }).click();

    // Wait for redirect and page load
    await page1.waitForURL('**/', { waitUntil: 'networkidle', timeout: 10000 });
    await page1.waitForTimeout(2000);

    // Wait for success
    const hasCharacterCreation = await page1.getByText('Create Your Hero').isVisible().catch(() => false);

    expect(hasCharacterCreation).toBe(true);
    console.log('✅ Account created successfully');

    await context1.close();

    // Sign in from different context (simulates different browser/device)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');

    console.log('Signing in from different browser context');

    // Already in sign in mode by default
    // Sign in with email and password
    await page2.locator('#email').fill(testEmail);
    await page2.locator('#password').fill(testPassword);
    await page2.getByRole('button', { name: 'Log In' }).click();

    // Should reach character creation (character doesn't exist yet)
    const signedIn = await page2.waitForSelector('text=Create Your Hero', {
      timeout: 10000
    }).then(() => true).catch(() => false);

    expect(signedIn).toBe(true);
    console.log('✅ Successfully signed in from different context');

    await context2.close();
  });

  test('should sign in with same email credentials', async ({ browser }) => {
    const email = `emaillogin${Date.now()}@example.com`;
    const password = 'EmailPass123';

    // Create account
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');

    // Click sign up link
    await page1.getByText("Don't have an account? Sign up").click();

    await page1.locator('#email').fill(email);
    await page1.locator('#password').fill(password);
    await page1.getByRole('button', { name: 'Sign Up' }).click();

    await page1.waitForTimeout(3000);
    await context1.close();

    // Sign in with same email
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');

    // Already in sign in mode by default
    await page2.locator('#email').fill(email);
    await page2.locator('#password').fill(password);
    await page2.getByRole('button', { name: 'Log In' }).click();

    const signedIn = await page2.waitForSelector('text=Create Your Hero', {
      timeout: 10000
    }).then(() => true).catch(() => false);

    expect(signedIn).toBe(true);
    console.log('✅ Successfully signed in with email');

    await context2.close();
  });

  test('should reject wrong password', async ({ browser }) => {
    const email = `wrongpass${Date.now()}@example.com`;
    const password = 'CorrectPass123';

    // Create account
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');

    // Click sign up link
    await page1.getByText("Don't have an account? Sign up").click();

    await page1.locator('#email').fill(email);
    await page1.locator('#password').fill(password);
    await page1.getByRole('button', { name: 'Sign Up' }).click();

    await page1.waitForTimeout(3000);
    await context1.close();

    // Try to sign in with wrong password
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');

    // Already in sign in mode by default
    await page2.locator('#email').fill(email);
    await page2.locator('#password').fill('WrongPassword123');
    await page2.getByRole('button', { name: 'Log In' }).click();

    // Wait for error message to appear
    await page2.waitForTimeout(2000);

    // Should show error and not be on character creation
    const hasError = await page2.locator('.bg-red-900\\/50').isVisible().catch(() => false);
    const onCharacterCreation = await page2.getByText('Create Your Hero').isVisible().catch(() => false);

    expect(hasError || !onCharacterCreation).toBe(true);
    console.log('✅ Correctly rejected wrong password');

    await context2.close();
  });

  test('should validate password minimum length', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const email = `validation${Date.now()}@example.com`;

    // Click sign up link
    await page.getByText("Don't have an account? Sign up").click();

    // Try short password (less than 6 chars)
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('12345'); // Only 5 chars
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Should get HTML5 validation message
    const passwordInput = page.locator('#password');
    const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    expect(validationMessage).toBeTruthy();
    expect(validationMessage).toContain('6 characters');

    console.log('✅ Password minimum length validation working correctly');
  });
});
