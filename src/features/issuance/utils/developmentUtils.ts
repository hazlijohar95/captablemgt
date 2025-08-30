/**
 * Development utilities for the Securities Issuance feature
 * These utilities help developers debug, test, and develop new functionality
 */

import { 
  ISecurityIssuanceForm, 
  IIssuanceStep,
  SECURITY_TYPE_CONFIGS,
  DEFAULT_VESTING_SCHEDULES 
} from '../types/issuance.types';

// Development mode detection
export const isDevelopment = () => process.env.NODE_ENV === 'development';

// Console logging utilities with consistent formatting
export const devLog = {
  step: (stepName: string, data?: any) => {
    if (isDevelopment()) {
      console.group(`🔄 Issuance Step: ${stepName}`);
      if (data) console.log(data);
      console.groupEnd();
    }
  },
  
  validation: (isValid: boolean, errors: string[], warnings: string[]) => {
    if (isDevelopment()) {
      console.group(`✅ Validation Result: ${isValid ? 'PASS' : 'FAIL'}`);
      if (errors.length > 0) console.error('Errors:', errors);
      if (warnings.length > 0) console.warn('Warnings:', warnings);
      console.groupEnd();
    }
  },
  
  compliance: (status: string, messages: string[]) => {
    if (isDevelopment()) {
      const icon = status === 'COMPLIANT' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
      console.group(`${icon} 409A Compliance: ${status}`);
      if (messages.length > 0) console.log('Messages:', messages);
      console.groupEnd();
    }
  },
  
  transaction: (action: string, data?: any) => {
    if (isDevelopment()) {
      console.group(`💫 Transaction: ${action}`);
      if (data) console.log(data);
      console.groupEnd();
    }
  }
};

// Form validation utilities for development
export const validateFormStep = (
  stepIndex: number, 
  formData: ISecurityIssuanceForm
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  switch (stepIndex) {
    case 0: // Stakeholder selection
      if (!formData.stakeholderId) issues.push('No stakeholder selected');
      break;
      
    case 1: // Security details
      if (formData.quantity <= 0) issues.push('Invalid quantity');
      if (!formData.grantDate) issues.push('No grant date set');
      break;
      
    case 2: // Pricing terms
      const config = SECURITY_TYPE_CONFIGS[formData.type];
      if (config.requiresStrikePrice && !formData.strikePrice) {
        issues.push('Strike price required for this security type');
      }
      if (config.requiresExpiration && !formData.expirationDate) {
        issues.push('Expiration date required for this security type');
      }
      break;
      
    case 3: // Vesting schedule
      if (formData.cliffMonths > formData.durationMonths && formData.durationMonths > 0) {
        issues.push('Cliff period cannot exceed total duration');
      }
      break;
  }
  
  return { isValid: issues.length === 0, issues };
};

// Development helpers for testing different scenarios
export const createTestScenarios = () => ({
  // Standard employee option grant
  standardEmployee: {
    type: 'OPTION' as const,
    quantity: 10000,
    strikePrice: '100', // $1.00
    grantDate: new Date().toISOString().split('T')[0],
    vestingStartDate: new Date().toISOString().split('T')[0],
    ...DEFAULT_VESTING_SCHEDULES.STANDARD_EMPLOYEE,
    stakeholderId: 'test-employee-1'
  },
  
  // Founder equity grant
  founderEquity: {
    type: 'EQUITY' as const,
    quantity: 1000000,
    grantDate: new Date().toISOString().split('T')[0],
    vestingStartDate: new Date().toISOString().split('T')[0],
    ...DEFAULT_VESTING_SCHEDULES.FOUNDER,
    stakeholderId: 'test-founder-1'
  },
  
  // Advisor RSU grant
  advisorRsu: {
    type: 'RSU' as const,
    quantity: 5000,
    grantDate: new Date().toISOString().split('T')[0],
    vestingStartDate: new Date().toISOString().split('T')[0],
    ...DEFAULT_VESTING_SCHEDULES.ADVISOR,
    stakeholderId: 'test-advisor-1'
  },
  
  // Invalid scenarios for testing error handling
  invalidStrikePrice: {
    type: 'OPTION' as const,
    quantity: 10000,
    strikePrice: '50', // Below FMV
    grantDate: new Date().toISOString().split('T')[0],
    stakeholderId: 'test-employee-1'
  },
  
  invalidQuantity: {
    type: 'OPTION' as const,
    quantity: 0, // Invalid
    stakeholderId: 'test-employee-1'
  }
});

