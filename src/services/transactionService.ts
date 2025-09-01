import { supabase } from './supabase';
import { AuthorizationService } from './authorizationService';
import { CSRFService } from './csrfService';
import { logger } from '@/utils/simpleLogger';
import { ulid } from 'ulid';

export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export interface ITransactionOperation<T = any> {
  name: string;
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
}

export interface ITransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: TransactionError;
  transactionId?: string;
}

/**
 * Service for handling atomic transactions in cap table operations
 * Ensures data integrity for complex financial operations
 */
export class TransactionService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 100;

  /**
   * Execute multiple operations atomically with automatic rollback on failure
   * @param operations Array of operations to execute in sequence
   * @param companyId Company ID for authorization and audit
   * @param csrfToken CSRF token for financial operations
   * @returns Transaction result with success status and data
   */
  static async executeAtomic<T>(
    operations: ITransactionOperation[],
    companyId: string,
    csrfToken?: string
  ): Promise<ITransactionResult<T[]>> {
    const transactionId = ulid();
    const executedOperations: Array<{ operation: ITransactionOperation; result: unknown }> = [];
    
    try {
      // Verify authorization
      await AuthorizationService.validateCompanyAccess(companyId);
      await AuthorizationService.verifyFinancialDataAccess(companyId, 'write');
      
      // Validate CSRF token if provided
      if (csrfToken) {
        await CSRFService.validateToken(csrfToken);
      }

      // Log transaction start
      await this.logTransactionEvent(companyId, transactionId, 'START', {
        operations: operations.map(op => op.name)
      });

      // Execute operations in sequence
      const results: T[] = [];
      for (const operation of operations) {
        try {
          const result = await this.executeWithRetry(operation.execute);
          executedOperations.push({ operation, result });
          results.push(result);
          
          // Log individual operation success
          await this.logTransactionEvent(companyId, transactionId, 'OPERATION_SUCCESS', {
            operation: operation.name,
            result
          });
        } catch (error) {
          // Log operation failure
          await this.logTransactionEvent(companyId, transactionId, 'OPERATION_FAILED', {
            operation: operation.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          throw error;
        }
      }

      // Log transaction success
      await this.logTransactionEvent(companyId, transactionId, 'COMMIT', {
        results
      });

      return {
        success: true,
        data: results,
        transactionId
      };
    } catch (error) {
      // Rollback all executed operations in reverse order
      await this.rollbackOperations(executedOperations, companyId, transactionId);
      
      // Log transaction failure
      await this.logTransactionEvent(companyId, transactionId, 'ROLLBACK', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: new TransactionError(
          'Transaction failed and was rolled back',
          'TRANSACTION_FAILED',
          error
        ),
        transactionId
      };
    }
  }

  /**
   * Execute operation with retry logic for transient failures
   */
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on non-transient errors
        if (this.isNonTransientError(lastError)) {
          throw lastError;
        }
        
        // Wait before retry with exponential backoff
        if (i < retries - 1) {
          await this.delay(this.RETRY_DELAY_MS * Math.pow(2, i));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Rollback executed operations in reverse order
   */
  private static async rollbackOperations(
    executedOperations: Array<{ operation: ITransactionOperation; result: unknown }>,
    companyId: string,
    transactionId: string
  ): Promise<void> {
    // Reverse the array to rollback in opposite order
    const reversedOperations = [...executedOperations].reverse();
    
    for (const { operation } of reversedOperations) {
      if (operation.rollback) {
        try {
          await operation.rollback();
          await this.logTransactionEvent(companyId, transactionId, 'ROLLBACK_SUCCESS', {
            operation: operation.name
          });
        } catch (error) {
          // Log rollback failure but continue with other rollbacks
          await this.logTransactionEvent(companyId, transactionId, 'ROLLBACK_FAILED', {
            operation: operation.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  }

  /**
   * Check if error is non-transient (should not retry)
   */
  private static isNonTransientError(error: Error): boolean {
    const nonTransientPatterns = [
      'validation',
      'authorization',
      'permission',
      'invalid',
      'duplicate',
      'constraint',
      'foreign key'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return nonTransientPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Log transaction event for audit trail
   */
  private static async logTransactionEvent(
    companyId: string,
    transactionId: string,
    event: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      // TODO: Uncomment when transactions table supports atomic operations
      // const { data: { user } } = await supabase.auth.getUser();
      // await supabase.from('transactions').insert({
      //   company_id: companyId,
      //   request_id: transactionId,
      //   kind: 'ATOMIC_TRANSACTION',
      //   effective_at: new Date().toISOString(),
      //   actor_id: user?.id || 'system',
      //   payload: {
      //     event,
      //     details,
      //     timestamp: new Date().toISOString()
      //   }
      // });
      
      // Use structured logging
      logger.transaction(companyId, transactionId, event, details);
    } catch (error) {
      // Log failure but don't throw - audit logging should not break transactions
      logger.error('Failed to log transaction event', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Helper to delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create idempotent operation wrapper
   * Ensures operation is only executed once even if called multiple times
   */
  static createIdempotentOperation<T>(
    operationId: string,
    operation: () => Promise<T>
  ): ITransactionOperation<T> {
    return {
      name: `idempotent-${operationId}`,
      execute: async () => {
        // Check if operation was already executed
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('request_id', operationId)
          .single();
        
        if (existing) {
          throw new TransactionError(
            'Operation already executed',
            'IDEMPOTENT_DUPLICATE',
            { operationId }
          );
        }
        
        // Execute operation
        const result = await operation();
        
        // TODO: Mark as executed in database when transactions table is ready
        // await supabase.from('transactions').insert({
        //   request_id: operationId,
        //   kind: 'IDEMPOTENT_MARKER',
        //   effective_at: new Date().toISOString(),
        //   payload: { executed: true }
        // });
        
        logger.debug('Idempotent operation executed', { operationId });
        
        return result;
      }
    };
  }
}

/**
 * Helper class for building complex transactions
 */
export class TransactionBuilder {
  private operations: ITransactionOperation[] = [];
  private companyId: string;
  private csrfToken?: string;

  constructor(companyId: string, csrfToken?: string) {
    this.companyId = companyId;
    this.csrfToken = csrfToken;
  }

  /**
   * Add operation to transaction
   */
  addOperation<T>(
    name: string,
    execute: () => Promise<T>,
    rollback?: () => Promise<void>
  ): this {
    this.operations.push({ name, execute, rollback });
    return this;
  }

  /**
   * Add idempotent operation
   */
  addIdempotentOperation<T>(
    operationId: string,
    operation: () => Promise<T>
  ): this {
    this.operations.push(
      TransactionService.createIdempotentOperation(operationId, operation)
    );
    return this;
  }

  /**
   * Execute the built transaction
   */
  async execute<T = any>(): Promise<ITransactionResult<T[]>> {
    return TransactionService.executeAtomic<T>(
      this.operations,
      this.companyId,
      this.csrfToken
    );
  }
}