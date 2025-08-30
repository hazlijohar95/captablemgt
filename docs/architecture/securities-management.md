# Securities Management Architecture

This document describes the architecture and implementation patterns for the Securities Management feature, providing guidance for understanding and extending the system.

## 🏗️ System Architecture

### Feature-Based Organization
The securities management functionality follows a modular, feature-based architecture that promotes maintainability and scalability.

```
src/features/instruments/
├── components/           # UI components
│   ├── InstrumentsPage.tsx         # Main page component
│   ├── InstrumentsHeader.tsx       # Page header with actions
│   ├── InstrumentsStats.tsx        # Statistics dashboard
│   ├── InstrumentsFilters.tsx      # Advanced filtering UI
│   └── InstrumentsTable.tsx        # Data table with sorting
├── hooks/               # React state management
│   └── useInstruments.ts           # Primary data hook
├── services/            # Business logic layer
│   └── instrumentsService.ts       # Core service implementation
└── types.ts            # TypeScript definitions
```

### Design Principles

**1. Separation of Concerns**
- **UI Components**: Focused on presentation and user interaction
- **Business Logic**: Centralized in service layer
- **State Management**: React hooks for component state
- **Type Safety**: Comprehensive TypeScript interfaces

**2. Data Flow Architecture**
```
UI Components → React Hooks → Service Layer → Supabase Client → Database
     ↑              ↑             ↑              ↑
     └── State ──────┘             │              │
         Updates                   └── Caching ───┘
```

**3. Error Handling Strategy**
- **Service Level**: Consistent error handling with typed responses
- **Component Level**: Graceful error states and user feedback
- **Global Level**: Error boundary protection for critical failures

## 🛠️ Core Components

### InstrumentsService
The central business logic layer that handles all securities operations.

**Key Responsibilities:**
- Data fetching with advanced filtering
- Audit trail management
- Authorization and security enforcement
- Performance optimization through caching

**Interface Design:**
```typescript
interface InstrumentsService {
  // Data operations
  fetchSecurities(filters: SecurityFilters): Promise<SecurityWithDetails[]>;
  getSecurityStats(companyId: string): Promise<SecurityStats>;
  
  // State management
  cancelSecurity(securityId: string, reason: string): Promise<void>;
  reactivateSecurity(securityId: string): Promise<void>;
  
  // Filtering and search
  applyFilters(securities: Security[], filters: SecurityFilters): Security[];
  searchSecurities(query: string, securities: Security[]): Security[];
}
```

### Advanced Filtering System

**Multi-dimensional Filtering:**
- **Security Type**: Common stock, preferred shares, options, SAFEs, warrants
- **Status**: Active, cancelled, expired, exercised
- **Stakeholder Type**: Employee, investor, advisor, founder
- **Date Range**: Issue date, vesting commencement, expiration
- **Search**: Full-text search across stakeholder names and security details

**Performance Optimizations:**
```typescript
// Database-level filtering for efficiency
const applyDatabaseFilters = (query: SupabaseQueryBuilder, filters: SecurityFilters) => {
  // Status filtering
  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }
  
  // Date range filtering
  if (filters.dateFrom) {
    query = query.gte('issue_date', filters.dateFrom);
  }
  
  // Search optimization (minimum 3 characters)
  if (filters.search && filters.search.length >= 3) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`
      stakeholder.people.name.ilike.${searchTerm},
      stakeholder.entity_name.ilike.${searchTerm},
      type.ilike.${searchTerm}
    `);
  }
  
  return query;
};
```

### Real-time Statistics Dashboard

**Metrics Tracking:**
```typescript
interface SecurityStats {
  totalSecurities: number;
  totalShares: number;
  breakdown: {
    byType: Record<SecurityType, number>;
    byStatus: Record<SecurityStatus, number>;
    byStakeholderType: Record<StakeholderType, number>;
  };
  trends: {
    recentActivity: number;
    monthlyGrowth: number;
  };
}
```

**Calculation Strategy:**
- **Real-time Updates**: Statistics recalculated on data changes
- **Efficient Aggregation**: Database-level aggregations where possible
- **Caching**: Intelligent caching for expensive calculations

## 🔐 Security & Authorization

### Multi-Tenant Data Isolation
```typescript
// Company-scoped data access
const fetchCompanySecurities = async (companyId: string): Promise<Security[]> => {
  const { data, error } = await supabase
    .from('securities')
    .select(`
      *,
      stakeholder!inner(
        id,
        company_id,
        type,
        people(name),
        entity_name
      )
    `)
    .eq('stakeholder.company_id', companyId)  // Company isolation
    .eq('stakeholder.deleted_at', null);      // Soft delete filtering
    
  if (error) throw new SecurityError('Failed to fetch securities');
  return data;
};
```

### Role-Based Access Control
```typescript
interface SecurityPermissions {
  canView: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canIssue: boolean;
  canViewSensitive: boolean;  // Valuation, ownership percentages
}

const getSecurityPermissions = (userRole: UserRole): SecurityPermissions => {
  switch (userRole) {
    case 'ADMIN':
      return { canView: true, canEdit: true, canCancel: true, canIssue: true, canViewSensitive: true };
    case 'MANAGER':
      return { canView: true, canEdit: true, canCancel: false, canIssue: true, canViewSensitive: true };
    case 'EMPLOYEE':
      return { canView: true, canEdit: false, canCancel: false, canIssue: false, canViewSensitive: false };
    default:
      return { canView: false, canEdit: false, canCancel: false, canIssue: false, canViewSensitive: false };
  }
};
```

