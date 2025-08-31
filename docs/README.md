# Cap Table Management Platform - Documentation

Complete documentation for the enterprise-grade cap table management platform.

## 📖 Documentation Index

### Getting Started
- **[Quick Start Guide](#quick-start)** - Get up and running in 5 minutes
- **[Installation & Setup](#installation--setup)** - Detailed setup instructions
- **[Development Guide](development/setup-guide.md)** - Development environment setup

### Core Features
- **[Financial Calculations](financial-calculations.md)** - Mathematical models and precision requirements
- **[Architecture Overview](architecture/securities-management.md)** - System architecture and design patterns

### Operations
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Performance Optimization](performance/QUERY_OPTIMIZATION_GUIDE.md)** - Performance tuning guide
- **[Testing Workflow](testing-workflow.md)** - Testing standards and procedures

### API Reference
- **[OpenAPI Specification](../src/api/openapi.yaml)** - Complete API documentation

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm 8+
- **PostgreSQL 12+** or Supabase account
- **Git** for version control

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/captable.git
cd captable

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your database credentials

# 4. Set up database
npm run db:setup
npm run db:migrate
npm run db:seed

# 5. Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🔧 Installation & Setup

### Environment Variables

Create `.env.local` with the following configuration:

```bash
# Database Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME="Cap Table Management Platform"

# Security Configuration
VITE_CSRF_SECRET=your_csrf_secret_key
VITE_SESSION_SECRET=your_session_secret

# Logging Configuration
VITE_LOG_LEVEL=info
VITE_LOG_ENDPOINT=your_logging_endpoint

# Features Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_MONITORING=true
```

### Database Setup Options

#### Option 1: Supabase (Recommended)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Run Database Migrations**
   ```bash
   npx supabase db push
   npx supabase db seed
   ```

3. **Enable Row Level Security**
   ```sql
   -- Run in Supabase SQL editor
   SELECT setup_rls_policies();
   ```

#### Option 2: Local PostgreSQL

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**
   ```bash
   createuser -s captable
   createdb -O captable captable_dev
   createdb -O captable captable_test
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Verification

Run the following commands to verify your setup:

```bash
# Test database connection
npm run db:test

# Run test suite
npm run test

# Check TypeScript compilation
npm run typecheck

# Start development server
npm run dev
```

## 🏗️ Development Commands

### Core Development
```bash
npm run dev              # Start development server with hot reload
npm run dev:turbo        # Start with performance optimizations
npm run build            # Production build
npm run build:analyze    # Build with bundle analysis
npm run preview          # Preview production build
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
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database (development only)
npm run db:seed          # Load sample data
npm run db:test          # Test database connection
```

### Performance & Analysis
```bash
npm run perf:analyze     # Bundle size analysis
npm run perf:lighthouse  # Lighthouse performance audit
npm run clean            # Clean build artifacts
```

## 📁 Project Structure

```
cap-table-platform/
├── README.md                 # Project overview and quick start
├── CONTRIBUTING.md           # Contribution guidelines
├── SECURITY.md              # Security policy and reporting
├── LICENSE                  # MIT license
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.optimized.ts # Optimized Vite build configuration
│
├── docs/                    # Documentation
│   ├── README.md            # Documentation index (this file)
│   ├── DEPLOYMENT.md        # Production deployment guide
│   ├── financial-calculations.md # Mathematical models
│   ├── architecture/        # System architecture docs
│   ├── development/         # Development guides
│   ├── performance/         # Performance optimization guides
│   └── testing-workflow.md  # Testing standards
│
├── src/                     # Application source code
│   ├── main.tsx             # Application entry point
│   ├── App.tsx              # Main application component
│   ├── index.css            # Global styles
│   │
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base UI components (Button, Input, etc.)
│   │   ├── forms/           # Form components with validation
│   │   ├── layout/          # Layout and navigation components
│   │   ├── tables/          # Table components with virtualization
│   │   └── errors/          # Error handling components
│   │
│   ├── features/            # Feature-based modules
│   │   ├── auth/            # Authentication system
│   │   ├── cap-table/       # Core cap table functionality
│   │   ├── instruments/     # Securities management
│   │   ├── scenarios/       # Scenario modeling and analysis
│   │   ├── waterfall/       # Exit analysis and distributions
│   │   ├── compliance/      # 409A and regulatory compliance
│   │   ├── reports/         # Reporting and data export
│   │   ├── dashboard/       # Main dashboard and overview
│   │   └── onboarding/      # User onboarding flow
│   │
│   ├── services/            # Business logic and API clients
│   │   ├── supabase.ts      # Supabase client configuration
│   │   ├── capTableService.ts # Core cap table operations
│   │   ├── authorizationService.ts # Access control
│   │   ├── loggingService.ts # Structured logging
│   │   ├── securityService.ts # Security headers and CORS
│   │   └── performanceMonitor.ts # Performance monitoring
│   │
│   ├── hooks/               # Shared React hooks
│   │   ├── useCompanyContext.ts # Company-specific operations
│   │   ├── useCapTableData.ts # Cap table data fetching
│   │   └── useFormValidation.ts # Form validation logic
│   │
│   ├── stores/              # Global state management (Zustand)
│   │   └── [feature]Store.ts # Feature-specific stores
│   │
│   ├── utils/               # Utility functions and helpers
│   │   ├── calculations/    # Financial calculation utilities
│   │   ├── validation.ts    # Input validation helpers
│   │   ├── formatting.ts    # Data formatting utilities
│   │   └── errorTracking.ts # Error monitoring
│   │
│   ├── types/               # Global TypeScript definitions
│   │   ├── database.ts      # Database schema types
│   │   ├── api.ts           # API request/response types
│   │   └── index.ts         # Shared type definitions
│   │
│   └── constants/           # Application constants
│       ├── business.ts      # Business logic constants
│       └── ui.ts            # UI-related constants
│
├── database/                # Database schema and migrations
│   ├── migrations/          # SQL migration files
│   └── schema.sql           # Complete database schema
│
└── scripts/                 # Build and deployment scripts
    └── check-ci-status.js   # CI/CD configuration checker
```

## 🎯 Key Features

### Financial Calculations
- **Precision**: All monetary calculations use Decimal.js for financial-grade accuracy
- **Validation**: 100% test coverage for financial calculations with golden tests
- **Compliance**: Calculations align with industry standards (ASC 820, 409A)

### Security & Compliance
- **Multi-tenancy**: Complete data isolation between companies
- **Audit Trail**: Immutable logging of all data modifications
- **Access Control**: Role-based permissions with row-level security
- **Encryption**: Data encrypted in transit and at rest

### Performance & Scalability
- **Virtualization**: Handle 10,000+ securities with smooth scrolling
- **Code Splitting**: Optimized bundles with lazy loading
- **Caching**: Intelligent caching of calculations and API responses
- **Real-time Updates**: WebSocket-based collaboration features

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
npm run db:test

# Reset database in development
npm run db:reset
npm run db:migrate
npm run db:seed
```

#### TypeScript Compilation Errors
```bash
# Full type check
npm run typecheck

# Clean and rebuild
npm run clean
npm install
npm run build
```

#### Test Failures
```bash
# Run specific test file
npm run test -- --run src/path/to/test.test.ts

# Run tests with verbose output
npm run test -- --reporter=verbose

# Update test snapshots
npm run test -- --update
```

#### Performance Issues
```bash
# Analyze bundle size
npm run build:analyze

# Run performance audit
npm run perf:lighthouse

# Check for memory leaks
npm run dev # then use browser dev tools
```

### Getting Help

1. **Check Documentation** - Review relevant documentation sections
2. **Search Issues** - Look through existing GitHub issues
3. **Create Issue** - Report bugs or request features
4. **Community Discussion** - Ask questions in discussions
5. **Security Issues** - Email security@captable.dev for sensitive issues

## 📊 Performance Benchmarks

| Operation | Target | Current |
|-----------|--------|---------|
| Cap Table Load (1K securities) | <500ms | ~200ms |
| Scenario Calculation | <2s | ~800ms |
| Waterfall Analysis | <1.5s | ~600ms |
| Data Export (10K rows) | <5s | ~2s |
| Initial Page Load | <3s | ~1.8s |

## 🗺️ Development Roadmap

### Current Version (v1.0)
- ✅ Core cap table management
- ✅ Financial calculations engine
- ✅ Scenario modeling
- ✅ Performance optimizations
- ✅ Security enhancements

### Next Release (v1.1)
- 📋 Advanced waterfall analysis
- 📋 Mobile-responsive improvements
- 📋 Enhanced export formats
- 📋 Real-time collaboration features

### Future Releases
- 📋 Advanced compliance features
- 📋 Third-party integrations
- 📋 Machine learning insights
- 📋 Advanced analytics dashboard

---

**Need help?** Check the troubleshooting section above or create an issue in the repository.

**Contributing?** See our [Contributing Guide](../CONTRIBUTING.md) for development guidelines.

**Security concerns?** Review our [Security Policy](../SECURITY.md) for reporting procedures.