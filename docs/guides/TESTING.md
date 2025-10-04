# Testing Guidelines

This document outlines testing best practices and requirements for the Eternal Realms project.

## Testing Stack

- **Unit Tests**: Jest for business logic
- **Frontend Tests**: Jest + React Testing Library for components
- **End-to-End Tests**: Playwright for full workflows
- **Test Coverage**: Aim for >80% coverage on critical paths

## Test Structure

All tests are organized in the `test/` directory:

```
test/
├── e2e/          # End-to-end tests (Playwright)
│   ├── auth.spec.ts
│   ├── combat.spec.ts
│   ├── gathering.spec.ts
│   ├── quests.spec.ts
│   └── ...
├── unit/         # Unit tests (Jest)
│   ├── auth.test.ts
│   ├── combat.test.ts
│   ├── gathering.test.ts
│   └── ...
└── frontend/     # Frontend component tests (Jest + RTL)
    └── (to be added)
```

## Test Commands

```bash
# All tests
npm run test:all        # Run both unit and E2E tests

# Unit tests
npm test                # Run all unit tests (test/unit + test/frontend)
npm run test:unit       # Run only unit tests (test/unit)
npm run test:frontend   # Run only frontend tests (test/frontend)
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# E2E tests
npm run test:e2e        # Run Playwright tests headless
npm run test:e2e:ui     # Run Playwright tests with UI
npm run test:e2e:headed # Run Playwright tests with visible browser
```

## Testing Best Practices

### 1. **Always Write Tests For**

- [ ] Authentication flows (signup, signin, signout)
- [ ] State management logic
- [ ] API interactions
- [ ] Form validation
- [ ] Error handling
- [ ] Edge cases (empty states, network errors, race conditions)

### 2. **Test Structure**

Follow the AAA pattern:
- **Arrange**: Set up test data and conditions
- **Act**: Execute the code being tested
- **Assert**: Verify the results

```typescript
it('should create user account', async () => {
  // Arrange
  const userData = { email: 'test@example.com', username: 'testuser' }

  // Act
  const result = await signUp(userData.username, userData.email)

  // Assert
  expect(result.error).toBeNull()
  expect(result.data.user).toBeDefined()
})
```

### 3. **Mock External Dependencies**

Always mock:
- Database calls (Supabase)
- localStorage
- setTimeout/setInterval
- External APIs
- Browser APIs (when needed)

### 4. **Test Edge Cases**

- Empty inputs
- Invalid data
- Network failures
- Race conditions
- Rapid user interactions
- Browser compatibility issues

### 5. **Playwright E2E Tests**

```typescript
// Good: Wait for actual content
await page.waitForSelector('text=Create Your Hero', { timeout: 10000 })

// Better: Use semantic selectors
await page.getByRole('button', { name: 'Create Account' }).click()

// Best: Handle both success and error states
const result = await Promise.race([
  page.waitForSelector('text=Success').then(() => 'success'),
  page.waitForSelector('.error-message').then(() => 'error'),
  new Promise(resolve => setTimeout(() => resolve('timeout'), 10000))
])
```

### 6. **Prevent Test Pollution**

```typescript
beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  // Clean up any test data
})
```

### 7. **Test User Interactions**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('should handle form submission', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)

  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.click(screen.getByRole('button', { name: 'Submit' }))

  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument()
  })
})
```

## Critical Test Scenarios

### Authentication

- [ ] User can create account with valid email/username
- [ ] User cannot create account with duplicate email
- [ ] User cannot create account with duplicate username
- [ ] User receives appropriate error messages
- [ ] Loading states are properly handled
- [ ] Multiple rapid submissions are prevented
- [ ] Session persists across page reloads
- [ ] User can sign out successfully

### Character Creation

- [ ] Character can be created with valid data
- [ ] Character data is saved to database
- [ ] Character loads correctly after creation
- [ ] Validation errors are displayed

### Game Flow

- [ ] Idle progress accumulates correctly
- [ ] Upgrades can be purchased
- [ ] Inventory updates properly
- [ ] State persists across sessions

## Coverage Requirements

Minimum coverage thresholds:

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

Run `npm run test:coverage` to check current coverage.

## Continuous Integration

All tests must pass before merging:

```bash
npm run test:all
```

## Debugging Tests

### Unit Tests

```bash
# Run specific test file
npm test -- test/unit/auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"

# Debug in VS Code
# Add breakpoint and use Jest debug configuration
```

### E2E Tests

```bash
# Run with headed browser
npx playwright test --headed

# Run specific test
npx playwright test test/e2e/auth.spec.ts

# Debug mode
npx playwright test --debug

# View trace
npx playwright show-trace trace.zip
```

## Common Pitfalls

### ❌ Don't

```typescript
// Don't test implementation details
expect(component.state.count).toBe(1)

// Don't use hard waits
await page.waitForTimeout(5000)

// Don't skip cleanup
// (Always clean up after tests)
```

### ✅ Do

```typescript
// Test user-visible behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument()

// Use semantic waits
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument())

// Always clean up
afterEach(() => cleanup())
```

## Test Data

Use factories or fixtures for consistent test data:

```typescript
// test-utils/factories.ts
export const createMockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  username: 'testuser',
  ...overrides,
})
```

## Browser Compatibility

Playwright tests run on:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

**Note**: Always test on standard browsers (Chrome, Firefox, Safari). Non-standard browsers like Comet may have compatibility issues.

## Performance Testing

Monitor and test:
- Initial load time
- Time to interactive
- Database query performance
- State update performance

## Adding New Features

When implementing new features:

1. Write failing tests first (TDD)
2. Implement the feature
3. Ensure all tests pass
4. Add E2E tests for critical paths
5. Update this documentation

## Questions?

If you're unsure about testing a specific scenario, refer to existing tests or ask for guidance in code review.
