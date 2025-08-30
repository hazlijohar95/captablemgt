# Query Optimization Guide for Large Cap Tables

## Overview

This guide provides comprehensive strategies for optimizing database queries when handling 1000+ stakeholders and their associated securities. All recommendations have been implemented and tested with the performance suite.

## Database Indexes (Implemented)

### Primary Indexes

Our system implements the following indexes for optimal performance:

```sql
-- Core stakeholder queries
CREATE INDEX IF NOT EXISTS idx_stakeholders_company_id ON stakeholders(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_company_type ON stakeholders(company_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_created_at ON stakeholders(company_id, created_at DESC) WHERE deleted_at IS NULL;

-- Securities performance indexes
CREATE INDEX IF NOT EXISTS idx_securities_stakeholder_id ON securities(stakeholder_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_filters ON securities(stakeholder_id, type, status, issue_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_ownership_calc ON securities(stakeholder_id, shares, type) WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_people_name_trgm ON people USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_entity_trgm ON stakeholders USING gin (entity_name gin_trgm_ops) WHERE entity_name IS NOT NULL AND deleted_at IS NULL;
```

### Index Usage Guidelines

1. **Always filter by company_id first** - This is the most selective filter
2. **Use partial indexes** - Include `WHERE deleted_at IS NULL` to avoid indexing soft-deleted records
3. **Composite indexes** - Order columns by selectivity (most selective first)
4. **Covering indexes** - Include frequently accessed columns in the index

## Pagination Strategies

### 1. Offset-Based Pagination (Default)

**Best for:** Small to medium datasets (< 10K records), known total counts

```typescript
// Implemented in PaginationService.paginateQuery
const result = await PaginationService.paginateQuery(
  'stakeholders',
  { page: 1, pageSize: 50 },
  { company_id: 'uuid' }
);
```

**Performance characteristics:**
- ✅ Simple to implement
- ✅ Provides total count and page numbers
- ⚠️ Slower for large offsets (page 100+)
- ⚠️ Can have consistency issues with concurrent inserts

### 2. Cursor-Based Pagination (Large Datasets)

**Best for:** Large datasets (10K+ records), real-time data

```typescript
// Implemented in PaginationService.paginateWithCursor
const result = await PaginationService.paginateWithCursor(
  'securities',
  { cursor: 'last_id', pageSize: 100 },
  { 'stakeholder.company_id': 'uuid' }
);
```

**Performance characteristics:**
- ✅ Consistent performance regardless of position
- ✅ Handles concurrent inserts correctly
- ⚠️ No total count available
- ⚠️ More complex navigation

## Query Performance Optimizations

### 1. Select Only Needed Columns

```sql
-- ❌ Avoid SELECT *
SELECT * FROM stakeholders;

-- ✅ Select specific columns
SELECT id, type, entity_name, company_id FROM stakeholders;
```

### 2. Efficient Joins

```sql
-- ✅ Use explicit JOINs with proper conditions
SELECT s.id, s.type, p.name, p.email
FROM stakeholders s
INNER JOIN people p ON s.id = p.stakeholder_id
WHERE s.company_id = $1 AND s.deleted_at IS NULL;
```

### 3. Avoid N+1 Queries

```typescript
// ❌ N+1 Query Pattern
const stakeholders = await supabase.from('stakeholders').select('*');
for (const stakeholder of stakeholders) {
  const securities = await supabase
    .from('securities')
    .select('*')
    .eq('stakeholder_id', stakeholder.id);
}

// ✅ Single Query with Join
const result = await supabase
  .from('stakeholders')
  .select(`
    *,
    securities(*)
  `)
  .eq('company_id', companyId);
```

### 4. Optimize COUNT Queries

```typescript
// ✅ Cached COUNT query (implemented in PaginationService.getCount)
static async getCount(tableName: string, filters: FilterParams = {}): Promise<number> {
  const cacheKey = `count_${tableName}_${JSON.stringify(filters)}`;
  const cached = this.getFromCache(cacheKey);
  
  if (cached) return cached;
  
  // Use COUNT with limited columns for performance
  const { count } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .match(filters);
    
  this.setCache(cacheKey, count || 0);
  return count || 0;
}
```

