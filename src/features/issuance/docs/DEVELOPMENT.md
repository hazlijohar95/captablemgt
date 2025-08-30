# Securities Issuance Feature - Developer Guide

## 🏗️ Architecture Overview

The Securities Issuance feature is built with a modular, testable architecture:

```
src/features/issuance/
├── components/
│   ├── steps/                    # Individual step components (95-302 lines each)
│   ├── shared/                   # Reusable UI components
│   └── SecuritiesIssuanceWizardRefactored.tsx  # Main orchestrator (144 lines)
├── context/                      # Centralized state management
├── services/                     # Business logic and API calls
├── hooks/                        # Reusable React hooks
├── types/                        # TypeScript definitions
├── utils/                        # Development and utility functions
└── __tests__/                    # Comprehensive test suite
```

## 🎯 Key Design Principles

### 1. **Single Responsibility**
Each component has one clear purpose:
- `StakeholderSelectionStep`: Only handles stakeholder selection
- `PricingTermsStep`: Only handles pricing and terms
- `IssuanceWizardContext`: Only manages wizard state

### 2. **Testability First**
- Every component can be tested in isolation
- Mock factories for consistent test data
- Integration tests for complete workflows

### 3. **Developer Experience**
- Clear TypeScript interfaces
- Comprehensive error messages
- Development utilities for debugging

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Test individual components
import { StakeholderSelectionStep } from '@/features/issuance/components';
import { renderWithProviders, createMockStakeholder } from '../__tests__/test-utils';

test('should select stakeholder', () => {
  const mockStakeholder = createMockStakeholder();
  renderWithProviders(<StakeholderSelectionStep />);
  // Test implementation...
});
```

### Integration Tests
```typescript
// Test complete workflows
import { SecuritiesIssuanceWizardRefactored } from '@/features/issuance/components';

test('should complete full issuance workflow', async () => {
  renderWithProviders(<SecuritiesIssuanceWizardRefactored companyId="test" />);
  // Complete workflow testing...
});
```

### Test Utilities
- `renderWithProviders()`: Renders components with all necessary providers
- `createMockStakeholder()`: Creates consistent test stakeholder data
- `createTestScenarios()`: Pre-built scenarios for different use cases

## 🔧 Development Utilities

### Debugging
```typescript
import { devLog, analyzeFormData, debugWizardState } from '@/features/issuance/utils/developmentUtils';

// Log step transitions
devLog.step('SecurityDetailsStep', { quantity: 1000 });

// Analyze form completeness
analyzeFormData(formData);

// Debug entire wizard state
debugWizardState(wizardState);
```

### Performance Monitoring
```typescript
import { perfTimer } from '@/features/issuance/utils/developmentUtils';

// Measure operation performance
perfTimer.start('validation');
await validateIssuance(formData);
perfTimer.end('validation'); // Logs: ⏱️ validation: 45.23ms
```

### Test Scenarios
```typescript
import { createTestScenarios } from '@/features/issuance/utils/developmentUtils';

const scenarios = createTestScenarios();
// Use scenarios.standardEmployee, scenarios.founderEquity, etc.
```

## 📝 Adding New Steps

Follow this pattern to add new steps:

### 1. Create Step Component
```typescript
// components/steps/NewStep.tsx
import React from 'react';
import { useIssuanceWizard } from '../../context/IssuanceWizardContext';

export const NewStep: React.FC = () => {
  const { state, updateFormData } = useIssuanceWizard();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">New Step Title</h3>
        <p className="text-sm text-gray-500">Step description</p>
      </div>
      
      {/* Step content */}
    </div>
  );
};
```

### 2. Update Step Configuration
```typescript
// types/issuance.types.ts
export const ISSUANCE_STEPS: IIssuanceStep[] = [
  // ... existing steps
  {
    id: 'new-step',
    title: 'New Step',
    description: 'Configure new functionality',
    completed: false,
    current: false
  }
];
```

### 3. Add to Main Wizard
```typescript
// components/SecuritiesIssuanceWizardRefactored.tsx
const renderCurrentStep = () => {
  switch (currentStepIndex) {
    // ... existing cases
    case 6:
      return <NewStep />;
    default:
      return <div>Unknown step</div>;
  }
};
```

### 4. Write Tests
```typescript
// __tests__/steps/NewStep.test.tsx
describe('NewStep', () => {
  it('should render step content', () => {
    renderWithProviders(<NewStep />);
    expect(screen.getByText('New Step Title')).toBeInTheDocument();
  });
});
```

## 🔄 State Management Patterns

### Context Usage
```typescript
// Use the wizard context in any step component
const { 
  state,           // Current wizard state
  updateFormData,  // Update form fields
  validateForm,    // Trigger validation
  generatePreview, // Generate issuance preview
  nextStep,        // Navigate to next step
  prevStep         // Navigate to previous step
} = useIssuanceWizard();
```

### Form Updates
```typescript
// Update single field
updateFormData({ quantity: 1000 });

