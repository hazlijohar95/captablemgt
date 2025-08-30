/**
 * 409A Valuation Creation/Edit Form
 * Comprehensive form for creating and editing IRS Section 409A valuations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  TextArea,
  Select
} from '@/components/ui';
import { FinancialInput } from '@/components/forms/FinancialInput';
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

import { 
  CreateValuation409ARequest,
  UpdateValuation409ARequest,
  Valuation409A,
  ValuationMethod,
  AppraisalContactInfo
} from '@/types/valuation409a';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { validationService } from '@/services/validationService';

// Validation schema
const valuationSchema = z.object({
  valuation_date: z.string().min(1, 'Valuation date is required'),
  effective_period_start: z.string().min(1, 'Effective start date is required'),
  effective_period_end: z.string().optional(),
  fair_market_value_per_share: z.number().min(1, 'FMV must be greater than zero'),
  valuation_method: z.enum([
    'INCOME_APPROACH',
    'MARKET_APPROACH', 
    'ASSET_APPROACH',
    'HYBRID_APPROACH',
    'OPM',
    'PWM',
    'BACKSOLVE'
  ]),
  
  // Appraiser Information
  appraiser_name: z.string().min(3, 'Appraiser name is required'),
  appraiser_credentials: z.string().optional(),
  appraiser_firm: z.string().optional(),
  appraiser_contact_info: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal(''))
  }).optional(),
  
  // Financial Data
  enterprise_value: z.number().min(0).optional(),
  equity_value: z.number().min(0).optional(),
  revenue_ltm: z.number().optional(),
  ebitda_ltm: z.number().optional(),
  cash_balance: z.number().min(0).optional(),
  debt_balance: z.number().min(0).optional(),
  
  // Market Context
  market_multiple_revenue: z.number().min(0).optional(),
  market_multiple_ebitda: z.number().min(0).optional(),
  discount_rate: z.number().min(0).max(1).optional(),
  risk_free_rate: z.number().min(0).max(1).optional(),
  
  // Compliance
  safe_harbor_qualified: z.boolean().default(false),
  presumption_of_reasonableness: z.boolean().default(false),
  board_resolution_date: z.string().optional(),
  
  // Notes
  notes: z.string().optional(),
  internal_comments: z.string().optional()
});

type ValuationFormData = z.infer<typeof valuationSchema>;

interface ValuationFormProps {
  valuation?: Valuation409A;
  onSubmit: (data: CreateValuation409ARequest | UpdateValuation409ARequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const ValuationForm: React.FC<ValuationFormProps> = ({
  valuation,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const { companyId } = useCompanyContext();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const isEditing = !!valuation;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<ValuationFormData>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      valuation_date: valuation?.valuation_date || '',
      effective_period_start: valuation?.effective_period_start || '',
      effective_period_end: valuation?.effective_period_end || '',
      fair_market_value_per_share: valuation?.fair_market_value_per_share || 0,
      valuation_method: valuation?.valuation_method || 'INCOME_APPROACH',
      appraiser_name: valuation?.appraiser_name || '',
      appraiser_credentials: valuation?.appraiser_credentials || '',
      appraiser_firm: valuation?.appraiser_firm || '',
      appraiser_contact_info: valuation?.appraiser_contact_info || {},
      enterprise_value: valuation?.enterprise_value || undefined,
      equity_value: valuation?.equity_value || undefined,
      revenue_ltm: valuation?.revenue_ltm || undefined,
      ebitda_ltm: valuation?.ebitda_ltm || undefined,
      cash_balance: valuation?.cash_balance || undefined,
      debt_balance: valuation?.debt_balance || undefined,
      market_multiple_revenue: valuation?.market_multiple_revenue || undefined,
      market_multiple_ebitda: valuation?.market_multiple_ebitda || undefined,
      discount_rate: valuation?.discount_rate || undefined,
      risk_free_rate: valuation?.risk_free_rate || undefined,
      safe_harbor_qualified: valuation?.safe_harbor_qualified || false,
      presumption_of_reasonableness: valuation?.presumption_of_reasonableness || false,
      board_resolution_date: valuation?.board_resolution_date || '',
      notes: valuation?.notes || '',
      internal_comments: valuation?.internal_comments || ''
    }
  });

  // Watch form values for real-time validation
  const formValues = watch();

  // Real-time validation
  const validateFormData = useCallback(async () => {
    if (!isDirty) return;
    
    setValidationLoading(true);
    try {
      const result = await validationService.validateValuationData({
        company_id: companyId,
        ...formValues
      } as CreateValuation409ARequest);
      
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setValidationLoading(false);
    }
  }, [companyId, formValues, isDirty]);

  // Trigger validation when form changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateFormData();
    }, 500); // Debounce validation

    return () => clearTimeout(timeoutId);
  }, [validateFormData]);

  const onFormSubmit = handleSubmit(async (data) => {
    const submitData = {
      company_id: companyId,
      ...data,
      id: valuation?.id
    };

    await onSubmit(submitData);
  });

  const ValidationIndicator = () => {
    if (validationLoading) {
      return (
        <div className="flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2" />
          Validating...
        </div>
      );
    }

    if (!validationResult) return null;

    const { is_valid, errors: validationErrors, warnings, compliance_score } = validationResult;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {is_valid ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={`text-sm font-medium ${
              is_valid ? 'text-green-700' : 'text-red-700'
            }`}>
              {is_valid ? 'Validation Passed' : 'Validation Issues Found'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Compliance Score: {compliance_score}%
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-yellow-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>• {warning.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      {/* Basic Valuation Information */}
      <Card>
        <CardHeader
          title="Basic Information"
          description="Core valuation details and effective period"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valuation Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                {...register('valuation_date')}
                error={errors.valuation_date?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Start Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                {...register('effective_period_start')}
                error={errors.effective_period_start?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective End Date
              </label>
              <Input
                type="date"
                {...register('effective_period_end')}
                error={errors.effective_period_end?.message}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank for indefinite period
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valuation Method <span className="text-red-500">*</span>
              </label>
              <Controller
                name="valuation_method"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={[
                      { value: 'INCOME_APPROACH', label: 'Income Approach' },
                      { value: 'MARKET_APPROACH', label: 'Market Approach' },
                      { value: 'ASSET_APPROACH', label: 'Asset Approach' },
                      { value: 'HYBRID_APPROACH', label: 'Hybrid Approach' },
                      { value: 'OPM', label: 'Option Pricing Model (OPM)' },
                      { value: 'PWM', label: 'Probability Weighted Method (PWM)' },
                      { value: 'BACKSOLVE', label: 'Backsolve Method' }
                    ]}
                    error={errors.valuation_method?.message}
                  />
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fair Market Value per Share <span className="text-red-500">*</span>
            </label>
            <Controller
              name="fair_market_value_per_share"
              control={control}
              render={({ field }) => (
                <FinancialInput
                  value={field.value}
                  onChange={field.onChange}
                  displayUnit="dollars"
                  placeholder="0.00"
                  error={errors.fair_market_value_per_share?.message}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appraiser Information */}
      <Card>
        <CardHeader
          title="Appraiser Information"
          description="Independent appraiser details for IRS compliance"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appraiser Name <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('appraiser_name')}
                placeholder="Full name of the appraiser"
                error={errors.appraiser_name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credentials
              </label>
              <Input
                {...register('appraiser_credentials')}
                placeholder="ASA, CPA, CFA, etc."
                error={errors.appraiser_credentials?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firm Name
              </label>
              <Input
                {...register('appraiser_firm')}
                placeholder="Appraisal firm name"
                error={errors.appraiser_firm?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <Input
                type="email"
                {...register('appraiser_contact_info.email')}
                placeholder="appraiser@firm.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                {...register('appraiser_contact_info.phone')}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                type="url"
                {...register('appraiser_contact_info.website')}
                placeholder="https://firm.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Data */}
      <Card>
        <CardHeader
          title="Financial Data"
          description="Company financial metrics at valuation date"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enterprise Value
              </label>
              <Controller
                name="enterprise_value"
                control={control}
                render={({ field }) => (
                  <FinancialInput
                    value={field.value || 0}
                    onChange={field.onChange}
                    displayUnit="dollars"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equity Value
              </label>
              <Controller
                name="equity_value"
                control={control}
                render={({ field }) => (
                  <FinancialInput
                    value={field.value || 0}
                    onChange={field.onChange}
                    displayUnit="dollars"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revenue (LTM)
              </label>
              <Controller
                name="revenue_ltm"
                control={control}
                render={({ field }) => (
                  <FinancialInput
                    value={field.value || 0}
                    onChange={field.onChange}
                    displayUnit="dollars"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EBITDA (LTM)
              </label>
              <Controller
                name="ebitda_ltm"
                control={control}
                render={({ field }) => (
                  <FinancialInput
                    value={field.value || 0}
                    onChange={field.onChange}
                    displayUnit="dollars"
                    placeholder="0.00"
                    allowNegative={true}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cash Balance
              </label>
              <Controller
                name="cash_balance"
                control={control}
                render={({ field }) => (
                  <FinancialInput
                    value={field.value || 0}
                    onChange={field.onChange}
                    displayUnit="dollars"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Debt Balance
              </label>
              <Controller
                name="debt_balance"
                control={control}
                render={({ field }) => (
                  <FinancialInput
                    value={field.value || 0}
                    onChange={field.onChange}
                    displayUnit="dollars"
                    placeholder="0.00"
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Context */}
      <Card>
        <CardHeader
          title="Market Context"
          description="Market multiples and discount rates used in valuation"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revenue Multiple
              </label>
              <Input
                type="number"
                step="0.1"
                {...register('market_multiple_revenue', { valueAsNumber: true })}
                placeholder="2.5"
              />
              <p className="text-xs text-gray-500 mt-1">e.g., 2.5x revenue</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EBITDA Multiple
              </label>
              <Input
                type="number"
                step="0.1"
                {...register('market_multiple_ebitda', { valueAsNumber: true })}
                placeholder="12.0"
              />
              <p className="text-xs text-gray-500 mt-1">e.g., 12.0x EBITDA</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Rate
              </label>
              <Input
                type="number"
                step="0.001"
                min="0"
                max="1"
                {...register('discount_rate', { valueAsNumber: true })}
                placeholder="0.15"
              />
              <p className="text-xs text-gray-500 mt-1">As decimal (0.15 = 15%)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk-Free Rate
              </label>
              <Input
                type="number"
                step="0.001"
                min="0"
                max="1"
                {...register('risk_free_rate', { valueAsNumber: true })}
                placeholder="0.045"
              />
              <p className="text-xs text-gray-500 mt-1">As decimal (0.045 = 4.5%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader
          title="IRS Compliance"
          description="Safe harbor and board resolution information"
        />
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="safe_harbor_qualified"
                {...register('safe_harbor_qualified')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="safe_harbor_qualified" className="ml-2 text-sm text-gray-700">
                Safe Harbor Qualified
              </label>
              <InformationCircleIcon className="h-4 w-4 text-gray-400 ml-2" title="Meets all IRS safe harbor requirements" />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="presumption_of_reasonableness"
                {...register('presumption_of_reasonableness')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="presumption_of_reasonableness" className="ml-2 text-sm text-gray-700">
                Presumption of Reasonableness
              </label>
              <InformationCircleIcon className="h-4 w-4 text-gray-400 ml-2" title="Entitled to presumption of reasonableness" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Board Resolution Date
            </label>
            <Input
              type="date"
              {...register('board_resolution_date')}
              error={errors.board_resolution_date?.message}
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for safe harbor qualification
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader
          title="Notes and Comments"
          description="Additional information and internal notes"
        />
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public Notes
            </label>
            <TextArea
              {...register('notes')}
              rows={3}
              placeholder="Any additional information about this valuation..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Comments
            </label>
            <TextArea
              {...register('internal_comments')}
              rows={3}
              placeholder="Internal notes (not visible to external parties)..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader
            title="Validation Results"
            description="Real-time compliance and business rule validation"
          />
          <CardContent>
            <ValidationIndicator />
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || loading}
        >
          Cancel
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            type="submit"
            disabled={isSubmitting || loading || (validationResult && !validationResult.is_valid)}
            loading={isSubmitting || loading}
          >
            {isEditing ? 'Update Valuation' : 'Create Valuation'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ValuationForm;