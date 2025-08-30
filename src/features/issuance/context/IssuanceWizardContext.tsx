import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ISecurityIssuanceForm,
  ISecurityIssuanceValidation,
  IIssuancePreview,
  ISecurityIssuanceResult,
  IIssuanceStep,
  ISSUANCE_STEPS
} from '../types/issuance.types';
import { issuanceService } from '../services/issuanceService';
import { CSRFService } from '@/services/csrfService';
import type { ULID } from '@/types';

// State interface
interface IIssuanceWizardState {
  // Step management
  currentStepIndex: number;
  steps: IIssuanceStep[];
  
  // Form data
  formData: ISecurityIssuanceForm;
  
  // Validation and preview
  validation: ISecurityIssuanceValidation | null;
  preview: IIssuancePreview | null;
  result: ISecurityIssuanceResult | null;
  
  // Reference data
  stakeholders: any[];
  shareClasses: any[];
  recommendedStrikePrice: string;
  
  // Loading states
  loading: boolean;
  validating: boolean;
  previewing: boolean;
  issuing: boolean;
  
  // CSRF token
  csrfToken: string;
}

// Action types
type IssuanceWizardAction =
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'UPDATE_STEP'; payload: { index: number; updates: Partial<IIssuanceStep> } }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<ISecurityIssuanceForm> }
  | { type: 'SET_VALIDATION'; payload: ISecurityIssuanceValidation | null }
  | { type: 'SET_PREVIEW'; payload: IIssuancePreview | null }
  | { type: 'SET_RESULT'; payload: ISecurityIssuanceResult | null }
  | { type: 'SET_REFERENCE_DATA'; payload: { stakeholders: any[]; shareClasses: any[]; recommendedStrikePrice: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_PREVIEWING'; payload: boolean }
  | { type: 'SET_ISSUING'; payload: boolean }
  | { type: 'SET_CSRF_TOKEN'; payload: string }
  | { type: 'RESET_WIZARD' };

// Initial state
const initialState: IIssuanceWizardState = {
  currentStepIndex: 0,
  steps: [...ISSUANCE_STEPS],
  formData: {
    type: 'OPTION',
    quantity: 0,
    grantDate: format(new Date(), 'yyyy-MM-dd'),
    vestingStartDate: format(new Date(), 'yyyy-MM-dd'),
    cliffMonths: 12,
    durationMonths: 48,
    frequency: 'MONTHLY',
    stakeholderId: '',
  },
  validation: null,
  preview: null,
  result: null,
  stakeholders: [],
  shareClasses: [],
  recommendedStrikePrice: '',
  loading: false,
  validating: false,
  previewing: false,
  issuing: false,
  csrfToken: '',
};

// Reducer
function issuanceWizardReducer(
  state: IIssuanceWizardState,
  action: IssuanceWizardAction
): IIssuanceWizardState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStepIndex: action.payload,
        steps: state.steps.map((step, index) => ({
          ...step,
          current: index === action.payload
        }))
      };
      
    case 'UPDATE_STEP':
      return {
        ...state,
        steps: state.steps.map((step, index) =>
          index === action.payload.index ? { ...step, ...action.payload.updates } : step
        )
      };
      
    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload }
      };
      
    case 'SET_VALIDATION':
      return {
        ...state,
        validation: action.payload
      };
      
    case 'SET_PREVIEW':
      return {
        ...state,
        preview: action.payload
      };
      
    case 'SET_RESULT':
      return {
        ...state,
        result: action.payload
      };
      
    case 'SET_REFERENCE_DATA':
      return {
        ...state,
        stakeholders: action.payload.stakeholders,
        shareClasses: action.payload.shareClasses,
        recommendedStrikePrice: action.payload.recommendedStrikePrice
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
      
    case 'SET_VALIDATING':
      return {
        ...state,
        validating: action.payload
      };
      
    case 'SET_PREVIEWING':
      return {
        ...state,
        previewing: action.payload
      };
      
    case 'SET_ISSUING':
      return {
        ...state,
        issuing: action.payload
      };
      
    case 'SET_CSRF_TOKEN':
      return {
        ...state,
        csrfToken: action.payload
      };
      
    case 'RESET_WIZARD':
      return initialState;
      
    default:
      return state;
  }
}

// Context interface
interface IIssuanceWizardContext {
  state: IIssuanceWizardState;
  dispatch: React.Dispatch<IssuanceWizardAction>;
  
  // Computed values
  currentStep: IIssuanceStep;
  canProceed: boolean;
  
