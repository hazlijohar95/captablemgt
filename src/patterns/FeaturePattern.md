# 🏗️ Feature Pattern - Scalable Feature Architecture

This pattern establishes the standard structure for building maintainable, testable features in the Cap Table platform.

## 📁 Standard Feature Structure

```
src/features/your-feature/
├── components/                   # UI Components
│   ├── YourMainComponent.tsx     # Primary component
│   ├── steps/                    # Multi-step components (if applicable)
│   │   ├── StepOne.tsx
│   │   ├── StepTwo.tsx
│   │   └── index.ts
│   ├── shared/                   # Reusable components within feature
│   │   ├── YourSharedComponent.tsx
│   │   └── index.ts
│   └── index.ts                  # Feature component exports
├── context/                      # State management (if complex)
│   ├── YourFeatureContext.tsx
│   └── index.ts
├── hooks/                        # Custom React hooks
│   ├── useYourFeature.ts
│   ├── useYourFeatureData.ts
│   └── index.ts
├── services/                     # Business logic and API calls
│   ├── yourFeatureService.ts
│   ├── yourFeatureValidation.ts  # Validation logic
│   └── index.ts
├── types/                        # TypeScript definitions
│   ├── your-feature.types.ts
│   └── index.ts
├── utils/                        # Utilities and helpers
│   ├── calculations.ts           # Business calculations
│   ├── formatters.ts             # Data formatting
│   ├── validators.ts             # Client-side validation
│   ├── developmentUtils.ts       # Development utilities
│   └── index.ts
├── __tests__/                    # Comprehensive test suite
│   ├── test-utils.tsx            # Testing utilities and mocks
│   ├── components/               # Component tests
│   ├── services/                 # Service tests
│   ├── integration/              # Full workflow tests
│   └── __mocks__/                # Mock data and services
└── docs/                         # Feature documentation
    ├── README.md                 # Feature overview
    ├── DEVELOPMENT.md            # Developer guide
    └── API.md                    # API documentation
```

## 🎯 Component Architecture Guidelines

### 1. **Component Size Limits**
- **Individual Components**: Maximum 300 lines
- **Step Components**: Maximum 200 lines  
- **Shared Components**: Maximum 150 lines
- **Main Orchestrator**: Maximum 200 lines

### 2. **Single Responsibility Principle**
```typescript
// ❌ Bad: Component doing too many things
const MassiveComponent = () => {
  // Data fetching
  // Form validation  
  // UI rendering
  // Business logic
  // Error handling
  // 500+ lines of mixed concerns
};

// ✅ Good: Focused components
const DataFetcher = () => { /* Only data fetching */ };
const FormValidator = () => { /* Only validation */ };
const UIRenderer = () => { /* Only UI rendering */ };
```

### 3. **State Management Strategy**
```typescript
// Simple features: useState
const [simpleState, setSimpleState] = useState(initialValue);

// Complex features: Context + useReducer
const YourFeatureProvider = ({ children }) => {
  const [state, dispatch] = useReducer(yourReducer, initialState);
  return <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>;
};

// Global features: Zustand store
const useYourFeatureStore = create((set) => ({
  data: [],
  loading: false,
  updateData: (data) => set({ data }),
  setLoading: (loading) => set({ loading })
}));
```

## 🧪 Testing Architecture

### 1. **Test Organization**
```
__tests__/
├── test-utils.tsx                # Shared testing utilities
├── components/                   # Component unit tests
│   ├── YourComponent.test.tsx
│   └── steps/
│       ├── StepOne.test.tsx
│       └── StepTwo.test.tsx
├── services/                     # Service tests
│   ├── yourService.test.ts
│   └── validation.test.ts
├── integration/                  # Full workflow tests
│   └── YourFeature.integration.test.tsx
└── __mocks__/                    # Mock data
    ├── mockData.ts
    └── mockServices.ts
```

### 2. **Testing Utilities Pattern**
```typescript
// __tests__/test-utils.tsx
export const createMockYourData = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Name',
  value: 123,
  ...overrides
});

export const createMockYourService = () => ({
  getData: jest.fn().mockResolvedValue([]),
  validateData: jest.fn().mockResolvedValue({ isValid: true }),
  processData: jest.fn().mockResolvedValue({ success: true })
});

export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const queryClient = new QueryClient({ /* test config */ });
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <YourFeatureProvider {...options}>
        {children}
      </YourFeatureProvider>
    </QueryClientProvider>
  );
  
  return render(ui, { wrapper: Wrapper });
};
```

