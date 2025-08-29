# Cap Table Management Platform

A modern, secure, and deterministic cap table management system built with React, TypeScript, and financial-grade precision calculations.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up Supabase (see SUPABASE_SETUP.md for detailed instructions)
# - Create a Supabase project
# - Copy your project URL and anon key
# - Update .env.local with your credentials

# 3. Start development server
npm run dev

# 4. Run tests
npm run test

# 5. Run type checking
npm run typecheck

# 6. Build for production
npm run build
```

The application will be available at `http://localhost:3000/`

**⚠️ Important:** You must set up Supabase before the app will work. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for complete instructions.

## 📋 Project Status

### ✅ Completed Features

**Core Infrastructure:**
- ✅ React 19 + Vite + TypeScript setup
- ✅ Tailwind CSS v3 with ElevenLabs-inspired design system
- ✅ React Router v7 for navigation
- ✅ React Query for data fetching
- ✅ Zustand for state management
- ✅ Vitest + Testing Library for testing

**Backend & Authentication:**
- ✅ Supabase integration with typed client
- ✅ Complete authentication system (login/signup/logout)
- ✅ Protected routes with auth context
- ✅ Row Level Security (RLS) policies
- ✅ Database schema with all PRD entities
- ✅ Environment configuration ready

**Financial Calculators:**
- ✅ Time-based vesting calculator with cliff support
- ✅ Priced round solver (pool top-up, PPS, investor shares)
- ✅ SAFE conversion functions (post-money/pre-money)
- ✅ Golden test files with PRD-specified accuracy (±0.01%)
- ✅ Decimal.js for financial precision (no floating-point errors)

**🎯 NEW: Instruments Feature (Production Ready):**
- ✅ Complete securities management system
- ✅ Advanced filtering (type, status, stakeholder, date, search)
- ✅ Real-time statistics dashboard
- ✅ Professional UI with sortable table
- ✅ Cancel/reactivate securities with audit trail
- ✅ Comprehensive test suite (30 tests)
- ✅ Enterprise logging & error tracking systems

**Monitoring & Quality Assurance:**
- ✅ Structured logging system with 5 levels
- ✅ Global error tracking & monitoring
- ✅ Performance monitoring with timing
- ✅ Security audit trail
- ✅ Zero TypeScript errors (100% compliance)
- ✅ Comprehensive testing workflow

**Project Structure:**
- ✅ Domain-driven folder structure
- ✅ Comprehensive TypeScript types
- ✅ Component-based architecture
- ✅ Clean code standards with linting

**Documentation:**
- ✅ CLAUDE.md with development guidelines
- ✅ Comprehensive PRD implementation
- ✅ Golden test documentation
- ✅ Complete Supabase setup guide
- ✅ Database schema with sample data
- ✅ **NEW: Complete implementation documentation**
- ✅ **NEW: Testing workflow standards**
- ✅ **NEW: Quick reference guide**

### 🚧 Next Phase (Ready to Build)

**Business Logic & Features:**
- ⏳ Company CRUD operations
- ⏳ Stakeholder management
- ⏳ Share class management
- ⏳ Grant wizard and workflow
- ⏳ Cap table views (as-of dates)
- ⏳ Scenario modeling interface
- ⏳ Waterfall calculations
- ⏳ Reporting and export system
- ⏳ Audit trail UI
- ⏳ RBAC permission enforcement

**Data Integration:**
- ⏳ React Query hooks for Supabase
- ⏳ Real-time subscriptions
- ⏳ Data validation and error handling
- ⏳ Import/export functionality

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React 19, TypeScript 5+, Vite
- **Styling:** Tailwind CSS v3
- **Routing:** React Router v7
- **State Management:** Zustand
- **Data Fetching:** React Query (TanStack Query)
- **Testing:** Vitest, React Testing Library
- **Build Tool:** Vite
- **Package Manager:** npm

### Key Libraries
- **Decimal.js:** Financial calculations without floating-point errors
- **date-fns:** Date manipulation and formatting
- **ULID:** Unique identifiers
- **Heroicons:** UI icons
- **Immer:** Immutable state updates

