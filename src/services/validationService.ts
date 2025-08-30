/**
 * Validation Service for 409A Valuations
 * Implements IRS compliance rules and business validation logic
 */

import { 
  Valuation409A,
  CreateValuation409ARequest,
  ValuationValidationResult,
  ValuationValidationRule,
  ComplianceReport
} from '@/types/valuation409a';

export class ValidationService {
  private validationRules: ValuationValidationRule[] = [];

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Validate valuation data against IRS 409A requirements
   */
  async validateValuation(valuation: Valuation409A): Promise<ValuationValidationResult> {
    const errors: Array<{ rule_id: string; message: string; field?: string }> = [];
    const warnings: Array<{ rule_id: string; message: string; field?: string }> = [];

    for (const rule of this.validationRules) {
      try {
        const isValid = rule.check(valuation);
        
        if (!isValid) {
          if (rule.severity === 'ERROR') {
            errors.push({
              rule_id: rule.rule_id,
              message: rule.message,
              field: this.extractFieldFromRule(rule.rule_id)
            });
          } else if (rule.severity === 'WARNING') {
            warnings.push({
              rule_id: rule.rule_id,
              message: rule.message,
              field: this.extractFieldFromRule(rule.rule_id)
            });
          }
        }
      } catch (error) {
        console.error(`Validation rule ${rule.rule_id} failed:`, error);
        warnings.push({
          rule_id: rule.rule_id,
          message: 'Validation rule execution failed'
        });
      }
    }

    const is_valid = errors.length === 0;
    const compliance_score = this.calculateComplianceScore(errors.length, warnings.length);

    return {
      is_valid,
      errors,
      warnings,
      compliance_score
    };
  }

  /**
   * Validate valuation creation data
   */
  async validateValuationData(data: CreateValuation409ARequest): Promise<ValuationValidationResult> {
    const errors: Array<{ rule_id: string; message: string; field?: string }> = [];
    const warnings: Array<{ rule_id: string; message: string; field?: string }> = [];

    // Basic data validation
    if (!data.company_id) {
      errors.push({ rule_id: 'REQUIRED_COMPANY', message: 'Company ID is required', field: 'company_id' });
    }

    if (!data.valuation_date) {
      errors.push({ rule_id: 'REQUIRED_VALUATION_DATE', message: 'Valuation date is required', field: 'valuation_date' });
    }

    if (!data.effective_period_start) {
      errors.push({ rule_id: 'REQUIRED_EFFECTIVE_START', message: 'Effective period start is required', field: 'effective_period_start' });
    }

    if (data.fair_market_value_per_share <= 0) {
      errors.push({ rule_id: 'INVALID_FMV', message: 'Fair market value must be greater than zero', field: 'fair_market_value_per_share' });
    }

    if (!data.appraiser_name) {
      errors.push({ rule_id: 'REQUIRED_APPRAISER', message: 'Appraiser name is required', field: 'appraiser_name' });
    }

    // Date logic validation
    if (data.valuation_date && data.effective_period_start) {
      const valuationDate = new Date(data.valuation_date);
      const effectiveStart = new Date(data.effective_period_start);
      
      if (effectiveStart < valuationDate) {
        warnings.push({ 
          rule_id: 'EFFECTIVE_BEFORE_VALUATION', 
          message: 'Effective period starts before valuation date', 
          field: 'effective_period_start' 
        });
      }

      // Check if valuation is too old
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (valuationDate < sixMonthsAgo) {
        warnings.push({
          rule_id: 'OLD_VALUATION',
          message: 'Valuation date is more than 6 months old',
          field: 'valuation_date'
        });
      }
    }

    if (data.effective_period_start && data.effective_period_end) {
      const startDate = new Date(data.effective_period_start);
      const endDate = new Date(data.effective_period_end);
      
      if (endDate <= startDate) {
        errors.push({
          rule_id: 'INVALID_PERIOD',
          message: 'Effective period end must be after start date',
          field: 'effective_period_end'
        });
      }
    }

    // Method-specific validation
    if (data.valuation_method === 'OPM' || data.valuation_method === 'PWM') {
      if (!data.enterprise_value && !data.equity_value) {
        warnings.push({
          rule_id: 'MISSING_VALUES_FOR_METHOD',
          message: `${data.valuation_method} method typically requires enterprise or equity value`,
          field: 'enterprise_value'
        });
      }
    }

    const is_valid = errors.length === 0;
    const compliance_score = this.calculateComplianceScore(errors.length, warnings.length);

    return {
      is_valid,
      errors,
      warnings,
      compliance_score
    };
  }

