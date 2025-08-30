# Contributing Guide

Welcome to the Cap Table Management Platform! We're excited that you're interested in contributing to enterprise-grade financial software. This guide will help you get started with contributing code, reporting bugs, and suggesting improvements.

## 🤝 Ways to Contribute

### Code Contributions
- **Bug Fixes**: Help us identify and fix issues
- **Feature Development**: Implement new functionality
- **Performance Improvements**: Optimize calculations and UI
- **Test Coverage**: Add tests for better reliability
- **Documentation**: Improve guides and technical documentation

### Non-Code Contributions
- **Bug Reports**: Detailed issue reports with reproduction steps
- **Feature Requests**: Thoughtful suggestions for new capabilities
- **Documentation**: Tutorials, guides, and examples
- **Community Support**: Help other users in discussions
- **Financial Domain Expertise**: Review calculations and compliance features

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm 8+
- **Git** for version control
- **PostgreSQL** or Supabase account for database
- **Basic understanding** of React, TypeScript, and financial concepts

### Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then:
   git clone https://github.com/your-username/captable.git
   cd captable
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Database Setup**
   ```bash
   # If using Supabase, see SUPABASE_SETUP.md
   # If using local PostgreSQL:
   npm run db:setup
   npm run db:migrate
   npm run db:seed
   ```

5. **Verify Setup**
   ```bash
   npm run test       # Run test suite
   npm run typecheck  # TypeScript validation
   npm run dev        # Start development server
   ```

### Development Workflow

1. **Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number
   ```

2. **Make Changes**
   - Write clean, well-commented code
   - Follow existing code patterns and conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run test           # Full test suite
   npm run test:financial # Financial calculation tests (must pass)
   npm run typecheck     # TypeScript validation
   npm run lint          # Code style checks
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add scenario comparison feature"
   # Follow conventional commit format
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

## 📋 Code Standards

### TypeScript Guidelines
```typescript
// ✅ Good: Explicit types and clear interfaces
interface StakeholderData {
  id: string;
  name: string;
  email: string;
  sharesOwned: number; // Always in whole shares
}

export const processStakeholder = (data: StakeholderData): ProcessedStakeholder => {
  // Implementation with clear return type
};

// ❌ Avoid: any types and implicit returns
const processData = (data: any) => {
  // Unclear what this returns
};
```

### Financial Calculations

**Critical Requirements:**
- **Use Decimal.js** for all monetary calculations
- **Test with Golden Tests** - financial functions must match reference results
- **Document Formulas** with legal/accounting references
- **Handle Edge Cases** like zero values, negative amounts, etc.

```typescript
// ✅ Correct financial calculation
import Decimal from 'decimal.js';

export const calculateWaterfall = (
  exitValue: string, // Use string to avoid precision loss
  preferences: LiquidationPreference[]
): WaterfallResult => {
  const exitDecimal = new Decimal(exitValue);
  // ... precise calculations using Decimal.js
};

// ❌ Incorrect - floating point errors
export const calculateWaterfall = (exitValue: number) => {
  const result = exitValue * 0.1; // Precision issues!
};
```

### Component Guidelines
```typescript
// ✅ Well-structured component
interface CapTableRowProps {
  stakeholder: Stakeholder;
  onEdit: (id: string) => void;
  className?: string;
}

export const CapTableRow: React.FC<CapTableRowProps> = React.memo(({
  stakeholder,
  onEdit,
  className = ''
}) => {
  const handleClick = useCallback(() => {
    onEdit(stakeholder.id);
  }, [stakeholder.id, onEdit]);

  return (
    <tr className={`hover:bg-gray-50 ${className}`} onClick={handleClick}>
      {/* Component JSX */}
    </tr>
  );
});

CapTableRow.displayName = 'CapTableRow';
```

### Testing Requirements

#### Financial Calculations (100% Coverage Required)
```typescript
// Golden tests - must match exact reference values
describe('calculateWaterfall', () => {
  it('should match reference calculation for Series A exit', () => {
    const result = calculateWaterfall('50000000', testPreferences);
    
    expect(result.commonDistribution).toBe('15000000'); // Exact match required
    expect(result.preferredDistribution).toBe('35000000');
  });
});
```

#### Component Tests
```typescript
describe('CapTableRow', () => {
  it('should render stakeholder information correctly', () => {
    render(<CapTableRow stakeholder={mockStakeholder} onEdit={mockEdit} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('10,000 shares')).toBeInTheDocument();
  });

  it('should call onEdit when clicked', async () => {
    const mockEdit = vi.fn();
    render(<CapTableRow stakeholder={mockStakeholder} onEdit={mockEdit} />);
    
    await user.click(screen.getByRole('row'));
    expect(mockEdit).toHaveBeenCalledWith('stakeholder-1');
  });
});
```

## 🎯 Contribution Areas

### High-Impact Areas
1. **Financial Calculations**: Accuracy improvements and new calculation types
2. **Performance**: Optimizations for large cap tables (10,000+ securities)
3. **Accessibility**: WCAG AA compliance improvements
4. **Mobile Experience**: Responsive design enhancements
5. **Documentation**: Tutorials and implementation examples

### Feature Requests
Before starting significant features:
1. **Check existing issues** to avoid duplicate work
2. **Create discussion issue** to gather feedback
3. **Review technical approach** with maintainers
4. **Break into smaller PRs** when possible

### Bug Reports
High-quality bug reports include:

```markdown
**Description**: Clear summary of the issue

