# Testing Workflow & Standards

## Overview
This document outlines the testing strategy, workflow, and standards for the Cap Table Management Platform. Our testing approach ensures reliability, maintainability, and confidence in financial calculations.

## Testing Stack
- **Test Runner**: Vitest
- **Testing Library**: @testing-library/react
- **Environment**: jsdom
- **Coverage**: v8 provider
- **Mock Data**: Golden test files for financial calculations

## Test Categories

### 1. Unit Tests
**Purpose**: Test individual functions, components, and services in isolation.
**Location**: Co-located with source files (`*.test.ts`, `*.test.tsx`)
**Coverage Target**: 90%+

```typescript
// Example: src/features/instruments/services/instrumentsService.test.ts
describe('InstrumentsService', () => {
  describe('getSecurities', () => {
    it('should fetch securities with proper authorization', async () => {
      // Test implementation
    });
  });
});
```

### 2. Integration Tests
**Purpose**: Test component interactions, API integrations, and data flow.
**Location**: `src/features/[feature]/integration/`
**Coverage Target**: 80%+

### 3. Golden Tests
**Purpose**: Test financial calculations with known-good data sets.
**Location**: `src/testdata/golden/`
**Coverage Target**: 100% for all financial calculations

### 4. Component Tests
**Purpose**: Test React components, user interactions, and rendering.
**Location**: Co-located with components (`*.test.tsx`)
**Coverage Target**: 85%+

## Test Structure

### File Naming Convention
```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
├── features/
│   ├── instruments/
│   │   ├── services/
│   │   │   ├── instrumentsService.ts
│   │   │   └── instrumentsService.test.ts
│   │   ├── hooks/
│   │   │   ├── useInstruments.ts
│   │   │   └── useInstruments.test.ts
│   │   └── components/
│   │       ├── InstrumentsTable.tsx
│   │       └── InstrumentsTable.test.tsx
└── testdata/
    ├── golden/
    │   ├── vesting.basic.gold.json
    │   └── dilution.scenarios.gold.json
    └── fixtures/
        ├── mockCompanies.ts
        └── mockSecurities.ts
```

