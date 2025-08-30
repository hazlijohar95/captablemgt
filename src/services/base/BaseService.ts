/**
 * Base Service with Transaction Management and Error Handling
 * Provides common database operations and error handling patterns
 */

import { supabase } from '../supabase';
import { ValidationError, AuthenticationError, NotFoundError } from '@/utils/validation';

export interface DatabaseClient {
  query: (sql: string, params?: any[]) => Promise<{ data: any; error: any }>;
}

export abstract class BaseService {
  protected async executeWithTransaction<T>(
    operation: (client: DatabaseClient) => Promise<T>
  ): Promise<T> {
    const client = supabase;
    
    try {
      // Start transaction
      const { error: beginError } = await client.rpc('begin_transaction');
      if (beginError) throw beginError;
      
      const result = await operation(client as DatabaseClient);
      
      // Commit transaction
      const { error: commitError } = await client.rpc('commit_transaction');
      if (commitError) throw commitError;
      
      return result;
    } catch (error) {
      // Rollback transaction
      await client.rpc('rollback_transaction').catch(rollbackError => {
        console.error('Failed to rollback transaction:', rollbackError);
      });
      
      throw this.handleError(error);
    }
  }
  
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) break;
        if (!this.isRetryableError(error)) throw this.handleError(error);
        
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    throw this.handleError(lastError!);
  }
  
  protected isRetryableError(error: any): boolean {
    // Database connection errors, timeout errors, etc.
    const retryableErrorCodes = [
      'ECONNRESET',
      'ETIMEDOUT', 
      'ENOTFOUND',
      'PGRST301', // Supabase rate limit
      'PGRST204'  // Supabase timeout
    ];
    
    const errorCode = error?.code || error?.message;
    return retryableErrorCodes.some(code => 
      errorCode?.toString().includes(code)
    );
  }
  
  protected handleError(error: any): Error {
    // Already a known error type
    if (error instanceof ValidationError || 
        error instanceof AuthenticationError || 
        error instanceof NotFoundError) {
      return error;
    }
    
    // Database constraint violations
    if (error?.code === '23505') { // Unique violation
      return new ValidationError('Duplicate entry detected');
    }
    
    if (error?.code === '23503') { // Foreign key violation
      return new ValidationError('Referenced record not found');
    }
    
    if (error?.code === '23502') { // Not null violation
      return new ValidationError('Required field is missing');
    }
    
    // Supabase specific errors
    if (error?.code === 'PGRST116') {
      return new NotFoundError('Resource not found');
    }
    
    if (error?.code === 'PGRST301') {
      return new ValidationError('Request rate limit exceeded');
    }
    
    // Authentication errors
    if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
      return new AuthenticationError('Authentication required');
    }
    
    // Generic database error
    console.error('Unhandled database error:', error);
    return new Error('Internal server error');
  }
  
  protected async validateRecord(
    table: string, 
    id: string, 
    select: string = 'id'
  ): Promise<any> {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      throw new NotFoundError(`${table} record not found: ${id}`);
    }
    
    return data;
  }
  
  protected async validateUserAccess(
    companyId: string,
    userId: string,
    requiredRole?: string
  ): Promise<void> {
    const { data, error } = await supabase
      .from('company_users')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      throw new AuthenticationError('Access denied: User not associated with company');
    }
    
    if (requiredRole && data.role !== requiredRole) {
      throw new AuthenticationError(`Access denied: ${requiredRole} role required`);
    }
  }
  
  protected logOperation(
    operation: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, any>
  ): void {
    // Audit logging - fire and forget
    auditService.logActivity({
      user_id: userId,
      action: operation,
      entity_type: 'reporting',
      entity_id: entityId,
      metadata: metadata || {}
    }).catch(error => {
      console.error('Failed to log audit event:', error);
    });
  }
}