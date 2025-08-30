# 🧙‍♂️ Wizard Pattern - Reusable Multi-Step Form Architecture

This pattern was developed for the Securities Issuance feature and can be reused for any multi-step workflow.

## 📋 Pattern Overview

The Wizard Pattern provides a standardized way to build complex, multi-step forms with:
- ✅ Centralized state management
- ✅ Step navigation and validation
- ✅ Progress tracking
- ✅ Error handling
- ✅ Testing infrastructure

## 🏗️ Architecture Components

### 1. Context Provider Pattern
```typescript
// context/YourWizardContext.tsx
interface IYourWizardState {
  currentStepIndex: number;
  steps: IYourStep[];
  formData: IYourFormData;
  validation: IYourValidation | null;
  loading: boolean;
}

type YourWizardAction = 
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<IYourFormData> }
  | { type: 'SET_VALIDATION'; payload: IYourValidation | null };

export const YourWizardProvider: React.FC<Props> = ({ children, ...props }) => {
  const [state, dispatch] = useReducer(yourWizardReducer, initialState);
  
  // Actions
  const goToStep = (stepIndex: number) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: stepIndex });
  };
  
  const updateFormData = (updates: Partial<IYourFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: updates });
  };
  
  return (
    <YourWizardContext.Provider value={{ state, goToStep, updateFormData, ... }}>
      {children}
    </YourWizardContext.Provider>
  );
};
```

### 2. Step Component Pattern
```typescript
// components/steps/YourStep.tsx
export const YourStep: React.FC = () => {
  const { state, updateFormData } = useYourWizard();
  const { formData, loading } = state;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Step Title</h3>
        <p className="text-sm text-gray-500">Step description</p>
      </div>
      
      {/* Step-specific content */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Field Label
        </label>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={formData.fieldName}
          onChange={(e) => updateFormData({ fieldName: e.target.value })}
        />
      </div>
    </div>
  );
};
```

### 3. Main Wizard Component Pattern
```typescript
// components/YourWizardRefactored.tsx
const WizardContent: React.FC<Props> = ({ onComplete, onCancel }) => {
  const { state, goToStep, nextStep, prevStep, canProceed } = useYourWizard();

  const renderCurrentStep = () => {
    switch (state.currentStepIndex) {
      case 0: return <StepOne />;
      case 1: return <StepTwo />;
      case 2: return <StepThree />;
      default: return <div>Unknown step</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <StepIndicator steps={state.steps} onStepClick={goToStep} />
      
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {renderCurrentStep()}
        </div>
        
        <WizardNavigation
          currentStepIndex={state.currentStepIndex}
          totalSteps={state.steps.length}
          canProceed={canProceed}
          onPrevious={prevStep}
          onNext={nextStep}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};

export const YourWizardRefactored: React.FC<Props> = (props) => (
  <YourWizardProvider {...props}>
    <WizardContent {...props} />
  </YourWizardProvider>
);
```

## 📁 Folder Structure Template

```
src/features/your-feature/
├── components/
│   ├── YourWizardRefactored.tsx          # Main orchestrator
│   ├── steps/                            # Individual step components
│   │   ├── StepOne.tsx
│   │   ├── StepTwo.tsx
│   │   └── index.ts
│   └── shared/                           # Reusable components
│       ├── StepIndicator.tsx             # Copy from issuance
│       └── WizardNavigation.tsx          # Copy from issuance
├── context/
│   └── YourWizardContext.tsx             # State management
├── services/
│   └── yourService.ts                    # Business logic
├── types/
│   └── your-types.ts                     # TypeScript definitions
├── utils/
│   └── developmentUtils.ts               # Development utilities
└── __tests__/                            # Test suite
    ├── test-utils.tsx                    # Testing utilities
    ├── steps/                            # Step component tests
    └── integration/                      # Full workflow tests
```

## 🎯 Step Implementation Checklist

For each new step component:

### ✅ Component Structure
- [ ] Import `useYourWizard()` hook
- [ ] Handle loading state
- [ ] Use consistent styling (`space-y-6`, etc.)
- [ ] Include proper heading structure
- [ ] Add form labels and accessibility attributes

### ✅ Form Handling
- [ ] Use `updateFormData()` for all form updates
- [ ] Implement proper validation
- [ ] Handle edge cases gracefully
- [ ] Provide user feedback for errors

### ✅ Testing
- [ ] Unit tests for component behavior
- [ ] Accessibility testing
- [ ] Edge case testing
- [ ] Mock data factories

## 🧪 Testing Pattern

### Test Utilities Template
```typescript
// __tests__/test-utils.tsx
export const createMockYourData = (overrides = {}) => ({
  // Default test data
  field1: 'default value',
  field2: 123,
  ...overrides
});

export const createMockYourService = () => ({
  validateYourData: jest.fn().mockResolvedValue({ isValid: true }),
  processYourData: jest.fn().mockResolvedValue({ success: true }),
  // ... other service methods
});

export const renderWithYourProvider = (ui: React.ReactElement, options = {}) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <YourWizardProvider {...options}>
        {children}
      </YourWizardProvider>
    </QueryClientProvider>
  );
  
  return render(ui, { wrapper: Wrapper });
};
```

