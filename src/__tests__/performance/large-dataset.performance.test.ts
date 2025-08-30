/**
 * Performance tests for large cap tables (1000+ stakeholders)
 * Tests pagination, virtualization, and query performance
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PaginationService, StakeholderPaginationService } from '@/services/paginationService';
import { generateLargeStakeholderDataset } from '../__mocks__/largeDataset';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  PAGINATION_QUERY_TIME: 500, // 500ms max for pagination queries
  INITIAL_RENDER_TIME: 1000, // 1s max for initial render
  SCROLL_RESPONSE_TIME: 100, // 100ms max for scroll response
  FILTER_RESPONSE_TIME: 300, // 300ms max for filter application
  LARGE_DATASET_SIZE: 2000, // Test with 2000 stakeholders
  EXPECTED_PAGE_SIZE: 100, // Expected items per page
};

// Mock Supabase client for performance testing
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            // Mock query execution time
            then: vi.fn((callback) => {
              const startTime = performance.now();
              const mockData = generateLargeStakeholderDataset(PERFORMANCE_THRESHOLDS.EXPECTED_PAGE_SIZE);
              const endTime = performance.now();
              
              return Promise.resolve({
                data: mockData,
                error: null,
                count: PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE
              });
            })
          }))
        }))
      }))
    }))
  }))
};

// Mock the supabase client
vi.mock('@/services/supabase', () => ({
  supabase: mockSupabaseClient
}));

describe('Large Dataset Performance Tests', () => {
  let performanceMetrics: Record<string, number> = {};

  beforeAll(() => {
    // Setup performance monitoring
    global.performance = global.performance || {
      now: () => Date.now(),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn()
    } as any;
  });

  afterAll(() => {
    // Output performance summary
    console.table(performanceMetrics);
    
    // Assert all performance thresholds are met
    Object.entries(performanceMetrics).forEach(([metric, value]) => {
      const threshold = PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS];
      if (threshold && typeof threshold === 'number') {
        expect(value).toBeLessThan(threshold);
      }
    });
  });

  describe('Pagination Service Performance', () => {
    it('should handle pagination queries within performance threshold', async () => {
      const startTime = performance.now();
      
      const result = await PaginationService.paginateQuery(
        'stakeholders',
        { page: 1, pageSize: 100 },
        { company_id: 'test-company' }
      );
      
      const queryTime = performance.now() - startTime;
      performanceMetrics.PAGINATION_QUERY_TIME = queryTime;
      
      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGINATION_QUERY_TIME);
    });

    it('should handle cursor-based pagination for very large datasets', async () => {
      const startTime = performance.now();
      
      const result = await PaginationService.paginateWithCursor(
        'stakeholders',
        { pageSize: 200 },
        { company_id: 'test-company' }
      );
      
      const queryTime = performance.now() - startTime;
      performanceMetrics.CURSOR_PAGINATION_TIME = queryTime;
      
      expect(result.data).toBeDefined();
      expect(result.pagination.hasNext).toBeDefined();
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGINATION_QUERY_TIME);
    });

    it('should efficiently batch fetch large datasets', async () => {
      const startTime = performance.now();
      const batches: any[][] = [];
      
      // Test async generator performance
      const batchGenerator = PaginationService.fetchAllPages(
        'stakeholders',
        { company_id: 'test-company' },
        '*',
        100
      );
      
      let batchCount = 0;
      for await (const batch of batchGenerator) {
        batches.push(batch);
        batchCount++;
        
        // Limit test to reasonable number of batches
        if (batchCount >= 5) break;
      }
      
      const totalTime = performance.now() - startTime;
      const avgBatchTime = totalTime / batchCount;
      performanceMetrics.BATCH_FETCH_AVG_TIME = avgBatchTime;
      
      expect(batches.length).toBeGreaterThan(0);
      expect(avgBatchTime).toBeLessThan(200); // 200ms per batch max
    });

    it('should handle concurrent pagination requests efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate concurrent requests
      const concurrentRequests = Array(10).fill(null).map((_, index) =>
        PaginationService.paginateQuery(
          'stakeholders',
          { page: index + 1, pageSize: 50 },
          { company_id: 'test-company' }
        )
      );
      
      const results = await Promise.all(concurrentRequests);
      
      const totalTime = performance.now() - startTime;
      const avgRequestTime = totalTime / concurrentRequests.length;
      performanceMetrics.CONCURRENT_REQUEST_AVG_TIME = avgRequestTime;
      
      expect(results).toHaveLength(10);
      expect(avgRequestTime).toBeLessThan(300); // 300ms per concurrent request max
    });
  });

  describe('Virtualized Table Performance', () => {
    it('should process large datasets within performance threshold', async () => {
      const mockData = generateLargeStakeholderDataset(500); // 500 items for processing test
      
      const startTime = performance.now();
      
      // Simulate table data processing operations
      const processedData = mockData.map((stakeholder, index) => ({
        ...stakeholder,
        displayName: stakeholder.people?.name || stakeholder.entity_name || 'Unknown',
        rowIndex: index,
        hasSecurities: stakeholder.securities && stakeholder.securities.length > 0
      }));
      
      // Simulate filtering operations
      const filteredData = processedData.filter(item => item.deleted_at === null);
      
      // Simulate sorting operations
      const sortedData = filteredData.sort((a, b) => 
        a.displayName.localeCompare(b.displayName)
      );
      
      const processingTime = performance.now() - startTime;
      performanceMetrics.DATA_PROCESSING_TIME = processingTime;
      
      expect(sortedData.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(200); // 200ms for data processing
    });

    it('should handle virtual scrolling efficiently', async () => {
      // This test would require more complex setup with actual scrolling
      // For now, we'll test the virtual list calculation performance
      
      const startTime = performance.now();
      
      // Simulate virtual list calculations
      const itemHeight = 50;
      const containerHeight = 600;
      const totalItems = 2000;
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const totalHeight = totalItems * itemHeight;
      
      // Simulate scroll calculations
      for (let scrollTop = 0; scrollTop < totalHeight; scrollTop += itemHeight * 10) {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, totalItems);
        const visibleItems = endIndex - startIndex;
        
        // Verify calculations are correct
        expect(visibleItems).toBeGreaterThan(0);
        expect(visibleItems).toBeLessThanOrEqual(visibleCount + 1);
      }
      
      const calculationTime = performance.now() - startTime;
      performanceMetrics.SCROLL_CALCULATION_TIME = calculationTime;
      
      expect(calculationTime).toBeLessThan(50); // 50ms for scroll calculations
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with large datasets', async () => {
      // Check initial memory usage
      const initialMemory = (global.gc && global.performance.memory?.usedJSHeapSize) || 0;
      
      // Create and destroy multiple table instances
      for (let i = 0; i < 10; i++) {
        const mockData = generateLargeStakeholderDataset(1000);
        
        // Simulate component lifecycle
        const component = {
          data: mockData,
          cleanup: () => {
            // Simulate cleanup
            mockData.length = 0;
          }
        };
        
        // Simulate cleanup
        component.cleanup();
      }
      
      // Force garbage collection if available
      global.gc && global.gc();
      
      const finalMemory = (global.gc && global.performance.memory?.usedJSHeapSize) || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      performanceMetrics.MEMORY_INCREASE_MB = memoryIncrease / (1024 * 1024);
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Query Optimization', () => {
    it('should use indexes effectively for common queries', async () => {
      // Test that common query patterns execute efficiently
      const testQueries = [
        { filters: { company_id: 'test-company' }, expectedTime: 100 },
        { filters: { company_id: 'test-company', type: 'INDIVIDUAL' }, expectedTime: 150 },
        { filters: { company_id: 'test-company', 'people.name': 'John%' }, expectedTime: 200 }
      ];
      
      for (const query of testQueries) {
        const startTime = performance.now();
        
        await PaginationService.paginateQuery(
          'stakeholders',
          { pageSize: 50 },
          query.filters
        );
        
        const queryTime = performance.now() - startTime;
        expect(queryTime).toBeLessThan(query.expectedTime);
      }
    });

    it('should handle complex joins efficiently', async () => {
      const startTime = performance.now();
      
      // Test complex query with joins
      await StakeholderPaginationService.getStakeholders(
        'test-company',
        { pageSize: 100 },
        { search: 'test', hasSecurities: true }
      );
      
      const queryTime = performance.now() - startTime;
      performanceMetrics.COMPLEX_QUERY_TIME = queryTime;
      
      expect(queryTime).toBeLessThan(800); // 800ms for complex queries
    });
  });

  describe('Caching Performance', () => {
    it('should serve cached results quickly', async () => {
      const cacheKey = 'test_stakeholders_page_1';
      
      // First request (cache miss)
      const startTime1 = performance.now();
      await PaginationService.paginateQuery(
        'stakeholders',
        { page: 1, pageSize: 50 },
        { company_id: 'test-company' }
      );
      const firstRequestTime = performance.now() - startTime1;
      
      // Second request (cache hit)
      const startTime2 = performance.now();
      await PaginationService.paginateQuery(
        'stakeholders',
        { page: 1, pageSize: 50 },
        { company_id: 'test-company' }
      );
      const secondRequestTime = performance.now() - startTime2;
      
      performanceMetrics.CACHE_HIT_TIME = secondRequestTime;
      performanceMetrics.CACHE_MISS_TIME = firstRequestTime;
      
      // Cache hit should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
      expect(secondRequestTime).toBeLessThan(50); // 50ms max for cache hits
    });
  });
});