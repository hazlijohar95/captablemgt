import { supabase } from './supabase';
import { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ICapTableResponse, ICapTableStakeholder, ULID } from '@/types';
import { calculateOwnership } from '@/features/cap-table/calc/round';
import { AuthorizationService } from './authorizationService';
import { CSRFService, CSRFError } from './csrfService';

type StakeholderWithPerson = Database['public']['Tables']['stakeholders']['Row'] & {
  people?: Database['public']['Tables']['people']['Row'];
  securities: (Database['public']['Tables']['securities']['Row'] & {
    share_classes?: Database['public']['Tables']['share_classes']['Row'];
  })[];
};

export class CapTableService {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = supabase;
  }

  /**
   * Fetches the current cap table for a company
   * @throws UnauthorizedAccessError if user doesn't have access to company
   * @throws ValidationError if companyId is invalid
   */
  async getCapTable(companyId: ULID, asOf?: string): Promise<ICapTableResponse> {
    // SECURITY: Verify user has access to this company
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');
    // Get all stakeholders with their associated people and securities
    const { data: stakeholdersData, error: stakeholdersError } = await this.client
      .from('stakeholders')
      .select(`
        *,
        people (*),
        securities (
          *,
          share_classes (*)
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (stakeholdersError) {
      throw new Error(`Failed to fetch stakeholders: ${stakeholdersError.message}`);
    }

    const stakeholders = stakeholdersData as StakeholderWithPerson[];

    // Calculate totals and stakeholder data
    const capTableStakeholders: ICapTableStakeholder[] = [];
    let totalShares = 0;

    // Calculate total shares first
    for (const stakeholder of stakeholders) {
      for (const security of stakeholder.securities) {
        if (!security.cancelled_at && (asOf ? new Date(security.issued_at) <= new Date(asOf) : true)) {
          totalShares += security.quantity;
        }
      }
    }

    // Process each stakeholder
    for (const stakeholder of stakeholders) {
      const stakeholderSecurities = {
        common: 0,
        preferred: 0,
        options: 0,
        rsus: 0,
        warrants: 0,
        safes: 0,
        notes: 0,
      };

      let stakeholderTotalShares = 0;

      // Sum up securities by type
      for (const security of stakeholder.securities) {
        if (!security.cancelled_at && (asOf ? new Date(security.issued_at) <= new Date(asOf) : true)) {
          stakeholderTotalShares += security.quantity;

          switch (security.type) {
            case 'EQUITY':
              if (security.share_classes?.type === 'COMMON') {
                stakeholderSecurities.common += security.quantity;
              } else {
                stakeholderSecurities.preferred += security.quantity;
              }
              break;
            case 'OPTION':
              stakeholderSecurities.options += security.quantity;
              break;
            case 'RSU':
              stakeholderSecurities.rsus += security.quantity;
              break;
            case 'WARRANT':
              stakeholderSecurities.warrants += security.quantity;
              break;
            case 'SAFE':
              stakeholderSecurities.safes += security.quantity;
              break;
            case 'NOTE':
              stakeholderSecurities.notes += security.quantity;
              break;
          }
        }
      }

      // Only include stakeholders with securities
      if (stakeholderTotalShares > 0) {
        const ownershipPct = calculateOwnership(stakeholderTotalShares, totalShares);
        
        capTableStakeholders.push({
          stakeholderId: stakeholder.id,
          name: stakeholder.people?.name || stakeholder.entity_name || 'Unknown',
          asConverted: stakeholderTotalShares,
          ownershipPct,
          securities: stakeholderSecurities,
        });
      }
    }

    // Calculate totals
    const totals = {
      common: capTableStakeholders.reduce((sum, s) => sum + (s.securities.common || 0), 0),
      preferred: capTableStakeholders.reduce((sum, s) => sum + (s.securities.preferred || 0), 0),
      optionsGranted: capTableStakeholders.reduce((sum, s) => sum + (s.securities.options || 0), 0),
      poolUnallocated: 0, // TODO: Calculate from share classes
    };

    return {
      companyId,
      asOf: asOf || new Date().toISOString(),
      mode: 'FD', // Fully Diluted
      totals,
      stakeholders: capTableStakeholders.sort((a, b) => b.ownershipPct - a.ownershipPct),
    };
  }

  /**
   * Fetches all stakeholders for a company
   */
  async getStakeholders(companyId: ULID): Promise<StakeholderWithPerson[]> {
    // SECURITY: Verify user has access to this company
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');
    const { data, error } = await this.client
      .from('stakeholders')
      .select(`
        *,
        people (*),
        securities (
          *,
          share_classes (*)
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch stakeholders: ${error.message}`);
    }

    return (data as StakeholderWithPerson[]) || [];
  }

  /**
   * Creates a new stakeholder
   */
  async createStakeholder(stakeholder: {
    companyId: ULID;
    personId?: ULID;
    entityName?: string;
    type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
    taxId?: string;
    csrfToken?: string;
  }): Promise<Database['public']['Tables']['stakeholders']['Row']> {
    // SECURITY: CSRF Protection for stakeholder creation (critical financial data)
    if (stakeholder.csrfToken) {
      await CSRFService.validateFinancialTransaction(
        stakeholder.csrfToken,
        'ISSUE',
        stakeholder.companyId,
        {
          type: stakeholder.type,
          entityName: stakeholder.entityName,
          personId: stakeholder.personId
        }
      );
    }

    // SECURITY: Verify user has write access to this company
    await AuthorizationService.validateCompanyAccess(stakeholder.companyId);
    await AuthorizationService.verifyFinancialDataAccess(stakeholder.companyId, 'write');
    const insertData: Database['public']['Tables']['stakeholders']['Insert'] = {
      company_id: stakeholder.companyId,
      person_id: stakeholder.personId || null,
      entity_name: stakeholder.entityName || null,
      type: stakeholder.type,
      tax_id: stakeholder.taxId || null,
    };

    const { data, error } = await (this.client as any)
      .from('stakeholders')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create stakeholder: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from stakeholder creation');
    }

    return data;
  }

  /**
   * Creates a stakeholder without authorization checks (for internal use during company creation)
   */
  private async createStakeholderInternal(stakeholder: {
    companyId: ULID;
    personId?: ULID;
    entityName?: string;
    type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
    taxId?: string;
  }): Promise<Database['public']['Tables']['stakeholders']['Row']> {
    const insertData: Database['public']['Tables']['stakeholders']['Insert'] = {
      company_id: stakeholder.companyId,
      person_id: stakeholder.personId || null,
      entity_name: stakeholder.entityName || null,
      type: stakeholder.type,
      tax_id: stakeholder.taxId || null,
    };

    const { data, error } = await (this.client as any)
      .from('stakeholders')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create stakeholder: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from stakeholder creation');
    }

    return data;
  }

  /**
   * Creates a new person
   */
  async createPerson(person: {
    name: string;
    email: string;
    phone?: string;
    csrfToken?: string;
  }): Promise<Database['public']['Tables']['people']['Row']> {
    // SECURITY: CSRF protection for person creation (contains PII)
    if (person.csrfToken) {
      await CSRFService.validateToken(person.csrfToken);
    }

    const insertData: Database['public']['Tables']['people']['Insert'] = {
      name: person.name,
      email: person.email,
      phone: person.phone || null,
    };

    const { data, error } = await (this.client as any)
      .from('people')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create person: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from person creation');
    }

    return data;
  }

  /**
   * Issues a security to a stakeholder
   */
  async issueSecurity(security: {
    companyId: ULID;
    stakeholderId: ULID;
    classId?: ULID;
    type: 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';
    quantity: number;
    issuedAt?: string;
    terms?: any;
    csrfToken?: string;
  }): Promise<Database['public']['Tables']['securities']['Row']> {
    // SECURITY: CSRF Protection for financial transactions
    if (!security.csrfToken) {
      throw new CSRFError('CSRF token is required for financial transactions');
    }

    await CSRFService.validateFinancialTransaction(
      security.csrfToken,
      'ISSUE',
      security.companyId,
      {
        stakeholderId: security.stakeholderId,
        type: security.type,
        quantity: security.quantity,
        classId: security.classId,
        terms: security.terms
      }
    );

    // SECURITY: Verify user has admin access to this company (securities issuance is sensitive)
    await AuthorizationService.validateCompanyAccess(security.companyId);
    await AuthorizationService.verifyFinancialDataAccess(security.companyId, 'admin');
    await AuthorizationService.logSecurityEvent(security.companyId, 'ISSUE_SECURITY', 'securities', {
      type: security.type,
      quantity: security.quantity,
      stakeholderId: security.stakeholderId
    });
    const insertData: Database['public']['Tables']['securities']['Insert'] = {
      company_id: security.companyId,
      stakeholder_id: security.stakeholderId,
      class_id: security.classId || null,
      type: security.type,
      quantity: security.quantity,
      issued_at: security.issuedAt || new Date().toISOString(),
      cancelled_at: null,
      terms: security.terms || null,
    };

    const { data, error } = await (this.client as any)
      .from('securities')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to issue security: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from security issuance');
    }

    return data;
  }

  /**
   * Gets share classes for a company
   */
  async getShareClasses(companyId: ULID): Promise<Database['public']['Tables']['share_classes']['Row'][]> {
    // SECURITY: Verify user has access to this company
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');
    const { data, error } = await this.client
      .from('share_classes')
      .select('*')
      .eq('company_id', companyId)
      .order('seniority_rank', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch share classes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Gets companies associated with a user through their person record
   */
  async getUserCompanies(userEmail: string): Promise<Database['public']['Tables']['companies']['Row'][]> {
    // First get the person record for this user
    const { data: personData, error: personError } = await (this.client as any)
      .from('people')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (personError && personError.code !== 'PGRST116') { // Not found is ok
      throw new Error(`Failed to fetch person: ${personError.message}`);
    }

    if (!personData) {
      // User not found in people table, return empty array
      return [];
    }

    // Get companies through stakeholder relationships
    const { data: companiesData, error: companiesError } = await (this.client as any)
      .from('companies')
      .select(`
        *,
        stakeholders!inner (
          person_id
        )
      `)
      .eq('stakeholders.person_id', personData.id);

    if (companiesError) {
      throw new Error(`Failed to fetch user companies: ${companiesError.message}`);
    }

    return companiesData || [];
  }

  /**
   * Creates or updates a person record for a user
   */
  async createOrUpdatePerson(userData: {
    email: string;
    name: string;
    userId: string;
  }): Promise<Database['public']['Tables']['people']['Row']> {
    // Try to find existing person by email
    const { data: existingPerson, error: findError } = await (this.client as any)
      .from('people')
      .select('*')
      .eq('email', userData.email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw new Error(`Failed to check for existing person: ${findError.message}`);
    }

    if (existingPerson) {
      // Update existing person with user_id if not set
      if (!existingPerson.user_id) {
        const { data: updatedPerson, error: updateError } = await (this.client as any)
          .from('people')
          .update({ 
            user_id: userData.userId,
            name: userData.name // Update name in case it changed
          })
          .eq('id', existingPerson.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update person: ${updateError.message}`);
        }

        return updatedPerson;
      }
      return existingPerson;
    }

    // Create new person
    const personData: any = {
      email: userData.email,
      name: userData.name,
    };
    
    // Only add user_id if it's supported by the schema
    if (userData.userId) {
      personData.user_id = userData.userId;
    }

    const { data: newPerson, error: createError } = await (this.client as any)
      .from('people')
      .insert(personData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create person: ${createError.message}`);
    }

    return newPerson;
  }

  /**
   * Creates a new company
   */
  async createCompany(company: {
    name: string;
    incorporationDate?: string;
    jurisdiction?: string;
    userId: string;
    userEmail: string;
    userName: string;
  }): Promise<Database['public']['Tables']['companies']['Row']> {
    // Create company with only required fields to avoid column errors
    const companyData: any = {
      name: company.name,
      country: 'US',
      currency: 'USD',
      fiscal_year_start: 1,
    };
    
    // Only add optional columns if they exist in the schema
    if (company.incorporationDate) {
      companyData.incorporation_date = company.incorporationDate;
    }
    if (company.jurisdiction) {
      companyData.jurisdiction = company.jurisdiction;
    }

    const { data: newCompany, error: companyError } = await (this.client as any)
      .from('companies')
      .insert(companyData)
      .select()
      .single();

    if (companyError) {
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    // Create or update person record
    const person = await this.createOrUpdatePerson({
      email: company.userEmail,
      name: company.userName,
      userId: company.userId,
    });

    // Create role assignment for the founder FIRST (CRITICAL for RLS policies)
    await this.createRoleAssignment({
      companyId: newCompany.id,
      personId: person.id,
      role: 'OWNER',
      scopes: ['companies.full', 'stakeholders.full', 'securities.full', 'grants.full', 'transactions.full']
    });

    // Now create founder stakeholder relationship (bypass auth during creation)
    await this.createStakeholderInternal({
      companyId: newCompany.id,
      personId: person.id,
      type: 'FOUNDER',
    });

    // Create default share classes (bypass auth during creation)
    await this.createDefaultShareClasses(newCompany.id);

    return newCompany;
  }

  /**
   * Creates a role assignment for a person in a company
   */
  async createRoleAssignment(roleAssignment: {
    companyId: ULID;
    personId: ULID;
    role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'INVESTOR' | 'AUDITOR';
    scopes: string[];
  }): Promise<Database['public']['Tables']['role_assignments']['Row']> {
    const insertData: Database['public']['Tables']['role_assignments']['Insert'] = {
      company_id: roleAssignment.companyId,
      person_id: roleAssignment.personId,
      role: roleAssignment.role,
      scopes: roleAssignment.scopes,
    };

    const { data, error } = await (this.client as any)
      .from('role_assignments')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role assignment: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from role assignment creation');
    }

    return data;
  }

  /**
   * Creates default share classes for a new company
   */
  private async createDefaultShareClasses(companyId: string): Promise<void> {
    const shareClasses = [
      {
        company_id: companyId,
        name: 'Common Stock',
        type: 'COMMON' as const,
        authorized: 10000000,
        par_value: 0.0001,
        seniority_rank: 1,
      },
      {
        company_id: companyId,
        name: 'Series Seed Preferred Stock',
        type: 'PREFERRED' as const,
        authorized: 2000000,
        par_value: 0.0001,
        seniority_rank: 2,
      },
    ];

    const { error } = await (this.client as any)
      .from('share_classes')
      .insert(shareClasses);

    if (error) {
      throw new Error(`Failed to create default share classes: ${error.message}`);
    }
  }

  /**
   * Creates a vesting schedule
   */
  async createVestingSchedule(schedule: {
    startDate: string;
    cliffMonths: number;
    durationMonths: number;
    frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  }): Promise<{ success: boolean; data?: any; error?: Error }> {
    try {
      const { data, error } = await (this.client as any)
        .from('vesting_schedules')
        .insert({
          start_date: schedule.startDate,
          cliff_months: schedule.cliffMonths,
          duration_months: schedule.durationMonths,
          frequency: schedule.frequency,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to create vesting schedule') 
      };
    }
  }

  /**
   * Creates a grant record for options/RSUs
   */
  async createGrant(grant: {
    securityId: string;
    strikePrice: string;
    vestingScheduleId: string;
    grantDate: string;
    planId?: string;
  }): Promise<{ success: boolean; data?: any; error?: Error }> {
    try {
      const { data, error } = await (this.client as any)
        .from('grants')
        .insert({
          security_id: grant.securityId,
          strike_price: grant.strikePrice,
          vesting_schedule_id: grant.vestingScheduleId,
          grant_date: grant.grantDate,
          plan_id: grant.planId || '00000000-0000-0000-0000-000000000000', // Default plan ID
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to create grant') 
      };
    }
  }

  /**
   * Creates a transaction record for audit trail
   */
  async createTransaction(transaction: {
    companyId: string;
    kind: 'ISSUE' | 'TRANSFER' | 'CANCEL' | 'CONVERT' | 'EXERCISE';
    effectiveAt: string;
    payload: any;
    csrfToken?: string;
  }): Promise<{ success: boolean; data?: any; error?: Error }> {
    try {
      // CSRF Protection for all financial transactions
      if (transaction.csrfToken) {
        await CSRFService.validateFinancialTransaction(
          transaction.csrfToken,
          transaction.kind,
          transaction.companyId,
          transaction.payload
        );
      }

      const { data: { user } } = await this.client.auth.getUser();
      
      const { data, error } = await (this.client as any)
        .from('transactions')
        .insert({
          company_id: transaction.companyId,
          kind: transaction.kind,
          effective_at: transaction.effectiveAt,
          payload: transaction.payload,
          actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
          request_id: `${transaction.kind}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to create transaction') 
      };
    }
  }

  /**
   * Wrapper methods with ServiceResult pattern for consistency
   */
  async getShareClassesWithResult(companyId: ULID): Promise<{ success: boolean; data?: any; error?: Error }> {
    try {
      const data = await this.getShareClasses(companyId);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to fetch share classes') 
      };
    }
  }

  async getStakeholdersWithResult(companyId: ULID): Promise<{ success: boolean; data?: any; error?: Error }> {
    try {
      const data = await this.getStakeholders(companyId);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to fetch stakeholders') 
      };
    }
  }

  async issueSecurityWithResult(security: {
    companyId: ULID;
    stakeholderId: ULID;
    classId?: ULID;
    type: 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';
    quantity: number;
    issuedAt?: string;
    terms?: any;
    csrfToken?: string;
  }): Promise<{ success: boolean; data?: any; error?: Error }> {
    try {
      const data = await this.issueSecurity(security);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to issue security') 
      };
    }
  }

  /**
   * Get stakeholder by ID with detailed information
   */
  async getStakeholderById(stakeholderId: ULID): Promise<any> {
    const { data, error } = await (this.client as any)
      .from('stakeholders')
      .select(`
        id,
        type,
        entity_name,
        tax_id,
        created_at,
        people:person_id (
          id,
          name,
          email,
          phone
        ),
        securities (
          id,
          type,
          quantity,
          issued_at,
          cancelled_at,
          share_classes:class_id (
            name,
            type
          )
        )
      `)
      .eq('id', stakeholderId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch stakeholder: ${error.message}`);
    }

    if (!data) {
      throw new Error('Stakeholder not found');
    }

    return data;
  }

  /**
   * Update stakeholder information
   */
  async updateStakeholder(stakeholderId: ULID, updates: {
    type?: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
    entity_name?: string | null;
    tax_id?: string | null;
    person?: {
      name: string;
      email: string;
      phone?: string | null;
    } | null;
  }): Promise<any> {
    // Start a transaction-like approach
    try {
      // First get the current stakeholder
      const current = await this.getStakeholderById(stakeholderId);
      
      // Update stakeholder record
      const stakeholderUpdates: any = {};
      if (updates.type !== undefined) stakeholderUpdates.type = updates.type;
      if (updates.entity_name !== undefined) stakeholderUpdates.entity_name = updates.entity_name;
      if (updates.tax_id !== undefined) stakeholderUpdates.tax_id = updates.tax_id;

      if (Object.keys(stakeholderUpdates).length > 0) {
        const { error: stakeholderError } = await (this.client as any)
          .from('stakeholders')
          .update(stakeholderUpdates)
          .eq('id', stakeholderId);

        if (stakeholderError) {
          throw new Error(`Failed to update stakeholder: ${stakeholderError.message}`);
        }
      }

      // Update person record if provided and person exists
      if (updates.person && current.people) {
        const { error: personError } = await (this.client as any)
          .from('people')
          .update({
            name: updates.person.name,
            email: updates.person.email,
            phone: updates.person.phone || null,
          })
          .eq('id', current.people.id);

        if (personError) {
          throw new Error(`Failed to update person: ${personError.message}`);
        }
      }

      // Return updated stakeholder
      return await this.getStakeholderById(stakeholderId);
    } catch (error) {
      throw new Error(`Failed to update stakeholder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const capTableService = new CapTableService();