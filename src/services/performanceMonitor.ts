/**
 * Performance Monitoring Service
 * Tracks web vitals and performance metrics
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  componentRenderTime?: number;
  apiResponseTime?: number;
  routeChangeTime?: number;
  memoryUsage?: number;
  bundleSize?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private timers: Map<string, number> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.initializeObservers();
      this.trackMemoryUsage();
    }
  }

  /**
   * Initialize performance observers for Web Vitals
   */
  private initializeObservers() {
    // Largest Contentful Paint
    this.observeLCP();
    
    // First Input Delay
    this.observeFID();
    
    // Cumulative Layout Shift
    this.observeCLS();
    
    // First Contentful Paint
    this.observeFCP();
    
    // Time to First Byte
    this.observeTTFB();
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        this.logMetric('LCP', this.metrics.lcp);
      });
      
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.set('lcp', observer);
    } catch (e) {
      console.warn('LCP observer not supported');
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.logMetric('FID', this.metrics.fid);
        });
      });
      
      observer.observe({ type: 'first-input', buffered: true });
      this.observers.set('fid', observer);
    } catch (e) {
      console.warn('FID observer not supported');
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS() {
    let clsValue = 0;
    let clsEntries: any[] = [];

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
        this.metrics.cls = clsValue;
        this.logMetric('CLS', this.metrics.cls);
      });
      
      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('cls', observer);
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  /**
   * Observe First Contentful Paint
   */
  private observeFCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
            this.logMetric('FCP', this.metrics.fcp);
          }
        });
      });
      
      observer.observe({ type: 'paint', buffered: true });
      this.observers.set('fcp', observer);
    } catch (e) {
      console.warn('FCP observer not supported');
    }
  }

  /**
   * Observe Time to First Byte
   */
  private observeTTFB() {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        this.metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        this.logMetric('TTFB', this.metrics.ttfb);
      }
    } catch (e) {
      console.warn('TTFB measurement not supported');
    }
  }

  /**
   * Track memory usage
   */
  private trackMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1048576; // Convert to MB
        
        // Warn if memory usage is high
        if (this.metrics.memoryUsage > 50) {
          console.warn(`High memory usage: ${this.metrics.memoryUsage.toFixed(2)} MB`);
        }
      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Start timing a custom metric
   */
  startTimer(name: string) {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing and record a custom metric
   */
  endTimer(name: string): number | null {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.logMetric(name, duration);
    return duration;
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, renderTime: number) {
    this.logMetric(`Component:${componentName}`, renderTime);
    
    // Warn if component is slow
    if (renderTime > 16) { // Longer than one frame (60fps)
      console.warn(`Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track API response time
   */
  trackApiCall(endpoint: string, duration: number, status: number) {
    this.logMetric(`API:${endpoint}`, duration);
    
    // Warn if API is slow
    if (duration > 1000) {
      console.warn(`Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
    }
    
    // Track errors
    if (status >= 400) {
      console.error(`API error: ${endpoint} returned ${status}`);
    }
  }

  /**
   * Track route change performance
   */
  trackRouteChange(from: string, to: string, duration: number) {
    this.logMetric(`Route:${from}->${to}`, duration);
    
    if (duration > 100) {
      console.warn(`Slow route change: ${from} -> ${to} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const weights = {
      lcp: 0.25,   // Target: < 2.5s
      fid: 0.25,   // Target: < 100ms
      cls: 0.25,   // Target: < 0.1
      fcp: 0.15,   // Target: < 1.8s
      ttfb: 0.10   // Target: < 600ms
    };

    let score = 0;
    
    // LCP score
    if (this.metrics.lcp !== undefined) {
      score += weights.lcp * Math.max(0, Math.min(100, 100 - (this.metrics.lcp - 2500) / 40));
    }
    
    // FID score
    if (this.metrics.fid !== undefined) {
      score += weights.fid * Math.max(0, Math.min(100, 100 - (this.metrics.fid - 100) / 3));
    }
    
    // CLS score
    if (this.metrics.cls !== undefined) {
      score += weights.cls * Math.max(0, Math.min(100, 100 - (this.metrics.cls - 0.1) / 0.0025));
    }
    
    // FCP score
    if (this.metrics.fcp !== undefined) {
      score += weights.fcp * Math.max(0, Math.min(100, 100 - (this.metrics.fcp - 1800) / 30));
    }
    
    // TTFB score
    if (this.metrics.ttfb !== undefined) {
      score += weights.ttfb * Math.max(0, Math.min(100, 100 - (this.metrics.ttfb - 600) / 8));
    }

    return Math.round(score);
  }

  /**
   * Log metric for debugging
   */
  private logMetric(name: string, value: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`);
    }
    
    // In production, you would send this to an analytics service
    // this.sendToAnalytics(name, value);
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(name: string, value: number) {
    // Implement analytics integration
    // Example: Google Analytics, Sentry, custom backend
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance', {
        event_category: 'Web Vitals',
        event_label: name,
        value: Math.round(value),
        non_interaction: true,
      });
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    
    return `
Performance Report
==================
Score: ${score}/100

Core Web Vitals:
- LCP: ${metrics.lcp?.toFixed(2) || 'N/A'} ms
- FID: ${metrics.fid?.toFixed(2) || 'N/A'} ms
- CLS: ${metrics.cls?.toFixed(4) || 'N/A'}

Additional Metrics:
- FCP: ${metrics.fcp?.toFixed(2) || 'N/A'} ms
- TTFB: ${metrics.ttfb?.toFixed(2) || 'N/A'} ms
- Memory: ${metrics.memoryUsage?.toFixed(2) || 'N/A'} MB

Recommendations:
${this.getRecommendations().join('\n')}
    `;
  }

  /**
   * Get performance recommendations
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.lcp && this.metrics.lcp > 2500) {
      recommendations.push('- Optimize largest contentful paint (current: ' + this.metrics.lcp.toFixed(0) + 'ms, target: <2500ms)');
    }
    
    if (this.metrics.fid && this.metrics.fid > 100) {
      recommendations.push('- Reduce first input delay (current: ' + this.metrics.fid.toFixed(0) + 'ms, target: <100ms)');
    }
    
    if (this.metrics.cls && this.metrics.cls > 0.1) {
      recommendations.push('- Fix layout shift issues (current: ' + this.metrics.cls.toFixed(3) + ', target: <0.1)');
    }
    
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 50) {
      recommendations.push('- Optimize memory usage (current: ' + this.metrics.memoryUsage.toFixed(0) + 'MB)');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✓ Performance is within acceptable thresholds');
    }
    
    return recommendations;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.timers.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    startTimer: (name: string) => performanceMonitor.startTimer(name),
    endTimer: (name: string) => performanceMonitor.endTimer(name),
    trackComponentRender: (name: string, time: number) => performanceMonitor.trackComponentRender(name, time),
    trackApiCall: (endpoint: string, duration: number, status: number) => performanceMonitor.trackApiCall(endpoint, duration, status),
    getMetrics: () => performanceMonitor.getMetrics(),
    getScore: () => performanceMonitor.getPerformanceScore(),
    generateReport: () => performanceMonitor.generateReport(),
  };
}