### Folder Structure
```
src/
├── app/              # App-level configuration
├── components/       # Reusable UI components
├── features/         # Feature-based modules
│   ├── cap-table/    # Cap table calculations and views
│   │   ├── calc/     # Pure financial calculation functions
│   │   ├── api/      # API layer for cap table data
│   │   └── ui/       # Cap table UI components
│   ├── dashboard/    # Dashboard views
│   ├── grants/       # Grant management
│   ├── scenarios/    # Scenario modeling
│   └── waterfall/    # Waterfall calculations
├── services/         # External services and API clients
├── stores/           # Global Zustand stores
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── testdata/         # Golden test files and fixtures
```

## 🧮 Financial Calculations

### Vesting Calculator
- **Location:** `src/features/cap-table/calc/vesting.ts`
- **Features:** Time-based vesting with cliff periods
- **Precision:** Exact share calculations with rounding rules
- **Golden Tests:** 7 test cases covering various scenarios

### Round Solver
- **Location:** `src/features/cap-table/calc/round.ts`
- **Formula:** Solves pool top-up, price per share, and investor shares
- **Precision:** Uses Decimal.js for exact monetary calculations
- **Golden Test:** PRD example with 10M existing shares, $20M pre-money

### SAFE Conversion
- **Location:** `src/features/cap-table/calc/safe.ts`
- **Features:** Post-money and pre-money SAFE conversion
- **MFN Support:** Most Favored Nation clause handling
- **Precision:** Minimum of discount price and cap price

## 🧪 Testing

### Test Coverage
- **Unit Tests:** All calculation functions
- **Golden Tests:** Financial calculations match PRD examples
- **Integration Tests:** Component rendering and interactions
- **Type Safety:** 100% TypeScript coverage with strict mode

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Generate coverage report
npm run test:coverage
```

## 📝 Code Standards

### TypeScript
- Strict mode enabled
- No `any` types without justification
- Explicit return types for exported functions
- Comprehensive interface definitions

### Component Guidelines
```typescript
interface IComponentProps {
  // Props definition
}

export const Component: React.FC<IComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return <div>...</div>;
};
```

### Financial Calculations
- All monetary values as strings (Decimal.js)
- Pure functions with no side effects
- Comprehensive input validation
- Golden test coverage for all formulas

## 🎨 Design System

### Colors
- **Primary:** Blue palette (#0ea5e9 and variants)
- **Gray:** Neutral palette for text and backgrounds
- **Success/Error:** Standard semantic colors

### Components
- Clean, modern interface
- Consistent spacing and typography
- Accessible design (WCAG AA compliance)
- Mobile-responsive layouts

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm 8+

### Environment Setup
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env.local` (when available)
4. Start development server with `npm run dev`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint checking
- `npm run format` - Prettier code formatting

## 📊 Performance

### Benchmarks (Target)
- Cap table render: <200ms for 10k instruments
- Waterfall calculation: <1.5s for 10k stakeholders
- Test suite: <5s execution time

### Optimization
- Component memoization for expensive renders
- Virtual scrolling for large lists
- Code splitting for route-based chunks
- Optimized bundle size

## 🔒 Security

### Data Protection
- No sensitive data in frontend code
- Input validation on all forms
- XSS protection via React's built-in escaping
- Audit trail for all mutations

### Financial Precision
- Decimal.js for exact calculations
- Immutable data structures
- Pure functions with predictable outputs
- Comprehensive validation

## 📈 Roadmap

### Phase 1: MVP Foundation (✅ Complete)
- Project setup and infrastructure
- Core financial calculators
- Basic UI framework
- Testing infrastructure

### Phase 2: Business Logic (🚧 Next)
- Mock API server
- CRUD operations for entities
- Authentication system
- Basic cap table views

### Phase 3: Advanced Features
- Scenario modeling
- Waterfall calculations
- Advanced reporting
- Import/export functionality

### Phase 4: Production Ready
- Real database integration
- Advanced security features
- Performance optimizations
- Compliance features

## 🤝 Contributing

This project follows strict coding standards:
- All changes must pass TypeScript compilation
- Tests must pass with 100% coverage for financial calculations
- Code must follow ESLint and Prettier rules
- PRD requirements are non-negotiable for accuracy

## 📄 License

ISC License - See package.json for details.

---

**Generated with Claude Code** 🤖

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md)