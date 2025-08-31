/**
 * Employee Portal Service
 * Secure service layer for employee self-service portal functionality
 */

import { supabase } from './supabase';
import { auditService } from './auditService';
import { BaseService } from './base/BaseService';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  validateUserId,
  isValidUUID,
  sanitizeReportData
} from '@/utils/validation';

import {
  EmployeeProfile,
  EmployeePortalPreferences,
  EmployeeEquitySummary,
  EmployeeEquityValue,
  EmployeeEquityGrant,
  EmployeeVestingSchedule,
  EmployeeDocument,
  EmployeePortalActivity,
  EmployeeDashboardData,
  EmployeeNotification,
  EmployeePortalAuthRequest,
  EmployeePortalAuthResponse,
  UpdateEmployeePreferencesRequest,
  ExerciseCalculation,
  TaxEstimate,
  DataExportRequest
} from '@/types/employeePortal';

export class EmployeePortalService extends BaseService {

  /**
   * Authenticate employee for portal access
   */
  async authenticateEmployee(
    request: EmployeePortalAuthRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EmployeePortalAuthResponse> {
    // Input validation
    if (!request.email || !request.company_id) {
      throw new ValidationError('Email and company ID are required');
    }

    if (!isValidUUID(request.company_id)) {
      throw new ValidationError('Invalid company ID format');
    }

    return await this.executeWithRetry(async () => {
      // Find employee by email and company
      const { data: employee, error: employeeError } = await supabase
        .from('people')
        .select(`
          *,
          manager:people!manager_id(id, name, email)
        `)
        .eq('email', request.email.toLowerCase())
        .eq('company_id', request.company_id)
        .eq('type', 'EMPLOYEE')
        .eq('employee_portal_enabled', true)
        .single();

      if (employeeError || !employee) {
        // Log failed authentication attempt
        await this.logActivity(
          'FAILED_LOGIN_ATTEMPT',
          request.company_id,
          'SYSTEM',
          {
            email: request.email,
            reason: 'Employee not found or portal disabled',
            ip_address: ipAddress
          }
        );
        
        throw new AuthenticationError('Employee portal access not available for this email');
      }

      // Check if invitation token is required and valid
      if (request.invitation_token) {
        // Validate invitation token logic would go here
        // For MVP, we'll skip complex invitation system
      }

      // Update login statistics
      const loginCount = (employee.portal_login_count || 0) + 1;
      const isFirstLogin = !employee.portal_first_login_at;
      
      const { error: updateError } = await supabase
        .from('people')
        .update({
          portal_last_login_at: new Date().toISOString(),
          portal_first_login_at: isFirstLogin ? new Date().toISOString() : employee.portal_first_login_at,
          portal_login_count: loginCount
        })
        .eq('id', employee.id);

      if (updateError) {
        console.error('Failed to update login stats:', updateError);
      }

      // Log successful authentication
      await this.logEmployeeActivity(
        employee.id,
        request.company_id,
        'LOGIN',
        {
          login_method: 'EMAIL',
          first_login: isFirstLogin,
          login_count: loginCount
        },
        ipAddress,
        userAgent
      );

      // Generate access tokens (simplified for MVP - in production use proper JWT)
      const accessToken = Buffer.from(`${employee.id}:${Date.now()}`).toString('base64');
      const refreshToken = Buffer.from(`${employee.id}:${Date.now() + 86400000}`).toString('base64');

      return {
        success: true,
        employee: {
          id: employee.id,
          company_id: employee.company_id,
          name: employee.name,
          email: employee.email,
          employee_id: employee.employee_id,
          hire_date: employee.hire_date,
          department: employee.department,
          job_title: employee.job_title,
          manager_id: employee.manager_id,
          employee_portal_enabled: employee.employee_portal_enabled,
          portal_invitation_sent_at: employee.portal_invitation_sent_at,
          portal_first_login_at: employee.portal_first_login_at,
          portal_last_login_at: employee.portal_last_login_at,
          portal_login_count: loginCount,
          manager: employee.manager
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        portal_enabled: employee.employee_portal_enabled,
        first_login: isFirstLogin
      };
    });
  }

  /**
   * Get complete employee dashboard data
   */
  async getEmployeeDashboard(
    employeeId: string,
    sessionToken: string
  ): Promise<EmployeeDashboardData> {
    // Validate session and get employee
    const employee = await this.validateEmployeeSession(employeeId, sessionToken);
    
    return await this.executeWithTransaction(async () => {
      // Fetch all dashboard data in parallel for performance
      const [
        equitySummary,
        equityValue,
        grants,
        vestingSchedules,
        documents,
        recentActivity,
        preferences,
        companyInfo,
        notifications
      ] = await Promise.all([
        this.getEmployeeEquitySummary(employeeId),
        this.getEmployeeEquityValue(employeeId),
        this.getEmployeeGrants(employeeId),
        this.getEmployeeVestingSchedules(employeeId),
        this.getEmployeeDocuments(employeeId),
        this.getEmployeeActivity(employeeId, { limit: 10 }),
        this.getEmployeePreferences(employeeId),
        this.getCompanyInfo(employee.company_id),
        this.getEmployeeNotifications(employeeId)
      ]);

      // Log dashboard access
      await this.logEmployeeActivity(
        employeeId,
        employee.company_id,
        'VIEW_EQUITY_SUMMARY'
      );

      return {
        profile: employee,
        equity_summary: equitySummary,
        equity_value: equityValue,
        grants: grants,
        vesting_schedules: vestingSchedules,
        documents: documents,
        recent_activity: recentActivity,
        preferences: preferences,
        company_info: companyInfo,
        pending_notifications: notifications
      };
    });
  }

  /**
   * Get employee equity summary from materialized view
   */
  async getEmployeeEquitySummary(employeeId: string): Promise<EmployeeEquitySummary> {
    validateUserId(employeeId);

    return await this.executeWithRetry(async () => {
      const { data, error } = await supabase
        .from('employee_equity_summary')
        .select('*')
        .eq('person_id', employeeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Employee equity summary not found');
        }
        throw error;
      }

      return data as EmployeeEquitySummary;
    });
  }

  /**
   * Calculate employee equity value using database function
   */
  async getEmployeeEquityValue(employeeId: string): Promise<EmployeeEquityValue> {
    validateUserId(employeeId);

    return await this.executeWithRetry(async () => {
      const { data, error } = await supabase
        .rpc('calculate_employee_equity_value', {
          p_person_id: employeeId
        });

      if (error) {
        throw new Error(`Failed to calculate equity value: ${error.message}`);
      }

      return data as EmployeeEquityValue;
    });
  }

  /**
   * Get employee's equity grants with vesting details
   */
  async getEmployeeGrants(employeeId: string): Promise<EmployeeEquityGrant[]> {
    validateUserId(employeeId);

    const { data, error } = await supabase
      .from('securities')
      .select(`
        id,
        type,
        quantity,
        strike_price,
        issue_date,
        status,
        fair_market_value,
        vesting_schedules (
          id,
          vesting_type,
          status,
          total_shares,
          vested_shares,
          vesting_start_date,
          cliff_date,
          vesting_end_date,
          vesting_frequency,
          next_vesting_date,
          completion_percentage
        )
      `)
      .eq('stakeholder_id', employeeId)
      .in('type', ['STOCK_OPTION', 'ISO', 'NSO', 'RSU', 'COMMON_STOCK'])
      .order('issue_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch employee grants: ${error.message}`);
    }

    return (data || []).map(grant => ({
      id: grant.id,
      security_id: grant.id,
      grant_date: grant.issue_date,
      grant_type: grant.type as any,
      quantity: grant.quantity,
      strike_price: grant.strike_price,
      fair_market_value: grant.fair_market_value,
      status: grant.status as any,
      vesting_schedule: grant.vesting_schedules?.[0] ? {
        id: grant.vesting_schedules[0].id,
        security_id: grant.id,
        vesting_type: grant.vesting_schedules[0].vesting_type as any,
        status: grant.vesting_schedules[0].status as any,
        total_shares: grant.vesting_schedules[0].total_shares,
        vested_shares: grant.vesting_schedules[0].vested_shares || 0,
        unvested_shares: grant.vesting_schedules[0].total_shares - (grant.vesting_schedules[0].vested_shares || 0),
        vesting_start_date: grant.vesting_schedules[0].vesting_start_date,
        cliff_date: grant.vesting_schedules[0].cliff_date,
        vesting_end_date: grant.vesting_schedules[0].vesting_end_date,
        vesting_frequency: grant.vesting_schedules[0].vesting_frequency as any,
        next_vesting_date: grant.vesting_schedules[0].next_vesting_date,
        completion_percentage: grant.vesting_schedules[0].completion_percentage || 0
      } : undefined
    }));
  }

  /**
   * Get employee's vesting schedules with detailed progress
   */
  async getEmployeeVestingSchedules(employeeId: string): Promise<EmployeeVestingSchedule[]> {
    validateUserId(employeeId);

    const { data, error } = await supabase
      .from('vesting_schedules')
      .select(`
        *,
        security:securities!inner (
          id,
          type,
          quantity,
          strike_price,
          stakeholder_id
        )
      `)
      .eq('security.stakeholder_id', employeeId)
      .eq('status', 'ACTIVE')
      .order('vesting_start_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch vesting schedules: ${error.message}`);
    }

    return (data || []).map(schedule => ({
      id: schedule.id,
      security_id: schedule.security_id,
      vesting_type: schedule.vesting_type,
      status: schedule.status,
      total_shares: schedule.total_shares,
      vested_shares: schedule.vested_shares || 0,
      unvested_shares: schedule.total_shares - (schedule.vested_shares || 0),
      vesting_start_date: schedule.vesting_start_date,
      cliff_date: schedule.cliff_date,
      vesting_end_date: schedule.vesting_end_date,
      vesting_frequency: schedule.vesting_frequency,
      vesting_percentage_per_period: schedule.vesting_percentage_per_period,
      next_vesting_date: schedule.next_vesting_date,
      next_vesting_amount: schedule.next_vesting_amount,
      completion_percentage: this.calculateVestingProgress(schedule)
    }));
  }

  /**
   * Get employee accessible documents
   */
  async getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
    validateUserId(employeeId);

    const { data, error } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        type,
        description,
        file_path,
        file_size,
        mime_type,
        uploaded_at,
        uploaded_by,
        is_confidential,
        related_security_id,
        document_date,
        expiry_date,
        version
      `)
      .or(`stakeholder_id.eq.${employeeId},is_public.eq.true`)
      .eq('document_category', 'EMPLOYEE')
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch employee documents: ${error.message}`);
    }

    return (data || []).map(doc => ({
      id: doc.id,
      name: doc.name,
      type: doc.type as any,
      description: doc.description,
      file_path: doc.file_path,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      upload_date: doc.uploaded_at,
      uploaded_by: doc.uploaded_by,
      is_confidential: doc.is_confidential,
      access_granted: true, // If they can see it, access is granted
      related_security_id: doc.related_security_id,
      document_date: doc.document_date,
      expiry_date: doc.expiry_date,
      version: doc.version
    }));
  }

  /**
   * Update employee portal preferences
   */
  async updateEmployeePreferences(
    employeeId: string,
    request: UpdateEmployeePreferencesRequest
  ): Promise<EmployeePortalPreferences> {
    validateUserId(employeeId);

    return await this.executeWithTransaction(async () => {
      const { data, error } = await supabase
        .from('employee_portal_preferences')
        .upsert({
          person_id: employeeId,
          company_id: (await this.validateEmployeeSession(employeeId, 'temp')).company_id,
          ...request.preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update preferences: ${error.message}`);
      }

      // Log preference update
      await this.logEmployeeActivity(
        employeeId,
        data.company_id,
        'UPDATE_PREFERENCES',
        { updated_fields: Object.keys(request.preferences) }
      );

      return data as EmployeePortalPreferences;
    });
  }

  /**
   * Calculate exercise cost and tax implications
   */
  async calculateExercise(
    employeeId: string,
    securityId: string,
    sharesToExercise: number
  ): Promise<ExerciseCalculation> {
    validateUserId(employeeId);
    validateUserId(securityId);

    const employee = await this.validateEmployeeSession(employeeId, 'temp');
    
    // Get security details
    const { data: security, error } = await supabase
      .from('securities')
      .select(`
        *,
        vesting_schedules (vested_shares)
      `)
      .eq('id', securityId)
      .eq('stakeholder_id', employeeId)
      .single();

    if (error || !security) {
      throw new NotFoundError('Security not found or not accessible');
    }

    // Validate shares to exercise
    const vestedShares = security.vesting_schedules?.[0]?.vested_shares || 0;
    if (sharesToExercise > vestedShares) {
      throw new ValidationError('Cannot exercise more shares than vested');
    }

    // Get current fair market value
    const { data: fmv } = await supabase
      .from('fair_market_valuations')
      .select('fair_market_value_per_share')
      .eq('company_id', employee.company_id)
      .eq('status', 'APPROVED')
      .lte('valuation_date', new Date().toISOString())
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    const currentFmv = fmv?.fair_market_value_per_share || 0;
    const strikePrice = security.strike_price || 0;
    const exerciseCost = sharesToExercise * strikePrice;
    const spreadValue = sharesToExercise * (currentFmv - strikePrice);

    // Log exercise calculation
    await this.logEmployeeActivity(
      employeeId,
      employee.company_id,
      'VIEW_EXERCISE_CALCULATOR',
      {
        security_id: securityId,
        shares_calculated: sharesToExercise,
        exercise_cost: exerciseCost,
        spread_value: spreadValue
      }
    );

    return {
      security_id: securityId,
      shares_to_exercise: sharesToExercise,
      strike_price: strikePrice,
      current_fmv: currentFmv,
      exercise_cost: exerciseCost,
      spread_value: spreadValue,
      available_exercise_methods: ['CASH', 'CASHLESS', 'NET_EXERCISE'],
      recommended_method: spreadValue > exerciseCost ? 'NET_EXERCISE' : 'CASH'
    };
  }

  /**
   * Private helper methods
   */
  private async validateEmployeeSession(employeeId: string, sessionToken: string): Promise<EmployeeProfile> {
    // For MVP, simplified session validation
    // In production, implement proper JWT token validation
    
    const { data: employee, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', employeeId)
      .eq('employee_portal_enabled', true)
      .single();

    if (error || !employee) {
      throw new AuthenticationError('Invalid employee session');
    }

    return employee;
  }

  private async getEmployeePreferences(employeeId: string): Promise<EmployeePortalPreferences> {
    const { data, error } = await supabase
      .from('employee_portal_preferences')
      .select('*')
      .eq('person_id', employeeId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create default preferences
      return {
        id: '',
        person_id: employeeId,
        company_id: '',
        email_notifications: true,
        vesting_reminders: true,
        equity_updates: true,
        document_notifications: true,
        preferred_currency: 'USD',
        show_tax_estimates: true,
        show_exercise_costs: true,
        dashboard_layout: {
          sections: ['equity_summary', 'vesting_timeline', 'documents']
        },
        allow_equity_sharing: false,
        data_export_requested: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    if (error) {
      throw error;
    }

    return data;
  }

  private async getEmployeeActivity(
    employeeId: string, 
    options: { limit?: number } = {}
  ): Promise<EmployeePortalActivity[]> {
    const { data, error } = await supabase
      .from('employee_portal_activity')
      .select('*')
      .eq('person_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(options.limit || 50);

    if (error) {
      throw error;
    }

    return data || [];
  }

  private async getCompanyInfo(companyId: string): Promise<any> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        logo_url,
        primary_currency,
        fair_market_valuations (
          valuation_date,
          status
        )
      `)
      .eq('id', companyId)
      .single();

    if (error) {
      throw error;
    }

    const currentValuation = data.fair_market_valuations?.find(fmv => fmv.status === 'APPROVED');
    
    return {
      id: data.id,
      name: data.name,
      logo_url: data.logo_url,
      primary_currency: data.primary_currency || 'USD',
      current_409a_date: currentValuation?.valuation_date,
      next_409a_date: null // Calculate based on current + 12 months
    };
  }

  private async getEmployeeNotifications(employeeId: string): Promise<EmployeeNotification[]> {
    // For MVP, return empty array
    // In production, implement notification system
    return [];
  }

  private calculateVestingProgress(schedule: any): number {
    const totalShares = schedule.total_shares || 0;
    const vestedShares = schedule.vested_shares || 0;
    return totalShares > 0 ? Math.round((vestedShares / totalShares) * 100) : 0;
  }

  private async logEmployeeActivity(
    personId: string,
    companyId: string,
    activityType: string,
    activityDetails: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      await supabase.rpc('log_employee_portal_activity', {
        p_person_id: personId,
        p_company_id: companyId,
        p_activity_type: activityType,
        p_activity_details: activityDetails,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_session_id: sessionId
      });
    } catch (error) {
      console.error('Failed to log employee activity:', error);
    }
  }
}

// Export singleton instance
export const employeePortalService = new EmployeePortalService();