### Test Template
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  describe('when condition', () => {
    it('should expected behavior', () => {
      // Arrange
      const input = createTestData();
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('Error Handling', () => {
    it('should handle authorization errors', async () => {
      // Test error scenarios
    });
  });
});
```

## Testing Commands

### Development Workflow
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- instruments

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Lint checking
npm run lint
```

### Pre-commit Checklist
1. ✅ All tests pass: `npm test`
2. ✅ Type check passes: `npm run typecheck`
3. ✅ Linting passes: `npm run lint`
4. ✅ Build succeeds: `npm run build`

## Testing Standards

### 1. Test Quality Standards
- **Descriptive Names**: Test names should clearly describe what is being tested
- **Single Responsibility**: Each test should verify one specific behavior
- **Isolation**: Tests should not depend on each other
- **Deterministic**: Tests should produce consistent results
- **Fast**: Tests should run quickly (< 1s per test typically)

### 2. Coverage Requirements
- **Financial Calculations**: 100% coverage required
- **Business Logic**: 90% coverage required
- **UI Components**: 85% coverage required
- **Integration Tests**: 80% coverage required

### 3. Mock Strategy
```typescript
// External dependencies (Supabase, APIs)
vi.mock('@/services/supabase', () => ({
  supabase: mockSupabaseClient
}));

// Internal services
vi.mock('../services/instrumentsService', () => ({
  InstrumentsService: {
    getSecurities: vi.fn(),
    cancelSecurity: vi.fn()
  }
}));

// Date/time for consistency
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2025-01-01')
}));
```

### 4. Test Data Management
```typescript
// Use factories for test data
const createMockSecurity = (overrides = {}) => ({
  id: 'security-1',
  type: 'EQUITY',
  quantity: 10000,
  stakeholder_name: 'John Doe',
  ...overrides
});

// Golden test data for financial calculations
import vestingGoldenData from '@/testdata/golden/vesting.basic.gold.json';
```

## Component Testing Patterns

### 1. Rendering Tests
```typescript
it('should render security data correctly', () => {
  render(<InstrumentsTable securities={mockSecurities} />);
  
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('10,000')).toBeInTheDocument();
});
```

### 2. User Interaction Tests
```typescript
it('should call onEdit when edit button is clicked', () => {
  const onEdit = vi.fn();
  render(<InstrumentsTable securities={mockSecurities} onEdit={onEdit} />);
  
  fireEvent.click(screen.getByTitle('Edit'));
  expect(onEdit).toHaveBeenCalledWith(mockSecurities[0]);
});
```

### 3. Loading States
```typescript
it('should show loading spinner when loading', () => {
  render(<InstrumentsTable securities={[]} loading={true} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

### 4. Error States
```typescript
it('should display error message when error occurs', () => {
  render(<ComponentWithError error="Failed to load" />);
  expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
});
```

## Service Testing Patterns

### 1. API Integration Tests
```typescript
it('should fetch securities with proper filters', async () => {
  const mockData = [createMockSecurity()];
  mockSupabase.from().select().eq.mockResolvedValue({ data: mockData, error: null });
  
  const result = await InstrumentsService.getSecurities('company-1', { type: 'EQUITY' });
  
  expect(mockSupabase.from).toHaveBeenCalledWith('securities');
  expect(result).toEqual(mockData);
});
```

### 2. Authorization Tests
```typescript
it('should verify company access before fetching data', async () => {
  await InstrumentsService.getSecurities('company-1');
  
  expect(AuthorizationService.validateCompanyAccess).toHaveBeenCalledWith('company-1');
});
```

### 3. Error Handling Tests
```typescript
it('should handle database errors gracefully', async () => {
  mockSupabase.from().select().eq.mockResolvedValue({ 
    data: null, 
    error: { message: 'Connection failed' } 
  });
  
  await expect(InstrumentsService.getSecurities('company-1'))
    .rejects.toThrow('Failed to fetch securities: Connection failed');
});
```

## Hook Testing Patterns

### 1. State Management
```typescript
it('should initialize with default state', () => {
  const { result } = renderHook(() => useInstruments('company-1'));
  
  expect(result.current.securities).toEqual([]);
  expect(result.current.loading).toBe(true);
});
```

### 2. Async Operations
```typescript
it('should load data on mount', async () => {
  renderHook(() => useInstruments('company-1'));
  
  await waitFor(() => {
    expect(InstrumentsService.getSecurities).toHaveBeenCalled();
  });
});
```

### 3. State Updates
```typescript
it('should update filters and reload data', async () => {
  const { result } = renderHook(() => useInstruments('company-1'));
  
  act(() => {
    result.current.updateFilters({ type: 'EQUITY' });
  });
  
  expect(result.current.filters.type).toBe('EQUITY');
});
```

## Golden Testing for Financial Calculations

### 1. Test Data Structure
```json
{
  "description": "Basic vesting schedule calculations",
  "testCases": [
    {
      "name": "4-year vesting with 1-year cliff",
      "input": {
        "units": 48000,
        "schedule": {
          "start": "2025-01-01",
          "cliffMonths": 12,
          "durationMonths": 48,
          "frequency": "MONTHLY"
        },
        "asOf": "2026-01-01"
      },
      "expectedVested": 12000
    }
  ]
}
```

### 2. Golden Test Implementation
```typescript
describe('Vesting Calculator - Golden Tests', () => {
  vestingGoldenData.testCases.forEach((testCase) => {
    it(testCase.name, () => {
      const result = computeVested(
        testCase.input.units,
        testCase.input.schedule,
        new Date(testCase.input.asOf)
      );
      
      expect(result).toBe(testCase.expectedVested);
    });
  });
});
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
```

## Best Practices

### Do's ✅
- Write tests before fixing bugs (TDD when possible)
- Test edge cases and error conditions
- Use descriptive test names and group related tests
- Mock external dependencies consistently
- Maintain golden test data for financial calculations
- Test user workflows end-to-end
- Keep tests fast and isolated

### Don'ts ❌
- Don't test implementation details
- Don't write overly complex test setups
- Don't ignore failing tests
- Don't mock what you own (internal modules)
- Don't commit without running tests
- Don't skip error handling tests

## Debugging Tests

### Common Issues and Solutions
1. **Flaky Tests**: Usually timing issues, use `waitFor` and proper async handling
2. **Mock Issues**: Clear mocks between tests with `vi.clearAllMocks()`
3. **Memory Leaks**: Clean up timers and subscriptions in `afterEach`
4. **Test Isolation**: Ensure tests don't share state

### Debugging Commands
```bash
# Debug specific test
npm test -- --reporter=verbose instruments

# Run single test in isolation
npm test -- --run --reporter=verbose -t "should fetch securities"

# Generate coverage report
npm run test:coverage
open coverage/index.html
```

## Reporting and Metrics

### Coverage Reports
- Generate after each test run
- Monitor coverage trends over time
- Enforce minimum coverage thresholds
- Review coverage reports in PRs

### Test Metrics
- Total test count
- Test execution time
- Coverage percentage by category
- Flaky test detection
- Golden test validation

This testing workflow ensures our cap table management platform maintains the highest standards of reliability and accuracy, especially critical for financial calculations and sensitive data handling.