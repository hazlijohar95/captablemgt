import { supabase } from '@/services/supabase';

export interface QueryResult {
  rows: any[];
  error?: Error;
}

export class DatabaseService {
  protected async executeQuery(query: string, params?: any[]): Promise<QueryResult> {
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query,
        params: params || []
      });

      if (error) {
        return { rows: [], error };
      }

      return { rows: data || [] };
    } catch (error) {
      return { 
        rows: [], 
        error: error instanceof Error ? error : new Error('Database query failed') 
      };
    }
  }

  protected async withTransaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    // Supabase doesn't have direct transaction support in JS client
    // This is a simplified version - in production, you'd use a server-side function
    try {
      const result = await callback(supabase);
      return result;
    } catch (error) {
      throw error;
    }
  }

  protected async logAuditEvent(params: {
    companyId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: any;
  }) {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        company_id: params.companyId,
        user_id: params.userId,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        metadata: params.metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}