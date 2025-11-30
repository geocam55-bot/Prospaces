# Testing Framework Summary

## What Was Created

A comprehensive automated testing framework to prevent breaking existing features when adding new ones.

## Files Created

### Configuration
- `/vitest.config.ts` - Test runner configuration
- `/tests/setup.ts` - Global test setup, mocks for Supabase and toast

### Test Utilities
- `/tests/utils/test-utils.tsx` - Shared mock data and helper functions
  - Mock users (Admin, Manager, Sales)
  - Mock contacts, bids, quotes, opportunities
  - Custom render function

### Component Tests
- `/tests/components/Bids.test.tsx` - Tests for Bids component
  - Renders correctly
  - Loads from both tables
  - Merges data
  - Handles empty states

- `/tests/components/ContactDetail.test.tsx` - Tests for ContactDetail component
  - Displays contact info
  - Shows price levels
  - Loads opportunities
  - Loads bids from both tables

### Integration Tests
- `/tests/integration/bids-quotes-isolation.test.tsx` - **CRITICAL**
  - Tests the data isolation fix we just completed
  - Ensures Bids module shows data from both tables
  - Ensures ContactDetail shows data from both tables
  - Prevents regression of this critical bug

### Feature Tests
- `/tests/features/price-levels.test.tsx` - Price levels feature
  - Tests named price levels
  - Tests default to "Retail"
  - Tests backward compatibility

### Documentation
- `/TESTING_GUIDE.md` - Comprehensive guide for writing and running tests
- `/run-tests.sh` - Simple script to run all tests

## Installation

To use this testing framework, install the required dependencies:

```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## Usage

### Run All Tests
```bash
npx vitest run
# or
bash run-tests.sh
```

### Run Tests in Watch Mode
```bash
npx vitest --watch
```

### Run Specific Test File
```bash
npx vitest Bids.test.tsx
```

### Generate Coverage Report
```bash
npx vitest --coverage
```

## What It Protects

### 1. Data Isolation (CRITICAL)
- **Problem:** Quotes/bids created in one module don't appear in another
- **Protection:** Tests verify both components load from both tables
- **Test File:** `bids-quotes-isolation.test.tsx`

### 2. Price Levels
- **Problem:** Regression to old numeric tiers
- **Protection:** Tests verify named levels are used
- **Test File:** `price-levels.test.tsx`

### 3. Component Rendering
- **Problem:** Components break due to prop changes
- **Protection:** Tests verify components render with expected data
- **Test Files:** `Bids.test.tsx`, `ContactDetail.test.tsx`

### 4. Data Loading
- **Problem:** API calls fail or return wrong data
- **Protection:** Tests verify correct APIs are called
- **Test Files:** All component tests

## Test Coverage

Current test coverage focuses on:
- ✅ Critical data isolation paths
- ✅ Component rendering
- ✅ Data loading from multiple sources
- ✅ Feature functionality (price levels)

Future additions should test:
- Permissions system
- CRUD operations
- Form submissions
- Error handling
- Edge cases

## Development Workflow

### Before Adding New Features
1. Run existing tests: `npx vitest run`
2. Ensure all pass

### While Developing
1. Run tests in watch mode: `npx vitest --watch`
2. Write tests for new feature
3. Implement feature
4. Ensure tests pass

### Before Committing
1. Run full test suite: `npx vitest run`
2. Check coverage: `npx vitest --coverage`
3. Fix any failing tests

## Key Benefits

1. **Catch Regressions Early** - Tests fail immediately if you break existing features
2. **Safe Refactoring** - Refactor with confidence knowing tests will catch issues
3. **Documentation** - Tests serve as living documentation of how features work
4. **Faster Development** - Catch bugs before manual testing
5. **Code Quality** - Forces you to write testable, maintainable code

## Maintenance

### Adding Tests for New Features
See `/TESTING_GUIDE.md` section "Adding New Tests"

### When Tests Fail
1. Read the error message carefully
2. Check what changed recently
3. Fix the bug or update the test
4. Never ignore failing tests

### Updating Tests
When features change intentionally:
1. Update the relevant test
2. Document why it changed
3. Ensure related tests still pass

## Critical Tests to Never Remove

These tests protect critical fixes and should NEVER be deleted:

1. **Bids/Quotes Data Isolation Tests**
   - File: `/tests/integration/bids-quotes-isolation.test.tsx`
   - Protects: The fix where bids/quotes appear in both modules
   - Why: This was a critical data isolation bug

2. **Price Levels Tests**
   - File: `/tests/features/price-levels.test.tsx`
   - Protects: Named price levels instead of numeric tiers
   - Why: Major feature migration

## Next Steps

1. Install dependencies (see Installation section)
2. Run tests to verify setup: `npx vitest run`
3. Review `/TESTING_GUIDE.md` for detailed documentation
4. Start adding tests for new features

## Questions?

Refer to:
- `/TESTING_GUIDE.md` - Comprehensive testing guide
- Test files in `/tests` - Examples of different test patterns
- [Vitest Docs](https://vitest.dev/) - Official documentation