  // Actions
  goToStep: (stepIndex: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (updates: Partial<ISecurityIssuanceForm>) => void;
  markStepCompleted: (stepIndex: number) => void;
  validateForm: () => Promise<void>;
  generatePreview: () => Promise<void>;
  issueSecurity: () => Promise<ISecurityIssuanceResult>;
  resetWizard: () => void;
}

// Create context
const IssuanceWizardContext = createContext<IIssuanceWizardContext | null>(null);

// Hook for using the context
export const useIssuanceWizard = (): IIssuanceWizardContext => {
  const context = useContext(IssuanceWizardContext);
  if (!context) {
    throw new Error('useIssuanceWizard must be used within an IssuanceWizardProvider');
  }
  return context;
};

// Provider props
interface IIssuanceWizardProviderProps {
  children: React.ReactNode;
  companyId: ULID;
  initialStakeholderId?: string;
}

// Provider component
export const IssuanceWizardProvider: React.FC<IIssuanceWizardProviderProps> = ({
  children,
  companyId,
  initialStakeholderId
}) => {
  const [state, dispatch] = useReducer(issuanceWizardReducer, {
    ...initialState,
    formData: {
      ...initialState.formData,
      stakeholderId: initialStakeholderId || ''
    }
  });

  // Initialize data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Get CSRF token
        const token = await CSRFService.getToken();
        dispatch({ type: 'SET_CSRF_TOKEN', payload: token });

        // Load reference data
        const [stakeholdersData, shareClassesData, strikePriceData] = await Promise.all([
          issuanceService.getStakeholders(companyId),
          issuanceService.getShareClasses(companyId),
          issuanceService.getRecommendedStrikePrice(companyId)
        ]);

        dispatch({
          type: 'SET_REFERENCE_DATA',
          payload: {
            stakeholders: stakeholdersData,
            shareClasses: shareClassesData,
            recommendedStrikePrice: strikePriceData.recommendedPrice
          }
        });

        // Set default share class
        if (shareClassesData.length > 0 && !state.formData.shareClassId) {
          const commonStock = shareClassesData.find(sc => sc.type === 'COMMON') || shareClassesData[0];
          dispatch({
            type: 'UPDATE_FORM_DATA',
            payload: { shareClassId: commonStock.id }
          });
        }

        // Set default strike price if available
        if (strikePriceData.recommendedPrice !== '0' && !state.formData.strikePrice) {
          dispatch({
            type: 'UPDATE_FORM_DATA',
            payload: { strikePrice: strikePriceData.recommendedPrice }
          });
        }

      } catch (error) {
        console.error('Failed to initialize wizard:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initialize();
  }, [companyId]);

  // Computed values
  const currentStep = state.steps[state.currentStepIndex];
  
  const canProceed = (() => {
    switch (state.currentStepIndex) {
      case 0: // Stakeholder selection
        return !!state.formData.stakeholderId;
      case 1: // Security details
        return state.formData.quantity > 0 && !!state.formData.grantDate;
      case 2: // Pricing terms
        return true; // Always can proceed from pricing
      case 3: // Vesting schedule
        return true; // Always can proceed from vesting
      case 4: // Review
        return state.validation?.isValid || false;
      case 5: // Result
        return false; // Final step
      default:
        return false;
    }
  })();

  // Actions
  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < state.steps.length) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: stepIndex });
    }
  };

  const nextStep = () => {
    if (state.currentStepIndex < state.steps.length - 1) {
      // Mark current step as completed
      dispatch({
        type: 'UPDATE_STEP',
        payload: { index: state.currentStepIndex, updates: { completed: true } }
      });
      
      // Go to next step
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStepIndex + 1 });
    }
  };

  const prevStep = () => {
    if (state.currentStepIndex > 0) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStepIndex - 1 });
    }
  };

  const updateFormData = (updates: Partial<ISecurityIssuanceForm>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: updates });
  };

  const markStepCompleted = (stepIndex: number) => {
    dispatch({
      type: 'UPDATE_STEP',
      payload: { index: stepIndex, updates: { completed: true } }
    });
  };

  const validateForm = async () => {
    if (!state.formData.stakeholderId || state.formData.quantity <= 0) {
      return;
    }

    try {
      dispatch({ type: 'SET_VALIDATING', payload: true });
      const validation = await issuanceService.validateIssuance(companyId, state.formData);
      dispatch({ type: 'SET_VALIDATION', payload: validation });
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      dispatch({ type: 'SET_VALIDATING', payload: false });
    }
  };

  const generatePreview = async () => {
    if (!state.formData.stakeholderId || state.formData.quantity <= 0) {
      return;
    }

    try {
      dispatch({ type: 'SET_PREVIEWING', payload: true });
      const preview = await issuanceService.generateIssuancePreview(companyId, state.formData);
      dispatch({ type: 'SET_PREVIEW', payload: preview });
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      dispatch({ type: 'SET_PREVIEWING', payload: false });
    }
  };

  const issueSecurity = async () => {
    if (!state.validation?.isValid) {
      throw new Error('Form validation failed');
    }

    try {
      dispatch({ type: 'SET_ISSUING', payload: true });
      const result = await issuanceService.issueSecurity(companyId, state.formData, state.csrfToken);
      dispatch({ type: 'SET_RESULT', payload: result });
      
      if (result.success) {
        markStepCompleted(state.currentStepIndex);
      }
      
      return result;
    } catch (error) {
      console.error('Issuance failed:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_ISSUING', payload: false });
    }
  };

  const resetWizard = () => {
    dispatch({ type: 'RESET_WIZARD' });
  };

  const contextValue: IIssuanceWizardContext = {
    state,
    dispatch,
    currentStep,
    canProceed,
    goToStep,
    nextStep,
    prevStep,
    updateFormData,
    markStepCompleted,
    validateForm,
    generatePreview,
    issueSecurity,
    resetWizard
  };

  return (
    <IssuanceWizardContext.Provider value={contextValue}>
      {children}
    </IssuanceWizardContext.Provider>
  );
};

export default IssuanceWizardContext;