### Step Test Template
```typescript
// __tests__/steps/YourStep.test.tsx
describe('YourStep', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('should render step content', async () => {
    renderWithYourProvider(<YourStep />);
    
    await waitFor(() => {
      expect(screen.getByText('Step Title')).toBeInTheDocument();
    });
  });

  it('should handle form input', async () => {
    renderWithYourProvider(<YourStep />);
    
    const input = screen.getByLabelText('Field Label');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(input).toHaveValue('test value');
  });

  it('should validate input', async () => {
    // Test validation logic
  });
});
```

## 🔄 State Management Patterns

### Form Data Updates
```typescript
// Single field update
updateFormData({ fieldName: newValue });

// Multiple fields update
updateFormData({
  field1: value1,
  field2: value2,
  field3: value3
});

// Conditional updates
if (someCondition) {
  updateFormData({ conditionalField: calculatedValue });
}
```

### Step Navigation
```typescript
// Programmatic navigation
goToStep(2); // Go to specific step

// Sequential navigation
nextStep();  // Go to next step
prevStep();  // Go to previous step

// Conditional navigation
if (canProceed) {
  nextStep();
} else {
  showValidationErrors();
}
```

### Validation Integration
```typescript
// In your wizard context
const validateCurrentStep = async () => {
  const validation = await yourService.validateStep(state.currentStepIndex, state.formData);
  dispatch({ type: 'SET_VALIDATION', payload: validation });
  return validation.isValid;
};

// In step components
useEffect(() => {
  validateCurrentStep();
}, [formData.criticalField]);
```

## 🎨 UI/UX Patterns

### Information Cards
```typescript
// Success card
<div className="bg-green-50 rounded-lg p-4">
  <div className="flex">
    <CheckCircleIcon className="h-5 w-5 text-green-400" />
    <div className="ml-3">
      <h4 className="text-sm font-medium text-green-800">Success Title</h4>
      <p className="mt-1 text-sm text-green-700">Success message</p>
    </div>
  </div>
</div>

// Warning card
<div className="bg-yellow-50 rounded-lg p-4">
  <div className="flex">
    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
    <div className="ml-3">
      <h4 className="text-sm font-medium text-yellow-800">Warning Title</h4>
      <p className="mt-1 text-sm text-yellow-700">Warning message</p>
    </div>
  </div>
</div>

// Error card
<div className="bg-red-50 rounded-lg p-4">
  <div className="flex">
    <XCircleIcon className="h-5 w-5 text-red-400" />
    <div className="ml-3">
      <h4 className="text-sm font-medium text-red-800">Error Title</h4>
      <p className="mt-1 text-sm text-red-700">Error message</p>
    </div>
  </div>
</div>
```

### Form Fields
```typescript
// Text input with validation
<div>
  <label htmlFor="field" className="block text-sm font-medium text-gray-700">
    Field Label {required && <span className="text-red-500">*</span>}
  </label>
  <input
    type="text"
    id="field"
    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
      hasError 
        ? 'border-red-300 focus:border-red-500' 
        : 'border-gray-300 focus:border-blue-500'
    }`}
    value={value}
    onChange={onChange}
    placeholder="Enter value..."
  />
  {hasError && (
    <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
  )}
  {helpText && (
    <p className="mt-1 text-sm text-gray-500">{helpText}</p>
  )}
</div>

// Select dropdown
<div>
  <label htmlFor="select" className="block text-sm font-medium text-gray-700">
    Select Label
  </label>
  <select
    id="select"
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    value={selectedValue}
    onChange={onChange}
  >
    <option value="">Select an option</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
</div>
```

## 🚀 Usage Examples

### Document Generation Wizard
```typescript
// For generating legal documents with multiple steps
export const DocumentGenerationWizard = () => (
  <DocumentWizardProvider>
    <WizardContent>
      {/* Steps: Template Selection → Content Input → Review → Generate */}
    </WizardContent>
  </DocumentWizardProvider>
);
```

### User Onboarding Wizard
```typescript
// For complex user onboarding flows
export const UserOnboardingWizard = () => (
  <OnboardingWizardProvider>
    <WizardContent>
      {/* Steps: Welcome → Profile → Preferences → Verification → Complete */}
    </WizardContent>
  </OnboardingWizardProvider>
);
```

### Data Migration Wizard
```typescript
// For migrating data between systems
export const DataMigrationWizard = () => (
  <MigrationWizardProvider>
    <WizardContent>
      {/* Steps: Source Selection → Mapping → Validation → Migration → Results */}
    </WizardContent>
  </MigrationWizardProvider>
);
```

## 📊 Benefits of This Pattern

1. **Consistency**: All wizards follow the same structure
2. **Reusability**: Share components between different wizards
3. **Testability**: Standardized testing approach
4. **Maintainability**: Clear separation of concerns
5. **Scalability**: Easy to add new steps or features
6. **Developer Experience**: Clear patterns to follow
7. **User Experience**: Consistent navigation and feedback

## 🔧 Customization Points

- **Step Validation Logic**: Custom validation per step
- **Navigation Rules**: Control when users can proceed
- **Progress Tracking**: Different progress indicators
- **State Persistence**: Save/restore wizard state
- **Error Handling**: Custom error display and recovery
- **Accessibility**: Custom ARIA labels and keyboard navigation

This pattern provides a solid foundation for any multi-step workflow while maintaining consistency and quality across the application.