// Step progression utilities
export const getStepProgress = (steps: IIssuanceStep[]) => {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.completed).length;
  const currentStepIndex = steps.findIndex(step => step.current);
  
  return {
    totalSteps,
    completedSteps,
    currentStepIndex,
    progressPercentage: (completedSteps / totalSteps) * 100,
    isComplete: completedSteps === totalSteps
  };
};

// Form data analysis for debugging
export const analyzeFormData = (formData: ISecurityIssuanceForm) => {
  const analysis = {
    securityType: formData.type,
    config: SECURITY_TYPE_CONFIGS[formData.type],
    hasRequiredStrikePrice: !!formData.strikePrice,
    hasRequiredExpiration: !!formData.expirationDate,
    vestingDetails: {
      hasVesting: formData.durationMonths > 0,
      cliffPeriod: formData.cliffMonths,
      totalDuration: formData.durationMonths,
      frequency: formData.frequency
    },
    completeness: {
      hasStakeholder: !!formData.stakeholderId,
      hasQuantity: formData.quantity > 0,
      hasGrantDate: !!formData.grantDate,
      hasVestingStart: !!formData.vestingStartDate
    }
  };
  
  if (isDevelopment()) {
    console.group('📋 Form Data Analysis');
    console.table(analysis.completeness);
    console.log('Security Config:', analysis.config);
    console.log('Vesting Details:', analysis.vestingDetails);
    console.groupEnd();
  }
  
  return analysis;
};

// Performance monitoring utilities
export const perfTimer = {
  timers: new Map<string, number>(),
  
  start: (label: string) => {
    if (isDevelopment()) {
      perfTimer.timers.set(label, performance.now());
    }
  },
  
  end: (label: string) => {
    if (isDevelopment() && perfTimer.timers.has(label)) {
      const duration = performance.now() - perfTimer.timers.get(label)!;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      perfTimer.timers.delete(label);
    }
  },
  
  measure: <T>(label: string, fn: () => T): T => {
    perfTimer.start(label);
    const result = fn();
    perfTimer.end(label);
    return result;
  }
};

// State debugging utilities
export const debugWizardState = (state: any) => {
  if (isDevelopment()) {
    console.group('🔍 Wizard State Debug');
    console.log('Current Step:', state.currentStepIndex);
    console.log('Form Data:', state.formData);
    console.log('Validation:', state.validation);
    console.log('Loading States:', {
      loading: state.loading,
      validating: state.validating,
      previewing: state.previewing,
      issuing: state.issuing
    });
    console.groupEnd();
  }
};

// Error analysis utilities
export const analyzeError = (error: Error, context: string) => {
  if (isDevelopment()) {
    console.group(`❌ Error in ${context}`);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Context:', context);
    console.groupEnd();
  }
  
  // Could integrate with error reporting service in production
  return {
    message: error.message,
    context,
    timestamp: new Date().toISOString()
  };
};

// Component debugging wrapper
export const withDevTools = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  if (!isDevelopment()) {
    return Component;
  }
  
  return (props: P) => {
    React.useEffect(() => {
      devLog.step(`${componentName} mounted`, props);
      return () => devLog.step(`${componentName} unmounted`);
    }, []);
    
    return React.createElement(Component, props);
  };
};

// Export all utilities
export default {
  devLog,
  validateFormStep,
  createTestScenarios,
  getStepProgress,
  analyzeFormData,
  perfTimer,
  debugWizardState,
  analyzeError,
  withDevTools
};