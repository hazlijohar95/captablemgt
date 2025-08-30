import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issuanceService } from '../services/issuanceService';
import { ComplianceService409A } from '@/features/compliance/services/409aComplianceService';
import { CSRFService } from '@/services/csrfService';
import { 
  ISecurityIssuanceForm, 
  ISecurityIssuanceValidation,
  IIssuancePreview
} from '../types/issuance.types';
import type { ULID } from '@/types';

interface UseSecuritiesIssuanceProps {
  companyId: ULID;
  initialStakeholderId?: string;
}

export const useSecuritiesIssuance = ({ companyId, initialStakeholderId }: UseSecuritiesIssuanceProps) => {
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<ISecurityIssuanceForm>({
    type: 'OPTION',
    quantity: 0,
    grantDate: new Date().toISOString().split('T')[0],
    vestingStartDate: new Date().toISOString().split('T')[0],
    cliffMonths: 12,
    durationMonths: 48,
    frequency: 'MONTHLY',
    stakeholderId: initialStakeholderId || '',
  });

  const [validation, setValidation] = useState<ISecurityIssuanceValidation | null>(null);
  const [preview, setPreview] = useState<IIssuancePreview | null>(null);

  // Load reference data
  const { data: stakeholders, isLoading: stakeholdersLoading } = useQuery({
    queryKey: ['stakeholders', companyId],
    queryFn: () => issuanceService.getStakeholders(companyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: shareClasses, isLoading: shareClassesLoading } = useQuery({
    queryKey: ['shareClasses', companyId],
    queryFn: () => issuanceService.getShareClasses(companyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: capTable, isLoading: capTableLoading } = useQuery({
    queryKey: ['capTable', companyId],
    queryFn: () => issuanceService.getCapTable(companyId),
    staleTime: 1 * 60 * 1000, // 1 minute - more frequent updates for cap table
  });

  const { data: complianceStatus, isLoading: complianceLoading } = useQuery({
    queryKey: ['409aCompliance', companyId],
    queryFn: () => ComplianceService409A.performComplianceCheck(companyId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: recommendedStrikePrice } = useQuery({
    queryKey: ['recommendedStrikePrice', companyId, formData.grantDate],
    queryFn: () => issuanceService.getRecommendedStrikePrice(companyId, new Date(formData.grantDate)),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!formData.grantDate
  });

  // Mutations
  const validateMutation = useMutation({
    mutationFn: (data: ISecurityIssuanceForm) => issuanceService.validateIssuance(companyId, data),
    onSuccess: (result) => {
      setValidation(result);
    }
  });

  const previewMutation = useMutation({
    mutationFn: (data: ISecurityIssuanceForm) => issuanceService.generateIssuancePreview(companyId, data),
    onSuccess: (result) => {
      setPreview(result);
    }
  });

  const issuanceMutation = useMutation({
    mutationFn: async ({ formData: data, csrfToken }: { formData: ISecurityIssuanceForm, csrfToken: string }) => 
      issuanceService.issueSecurity(companyId, data, csrfToken),
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['capTable', companyId] });
        queryClient.invalidateQueries({ queryKey: ['stakeholders', companyId] });
      }
    }
  });

  // Form data updates
  const updateFormData = useCallback((updates: Partial<ISecurityIssuanceForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Auto-set default share class when share classes are loaded
  useEffect(() => {
    if (shareClasses && shareClasses.length > 0 && !formData.shareClassId) {
      const commonStock = shareClasses.find(sc => sc.type === 'COMMON') || shareClasses[0];
      updateFormData({ shareClassId: commonStock.id });
    }
  }, [shareClasses, formData.shareClassId, updateFormData]);

  // Auto-set recommended strike price
  useEffect(() => {
    if (recommendedStrikePrice && recommendedStrikePrice.recommendedPrice !== '0' && !formData.strikePrice) {
      updateFormData({ strikePrice: recommendedStrikePrice.recommendedPrice });
    }
  }, [recommendedStrikePrice, formData.strikePrice, updateFormData]);

  // Validation and preview generation
  const validateForm = useCallback(async () => {
    if (formData.stakeholderId && formData.quantity > 0) {
      try {
        validateMutation.mutate(formData);
      } catch (error) {
        console.error('Validation failed:', error);
      }
    }
  }, [formData, validateMutation]);

  const generatePreview = useCallback(async () => {
    if (formData.stakeholderId && formData.quantity > 0) {
      try {
        previewMutation.mutate(formData);
      } catch (error) {
        console.error('Preview generation failed:', error);
      }
    }
  }, [formData, previewMutation]);

  // Issue security
  const issueSecurity = useCallback(async () => {
    if (!validation?.isValid) {
      throw new Error('Form validation failed');
    }

    const csrfToken = await CSRFService.getToken();
    return issuanceMutation.mutateAsync({ formData, csrfToken });
  }, [formData, validation, issuanceMutation]);

  // Helper functions
  const getStakeholderById = useCallback((stakeholderId: string) => {
    return stakeholders?.find(s => s.id === stakeholderId);
  }, [stakeholders]);

  const getShareClassById = useCallback((shareClassId: string) => {
    return shareClasses?.find(sc => sc.id === shareClassId);
  }, [shareClasses]);

  const getCurrentOwnership = useCallback((stakeholderId: string) => {
    const stakeholder = capTable?.stakeholders.find(s => s.stakeholderId === stakeholderId);
    return stakeholder?.ownershipPct || 0;
  }, [capTable]);

  // Calculate if form is complete for each step
  const isStakeholderStepComplete = !!formData.stakeholderId;
  const isSecurityStepComplete = formData.quantity > 0 && !!formData.grantDate;
  const isPricingStepComplete = !formData.strikePrice || !!formData.strikePrice; // Strike price is optional for some securities
  const isVestingStepComplete = true; // Always complete as vesting is optional
  const isReviewStepComplete = validation?.isValid || false;

  const loading = stakeholdersLoading || shareClassesLoading || capTableLoading || complianceLoading;
  const validating = validateMutation.isPending;
  const previewing = previewMutation.isPending;
  const issuing = issuanceMutation.isPending;

  return {
    // Form state
    formData,
    updateFormData,
    
    // Validation and preview
    validation,
    preview,
    validateForm,
    generatePreview,
    
    // Reference data
    stakeholders,
    shareClasses,
    capTable,
    complianceStatus,
    recommendedStrikePrice,
    
    // Helper functions
    getStakeholderById,
    getShareClassById,
    getCurrentOwnership,
    
    // Step completion status
    isStakeholderStepComplete,
    isSecurityStepComplete,
    isPricingStepComplete,
    isVestingStepComplete,
    isReviewStepComplete,
    
    // Actions
    issueSecurity,
    
    // Loading states
    loading,
    validating,
    previewing,
    issuing,
    
    // Results
    issuanceResult: issuanceMutation.data,
    issuanceError: issuanceMutation.error,
    
    // Reset functions
    resetValidation: () => setValidation(null),
    resetPreview: () => setPreview(null),
    resetMutation: issuanceMutation.reset,
  };
};

export default useSecuritiesIssuance;