  /**
   * Generate compliance report for a company
   */
  async generateComplianceReport(
    companyId: string,
    valuations: Valuation409A[]
  ): Promise<ComplianceReport> {
    const reportDate = new Date().toISOString();
    const totalValuations = valuations.length;
    
    let compliantValuations = 0;
    let nonCompliantValuations = 0;
    const complianceIssues: any[] = [];

    // Check each valuation for compliance
    for (const valuation of valuations) {
      const validation = await this.validateValuation(valuation);
      
      if (validation.is_valid && validation.compliance_score >= 80) {
        compliantValuations++;
      } else {
        nonCompliantValuations++;
        
        // Add high-severity issues to report
        validation.errors.forEach(error => {
          complianceIssues.push({
            valuation_id: valuation.id,
            issue_type: 'VALIDATION_ERROR',
            severity: 'HIGH',
            description: error.message,
            recommended_action: this.getRecommendedAction(error.rule_id)
          });
        });
      }
    }

    // Check for expired valuations
    const currentDate = new Date();
    const expiredValuations = valuations.filter(v => 
      v.status === 'FINAL' && 
      v.effective_period_end && 
      new Date(v.effective_period_end) < currentDate
    ).length;

    // Check for upcoming expirations (next 90 days)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    
    const upcomingExpirations = valuations.filter(v =>
      v.status === 'FINAL' &&
      v.effective_period_end &&
      new Date(v.effective_period_end) > currentDate &&
      new Date(v.effective_period_end) < ninetyDaysFromNow
    ).length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(valuations, complianceIssues);

    // Calculate next review date (typically 12 months or earlier if needed)
    const nextReviewDate = this.calculateNextReviewDate(valuations);

    return {
      company_id: companyId,
      report_date: reportDate,
      total_valuations: totalValuations,
      compliant_valuations: compliantValuations,
      non_compliant_valuations: nonCompliantValuations,
      expired_valuations: expiredValuations,
      upcoming_expirations: upcomingExpirations,
      compliance_issues: complianceIssues,
      recommendations,
      next_review_date: nextReviewDate
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private initializeValidationRules(): void {
    this.validationRules = [
      // Required Fields Rules
      {
        rule_id: 'REQ_VALUATION_DATE',
        rule_name: 'Valuation Date Required',
        severity: 'ERROR',
        check: (v) => !!v.valuation_date,
        message: 'Valuation date is required for 409A compliance',
        regulatory_reference: 'IRC Section 409A(e)(1)'
      },
      {
        rule_id: 'REQ_EFFECTIVE_PERIOD',
        rule_name: 'Effective Period Required',
        severity: 'ERROR',
        check: (v) => !!v.effective_period_start,
        message: 'Effective period start date is required',
        regulatory_reference: 'IRC Section 409A(e)(1)'
      },
      {
        rule_id: 'REQ_FMV',
        rule_name: 'Fair Market Value Required',
        severity: 'ERROR',
        check: (v) => v.fair_market_value_per_share > 0,
        message: 'Fair market value per share must be greater than zero',
        regulatory_reference: 'IRC Section 409A(e)(1)'
      },
      {
        rule_id: 'REQ_APPRAISER',
        rule_name: 'Independent Appraiser Required',
        severity: 'ERROR',
        check: (v) => !!v.appraiser_name && v.appraiser_name.length >= 3,
        message: 'Independent appraiser name is required for safe harbor',
        regulatory_reference: 'IRC Section 409A(e)(1)(A)(iii)'
      },
      
      // Safe Harbor Rules
      {
        rule_id: 'SAFE_HARBOR_BOARD_RESOLUTION',
        rule_name: 'Board Resolution for Safe Harbor',
        severity: 'WARNING',
        check: (v) => !v.safe_harbor_qualified || !!v.board_resolution_date,
        message: 'Board resolution date required for safe harbor qualification',
        regulatory_reference: 'IRC Section 409A(e)(1)(A)(i)'
      },
      {
        rule_id: 'SAFE_HARBOR_QUALIFIED_APPRAISER',
        rule_name: 'Qualified Appraiser for Safe Harbor',
        severity: 'WARNING',
        check: (v) => !v.safe_harbor_qualified || (!!v.appraiser_credentials && v.appraiser_credentials.length > 0),
        message: 'Appraiser credentials required for safe harbor qualification',
        regulatory_reference: 'IRC Section 409A(e)(1)(A)(iii)'
      },
      {
        rule_id: 'SAFE_HARBOR_REPORT',
        rule_name: 'Written Report for Safe Harbor',
        severity: 'WARNING',
        check: (v) => !v.safe_harbor_qualified || !!v.report_file_path,
        message: 'Written valuation report required for safe harbor',
        regulatory_reference: 'IRC Section 409A(e)(1)(A)(ii)'
      },

      // Timing Rules
      {
        rule_id: 'VALUATION_FRESHNESS',
        rule_name: 'Valuation Freshness',
        severity: 'WARNING',
        check: (v) => {
          const valuationDate = new Date(v.valuation_date);
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
          return valuationDate >= twelveMonthsAgo;
        },
        message: 'Valuation is more than 12 months old and may need updating',
        regulatory_reference: 'IRC Section 409A(e)(1)'
      },
      {
        rule_id: 'EFFECTIVE_PERIOD_LOGIC',
        rule_name: 'Effective Period Logic',
        severity: 'ERROR',
        check: (v) => {
          if (!v.effective_period_end) return true;
          return new Date(v.effective_period_end) > new Date(v.effective_period_start);
        },
        message: 'Effective period end must be after start date',
        regulatory_reference: 'Business Logic'
      },

      // Financial Data Consistency
      {
        rule_id: 'ENTERPRISE_EQUITY_CONSISTENCY',
        rule_name: 'Enterprise and Equity Value Consistency',
        severity: 'WARNING',
        check: (v) => {
          if (!v.enterprise_value || !v.equity_value || !v.debt_balance) return true;
          const impliedEquity = v.enterprise_value - (v.debt_balance || 0) + (v.cash_balance || 0);
          const variance = Math.abs(impliedEquity - v.equity_value) / v.equity_value;
          return variance <= 0.1; // 10% tolerance
        },
        message: 'Enterprise value, equity value, and debt/cash balances appear inconsistent',
        regulatory_reference: 'Valuation Best Practices'
      },
      {
        rule_id: 'REASONABLE_MULTIPLES',
        rule_name: 'Reasonable Market Multiples',
        severity: 'WARNING',
        check: (v) => {
          if (!v.market_multiple_revenue) return true;
          return v.market_multiple_revenue >= 0.1 && v.market_multiple_revenue <= 50;
        },
        message: 'Revenue multiple appears unreasonable (should be 0.1x to 50x)',
        regulatory_reference: 'Market Approach Best Practices'
      },

      // Methodology Rules
      {
        rule_id: 'METHOD_DOCUMENTATION',
        rule_name: 'Valuation Method Documentation',
        severity: 'INFO',
        check: (v) => ['INCOME_APPROACH', 'MARKET_APPROACH', 'ASSET_APPROACH', 'HYBRID_APPROACH'].includes(v.valuation_method),
        message: 'Standard valuation methodology should be documented',
        regulatory_reference: 'ASA Standards'
      },

      // Status and Workflow Rules
      {
        rule_id: 'FINAL_STATUS_REQUIREMENTS',
        rule_name: 'Final Status Requirements',
        severity: 'ERROR',
        check: (v) => {
          if (v.status !== 'FINAL') return true;
          return !!v.board_resolution_date && !!v.report_file_path;
        },
        message: 'Final valuations must have board resolution and report file',
        regulatory_reference: 'Internal Controls'
      }
    ];
  }

  private calculateComplianceScore(errorCount: number, warningCount: number): number {
    const totalRules = this.validationRules.length;
    const errorWeight = 10; // Errors are heavily weighted
    const warningWeight = 2; // Warnings have lighter weight
    
    const penalty = (errorCount * errorWeight) + (warningCount * warningWeight);
    const maxPenalty = totalRules * errorWeight;
    
    const score = Math.max(0, 100 - (penalty / maxPenalty) * 100);
    return Math.round(score);
  }

  private extractFieldFromRule(ruleId: string): string | undefined {
    const fieldMappings: Record<string, string> = {
      'REQ_VALUATION_DATE': 'valuation_date',
      'REQ_EFFECTIVE_PERIOD': 'effective_period_start',
      'REQ_FMV': 'fair_market_value_per_share',
      'REQ_APPRAISER': 'appraiser_name',
      'SAFE_HARBOR_BOARD_RESOLUTION': 'board_resolution_date',
      'SAFE_HARBOR_QUALIFIED_APPRAISER': 'appraiser_credentials',
      'SAFE_HARBOR_REPORT': 'report_file_path'
    };
    
    return fieldMappings[ruleId];
  }

  private getRecommendedAction(ruleId: string): string {
    const actionMappings: Record<string, string> = {
      'REQ_VALUATION_DATE': 'Set a valid valuation date',
      'REQ_EFFECTIVE_PERIOD': 'Define the effective period start date',
      'REQ_FMV': 'Enter a valid fair market value greater than zero',
      'REQ_APPRAISER': 'Provide the independent appraiser name',
      'SAFE_HARBOR_BOARD_RESOLUTION': 'Obtain and record board resolution approving the valuation',
      'SAFE_HARBOR_QUALIFIED_APPRAISER': 'Document appraiser qualifications (ASA, CPA, CFA, etc.)',
      'SAFE_HARBOR_REPORT': 'Upload the written valuation report',
      'VALUATION_FRESHNESS': 'Consider updating the valuation if older than 12 months',
      'FINAL_STATUS_REQUIREMENTS': 'Complete board resolution and upload report before finalizing'
    };
    
    return actionMappings[ruleId] || 'Review and correct the identified issue';
  }

  private generateRecommendations(valuations: Valuation409A[], issues: any[]): string[] {
    const recommendations: string[] = [];
    
    // No current valuation
    const currentDate = new Date();
    const hasCurrentValuation = valuations.some(v => 
      v.status === 'FINAL' &&
      new Date(v.effective_period_start) <= currentDate &&
      (!v.effective_period_end || new Date(v.effective_period_end) >= currentDate)
    );
    
    if (!hasCurrentValuation) {
      recommendations.push('Obtain a current 409A valuation to ensure compliance with stock option grants');
    }

    // High number of compliance issues
    if (issues.length > valuations.length * 0.5) {
      recommendations.push('Consider engaging a qualified appraiser to review valuation procedures');
    }

    // No safe harbor valuations
    const safeHarborValuations = valuations.filter(v => v.safe_harbor_qualified).length;
    if (safeHarborValuations === 0 && valuations.length > 0) {
      recommendations.push('Consider obtaining safe harbor qualified valuations to reduce IRS challenge risk');
    }

    // Regular review schedule
    if (valuations.length > 0) {
      recommendations.push('Establish regular valuation review schedule (at least annually or with significant events)');
    }

    return recommendations;
  }

  private calculateNextReviewDate(valuations: Valuation409A[]): string {
    const currentDate = new Date();
    
    // Find the next expiring valuation
    const expiringValuations = valuations
      .filter(v => v.status === 'FINAL' && v.effective_period_end)
      .map(v => new Date(v.effective_period_end!))
      .filter(date => date > currentDate)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (expiringValuations.length > 0) {
      // Review 30 days before expiration
      const nextExpiration = expiringValuations[0];
      nextExpiration.setDate(nextExpiration.getDate() - 30);
      return nextExpiration.toISOString().split('T')[0];
    }
    
    // Default to 12 months from now
    const oneYearFromNow = new Date(currentDate);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return oneYearFromNow.toISOString().split('T')[0];
  }
}

export const validationService = new ValidationService();