// Update multiple fields
updateFormData({
  quantity: 1000,
  strikePrice: '100',
  grantDate: '2024-01-01'
});
```

### Validation Patterns
```typescript
// Trigger validation
await validateForm();

// Check validation result
if (state.validation?.isValid) {
  // Proceed with action
}

// Handle validation errors
state.validation?.errors.forEach(error => {
  console.error(error);
});
```

## 🚨 Error Handling

### Service Errors
```typescript
try {
  await issuanceService.issueSecurity(companyId, formData, csrfToken);
} catch (error) {
  // Error handling is built into the context
  // Errors are automatically captured and displayed
}
```

### Validation Errors
```typescript
// Validation errors are automatically collected and displayed
const validation = await validateIssuance(formData);
if (!validation.isValid) {
  // Errors are shown in the UI automatically
  // Individual steps can access validation.errors
}
```

### Compliance Errors
```typescript
// 409A compliance errors are integrated into validation
if (!validation.complianceCheck?.fmvCompliant) {
  // UI automatically shows compliance issues
  // Recommended actions are provided
}
```

## 🎨 UI/UX Patterns

### Consistent Styling
- Use Tailwind CSS classes consistently
- Follow the established spacing patterns (`space-y-6` for sections)
- Use semantic colors (green for success, red for errors, yellow for warnings)

### Form Patterns
```typescript
// Standard form field structure
<div>
  <label htmlFor="fieldId" className="block text-sm font-medium text-gray-700">
    Field Label
  </label>
  <input
    type="text"
    id="fieldId"
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    value={formData.fieldName}
    onChange={(e) => updateFormData({ fieldName: e.target.value })}
  />
  <p className="mt-1 text-sm text-gray-500">
    Helpful description or hint
  </p>
</div>
```

### Information Cards
```typescript
// Informational content pattern
<div className="bg-blue-50 rounded-lg p-4">
  <div className="flex">
    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
    <div className="ml-3">
      <h4 className="text-sm font-medium text-blue-800">
        Information Title
      </h4>
      <p className="mt-1 text-sm text-blue-700">
        Information content
      </p>
    </div>
  </div>
</div>
```

## 🔍 Debugging Tips

### Enable Development Logging
```typescript
// Development utilities automatically log in development mode
// Check browser console for detailed step-by-step information
```

### Common Issues

1. **Context Not Found**: Ensure component is wrapped in `IssuanceWizardProvider`
2. **Validation Not Running**: Check that required fields are filled
3. **Navigation Disabled**: Verify `canProceed` logic for current step
4. **API Errors**: Check network tab and service mock configurations

### Browser DevTools
- **React DevTools**: Inspect wizard state and context values
- **Network Tab**: Monitor API calls to services
- **Console**: View development logs and error messages

## 📊 Performance Considerations

### Lazy Loading
```typescript
// Components are already split for better code splitting
const StakeholderSelectionStep = React.lazy(() => import('./steps/StakeholderSelectionStep'));
```

### Memoization
```typescript
// Use React.memo for expensive components
export const ExpensiveStep = React.memo<IProps>(({ prop1, prop2 }) => {
  // Component implementation
});
```

### Query Optimization
```typescript
// Use React Query for caching and deduplication
const { data: stakeholders } = useQuery({
  queryKey: ['stakeholders', companyId],
  queryFn: () => issuanceService.getStakeholders(companyId),
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

## 🏆 Best Practices

1. **Keep Components Focused**: Each component should have a single responsibility
2. **Write Tests First**: Use TDD approach for new functionality
3. **Use TypeScript Strictly**: No `any` types, define proper interfaces
4. **Handle Loading States**: Always show appropriate loading indicators
5. **Provide User Feedback**: Clear error messages and success confirmations
6. **Follow Accessibility**: Proper ARIA labels, keyboard navigation
7. **Document Complex Logic**: Add comments for business rules and calculations

## 📚 Additional Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

This architecture provides a solid foundation for building maintainable, testable, and scalable securities issuance functionality.