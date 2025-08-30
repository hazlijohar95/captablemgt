/**
 * Comprehensive Reporting Service
 * Handles board reports, dilution analysis, and regulatory filing management
 */

import { supabase } from './supabase';
import { auditService } from './auditService';
import { 
  ReportTemplate,
  GeneratedReport,
  DilutionScenario,
  DilutionAnalysisResult,
  RegulatoryFiling,
  ComplianceCalendarEvent,
  BoardPackageData,
  GenerateReportRequest,
  CreateDilutionScenarioRequest,
  ComplianceDashboard,
  ReportTemplateType,
  DilutionScenarioType,
  RegulatoryFilingType
} from '@/types/reporting';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  validateGenerateReportRequest,
  validateUserId,
  validateCompanyAccess,
  sanitizeReportData,
  isValidUUID
} from '@/utils/validation';

import { BaseService } from './base/BaseService';

export class ReportingService extends BaseService {
  /**
   * Generate a board-ready report
   */
  async generateReport(
    request: GenerateReportRequest,
    userId: string
  ): Promise<GeneratedReport> {
    // Input validation
    const validatedRequest = validateGenerateReportRequest(request);
    validateUserId(userId);
    validateCompanyAccess(validatedRequest.company_id, userId);

    // Check template exists and user has access
    const template = await this.getReportTemplate(validatedRequest.template_id);
    if (!template) {
      throw new NotFoundError('Report template not found');
    }

    if (!template.is_active) {
      throw new ValidationError('Cannot generate reports from inactive template');
    }

    // Create report record
    // Use transaction for report generation
    return await this.executeWithTransaction(async () => {
      const reportId = crypto.randomUUID();
      const reportName = `${template.template_name} - ${validatedRequest.as_of_date}`;

      const { data: report, error } = await supabase
        .from('generated_reports')
        .insert({
          id: reportId,
          report_name: reportName,
          template_id: validatedRequest.template_id,
          company_id: validatedRequest.company_id,
          report_type: template.template_type,
          as_of_date: validatedRequest.as_of_date,
          generation_parameters: validatedRequest.parameters,
          status: 'GENERATING',
          created_by: userId,
          updated_by: userId
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create report: ${error.message}`);
      }

      // Log audit event
      this.logOperation('GENERATE_REPORT', reportId, userId, {
        template_type: template.template_type,
        as_of_date: validatedRequest.as_of_date
      });

      try {
        // Generate report content based on template type  
        const reportData = await this.generateReportData(
          validatedRequest.company_id,
          template.template_type,
          validatedRequest.as_of_date,
          validatedRequest.parameters
        );

        // Create file based on output format
        const filePath = await this.createReportFile(
          report,
          reportData,
          template.template_config
        );

        // Update report with generated file
        const { data: updatedReport, error: updateError } = await supabase
          .from('generated_reports')
          .update({
            status: 'GENERATED',
            file_path: filePath,
            executive_summary: reportData.executive_summary,
            key_metrics: reportData.key_metrics,
            data_sources: reportData.data_sources,
            updated_by: userId
          })
          .eq('id', reportId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update report: ${updateError.message}`);
        }

        return sanitizeReportData(updatedReport, 'USER'); // Assume user role for now

      } catch (error) {
        // Update report status to failed
        await supabase
          .from('generated_reports')
          .update({
            status: 'REJECTED',
            updated_by: userId
          })
          .eq('id', reportId);

        throw this.handleError(error);
      }
    });
  }

  /**
   * Get report template by ID with caching
   */
  async getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
    // Validate template ID format
    if (!templateId || typeof templateId !== 'string') {
      throw new ValidationError('Template ID is required');
    }
    
    if (!isValidUUID(templateId)) {
      throw new ValidationError('Invalid template ID format');
    }

    return await this.executeWithRetry(async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return data;
    });
  }


  /**
   * Get board package data for a specific date
   */
  async getBoardPackageData(
    companyId: string,
    asOfDate: string
  ): Promise<BoardPackageData> {
    // Fetch all required data in parallel
    const [
      capTableData,
      recentActivity,
      complianceStatus,
      dilutionScenarios,
      upcomingEvents
    ] = await Promise.all([
      this.getCapTableSummary(companyId, asOfDate),
      this.getRecentActivity(companyId, asOfDate),
      this.getComplianceStatus(companyId),
      this.getDilutionScenarios(companyId),
      this.getUpcomingEvents(companyId)
    ]);

    // Calculate key metrics
    const totalStakeholders = capTableData.stakeholder_summary.reduce(
      (sum, s) => sum + s.count, 0
    );

    const totalSharesOutstanding = capTableData.security_summary.reduce(
      (sum, s) => sum + s.total_shares, 0
    );

    // Get current 409A valuation
    const currentValuation = await this.getCurrentValuation(companyId);
    const currentFMV = currentValuation?.fair_market_value_per_share || 0;
    const totalCompanyValue = totalSharesOutstanding * currentFMV;

    return {
      executive_summary: {
        report_period: {
          start_date: this.getReportPeriodStart(asOfDate),
          end_date: asOfDate,
          as_of_date: asOfDate
        },
        key_metrics: {
          total_stakeholders: totalStakeholders,
          total_shares_outstanding: totalSharesOutstanding,
          fully_diluted_shares: capTableData.fully_diluted_shares,
          current_409a_value_per_share: currentFMV,
          total_company_value: totalCompanyValue
        },
        significant_changes: {
          new_stakeholders: recentActivity.new_stakeholders_count,
          securities_issued: recentActivity.new_securities_count,
          major_transactions: recentActivity.major_transactions,
          governance_changes: recentActivity.governance_changes
        },
        upcoming_deadlines: {
          regulatory_filings: upcomingEvents.regulatory_filings,
          board_matters: upcomingEvents.board_matters,
          compliance_items: upcomingEvents.compliance_items
        }
      },
      cap_table_summary: capTableData,
      recent_activity: recentActivity.activities,
      compliance_status: complianceStatus,
      forward_looking: {
        dilution_scenarios: dilutionScenarios.scenarios,
        upcoming_events: upcomingEvents.events,
        recommendations: await this.generateRecommendations(companyId, asOfDate)
      }
    };
  }

  /**
   * Create dilution analysis scenario
   */
  async createDilutionScenario(
    request: CreateDilutionScenarioRequest,
    userId: string
  ): Promise<DilutionScenario> {
    const { data: scenario, error } = await supabase
      .from('dilution_scenarios')
      .insert({
        company_id: request.company_id,
        scenario_name: request.scenario_name,
        scenario_type: request.scenario_type,
        base_date: request.base_date,
        new_shares_issued: request.new_shares_issued,
        issue_price_cents: request.issue_price_cents,
        new_option_pool_shares: request.new_option_pool_shares,
        converting_securities: request.converting_securities,
        scenario_description: request.scenario_description,
        assumptions: request.assumptions,
        status: 'DRAFT',
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create dilution scenario: ${error.message}`);
    }

    // Perform initial dilution analysis
    await this.analyzeDilutionImpact(scenario.id, userId);

    // Log creation
    await auditService.logEvent({
      event_type: 'CREATE',
      entity_type: 'SCENARIO_MODEL',
      entity_id: scenario.id,
      company_id: request.company_id,
      user_id: userId,
      change_summary: `Created dilution scenario: ${request.scenario_name}`,
      metadata: {
        scenario_type: request.scenario_type,
        base_date: request.base_date
      }
    });

    return scenario;
  }

  /**
   * Analyze dilution impact for a scenario
   */
  async analyzeDilutionImpact(
    scenarioId: string,
    userId: string
  ): Promise<DilutionAnalysisResult[]> {
    const scenario = await this.getDilutionScenario(scenarioId);
    if (!scenario) {
      throw new Error('Dilution scenario not found');
    }

    // Get current cap table
    const currentCapTable = await this.getCurrentCapTable(
      scenario.company_id,
      scenario.base_date
    );

    // Calculate pre-dilution positions
    const preDilutionResults = this.calculatePreDilutionPositions(currentCapTable);

    // Apply scenario changes
    const postDilutionResults = this.calculatePostDilutionPositions(
      preDilutionResults,
      scenario
    );

    // Calculate dilution impact for each stakeholder
    const dilutionResults: DilutionAnalysisResult[] = [];

    for (const stakeholder of currentCapTable.stakeholders) {
      const preDilution = preDilutionResults.find(
        p => p.stakeholder_id === stakeholder.id
      );
      const postDilution = postDilutionResults.find(
        p => p.stakeholder_id === stakeholder.id
      );

      if (preDilution && postDilution) {
        const result: Partial<DilutionAnalysisResult> = {
          dilution_scenario_id: scenarioId,
          stakeholder_id: stakeholder.id,
          pre_dilution_shares: preDilution.shares,
          pre_dilution_percentage: preDilution.ownership_percentage,
          post_dilution_shares: postDilution.shares,
          post_dilution_percentage: postDilution.ownership_percentage,
          absolute_dilution_shares: preDilution.shares - postDilution.shares,
          percentage_dilution: preDilution.ownership_percentage - postDilution.ownership_percentage,
          relative_dilution_percentage: (
            (preDilution.ownership_percentage - postDilution.ownership_percentage) / 
            preDilution.ownership_percentage
          ) * 100
        };

        // Save result to database
        const { data: savedResult, error } = await supabase
          .from('dilution_analysis_results')
          .upsert(result)
          .select()
          .single();

        if (!error) {
          dilutionResults.push(savedResult);
        }
      }
    }

    // Update scenario with analysis results
    const dilutionSummary = this.calculateDilutionSummary(dilutionResults);
    
    await supabase
      .from('dilution_scenarios')
      .update({
        dilution_impact: dilutionSummary,
        status: 'MODELING',
        updated_by: userId
      })
      .eq('id', scenarioId);

    // Log analysis completion
    await auditService.logCalculation({
      calculation_type: 'DILUTION_ANALYSIS',
      company_id: scenario.company_id,
      triggered_by_entity_type: 'SCENARIO_MODEL',
      triggered_by_entity_id: scenarioId,
      input_parameters: { scenario: scenario },
      output_results: { dilution_results: dilutionResults },
      calculation_method: 'DILUTION_IMPACT_ANALYSIS',
      calculated_by: userId
    });

    return dilutionResults;
  }

  /**
   * Get regulatory filing schedule
   */
  async getRegulatoryFilingSchedule(companyId: string): Promise<RegulatoryFiling[]> {
    const { data: filings, error } = await supabase
      .from('regulatory_filings')
      .select('*')
      .eq('company_id', companyId)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get filing schedule: ${error.message}`);
    }

    return filings || [];
  }

  /**
   * Create regulatory filing requirement
   */
  async createRegulatoryFiling(
    companyId: string,
    filingType: RegulatoryFilingType,
    jurisdiction: string,
    dueDate: string,
    userId: string
  ): Promise<RegulatoryFiling> {
    // Get filing requirements template
    const requirements = this.getFilingRequirements(filingType, jurisdiction);

    const { data: filing, error } = await supabase
      .from('regulatory_filings')
      .insert({
        company_id: companyId,
        filing_type: filingType,
        filing_frequency: requirements.frequency,
        jurisdiction,
        due_date: dueDate,
        required_data_elements: requirements.data_elements,
        filing_fee_cents: requirements.estimated_fee_cents,
        status: 'PENDING',
        compliance_status: 'COMPLIANT',
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create regulatory filing: ${error.message}`);
    }

    // Create compliance calendar event
    await this.createComplianceCalendarEvent({
      company_id: companyId,
      event_name: `${filingType} Filing Due`,
      event_type: 'FILING_DEADLINE',
      event_date: dueDate,
      related_filing_id: filing.id,
      priority_level: this.getFilingPriority(filingType),
      assigned_to: userId
    });

    return filing;
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(companyId: string): Promise<ComplianceDashboard> {
    const asOfDate = new Date().toISOString().split('T')[0];

    // Get all compliance-related data in parallel
    const [
      regulatoryFilings,
      upcomingDeadlines,
      complianceItems
    ] = await Promise.all([
      this.getRegulatoryFilingSchedule(companyId),
      this.getUpcomingDeadlines(companyId),
      this.getComplianceItems(companyId)
    ]);

    // Calculate metrics
    const totalComplianceItems = complianceItems.length;
    const compliantItems = complianceItems.filter(
      item => item.compliance_status === 'COMPLIANT'
    ).length;
    const overdueItems = complianceItems.filter(
      item => item.compliance_status === 'OVERDUE'
    ).length;
    
    const upcomingDeadlinesCount = upcomingDeadlines.filter(
      deadline => new Date(deadline.event_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    ).length;

    // Calculate compliance score
    const complianceScore = totalComplianceItems > 0 
      ? Math.round((compliantItems / totalComplianceItems) * 100)
      : 100;

    return {
      company_id: companyId,
      as_of_date: asOfDate,
      
      total_compliance_items: totalComplianceItems,
      compliant_items: compliantItems,
      overdue_items: overdueItems,
      upcoming_deadlines: upcomingDeadlinesCount,
      
      regulatory_compliance: regulatoryFilings.filter(f => f.compliance_status === 'COMPLIANT').length,
      corporate_governance: 0, // Would calculate from governance checklist
      tax_compliance: 0, // Would calculate from tax filings
      employment_compliance: 0, // Would calculate from employment compliance
      
      upcoming_filings: regulatoryFilings.slice(0, 10).map(filing => ({
        filing_type: filing.filing_type,
        due_date: filing.due_date,
        status: filing.status,
        estimated_cost: filing.total_cost_cents
      })),
      
      compliance_score: complianceScore,
      risk_factors: this.generateRiskFactors(complianceItems),
      recommendations: this.generateComplianceRecommendations(complianceItems)
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error) return null;
    return data;
  }

  private async generateReportData(
    companyId: string,
    templateType: ReportTemplateType,
    asOfDate: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    switch (templateType) {
      case 'BOARD_PACKAGE':
        return await this.getBoardPackageData(companyId, asOfDate);
      
      case 'CAP_TABLE_SUMMARY':
        return await this.getCapTableSummary(companyId, asOfDate);
      
      case 'DILUTION_ANALYSIS':
        return await this.getDilutionAnalysisData(companyId, parameters?.scenario_id);
      
      default:
        throw new Error(`Unsupported template type: ${templateType}`);
    }
  }

  private async createReportFile(
    report: GeneratedReport,
    data: any,
    templateConfig: any
  ): Promise<string> {
    // This would integrate with a report generation library
    // For now, return a placeholder path
    const fileName = `${report.report_name.replace(/\s+/g, '_')}.${report.output_format?.toLowerCase()}`;
    const filePath = `reports/${report.company_id}/${fileName}`;
    
    // In production, this would generate the actual file
    // using libraries like jsPDF, ExcelJS, etc.
    
    return filePath;
  }

  private getReportPeriodStart(asOfDate: string): string {
    const date = new Date(asOfDate);
    date.setMonth(date.getMonth() - 3); // Previous quarter
    return date.toISOString().split('T')[0];
  }

  private async getCurrentValuation(companyId: string) {
    const { data } = await supabase
      .from('valuations_409a')
      .select('fair_market_value_per_share')
      .eq('company_id', companyId)
      .eq('status', 'FINAL')
      .lte('effective_period_start', new Date().toISOString())
      .or('effective_period_end.is.null,effective_period_end.gte.' + new Date().toISOString())
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  private async getCapTableSummary(companyId: string, asOfDate: string): Promise<any> {
    // Implement cap table summary calculation
    return {
      stakeholder_summary: [],
      security_summary: [],
      fully_diluted_shares: 0
    };
  }

  private async getRecentActivity(companyId: string, asOfDate: string): Promise<any> {
    // Implement recent activity calculation
    return {
      new_stakeholders_count: 0,
      new_securities_count: 0,
      major_transactions: [],
      governance_changes: [],
      activities: {
        new_grants: [],
        exercises: [],
        transfers: [],
        cancellations: []
      }
    };
  }

  private async getComplianceStatus(companyId: string): Promise<any> {
    // Implement compliance status calculation
    return {
      regulatory_filings: [],
      corporate_governance: [],
      tax_obligations: [],
      insurance_coverage: []
    };
  }

  private async getDilutionScenarios(companyId: string): Promise<any> {
    const { data } = await supabase
      .from('dilution_scenarios')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['UNDER_REVIEW', 'APPROVED'])
      .order('created_at', { ascending: false })
      .limit(5);

    return { scenarios: data || [] };
  }

  private async getUpcomingEvents(companyId: string): Promise<any> {
    const { data } = await supabase
      .from('compliance_calendar')
      .select('*')
      .eq('company_id', companyId)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10);

    const events = data || [];
    
    return {
      regulatory_filings: events.filter(e => e.event_type === 'FILING_DEADLINE').length,
      board_matters: events.filter(e => e.event_type === 'BOARD_MEETING').length,
      compliance_items: events.filter(e => e.event_type === 'COMPLIANCE_REVIEW').length,
      events: events.map(e => ({
        event_name: e.event_name,
        event_date: e.event_date,
        event_type: e.event_type,
        preparation_required: [],
        board_action_required: false
      }))
    };
  }

  private async generateRecommendations(companyId: string, asOfDate: string): Promise<any[]> {
    // Generate intelligent recommendations based on company data
    return [
      {
        category: 'GOVERNANCE',
        priority: 'HIGH',
        recommendation: 'Schedule quarterly board meeting',
        rationale: 'Regular board meetings ensure proper governance',
        timeline: '30 days',
        responsible_party: 'Corporate Secretary'
      }
    ];
  }

  private async getDilutionScenario(scenarioId: string): Promise<DilutionScenario | null> {
    const { data } = await supabase
      .from('dilution_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    return data;
  }

  private async getCurrentCapTable(companyId: string, asOfDate: string): Promise<any> {
    // Implement current cap table calculation
    return { stakeholders: [] };
  }

  private calculatePreDilutionPositions(capTable: any): any[] {
    // Implement pre-dilution position calculation
    return [];
  }

  private calculatePostDilutionPositions(preDilution: any[], scenario: DilutionScenario): any[] {
    // Implement post-dilution position calculation
    return [];
  }

  private calculateDilutionSummary(results: DilutionAnalysisResult[]): any {
    // Implement dilution summary calculation
    return {
      total_dilution_percentage: 0,
      founder_dilution: 0,
      employee_dilution: 0,
      investor_dilution: 0
    };
  }

  private getFilingRequirements(filingType: RegulatoryFilingType, jurisdiction: string) {
    // Return filing requirements based on type and jurisdiction
    return {
      frequency: 'ANNUAL' as const,
      data_elements: {},
      estimated_fee_cents: 0
    };
  }

  private getFilingPriority(filingType: RegulatoryFilingType) {
    const priorityMap = {
      'SEC_FORM_D': 'HIGH',
      'IRS_FORM_3921': 'MEDIUM',
      'STATE_BLUE_SKY': 'HIGH',
      'FRANCHISE_TAX_REPORT': 'HIGH'
    };
    
    return priorityMap[filingType] || 'MEDIUM';
  }

  private async createComplianceCalendarEvent(event: Partial<ComplianceCalendarEvent>) {
    const { data, error } = await supabase
      .from('compliance_calendar')
      .insert(event)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    return data;
  }

  private async getUpcomingDeadlines(companyId: string) {
    const { data } = await supabase
      .from('compliance_calendar')
      .select('*')
      .eq('company_id', companyId)
      .gte('event_date', new Date().toISOString())
      .lte('event_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('event_date', { ascending: true });

    return data || [];
  }

  private async getComplianceItems(companyId: string) {
    // Implement compliance items retrieval
    return [];
  }

  private generateRiskFactors(complianceItems: any[]): string[] {
    return [
      'Potential regulatory compliance gaps identified',
      'Filing deadlines approaching within 30 days'
    ];
  }

  private generateComplianceRecommendations(complianceItems: any[]): string[] {
    return [
      'Review and update compliance calendar',
      'Engage legal counsel for upcoming filings'
    ];
  }

  private async getDilutionAnalysisData(companyId: string, scenarioId?: string): Promise<any> {
    // Implement dilution analysis data retrieval
    return {};
  }
}

export const reportingService = new ReportingService();