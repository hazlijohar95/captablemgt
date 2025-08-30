# Development Setup Guide

Complete guide for setting up the Cap Table Management Platform development environment.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm 8+
- **PostgreSQL** 12+ or Supabase account
- **Git** for version control

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/captable.git
   cd captable
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**
   ```bash
   # For Supabase setup, see SUPABASE_SETUP.md
   # For local PostgreSQL:
   createdb captable_dev
   npm run db:migrate
   npm run db:seed
   ```

5. **Verify Setup**
   ```bash
   npm run test           # Should pass all tests
   npm run typecheck      # Should have no TypeScript errors
   npm run dev            # Start development server
   ```

## 🔧 Development Commands

### Core Development
```bash
npm run dev              # Start development server (hot reload)
npm run build            # Production build
npm run preview          # Preview production build locally
```

### Code Quality
```bash
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code quality check
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
```

### Database Operations
```bash
npm run db:generate      # Generate TypeScript types from schema
npm run db:reset         # Reset database (development only)
npm run db:seed          # Load sample data
```

## 📁 Project Structure

### Core Directories
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, etc.)
│   ├── forms/          # Form components with validation
│   ├── layout/         # Layout and navigation components
│   └── errors/         # Error handling components
├── features/           # Feature-based modules
│   ├── auth/           # Authentication system
│   ├── cap-table/      # Core cap table functionality
│   ├── instruments/    # Securities management
│   ├── scenarios/      # Scenario modeling
│   ├── waterfall/      # Exit analysis
│   ├── compliance/     # 409A and regulatory features
│   ├── reports/        # Reporting and exports
│   └── dashboard/      # Main dashboard
├── services/           # API clients and external services
├── stores/             # Global state management (Zustand)
├── hooks/              # Shared React hooks
├── utils/              # Utility functions and helpers
├── types/              # Global TypeScript definitions
└── constants/          # Application constants
```

### Feature Module Structure
```
src/features/[feature-name]/
├── components/         # Feature-specific UI components
├── hooks/             # Feature-specific React hooks
├── services/          # Business logic and API calls
├── stores/            # Feature-specific state management
├── types/             # Feature-specific TypeScript types
├── utils/             # Feature-specific utilities
└── __tests__/         # Feature-specific tests
```

## 🏗️ Architecture Guidelines

### Component Design
```typescript
// Component structure template
interface ComponentProps {
  // Props with explicit types
  data: DataType;
  onAction: (id: string) => void;
  className?: string;
}

export const Component: React.FC<ComponentProps> = React.memo(({
  data,
  onAction,
  className = ''
}) => {
  // Use hooks for state and effects
  const [localState, setLocalState] = useState<StateType>(initialState);
  
  // Memoize expensive calculations
  const processedData = useMemo(() => 
    processData(data), 
    [data]
  );
  
  // Callback handlers
  const handleAction = useCallback((id: string) => {
    onAction(id);
  }, [onAction]);
  
  return (
    <div className={`component-styles ${className}`}>
      {/* Component JSX */}
    </div>
  );
});

Component.displayName = 'Component';
```

### Service Layer Pattern
```typescript
// Service interface
interface ServiceInterface {
  fetch(params: Params): Promise<Result>;
  create(data: CreateData): Promise<Entity>;
  update(id: string, data: UpdateData): Promise<Entity>;
  delete(id: string): Promise<void>;
}

// Service implementation
class ServiceImplementation implements ServiceInterface {
  constructor(private client: SupabaseClient) {}
  
  async fetch(params: Params): Promise<Result> {
    const { data, error } = await this.client
      .from('table')
      .select('*')
      .eq('company_id', params.companyId);
    
    if (error) throw new ServiceError('Failed to fetch data');
    return data;
  }
}
```

### State Management with Zustand
```typescript
interface StoreState {
  data: DataType[];
  loading: boolean;
  error: string | null;
}

