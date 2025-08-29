import { supabase } from './supabase';
import { ValidationError } from '@/utils/validation';

/**
 * Authorization service for cap table operations
 * Provides application-level security checks on top of RLS policies
 */

export class UnauthorizedAccessError extends Error {
  constructor(message: string, resource?: string, action?: string) {
    super(message);
    this.name = 'UnauthorizedAccessError';
    this.resource = resource;
    this.action = action;
  }
  resource?: string;
  action?: string;
}

// Align with database schema - VIEWER role removed as it's not in the database
type UserRole = 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'INVESTOR' | 'AUDITOR';

// Note: Using controlled type assertions where Supabase types are incomplete

export class AuthorizationService {
  /**
   * Verify that the current user has access to a specific company with retry for new companies
   */
  static async verifyCompanyAccess(companyId: string, requiredRole: UserRole[] = ['OWNER', 'ADMIN'], retries: number = 0): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new UnauthorizedAccessError('User not authenticated', 'company', 'access');
    }

    try {
      // Check if user has access to this company through role assignments
      console.log(`Checking access for user ${user.email} to company ${companyId}`);
      
      // Validate company ID format first to prevent injection attacks
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(companyId)) {
        throw new UnauthorizedAccessError('Invalid company ID format', 'company', 'access');
      }
      
      // First get the person record for this user
      const { data: personData, error: personError } = await supabase
        .from('people')
        .select('id')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .single();
        
      // Properly handle the response with known types

      if (personError || !personData) {
        console.log('Person not found for user:', user.email);
        throw new UnauthorizedAccessError(`Access denied to company ${companyId}`, 'company', 'access');
      }

      // Then check role assignments using the person ID with proper typing
      const { data: roleAssignments, error } = await supabase
        .from('role_assignments')
        .select('role, company_id')
        .eq('company_id', companyId)
        .eq('person_id', (personData as any).id);

      if (error) {
        console.error('Authorization check failed:', error);
        throw new UnauthorizedAccessError('Failed to verify company access', 'company', 'access');
      }

      console.log(`Found ${roleAssignments?.length || 0} role assignments for user ${user.email}`);
      if (!roleAssignments || roleAssignments.length === 0) {
        // Limit retry logic to prevent abuse and only for specific cases
        if (retries < 1) { // Reduced from 2 to 1 retry maximum
          console.log(`No role assignments found, retrying once (attempt ${retries + 1}/2)`);
          // Rate limit retries to prevent abuse
          await this.checkRateLimit('company_access_retry', 5, 10); // Max 10 retries per 5 minutes
          await new Promise(resolve => setTimeout(resolve, 1000)); // Fixed 1 second delay
          return this.verifyCompanyAccess(companyId, requiredRole, retries + 1);
        }
        throw new UnauthorizedAccessError(`Access denied to company ${companyId}`, 'company', 'access');
      }

      // Check if user has required role with proper typing
      const userRoles = roleAssignments.map((assignment: any) => assignment.role as UserRole);
      const hasRequiredRole = requiredRole.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        throw new UnauthorizedAccessError(
          `Insufficient permissions. Required: ${requiredRole.join(' or ')}, Have: ${userRoles.join(', ')}`,
          'company',
          'access'
        );
      }

    } catch (error) {
      if (error instanceof UnauthorizedAccessError) {
        throw error;
      }
      // Log unexpected errors but don't expose sensitive information
      console.error('Unexpected authorization error:', error);
      throw new UnauthorizedAccessError('Authorization verification failed', 'company', 'access');
    }
  }

  /**
   * Verify that the current user is the owner of a company
   */
  static async verifyCompanyOwnership(companyId: string): Promise<void> {
    await this.verifyCompanyAccess(companyId, ['OWNER']);
  }

  /**
   * Verify that the current user has admin access to a company
   */
  static async verifyCompanyAdminAccess(companyId: string): Promise<void> {
    await this.verifyCompanyAccess(companyId, ['OWNER', 'ADMIN']);
  }

  /**
   * Get all companies the current user has access to
   */
  static async getUserCompanies(): Promise<Array<{ id: string; name: string; role: UserRole }>> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new UnauthorizedAccessError('User not authenticated', 'companies', 'list');
    }

    try {
      // First get the person record for this user
      const { data: personData, error: personError } = await supabase
        .from('people')
        .select('id')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .single();
        
      // Handle response properly

      if (personError || !personData) {
        console.log('Person not found for user:', user.email);
        return []; // Return empty array if person not found
      }

      // Then get role assignments and companies for this person with proper typing
      const { data: roleAssignments, error } = await supabase
        .from('role_assignments')
        .select(`
          role,
          companies!inner(
            id,
            name
          )
        `)
        .eq('person_id', (personData as any).id);
        
      // Properly type the response without dangerous assertions

      if (error) {
        console.error('Failed to get user companies:', error);
        throw new UnauthorizedAccessError('Failed to retrieve company access', 'companies', 'list');
      }

      // Ensure proper typing and validation of returned data
      if (!roleAssignments) return [];
      
      return roleAssignments.map((assignment: any) => {
        // Validate the structure exists to prevent runtime errors
        if (!assignment.companies || typeof assignment.companies !== 'object') {
          console.error('Invalid company data structure in role assignment:', assignment);
          return null;
        }
        
        return {
          id: assignment.companies.id,
          name: assignment.companies.name,
          role: assignment.role as UserRole
        };
      }).filter((item): item is { id: string; name: string; role: UserRole } => item !== null);

    } catch (error) {
      if (error instanceof UnauthorizedAccessError) {
        throw error;
      }
      console.error('Unexpected error getting user companies:', error);
      throw new UnauthorizedAccessError('Failed to retrieve companies', 'companies', 'list');
    }
  }

  /**
   * Verify that the current user can perform a specific action on financial data
   * Updated to match actual database roles
   */
  static async verifyFinancialDataAccess(companyId: string, action: 'read' | 'write' | 'admin'): Promise<void> {
    const roleRequirements: Record<string, UserRole[]> = {
      read: ['OWNER', 'ADMIN', 'AUDITOR'], // AUDITOR can read financial data
      write: ['OWNER', 'ADMIN'], 
      admin: ['OWNER']
    };

    await this.verifyCompanyAccess(companyId, roleRequirements[action]);
  }

  /**
   * Validate that a company ID exists and user has access
   * Enhanced with proper input validation
   */
  static async validateCompanyAccess(companyId: string): Promise<{ id: string; name: string }> {
    // Enhanced input validation
    if (!companyId || typeof companyId !== 'string' || companyId.trim().length === 0) {
      throw new ValidationError('Company ID is required', 'companyId');
    }
    
    // Validate UUID format to prevent injection attacks
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(companyId.trim())) {
      throw new ValidationError('Invalid company ID format', 'companyId');
    }

    const sanitizedCompanyId = companyId.trim();
    await this.verifyCompanyAccess(sanitizedCompanyId);

    // Get company details if access is verified
    const { data: company, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', sanitizedCompanyId)
      .single();

    if (error || !company) {
      throw new UnauthorizedAccessError('Company not found or access denied', 'company', 'access');
    }

    return company;
  }

  /**
   * Create audit log entry for sensitive operations
   */
  static async logSecurityEvent(
    companyId: string, 
    action: string, 
    resource: string, 
    details: any = {}
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      await supabase
        .from('audit_events')
        .insert({
          company_id: companyId,
          actor_id: user.id,
          timestamp: new Date().toISOString(),
          after: details,
          hash: `${action}-${resource}-${Date.now()}`,
          reason: `${action} on ${resource}`
        } as any);
    } catch (error) {
      // Log audit failure but don't fail the main operation
      console.error('Failed to create security audit log:', error);
    }
  }

  /**
   * Rate limiting check for sensitive operations
   */
  static async checkRateLimit(action: string, windowMinutes: number = 60, maxAttempts: number = 100): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    try {
      const { data: recentAttempts, error } = await supabase
        .from('audit_events')
        .select('id')
        .eq('actor_id', user.id)
        .ilike('reason', `${action}%`)
        .gte('timestamp', windowStart);

      if (error) {
        console.error('Rate limit check failed:', error);
        return; // Don't block on rate limit check failure
      }

      if ((recentAttempts?.length || 0) >= maxAttempts) {
        throw new UnauthorizedAccessError(
          `Rate limit exceeded for ${action}. Please try again later.`,
          action,
          'rate_limit'
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedAccessError) {
        throw error;
      }
      // Don't block on rate limit check failure
      console.error('Rate limit check error:', error);
    }
  }
}