**Steps to Reproduce**:
1. Go to cap table page
2. Add new stakeholder with 10,000 shares
3. Create Series A round with $5M investment
4. Calculate dilution

**Expected Behavior**: Stakeholder should own 8.33% after dilution

**Actual Behavior**: Shows 8.337% (precision error)

**Environment**:
- Browser: Chrome 120.0
- OS: macOS 14.1
- Version: v1.2.3

**Additional Context**: 
- Calculation works correctly for smaller amounts
- Issue appears to be in round calculations (round.ts:145)
```

## 🔄 Pull Request Process

### PR Requirements
- [ ] **Tests Pass**: All tests must pass, especially financial calculations
- [ ] **Type Safety**: No TypeScript errors or warnings
- [ ] **Code Style**: Follows linting rules and conventions
- [ ] **Documentation**: Updated for new features or API changes
- [ ] **Golden Tests**: Financial calculations include reference test cases

### PR Template
```markdown
## Description
Brief description of changes and motivation

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Tests added for new functionality
- [ ] All tests pass locally
- [ ] Financial calculations tested with golden tests

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No merge conflicts
```

### Review Process
1. **Automated Checks**: CI pipeline runs tests, linting, and type checking
2. **Maintainer Review**: Code review focusing on correctness and architecture
3. **Financial Review**: For calculation changes, domain expert review required
4. **Testing**: Manual testing for UI changes and complex features
5. **Approval**: At least one maintainer approval required for merge

## 🏛️ Financial Domain Guidelines

### Accuracy Requirements
- **Calculation Precision**: ±0.01% accuracy for all financial calculations
- **Legal Compliance**: Calculations must align with standard accounting practices
- **Reference Documentation**: Include sources for complex formulas
- **Edge Case Handling**: Handle zero values, negative amounts, and boundary conditions

### Common Calculation Types
- **Vesting**: Time-based and milestone-based with acceleration triggers
- **Dilution**: Round-by-round ownership calculations
- **Waterfall**: Exit distributions with preferences and participation
- **409A**: Fair market value calculations for compliance
- **Tax**: ISO vs NSO implications, 83(b) elections

### Compliance Considerations
- **409A Compliance**: Fair value calculations for option grants
- **ASC 820**: Fair value measurement standards
- **SOX Requirements**: Audit trail and internal controls
- **Privacy**: GDPR/CCPA data handling requirements

## 🏗️ Architecture Guidelines

### Project Structure
```
src/
├── components/          # Reusable UI components
├── features/           # Feature-based modules
│   ├── cap-table/      # Core functionality
│   ├── scenarios/      # Scenario modeling
│   ├── waterfall/      # Exit analysis
│   └── compliance/     # Regulatory features
├── services/           # API and integrations
├── utils/             # Shared utilities
└── types/             # TypeScript definitions
```

### Component Architecture
- **Feature-Based**: Group related functionality together
- **Separation of Concerns**: UI components separate from business logic
- **Reusable Components**: Shared components in `/components`
- **Type Safety**: Comprehensive TypeScript interfaces

### State Management
- **Zustand**: Global state with immutable updates
- **React Query**: Server state and caching
- **Local State**: Component-level state for UI concerns
- **Context**: Authentication and company context

## 📞 Getting Help

### Community Support
- **GitHub Discussions**: General questions and feature discussions
- **Issues**: Bug reports and specific problems
- **Discord/Slack**: Real-time community chat (if available)

### Maintainer Contact
- **Code Questions**: Tag maintainers in issues or PRs
- **Financial Questions**: Request domain expert review for calculation changes
- **Security Issues**: Use security@captable.dev for sensitive issues

## 🎉 Recognition

### Contributors
We recognize contributors through:
- **Contributors File**: Listed in CONTRIBUTORS.md
- **Release Notes**: Major contributions highlighted in releases
- **GitHub Recognition**: Contributor badges and stars
- **Community Showcases**: Featured implementations and use cases

### Becoming a Maintainer
Regular contributors may be invited to become maintainers based on:
- **Consistent Quality**: High-quality contributions over time
- **Domain Expertise**: Deep understanding of financial calculations or system architecture
- **Community Involvement**: Active participation in discussions and reviews
- **Reliability**: Responsive to feedback and committed to project success

---

Thank you for contributing to enterprise-grade financial software! Every contribution helps make cap table management more accessible and accurate for the startup ecosystem.