/**
 * Security Service for HTTP Headers and CORS Configuration
 * Implements security headers and CORS policies for production deployment
 */

export interface ICORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge?: number;
}

export interface ISecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'Referrer-Policy'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Permissions-Policy'?: string;
}

export class SecurityService {
  private static readonly DEFAULT_CORS_CONFIG: ICORSConfig = {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://app.captable.com',
      'https://staging.captable.com'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Cache-Control'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  private static readonly DEFAULT_SECURITY_HEADERS: ISecurityHeaders = {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=(self)',
      'usb=()',
      'serial=()',
      'bluetooth=()'
    ].join(', ')
  };

  /**
   * Get CORS configuration based on environment
   */
  static getCORSConfig(): ICORSConfig {
    const corsConfig = { ...this.DEFAULT_CORS_CONFIG };
    
    // Production-specific origins
    if (import.meta.env.PROD) {
      corsConfig.allowedOrigins = corsConfig.allowedOrigins.filter(
        origin => !origin.includes('localhost')
      );
      
      // Add production domains from environment
      const productionOrigin = import.meta.env.VITE_APP_URL;
      if (productionOrigin && !corsConfig.allowedOrigins.includes(productionOrigin)) {
        corsConfig.allowedOrigins.push(productionOrigin);
      }
    }
    
    return corsConfig;
  }

  /**
   * Get security headers configuration
   */
  static getSecurityHeaders(): ISecurityHeaders {
    const headers = { ...this.DEFAULT_SECURITY_HEADERS };
    
    // Development-specific adjustments
    if (import.meta.env.DEV) {
      // More relaxed CSP for development
      headers['Content-Security-Policy'] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' ws: wss:",
        "frame-src 'self'",
        "object-src 'none'"
      ].join('; ');
      
      // Allow framing in development
      headers['X-Frame-Options'] = 'SAMEORIGIN';
    }
    
    return headers;
  }

  /**
   * Check if origin is allowed by CORS policy
   */
  static isOriginAllowed(origin: string): boolean {
    const corsConfig = this.getCORSConfig();
    
    // Allow requests without origin (mobile apps, etc.)
    if (!origin) {
      return true;
    }
    
    return corsConfig.allowedOrigins.includes(origin) || 
           corsConfig.allowedOrigins.includes('*');
  }

  /**
   * Generate CORS headers for a request
   */
  static getCORSHeaders(requestOrigin?: string): Record<string, string> {
    const corsConfig = this.getCORSConfig();
    const headers: Record<string, string> = {};
    
    // Set allowed origin
    if (requestOrigin && this.isOriginAllowed(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    } else if (corsConfig.allowedOrigins.includes('*')) {
      headers['Access-Control-Allow-Origin'] = '*';
    }
    
    // Set other CORS headers
    headers['Access-Control-Allow-Methods'] = corsConfig.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = corsConfig.allowedHeaders.join(', ');
    
    if (corsConfig.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    if (corsConfig.maxAge) {
      headers['Access-Control-Max-Age'] = corsConfig.maxAge.toString();
    }
    
    return headers;
  }

  /**
   * Apply security headers to a response (for use with fetch interceptors)
   */
  static applySecurityHeaders(): void {
    const headers = this.getSecurityHeaders();
    
    // Apply headers via meta tags (limited effectiveness but better than nothing)
    Object.entries(headers).forEach(([name, value]) => {
      if (name === 'Content-Security-Policy') {
        let metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (!metaCSP) {
          metaCSP = document.createElement('meta');
          metaCSP.setAttribute('http-equiv', 'Content-Security-Policy');
          document.head.appendChild(metaCSP);
        }
        metaCSP.setAttribute('content', value);
      }
    });
  }

  /**
   * Validate Content Security Policy compliance
   */
  static validateCSPCompliance(): {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for inline scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    if (inlineScripts.length > 0) {
      violations.push(`Found ${inlineScripts.length} inline script(s)`);
      recommendations.push('Move inline scripts to external files or use nonce/hash');
    }

    // Check for inline styles
    const inlineStyles = document.querySelectorAll('style, [style]');
    if (inlineStyles.length > 0) {
      violations.push(`Found ${inlineStyles.length} inline style(s)`);
      recommendations.push('Move inline styles to CSS files or use nonce/hash');
    }

    // Check for unsafe eval usage
    try {
      eval('1+1');
      violations.push('eval() is available and not blocked');
      recommendations.push('Ensure CSP blocks unsafe-eval in production');
    } catch {
      // Good - eval is blocked
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * Get security audit report
   */
  static getSecurityAudit(): {
    cors: {
      configured: boolean;
      allowedOrigins: string[];
    };
    headers: {
      configured: boolean;
      missing: string[];
      present: string[];
    };
    csp: {
      compliant: boolean;
      violations: string[];
      recommendations: string[];
    };
  } {
    const corsConfig = this.getCORSConfig();
    const securityHeaders = this.getSecurityHeaders();
    const cspCompliance = this.validateCSPCompliance();

    // Check which headers are actually applied (limited in browser context)
    const presentHeaders: string[] = [];
    const missingHeaders: string[] = [];
    
    Object.keys(securityHeaders).forEach(header => {
      // This is limited in browser - would need server-side implementation
      // for complete header verification
      if (header === 'Content-Security-Policy') {
        const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (metaCSP) {
          presentHeaders.push(header);
        } else {
          missingHeaders.push(header);
        }
      } else {
        // Other headers can't be easily checked in browser context
        missingHeaders.push(header);
      }
    });

    return {
      cors: {
        configured: true,
        allowedOrigins: corsConfig.allowedOrigins
      },
      headers: {
        configured: presentHeaders.length > 0,
        missing: missingHeaders,
        present: presentHeaders
      },
      csp: cspCompliance
    };
  }

  /**
   * Initialize security service (apply headers, setup interceptors)
   */
  static initialize(): void {
    // Apply security headers
    this.applySecurityHeaders();

    // Set up fetch interceptor for CORS headers (for API calls)
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      // Add CORS headers to API requests
      const url = typeof input === 'string' ? input : input.toString();
      
      if (url.includes('/api/') || url.includes('supabase.co')) {
        const corsHeaders = this.getCORSHeaders(window.location.origin);
        
        init.headers = {
          ...init.headers,
          ...corsHeaders
        };

        // Ensure credentials are included for authenticated requests
        if (init.credentials === undefined) {
          init.credentials = 'include';
        }
      }

      return originalFetch(input, init);
    };

    // Log security status in development
    if (import.meta.env.DEV) {
      console.log('[Security] Security service initialized');
      const audit = this.getSecurityAudit();
      console.log('[Security] Security audit:', audit);
    }
  }
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      SecurityService.initialize();
    });
  } else {
    SecurityService.initialize();
  }
}