interface StoreActions {
  fetchData: () => Promise<void>;
  updateData: (id: string, updates: Partial<DataType>) => void;
  reset: () => void;
}

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  // Initial state
  data: [],
  loading: false,
  error: null,
  
  // Actions
  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await dataService.fetch();
      set({ data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  updateData: (id, updates) => {
    set(state => ({
      data: state.data.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  },
  
  reset: () => set({ data: [], loading: false, error: null })
}));
```

## 🧪 Testing Guidelines

### Test Structure
```typescript
describe('ComponentName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Test setup
  });

  afterEach(() => {
    // Cleanup
  });

  // Group related tests
  describe('when condition is true', () => {
    it('should perform expected behavior', async () => {
      // Arrange
      const props = { /* test props */ };
      
      // Act
      render(<ComponentName {...props} />);
      
      // Assert
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });

  // Test user interactions
  describe('user interactions', () => {
    it('should handle button clicks', async () => {
      const mockHandler = vi.fn();
      const user = userEvent.setup();
      
      render(<ComponentName onAction={mockHandler} />);
      
      await user.click(screen.getByRole('button', { name: 'Action' }));
      
      expect(mockHandler).toHaveBeenCalledWith('expected-param');
    });
  });
});
```

### Financial Calculation Tests
```typescript
describe('calculateWaterfall', () => {
  // Golden tests - must match exact values
  it('should match reference calculation for Series A scenario', () => {
    const exitValue = '50000000'; // $500K in cents
    const preferences = testPreferences;
    
    const result = calculateWaterfall(exitValue, preferences);
    
    // Exact matches required for financial calculations
    expect(result.commonDistribution).toBe('15000000');
    expect(result.preferredDistribution).toBe('35000000');
  });
  
  // Edge cases
  it('should handle zero exit value', () => {
    const result = calculateWaterfall('0', testPreferences);
    expect(result.commonDistribution).toBe('0');
  });
});
```

## 🔍 Debugging and Monitoring

### Logging System
```typescript
import { logger } from '@/utils/logger';

// Set operation context
logger.setContext({ 
  feature: 'cap-table',
  companyId: user.companyId,
  userId: user.id 
});

// Log different levels
logger.debug('Debug information', { data });
logger.info('Operation completed', { result });
logger.warn('Warning condition', { details });
logger.error('Operation failed', error, { context });

// Performance logging
const startTime = performance.now();
// ... operation
logger.info('Operation performance', { 
  duration: performance.now() - startTime 
});
```

### Error Tracking
```typescript
import { errorTracker } from '@/utils/errorTracking';

try {
  await riskyOperation();
} catch (error) {
  // Capture with context
  errorTracker.captureException(error, {
    tags: { feature: 'cap-table' },
    extra: { operationData }
  });
  
  // Re-throw or handle gracefully
  throw error;
}
```

### Performance Monitoring
```typescript
// Monitor component render performance
const ComponentWithMonitoring = React.memo((props) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 100) { // Log slow renders
        logger.warn('Slow render detected', { 
          component: 'ComponentName',
          renderTime 
        });
      }
    };
  });
  
  return <ActualComponent {...props} />;
});
```

## 🔧 Development Workflow

### Feature Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature-name
   ```

2. **Implement Feature**
   - Start with types and interfaces
   - Build service layer with tests
   - Create UI components with tests
   - Add integration tests

3. **Quality Checks**
   ```bash
   npm run typecheck     # Must pass
   npm run test          # Must pass with good coverage
   npm run lint          # Must pass or auto-fix
   ```

4. **Documentation**
   - Update relevant documentation
   - Add code comments for complex logic
   - Create or update API documentation

5. **Create Pull Request**
   - Clear description of changes
   - Link to related issues
   - Include test coverage information

### Code Review Guidelines

**What Reviewers Look For:**
- TypeScript type safety
- Test coverage (especially for financial calculations)
- Performance considerations
- Security implications
- Accessibility compliance
- Code clarity and documentation

### Deployment Process

1. **Development Environment**
   ```bash
   npm run dev          # Local development
   npm run test         # Continuous testing
   ```

2. **Staging Environment**
   ```bash
   npm run build        # Production build
   npm run preview      # Local preview
   ```

3. **Production Deployment**
   - Automated through CI/CD
   - Database migrations run first
   - Health checks verify deployment

## 📚 Additional Resources

### Documentation
- **[API Reference](../api-reference.md)** - Complete API documentation
- **[Financial Calculations](../financial-calculations.md)** - Mathematical models
- **[Architecture Guide](../architecture/)** - System architecture docs
- **[Testing Standards](../testing-workflow.md)** - Testing guidelines

### External Tools
- **Supabase Dashboard** - Database management and monitoring
- **Error Tracking** - Application error monitoring
- **Performance Monitoring** - Application performance insights

### Community
- **GitHub Discussions** - Feature discussions and questions
- **Issues** - Bug reports and feature requests
- **Contributing Guide** - How to contribute to the project

---

For additional development questions or issues, please refer to the community discussions or create an issue in the repository.