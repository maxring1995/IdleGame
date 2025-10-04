# Test Directory

Organized test suite for Eternal Realms.

## 📁 Structure

```
test/
├── e2e/          # End-to-End Tests (Playwright)
├── unit/         # Unit Tests (Jest)
└── frontend/     # Frontend Component Tests (Jest + RTL)
```

## 🧪 Test Types

### E2E Tests (`test/e2e/`)

End-to-end tests using Playwright for browser automation.

**Files:**
- `auth.spec.ts` - Authentication flows
- `signin.spec.ts` - Sign-in edge cases
- `combat.spec.ts` - Combat system workflows
- `gathering.spec.ts` - Gathering system flows
- `quests.spec.ts` - Quest system workflows
- `adventure.spec.ts` - Adventure and exploration
- `inventory.spec.ts` - Inventory operations
- `equipment-overlay.spec.ts` - Equipment management
- `full-flow.spec.ts` - Complete user journey

**Run E2E Tests:**
```bash
npm run test:e2e              # All E2E tests
npm run test:e2e:ui           # Interactive UI mode
npm run test:e2e:headed       # With visible browser
npx playwright test test/e2e/auth.spec.ts  # Specific test
```

### Unit Tests (`test/unit/`)

Unit tests for business logic using Jest.

**Files:**
- `auth.test.ts` - Authentication utilities
- `auth-integration.test.ts` - Auth integration scenarios
- `combat.test.ts` - Combat calculations
- `gathering.test.ts` - Gathering mechanics
- `quest-tracking.test.ts` - Quest progress tracking
- `quests.test.ts` - Quest system logic
- `travel.test.ts` - Travel calculations

**Run Unit Tests:**
```bash
npm test                      # All unit tests
npm run test:unit             # Only unit tests
npm run test:watch            # Watch mode
npm test test/unit/auth.test.ts  # Specific test
```

### Frontend Tests (`test/frontend/`)

Component tests using Jest + React Testing Library.

**Status:** To be added

**Run Frontend Tests:**
```bash
npm run test:frontend         # All frontend tests
```

## 📊 Coverage

Generate coverage report:
```bash
npm run test:coverage
```

## 🔍 Configuration

- **Playwright**: `playwright.config.ts` → points to `test/e2e/`
- **Jest**: `jest.config.js` → points to `test/unit/` and `test/frontend/`

## 📖 Related Documentation

- [Testing Guide](../docs/guides/TESTING.md) - Best practices and patterns
- [CLAUDE.md](../CLAUDE.md) - Testing requirements for new features

## ✅ Test Summary

- **E2E Tests**: 60 tests in 14 files
- **Unit Tests**: 7 test files
- **Frontend Tests**: 0 (to be added)

---

**Last Updated:** 2025-10-04