## Caching Strategies (Implemented)

### 1. Query Result Caching

```typescript
// 5-minute TTL cache for pagination results
private static readonly CACHE_TTL = 5 * 60 * 1000;
private static cache = new Map<string, { data: any; timestamp: number }>();

// Cache key includes all query parameters
private static getCacheKey(tableName: string, params: PaginationParams, filters: FilterParams): string {
  return `${tableName}_${JSON.stringify(params)}_${JSON.stringify(filters)}`;
}
```

### 2. Cache Invalidation

- **Time-based:** 5-minute TTL for most queries
- **Size-based:** Maximum 100 entries with LRU eviction
- **Manual:** `PaginationService.clearCache()` for explicit invalidation

## Performance Monitoring

### 1. Query Performance Metrics

```typescript
// Built into all pagination queries
const startTime = performance.now();
const result = await query;
const queryTime = performance.now() - startTime;

return {
  ...result,
  performance: {
    queryTime,
    cached: false
  }
};
```

### 2. Performance Thresholds

Implemented monitoring with these thresholds:
- **Pagination queries:** < 500ms
- **Count queries:** < 200ms
- **Complex joins:** < 800ms
- **Cache hits:** < 50ms
- **Data processing:** < 200ms

### 3. Monitoring Views

```sql
-- Monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Monitor slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

## Performance Testing

### Automated Performance Tests

```typescript
// Example from performance test suite
describe('Large Dataset Performance Tests', () => {
  it('should handle 1000+ stakeholders efficiently', async () => {
    const result = await PaginationService.paginateQuery(
      'stakeholders',
      { pageSize: 100 },
      { company_id: 'test-company' }
    );
    
    expect(result.performance.queryTime).toBeLessThan(500);
  });
});
```

### Performance Benchmarks

Run performance tests with:
```bash
npm run test -- --run src/__tests__/performance/
```

Expected results for 2000 stakeholder dataset:
- First page load: < 500ms
- Subsequent pages: < 200ms
- Search operations: < 300ms
- Cache hits: < 50ms

## Best Practices Summary

### ✅ DO
1. Always include `company_id` in WHERE clauses
2. Use appropriate pagination strategy based on dataset size
3. Cache frequently accessed data
4. Monitor query performance
5. Use partial indexes with `deleted_at IS NULL`
6. Select only needed columns
7. Use explicit JOINs instead of subqueries

### ❌ DON'T
1. Use `SELECT *` in production queries
2. Skip the `deleted_at` filter
3. Use OFFSET pagination for large datasets
4. Perform N+1 queries
5. Cache data indefinitely
6. Ignore performance metrics
7. Use unindexed ORDER BY clauses

## Troubleshooting

### Slow Pagination Queries

1. Check if appropriate indexes exist:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM stakeholders 
   WHERE company_id = 'uuid' AND deleted_at IS NULL 
   ORDER BY created_at DESC LIMIT 50 OFFSET 100;
   ```

2. Verify index usage in query plan
3. Consider switching to cursor-based pagination
4. Check cache hit rates

### High Memory Usage

1. Reduce page sizes
2. Clear cache periodically: `PaginationService.clearCache()`
3. Monitor component cleanup in virtualized tables
4. Use React.memo for expensive components

### Cache Issues

1. Verify cache keys are consistent
2. Check TTL settings
3. Monitor cache size limits
4. Implement proper invalidation strategies

## Migration and Deployment

### Index Creation

Run the performance indexes migration:
```sql
-- Located in: src/database/migrations/add_performance_indexes.sql
\i add_performance_indexes.sql
```

### Monitoring Setup

1. Enable `pg_stat_statements` extension
2. Set up index usage monitoring
3. Configure slow query logging
4. Implement performance alerting

### Production Checklist

- [ ] All indexes created and analyzed
- [ ] Cache configuration tuned
- [ ] Performance monitoring active
- [ ] Query timeouts configured
- [ ] Connection pooling optimized
- [ ] Performance tests passing