import { SupabaseClient } from '@supabase/supabase-js';
import { CSRFService, CSRFError } from './csrfService';

/**
 * CSRF Protection Middleware for Supabase Client
 * Automatically adds CSRF tokens to state-changing operations
 */
export class CSRFMiddleware {
  private static instance: CSRFMiddleware | null = null;
  private client: SupabaseClient | null = null;
  private originalMethods: Map<string, Function> = new Map();

  private constructor() {}

  static getInstance(): CSRFMiddleware {
    if (!CSRFMiddleware.instance) {
      CSRFMiddleware.instance = new CSRFMiddleware();
    }
    return CSRFMiddleware.instance;
  }

  /**
   * Initialize CSRF protection for Supabase client
   */
  initialize(client: SupabaseClient): void {
    if (this.client === client) {
      return; // Already initialized
    }

    this.client = client;
    this.wrapSupabaseMethods();
  }

  /**
   * Wrap Supabase methods to add CSRF protection
   */
  private wrapSupabaseMethods(): void {
    if (!this.client) return;

    // Protected tables that require CSRF tokens for mutations
    const protectedTables = [
      'stakeholders',
      'securities',
      'transactions',
      'people',
      'grants',
      'vesting_schedules',
      'role_assignments'
    ];

    // Store original from method
    const originalFrom = this.client.from.bind(this.client);
    
    // Override from method to wrap table operations
    this.client.from = (table: string) => {
      const tableQuery = originalFrom(table);

      if (protectedTables.includes(table)) {
        return this.wrapTableMethods(tableQuery, table);
      }

      return tableQuery;
    };
  }

  /**
   * Wrap table methods (insert, update, upsert) with CSRF protection
   */
  private wrapTableMethods(tableQuery: any, tableName: string): any {
    const originalInsert = tableQuery.insert?.bind(tableQuery);
    const originalUpdate = tableQuery.update?.bind(tableQuery);
    const originalUpsert = tableQuery.upsert?.bind(tableQuery);
    const originalDelete = tableQuery.delete?.bind(tableQuery);

    if (originalInsert) {
      tableQuery.insert = this.wrapMutationMethod(originalInsert, 'INSERT', tableName);
    }

    if (originalUpdate) {
      tableQuery.update = this.wrapMutationMethod(originalUpdate, 'UPDATE', tableName);
    }

    if (originalUpsert) {
      tableQuery.upsert = this.wrapMutationMethod(originalUpsert, 'UPSERT', tableName);
    }

    if (originalDelete) {
      tableQuery.delete = this.wrapMutationMethod(originalDelete, 'DELETE', tableName);
    }

    return tableQuery;
  }

  /**
   * Wrap individual mutation methods with CSRF validation
   */
  private wrapMutationMethod(
    originalMethod: Function, 
    operation: string, 
    tableName: string
  ): Function {
    return async (...args: any[]) => {
      try {
        // Check if this is a critical financial operation
        if (this.isCriticalFinancialOperation(tableName, operation)) {
          // Validate CSRF token for critical operations
          await this.validateCSRFForOperation(tableName, operation, args[0]);
        }

        // Call original method
        return await originalMethod(...args);
      } catch (error) {
        // Log security event for failed operations
        this.logSecurityEvent(tableName, operation, error);
        throw error;
      }
    };
  }

  /**
   * Determine if operation requires CSRF protection
   */
  private isCriticalFinancialOperation(tableName: string, operation: string): boolean {
    const criticalTables = ['securities', 'transactions', 'stakeholders', 'grants'];
    const criticalOperations = ['INSERT', 'UPDATE', 'DELETE'];

    return criticalTables.includes(tableName) && criticalOperations.includes(operation);
  }

  /**
   * Validate CSRF token for operation
   */
  private async validateCSRFForOperation(
    tableName: string, 
    operation: string, 
    payload: any
  ): Promise<void> {
    // Extract CSRF token from payload
    const csrfToken = payload?.csrfToken || payload?.csrf_token;
    
    if (!csrfToken) {
      throw new CSRFError(`CSRF token required for ${operation} operation on ${tableName}`);
    }

    // Extract company ID from payload for context-aware validation
    const companyId = payload?.company_id || payload?.companyId;

    try {
      if (this.isFinancialTransaction(tableName)) {
        // Use financial transaction validation for critical operations
        await CSRFService.validateFinancialTransaction(
          csrfToken,
          this.mapOperationToTransactionType(operation),
          companyId,
          payload
        );
      } else {
        // Use standard token validation for non-financial operations
        await CSRFService.validateToken(csrfToken, companyId);
      }
    } catch (error) {
      throw new CSRFError(`CSRF validation failed for ${operation} on ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if table represents financial transaction
   */
  private isFinancialTransaction(tableName: string): boolean {
    const financialTables = ['securities', 'transactions', 'grants'];
    return financialTables.includes(tableName);
  }

  /**
   * Map database operation to transaction type
   */
  private mapOperationToTransactionType(operation: string): 'ISSUE' | 'TRANSFER' | 'CANCEL' | 'CONVERT' | 'EXERCISE' {
    switch (operation) {
      case 'INSERT':
        return 'ISSUE';
      case 'UPDATE':
        return 'TRANSFER';
      case 'DELETE':
        return 'CANCEL';
      default:
        return 'ISSUE';
    }
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(tableName: string, operation: string, error: any): void {
    console.error('CSRF Middleware Security Event', {
      tableName,
      operation,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    });
  }

  /**
   * Restore original Supabase methods (for testing/cleanup)
   */
  restore(): void {
    if (!this.client) return;

    this.originalMethods.forEach((originalMethod, methodName) => {
      (this.client as any)[methodName] = originalMethod;
    });

    this.originalMethods.clear();
    this.client = null;
  }
}

/**
 * Initialize CSRF middleware for a Supabase client
 */
export function initializeCSRFMiddleware(client: SupabaseClient): void {
  const middleware = CSRFMiddleware.getInstance();
  middleware.initialize(client);
}

/**
 * Utility function to manually validate CSRF for custom operations
 */
export async function validateCSRFToken(
  token: string, 
  operation: 'READ' | 'WRITE' | 'ADMIN' = 'WRITE',
  companyId?: string
): Promise<void> {
  if (operation === 'READ') {
    // Read operations typically don't require CSRF
    return;
  }

  try {
    await CSRFService.validateToken(token, companyId);
  } catch (error) {
    throw new CSRFError(`CSRF validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}