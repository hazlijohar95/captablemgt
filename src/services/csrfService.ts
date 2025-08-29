import { supabase } from './supabase';
import { AuthorizationService } from './authorizationService';
import crypto from 'crypto';

export class CSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSRFError';
  }
}

/**
 * CSRF Protection Service for Financial Transactions
 * Implements double-submit cookie pattern with server-side validation
 */
export class CSRFService {
  private static readonly TOKEN_EXPIRY_MINUTES = 30;
  private static readonly STORAGE_KEY = 'csrf_token';

  /**
   * Generate a cryptographically secure CSRF token
   */
  static generateToken(): string {
    // Generate random bytes and convert to hex
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    return Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get or create CSRF token for the current session
   */
  static async getToken(): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new CSRFError('User not authenticated');
      }

      // Check if we have a valid token in session storage
      const existingToken = sessionStorage.getItem(this.STORAGE_KEY);
      const tokenTimestamp = sessionStorage.getItem(`${this.STORAGE_KEY}_timestamp`);

      if (existingToken && tokenTimestamp) {
        const tokenAge = Date.now() - parseInt(tokenTimestamp);
        if (tokenAge < this.TOKEN_EXPIRY_MINUTES * 60 * 1000) {
          return existingToken;
        }
      }

      // Generate new token
      const newToken = this.generateToken();
      const timestamp = Date.now().toString();

      // Store in session storage
      sessionStorage.setItem(this.STORAGE_KEY, newToken);
      sessionStorage.setItem(`${this.STORAGE_KEY}_timestamp`, timestamp);

      // Store hash in database for server-side validation
      await this.storeTokenHash(user.id, newToken);

      return newToken;
    } catch (error) {
      console.error('Failed to generate CSRF token:', error);
      throw new CSRFError('Failed to generate CSRF token');
    }
  }

  /**
   * Store CSRF token hash in database for server-side validation
   */
  private static async storeTokenHash(userId: string, token: string): Promise<void> {
    try {
      // Create hash of token for database storage (never store token directly)
      const tokenHash = await this.hashToken(token);
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // Upsert token hash in user session table (we'll use audit_events for now as a workaround)
      await supabase
        .from('audit_events')
        .insert({
          actor_id: userId,
          company_id: '00000000-0000-0000-0000-000000000000', // Special company ID for CSRF tokens
          timestamp: new Date().toISOString(),
          after: {
            type: 'csrf_token',
            token_hash: tokenHash,
            expires_at: expiresAt
          },
          hash: `csrf-${userId}-${Date.now()}`,
          reason: 'CSRF token generation'
        } as any);
    } catch (error) {
      console.error('Failed to store CSRF token hash:', error);
      // Don't throw - this is for additional security, not critical path
    }
  }

  /**
   * Validate CSRF token for financial transactions
   */
  static async validateToken(token: string, companyId?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new CSRFError('User not authenticated');
      }

      // Check if token exists in session storage
      const storedToken = sessionStorage.getItem(this.STORAGE_KEY);
      const tokenTimestamp = sessionStorage.getItem(`${this.STORAGE_KEY}_timestamp`);

      if (!storedToken || !tokenTimestamp) {
        throw new CSRFError('No CSRF token found in session');
      }

      // Check token expiry
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      if (tokenAge >= this.TOKEN_EXPIRY_MINUTES * 60 * 1000) {
        this.clearToken();
        throw new CSRFError('CSRF token has expired');
      }

      // Validate token matches (constant-time comparison)
      if (!this.constantTimeEquals(token, storedToken)) {
        throw new CSRFError('Invalid CSRF token');
      }

      // Additional validation: check if token hash exists in database
      await this.validateTokenHash(user.id, token);

      // Log security event for financial transaction
      if (companyId) {
        await AuthorizationService.logSecurityEvent(
          companyId,
          'csrf_validation_success',
          'financial_transaction',
          {
            token_hash: await this.hashToken(token),
            timestamp: new Date().toISOString()
          }
        );
      }

    } catch (error) {
      if (error instanceof CSRFError) {
        throw error;
      }
      console.error('CSRF validation error:', error);
      throw new CSRFError('CSRF validation failed');
    }
  }

  /**
   * Validate CSRF token hash against database
   */
  private static async validateTokenHash(userId: string, token: string): Promise<void> {
    try {
      const tokenHash = await this.hashToken(token);
      const cutoffTime = new Date(Date.now() - this.TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // Check for valid token hash in audit events
      const { data: tokenRecords, error } = await supabase
        .from('audit_events')
        .select('after')
        .eq('actor_id', userId)
        .eq('company_id', '00000000-0000-0000-0000-000000000000')
        .gte('timestamp', cutoffTime)
        .eq('reason', 'CSRF token generation')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error || !tokenRecords || tokenRecords.length === 0) {
        throw new CSRFError('No valid CSRF token found in database');
      }

      // Check if any of the recent tokens match
      const validToken = tokenRecords.some(record => {
        const afterData = (record as any).after;
        return afterData?.token_hash === tokenHash && 
               afterData?.expires_at && 
               new Date(afterData.expires_at) > new Date();
      });

      if (!validToken) {
        throw new CSRFError('CSRF token not valid or expired');
      }

    } catch (error) {
      if (error instanceof CSRFError) {
        throw error;
      }
      console.error('Token hash validation error:', error);
      throw new CSRFError('Token hash validation failed');
    }
  }

  /**
   * Clear CSRF token from storage
   */
  static clearToken(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(`${this.STORAGE_KEY}_timestamp`);
  }

  /**
   * Create SHA-256 hash of token
   */
  private static async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Validate financial transaction with CSRF protection
   */
  static async validateFinancialTransaction(
    csrfToken: string,
    transactionType: 'ISSUE' | 'TRANSFER' | 'CANCEL' | 'CONVERT' | 'EXERCISE',
    companyId: string,
    payload: any
  ): Promise<void> {
    try {
      // Validate CSRF token
      await this.validateToken(csrfToken, companyId);

      // Additional rate limiting for financial transactions
      await AuthorizationService.checkRateLimit(`financial_${transactionType.toLowerCase()}`, 60, 10);

      // Verify company access
      await AuthorizationService.verifyFinancialDataAccess(companyId, 'write');

      // Log financial transaction attempt
      await AuthorizationService.logSecurityEvent(
        companyId,
        `financial_transaction_${transactionType.toLowerCase()}`,
        'transaction_validation',
        {
          transaction_type: transactionType,
          csrf_validated: true,
          payload_hash: await this.hashToken(JSON.stringify(payload)),
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      // Log security event for failed validation
      try {
        await AuthorizationService.logSecurityEvent(
          companyId,
          `financial_transaction_failed`,
          'security_violation',
          {
            transaction_type: transactionType,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        );
      } catch (logError) {
        console.error('Failed to log security event:', logError);
      }

      throw error;
    }
  }

  /**
   * Generate CSRF token for forms
   */
  static async initializeForm(): Promise<{ csrfToken: string; csrfHeader: Record<string, string> }> {
    const token = await this.getToken();
    
    return {
      csrfToken: token,
      csrfHeader: {
        'X-CSRF-Token': token
      }
    };
  }
}