### Audit Trail Implementation
```typescript
// Automatic audit logging for all changes
const auditSecurityChange = async (
  securityId: string,
  action: 'CANCEL' | 'REACTIVATE' | 'MODIFY',
  details: AuditDetails
): Promise<void> => {
  await supabase
    .from('audit_log')
    .insert({
      entity_type: 'SECURITY',
      entity_id: securityId,
      action,
      details,
      user_id: currentUser.id,
      company_id: currentUser.company_id,
      timestamp: new Date().toISOString()
    });
};
```

## 📊 Performance Optimization

### Database Query Optimization

**Efficient Joins:**
```typescript
// Single query with proper joins instead of multiple round trips
const query = supabase
  .from('securities')
  .select(`
    id,
    type,
    status,
    shares,
    issue_date,
    stakeholder!inner(
      id,
      type,
      company_id,
      people(name, email),
      entity_name
    )
  `)
  .order('issue_date', { ascending: false });
```

**Pagination Strategy:**
```typescript
const SECURITIES_PER_PAGE = 50;

const fetchSecuritiesPaginated = async (
  page: number,
  filters: SecurityFilters
): Promise<PaginatedResponse<Security>> => {
  const from = page * SECURITIES_PER_PAGE;
  const to = from + SECURITIES_PER_PAGE - 1;
  
  const query = applyFilters(supabase.from('securities'), filters);
  const { data, error, count } = await query
    .range(from, to)
    .select('*', { count: 'exact' });
    
  return {
    data: data || [],
    pagination: {
      page,
      totalPages: Math.ceil((count || 0) / SECURITIES_PER_PAGE),
      totalItems: count || 0,
      hasNext: to < (count || 0) - 1
    }
  };
};
```

### Client-Side Optimizations

**React Performance:**
```typescript
// Memoized components for expensive renders
export const InstrumentsTable = React.memo(({ securities, onAction }: Props) => {
  const memoizedSecurities = useMemo(() => 
    securities.map(transformSecurityForDisplay), 
    [securities]
  );
  
  const handleAction = useCallback((action: string, securityId: string) => {
    onAction(action, securityId);
  }, [onAction]);
  
  return (
    // Table implementation
  );
});
```

**Intelligent Caching:**
```typescript
// Cache expensive calculations
const useSecurityStats = (companyId: string) => {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const cacheKey = `security_stats_${companyId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minutes
        setStats(data);
        setLoading(false);
        return;
      }
    }
    
    fetchSecurityStats(companyId).then(data => {
      setStats(data);
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      setLoading(false);
    });
  }, [companyId]);
  
  return { stats, loading };
};
```

## 🧪 Testing Strategy

### Component Testing
```typescript
describe('InstrumentsTable', () => {
  it('should display securities with correct formatting', () => {
    const mockSecurities = [
      {
        id: '1',
        type: 'COMMON_STOCK',
        shares: 10000,
        stakeholder: { name: 'John Doe' }
      }
    ];
    
    render(<InstrumentsTable securities={mockSecurities} onAction={vi.fn()} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('Common Stock')).toBeInTheDocument();
  });
});
```

### Integration Testing
```typescript
describe('InstrumentsService', () => {
  it('should fetch securities with filters applied', async () => {
    const filters = { status: 'ACTIVE', type: 'COMMON_STOCK' };
    const result = await instrumentsService.fetchSecurities(filters);
    
    expect(result.every(s => s.status === 'ACTIVE')).toBe(true);
    expect(result.every(s => s.type === 'COMMON_STOCK')).toBe(true);
  });
});
```

## 🔄 Extension Patterns

### Adding New Security Types
```typescript
// 1. Extend type definitions
export type SecurityType = 
  | 'COMMON_STOCK'
  | 'PREFERRED_STOCK' 
  | 'STOCK_OPTION'
  | 'SAFE'
  | 'WARRANT'
  | 'NEW_SECURITY_TYPE';  // Add here

// 2. Update service logic
const getSecurityTypeLabel = (type: SecurityType): string => {
  switch (type) {
    case 'NEW_SECURITY_TYPE':
      return 'New Security Type';
    // ... other cases
  }
};

// 3. Add filtering support
const filterByType = (securities: Security[], type: SecurityType) => {
  return securities.filter(s => s.type === type);
};
```

### Custom Actions
```typescript
interface SecurityAction {
  id: string;
  label: string;
  icon: ReactNode;
  permission: keyof SecurityPermissions;
  handler: (security: Security) => Promise<void>;
}

const customActions: SecurityAction[] = [
  {
    id: 'transfer',
    label: 'Transfer Ownership',
    icon: <ArrowRightIcon />,
    permission: 'canEdit',
    handler: async (security) => {
      // Implementation
    }
  }
];
```

## 📈 Monitoring & Analytics

### Performance Metrics
```typescript
interface PerformanceMetrics {
  queryResponseTime: number;
  componentRenderTime: number;
  cacheHitRate: number;
  errorRate: number;
}

// Monitoring implementation
const trackPerformance = (operation: string, startTime: number) => {
  const duration = performance.now() - startTime;
  analytics.track('securities_operation', {
    operation,
    duration,
    timestamp: new Date().toISOString()
  });
};
```

### Business Intelligence
```typescript
interface UsageAnalytics {
  mostUsedFilters: Record<string, number>;
  averageSessionDuration: number;
  featureAdoptionRate: Record<string, number>;
  userActionFrequency: Record<string, number>;
}
```

This architecture provides a solid foundation for securities management while maintaining flexibility for future enhancements and scale requirements.