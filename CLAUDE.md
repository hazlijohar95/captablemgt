# Cap Table Management Platform - Development Guide

## Project Overview
Building a professional cap table management platform comparable to CakeEquity.com. This platform will handle equity management, ownership tracking, vesting schedules, and related financial calculations for startups and growing companies.

## Tech Stack
- **Frontend Framework**: React 18+ with TypeScript 5+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Data Fetching**: React Query (TanStack Query)
- **State Management**: Zustand with immutable updates
- **Testing**: 
  - Unit/Integration: Vitest + React Testing Library
  - Golden Tests: For all financial calculators
- **Development API**: JSON Server or local Express server for mock endpoints

## Code Conventions

### File Structure
```
src/
├── components/      # Reusable UI components
│   └── [ComponentName]/
│       ├── index.tsx
│       ├── [ComponentName].tsx
│       ├── [ComponentName].test.tsx
│       └── types.ts
├── features/        # Feature-based modules
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── stores/
│       └── types/
├── hooks/          # Global custom hooks
├── services/       # API services and external integrations
├── stores/         # Global Zustand stores
├── types/          # Global TypeScript types
├── utils/          # Utility functions and helpers
└── constants/      # App-wide constants
```

### Naming Conventions
- **Components**: PascalCase (e.g., `CapTable`, `ShareholderList`)
- **Files**: 
  - Components: PascalCase (e.g., `CapTable.tsx`)
  - Hooks: camelCase with 'use' prefix (e.g., `useCapTable.ts`)
  - Utils/Services: camelCase (e.g., `calculateDilution.ts`)
  - Types: PascalCase (e.g., `Shareholder.ts`)
- **Variables/Functions**: camelCase (e.g., `calculateOwnership`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_VESTING_PERIOD`)
- **Interfaces/Types**: PascalCase with 'I' prefix for interfaces (e.g., `IShareholder`)
- **Enums**: PascalCase with singular names (e.g., `ShareClass`)

### TypeScript Standards
- Strict mode enabled
- No `any` types without explicit justification
- Prefer interfaces over type aliases for object shapes
- Use discriminated unions for state management
- All exported functions must have explicit return types

### Component Guidelines
```typescript
// Component template
interface IComponentNameProps {
  // Props definition
}

export const ComponentName: React.FC<IComponentNameProps> = ({ prop1, prop2 }) => {
  // Component logic
  return <div>...</div>;
};
```

### State Management (Zustand)
- One store per feature/domain
- Use immer for immutable updates
- Implement selectors for performance
- Type all store states and actions

### Testing Requirements
- **Coverage Target**: Minimum 80% for business logic, 100% for financial calculations
- **Test Files**: Co-located with components (`ComponentName.test.tsx`)
- **Test Structure**:
  ```typescript
  describe('ComponentName', () => {
    describe('when condition', () => {
      it('should expected behavior', () => {
        // Test implementation
      });
    });
  });
  ```
- **Golden Tests**: All financial calculations must have golden test files
- **Mock Data**: Centralized in `__mocks__/` directory

## Development Workflow

### Pre-commit Checklist
1. Run type checking: `npm run typecheck`
2. Run linting: `npm run lint`
3. Run tests: `npm run test`
4. Run build: `npm run build`

### Available Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint         # Lint all files
npm run lint:fix     # Auto-fix linting issues
npm run typecheck    # TypeScript type checking
npm run format       # Format code with Prettier
```

## Financial Calculation Standards
- All monetary values in cents (integers) to avoid floating-point errors
- Use `Decimal.js` or similar for precision calculations
- Document all formulas with comments including source/standard
- Implement validation for all inputs
- Include edge case handling (division by zero, negative values, etc.)

## API Design Patterns
- RESTful endpoints following standard conventions
- Consistent error response format
- Pagination for list endpoints
- Versioning strategy (e.g., `/api/v1/`)
- Request/response type definitions shared between frontend and mock server

## Security Considerations
- No sensitive data in frontend code
- Input validation on all forms
- XSS protection via React's built-in escaping
- Secure storage for auth tokens (httpOnly cookies preferred)
- Rate limiting on API endpoints

## Performance Guidelines
- Lazy load route components
- Implement virtual scrolling for large lists
- Use React.memo for expensive components
- Optimize bundle size with code splitting
- Image optimization and lazy loading

## AI Assistant Instructions

### For Claude/AI Assistants:
1. **Always confirm before large changes**: For any feature that affects multiple files or introduces new dependencies, explain the implementation plan and ask for confirmation.

2. **Testing is non-negotiable**: 
   - Write tests for every new feature
   - Ensure all tests pass before marking task complete
   - Include edge cases and error scenarios
   - Golden tests for any financial calculations

3. **Code quality standards**:
   - Run `npm run typecheck` after TypeScript changes
   - Run `npm run lint` and fix all issues
   - No `any` types unless absolutely necessary
   - Clean, readable code with meaningful variable names

4. **Scale considerations**:
   - Think about performance implications
   - Consider data volume (1000+ shareholders)
   - Plan for concurrent users
   - Implement proper loading states and error handling

5. **Communication**:
   - Break down large tasks into smaller, manageable pieces
   - Provide progress updates for long-running tasks
   - Ask clarifying questions when requirements are ambiguous
   - Suggest alternatives when encountering blockers

6. **Feature implementation process**:
   - Review requirements thoroughly
   - Create implementation plan
   - Write tests first (TDD when applicable)
   - Implement feature
   - Verify tests pass
   - Run linting and type checking
   - Document complex logic

7. **Cap Table Specific Considerations**:
   - Precision is critical for equity calculations
   - Maintain audit trail for all changes
   - Consider regulatory compliance (409A, etc.)
   - Handle multiple share classes and conversion scenarios
   - Support various vesting schedules

## Domain Knowledge

### Key Cap Table Concepts:
- **Shareholders**: Individuals or entities owning shares
- **Share Classes**: Common, Preferred (Series A, B, etc.)
- **Vesting**: Time-based or milestone-based equity earning
- **Dilution**: Ownership percentage change due to new shares
- **Options Pool**: Reserved shares for employee compensation
- **Conversion**: Preferred to common share conversion
- **Liquidation Preferences**: Payout order and multiples
- **Pro-rata Rights**: Rights to maintain ownership percentage
- **409A Valuation**: Fair market value for tax purposes

### Critical Calculations:
- Fully diluted ownership
- Post-money valuation
- Option strike prices
- Vesting schedules
- Waterfall analysis
- Dilution modeling

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment variables: Copy `.env.example` to `.env.local`
3. Start mock API server: `npm run mock-api`
4. Start development server: `npm run dev`
5. Run tests: `npm run test`

## Additional Resources
- [CakeEquity](https://cakeequity.com) - Reference implementation
- [Carta](https://carta.com) - Industry standard features
- [YC Safe Documents](https://www.ycombinator.com/documents) - Standard investment documents
- [409A Valuation Guide](https://carta.com/blog/409a-valuation/) - Compliance requirements

---

**Remember**: Always prioritize accuracy in financial calculations, maintain clean code, and ensure comprehensive test coverage. When in doubt, ask for clarification rather than making assumptions about equity management requirements.