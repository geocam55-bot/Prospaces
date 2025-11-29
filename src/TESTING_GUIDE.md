# ProSpaces CRM - Testing Guide

## Overview

This testing framework prevents regressions when adding new features. It provides automated tests for critical functionality including data isolation, CRUD operations, and business logic.

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run specific test file
npm test -- Bids.test.tsx

# Run tests with coverage report
npm test -- --coverage
```

### Test Structure

```
/tests
├── setup.ts                          # Test configuration & mocks
├── utils/
│   └── test-utils.tsx               # Shared test utilities & mock data
├── components/
│   ├── Bids.test.tsx               # Bids component tests
│   └── ContactDetail.test.tsx      # ContactDetail component tests
├── integration/
│   └── bids-quotes-isolation.test.tsx  # Data isolation tests
└── features/
    └── price-levels.test.tsx        # Price levels feature tests
```

## Critical Test Suites

### 1. Data Isolation Tests (`/tests/integration/bids-quotes-isolation.test.tsx`)

**What it tests:**
- Bids module loads from BOTH `quotes` and `bids` tables
- ContactDetail loads from BOTH tables and filters correctly
- Quotes created in Bids module appear in ContactDetail
- Bids created in ContactDetail appear in Bids module

**Why it's critical:**
This was a major bug where quotes/bids weren't visible across components due to being stored in different tables. These tests ensure it stays fixed.

**Run it:**
```bash
npm test -- bids-quotes-isolation.test.tsx
```

### 2. Bids Component Tests (`/tests/components/Bids.test.tsx`)

**What it tests:**
- Bids component renders correctly
- Loads data from both tables
- Merges bids and quotes into single list
- Handles empty states
- Filters by status

**Run it:**
```bash
npm test -- Bids.test.tsx
```

### 3. ContactDetail Tests (`/tests/components/ContactDetail.test.tsx`)

**What it tests:**
- Contact details display correctly
- Price levels display properly
- Opportunities section works
- Bids dialog loads data from both tables
- Filtering quotes by contact_id

**Run it:**
```bash
npm test -- ContactDetail.test.tsx
```

### 4. Price Levels Tests (`/tests/features/price-levels.test.tsx`)

**What it tests:**
- Named price levels (Standard, Premium, Wholesale, Retail, Contractor)
- Default to "Retail" for new contacts
- Backward compatibility with old data

**Run it:**
```bash
npm test -- price-levels.test.tsx
```

## Adding New Tests

### Testing a New Component

1. Create test file: `/tests/components/YourComponent.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithUser, mockAdminUser } from '../utils/test-utils';
import { YourComponent } from '../../components/YourComponent';
import * as api from '../../utils/api';

// Mock APIs
vi.mock('../../utils/api', () => ({
  yourAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('YourComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render', () => {
    renderWithUser(<YourComponent user={mockAdminUser} />, { user: mockAdminUser });
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should load data', async () => {
    vi.mocked(api.yourAPI.getAll).mockResolvedValue({ data: [] });
    
    renderWithUser(<YourComponent user={mockAdminUser} />, { user: mockAdminUser });
    
    await waitFor(() => {
      expect(api.yourAPI.getAll).toHaveBeenCalled();
    });
  });
});
```

### Testing a New Feature

1. Create test file: `/tests/features/your-feature.test.tsx`
2. Document what the feature does
3. Test happy path and edge cases
4. Test data integrity

```typescript
/**
 * Tests for Your Feature
 * 
 * Description of what this feature does and why it's important
 */

import { describe, it, expect } from 'vitest';

describe('Your Feature', () => {
  it('should work correctly', () => {
    // Test implementation
  });
  
  it('should handle edge cases', () => {
    // Test edge cases
  });
});
```

## Best Practices

### 1. Always Mock External Dependencies

```typescript
// Mock Supabase
vi.mock('../../utils/supabase', () => ({ ... }));

// Mock APIs
vi.mock('../../utils/api', () => ({ ... }));

// Mock toast notifications
vi.mock('sonner@2.0.3', () => ({ ... }));
```

### 2. Clean Up After Each Test

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 3. Use Descriptive Test Names

```typescript
// ❌ Bad
it('should work', () => { ... });

// ✅ Good
it('should load bids from BOTH bids and quotes tables', () => { ... });
```

### 4. Test User Interactions

```typescript
import { userEvent } from '@testing-library/user-event';

it('should handle button click', async () => {
  const user = userEvent.setup();
  renderWithUser(<Component />);
  
  await user.click(screen.getByText('Click Me'));
  
  expect(mockFunction).toHaveBeenCalled();
});
```

### 5. Wait for Async Operations

```typescript
await waitFor(() => {
  expect(api.getAll).toHaveBeenCalled();
});
```

## Test Coverage Goals

- **Critical Paths**: 100% coverage
  - Data loading and merging (bids/quotes)
  - CRUD operations
  - Data isolation
  - Permissions

- **UI Components**: 80% coverage
  - Rendering
  - User interactions
  - State changes

- **Utilities**: 90% coverage
  - API functions
  - Helper functions
  - Calculations

## Continuous Integration

### Before Committing

```bash
# Run all tests
npm test

# Check coverage
npm test -- --coverage
```

### Before Deploying

```bash
# Run full test suite
npm test -- --run

# Verify no failing tests
# Verify coverage meets goals
```

## Troubleshooting

### Tests Fail Due to Missing Mocks

**Problem:** `Error: Cannot find module`

**Solution:** Add the module to `/tests/setup.ts`:
```typescript
vi.mock('module-name', () => ({
  // Mock implementation
}));
```

### Tests Timeout

**Problem:** `Test timed out in 5000ms`

**Solution:** Increase timeout or check for missing `await`:
```typescript
it('should work', async () => {
  // Make sure to await async operations
  await waitFor(() => { ... });
}, 10000); // Increase timeout to 10s
```

### Mock Not Working

**Problem:** Mock function not being called

**Solution:** Verify mock path and clear mocks:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Key Testing Scenarios

### Testing Data Isolation (Critical!)

```typescript
it('should show data from both tables', async () => {
  vi.mocked(api.bidsAPI.getAll).mockResolvedValue({ bids: [bid1] });
  vi.mocked(api.quotesAPI.getAll).mockResolvedValue({ quotes: [quote1] });
  
  renderWithUser(<Bids user={mockAdminUser} />);
  
  await waitFor(() => {
    expect(screen.getByText(bid1.title)).toBeInTheDocument();
    expect(screen.getByText(quote1.title)).toBeInTheDocument();
  });
});
```

### Testing Permissions

```typescript
it('should hide delete button for Sales role', () => {
  renderWithUser(<Component user={mockSalesUser} />);
  
  expect(screen.queryByText('Delete')).not.toBeInTheDocument();
});
```

### Testing Forms

```typescript
it('should submit form with correct data', async () => {
  const user = userEvent.setup();
  renderWithUser(<Form onSubmit={mockSubmit} />);
  
  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByText('Submit'));
  
  expect(mockSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

## Maintenance

### When Adding New Features

1. Write tests FIRST (TDD approach)
2. Run existing tests to ensure no regressions
3. Add new tests for the feature
4. Update this guide if needed

### When Fixing Bugs

1. Write a test that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Keep the test to prevent regression

### Monthly Review

- Review test coverage
- Update outdated tests
- Remove obsolete tests
- Add tests for untested critical paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

If tests are failing or you need help writing tests, check:
1. Console output for error messages
2. This guide for examples
3. Existing test files for patterns
