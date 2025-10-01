import { test, expect } from '@playwright/test';

test.describe('Password-Based Authentication', () => {
  const testEmail = `passwordtest${Date.now()}@example.com`;
  const testUsername = 'passworduser';
  const testPassword = 'SecurePass123';

  test('should create account and sign in from different session', async ({ browser }) => {
    // Create account in first context (simulates one browser/device)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');

    console.log('Creating account with:', { email: testEmail, username: testUsername });

    // Sign up
    await page1.locator('#email').fill(testEmail);
    await page1.locator('#username').fill(testUsername);
    await page1.locator('#password').fill(testPassword);
    await page1.locator('#confirmPassword').fill(testPassword);
    await page1.getByRole('button', { name: 'Create Account' }).click();

    // Wait for success
    const hasCharacterCreation = await page1.waitForSelector('text=Create Your Hero', {
      timeout: 10000
    }).then(() => true).catch(() => false);

    expect(hasCharacterCreation).toBe(true);
    console.log('✅ Account created successfully');

    await context1.close();

    // Sign in from different context (simulates different browser/device)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');

    console.log('Signing in from different browser context');

    // Switch to sign in mode
    await page2.getByRole('button', { name: /already have an account/i }).click();

    // Sign in with username and password
    await page2.locator('#username').fill(testUsername);
    await page2.locator('#password').fill(testPassword);
    await page2.getByRole('button', { name: 'Sign In' }).click();

    // Should reach character creation (character doesn't exist yet)
    const signedIn = await page2.waitForSelector('text=Create Your Hero', {
      timeout: 10000
    }).then(() => true).catch(() => false);

    expect(signedIn).toBe(true);
    console.log('✅ Successfully signed in from different context');

    await context2.close();
  });

  test('should sign in with email instead of username', async ({ browser }) => {
    const email = `emaillogin${Date.now()}@example.com`;
    const username = 'emailuser';
    const password = 'EmailPass123';

    // Create account
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');

    await page1.locator('#email').fill(email);
    await page1.locator('#username').fill(username);
    await page1.locator('#password').fill(password);
    await page1.locator('#confirmPassword').fill(password);
    await page1.getByRole('button', { name: 'Create Account' }).click();

    await page1.waitForTimeout(3000);
    await context1.close();

    // Sign in with email (not username)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');

    await page2.getByRole('button', { name: /already have an account/i }).click();

    // Use email for login
    await page2.locator('#username').fill(email); // Email field accepts email too
    await page2.locator('#password').fill(password);
    await page2.getByRole('button', { name: 'Sign In' }).click();

    const signedIn = await page2.waitForSelector('text=Create Your Hero', {
      timeout: 10000
    }).then(() => true).catch(() => false);

    expect(signedIn).toBe(true);
    console.log('✅ Successfully signed in with email');

    await context2.close();
  });

  test('should reject wrong password', async ({ browser }) => {
    const email = `wrongpass${Date.now()}@example.com`;
    const username = 'wrongpassuser';
    const password = 'CorrectPass123';

    // Create account
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');

    await page1.locator('#email').fill(email);
    await page1.locator('#username').fill(username);
    await page1.locator('#password').fill(password);
    await page1.locator('#confirmPassword').fill(password);
    await page1.getByRole('button', { name: 'Create Account' }).click();

    await page1.waitForTimeout(3000);
    await context1.close();

    // Try to sign in with wrong password
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');

    await page2.getByRole('button', { name: /already have an account/i }).click();

    await page2.locator('#username').fill(username);
    await page2.locator('#password').fill('WrongPassword123');
    await page2.getByRole('button', { name: 'Sign In' }).click();

    // Should show error
    const hasError = await page2.locator('.bg-red-500\\/10').isVisible().catch(() => false);

    expect(hasError).toBe(true);
    console.log('✅ Correctly rejected wrong password');

    await context2.close();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const email = `validation${Date.now()}@example.com`;

    // Try weak password (no uppercase)
    await page.locator('#email').fill(email);
    await page.locator('#username').fill('validuser');
    await page.locator('#password').fill('weakpassword123');
    await page.locator('#confirmPassword').fill('weakpassword123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForTimeout(1000);

    const hasError = await page.locator('.bg-red-500\\/10').isVisible().catch(() => false);
    expect(hasError).toBe(true);

    const errorText = await page.locator('.bg-red-500\\/10').textContent();
    expect(errorText).toContain('uppercase');

    console.log('✅ Password validation working correctly');
  });
});