### 3. **Test Coverage Requirements**
- **Component Tests**: 90%+ coverage
- **Service Tests**: 100% coverage (business logic)
- **Integration Tests**: All major workflows
- **Edge Cases**: Error scenarios, empty states, loading states

## 🔧 Service Architecture

### 1. **Service Responsibility Separation**
```typescript
// ❌ Bad: One service doing everything
class MassiveService {
  async getData() { /* 100 lines */ }
  async validateData() { /* 100 lines */ }
  async processData() { /* 100 lines */ }
  async generateReport() { /* 100 lines */ }
  async handleErrors() { /* 100 lines */ }
}

// ✅ Good: Focused services
class YourDataService {
  async getData() { /* 50 lines max */ }
  async updateData() { /* 50 lines max */ }
}

class YourValidationService {
  async validateData() { /* 50 lines max */ }
  async getValidationRules() { /* 30 lines max */ }
}

class YourProcessingService {
  async processData() { /* 50 lines max */ }
  async handleResults() { /* 30 lines max */ }
}
```

### 2. **Error Handling Pattern**
```typescript
// Consistent error handling across services
export interface IServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

class YourService {
  async yourMethod(): Promise<IServiceResult<YourData>> {
    try {
      const data = await this.processData();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
```

## 📝 TypeScript Patterns

### 1. **Interface Naming**
```typescript
// Use 'I' prefix for interfaces
export interface IYourData {
  id: string;
  name: string;
}

// Use descriptive names for form data
export interface IYourFeatureForm {
  field1: string;
  field2: number;
  field3?: boolean;
}

// Use specific result types
export interface IYourFeatureResult {
  success: boolean;
  data?: IYourData;
  error?: string;
}
```

### 2. **Enum Usage**
```typescript
// Use enums for fixed sets of values
export enum YourFeatureStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Use string literal unions for smaller sets
export type YourFeatureMode = 'create' | 'edit' | 'view';
```

### 3. **Generic Patterns**
```typescript
// Reusable generic interfaces
export interface IWizardStep<T = any> {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  data?: T;
}

export interface IValidationResult<T = any> {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: T;
}
```

## 🔄 Integration Patterns

### 1. **Service Integration**
```typescript
// Services should depend on interfaces, not implementations
interface IAuthService {
  validateAccess(companyId: string): Promise<boolean>;
}

class YourService {
  constructor(private authService: IAuthService) {}
  
  async yourMethod(companyId: string) {
    await this.authService.validateAccess(companyId);
    // Implementation
  }
}
```

### 2. **Cross-Feature Communication**
```typescript
// Use events for loose coupling between features
export const featureEvents = {
  STAKEHOLDER_CREATED: 'stakeholder.created',
  SECURITY_ISSUED: 'security.issued',
  VALIDATION_UPDATED: 'validation.updated'
};

// Emit events
eventBus.emit(featureEvents.SECURITY_ISSUED, { securityId, stakeholderId });

// Listen for events
eventBus.on(featureEvents.STAKEHOLDER_CREATED, handleNewStakeholder);
```

## 🎯 Quality Checklist

Before considering a feature complete:

### ✅ Code Quality
- [ ] All components under size limits
- [ ] No code duplication
- [ ] Consistent naming conventions
- [ ] Proper TypeScript types (no `any`)
- [ ] ESLint passes without warnings

### ✅ Testing
- [ ] 90%+ component test coverage
- [ ] 100% service test coverage
- [ ] Integration tests for main workflows
- [ ] Edge case testing
- [ ] Accessibility testing

### ✅ Documentation
- [ ] Feature README with overview
- [ ] Development guide for contributors
- [ ] API documentation for services
- [ ] Inline code comments for complex logic

### ✅ Performance
- [ ] Components properly memoized
- [ ] Efficient re-rendering patterns
- [ ] Proper loading states
- [ ] Error boundaries implemented

### ✅ Accessibility
- [ ] Proper ARIA labels
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Color contrast compliance

### ✅ Security
- [ ] Input validation
- [ ] CSRF protection for mutations
- [ ] Authorization checks
- [ ] No sensitive data exposure

This pattern ensures every feature is built to the same high standard and follows consistent architectural principles.