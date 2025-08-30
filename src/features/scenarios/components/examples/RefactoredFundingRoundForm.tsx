/**
 * Example: Refactored funding round form implementing all improvement patterns
 * Demonstrates proper form architecture, accessibility, and type safety
 */

import React, { useCallback, useMemo } from 'react';
import Decimal from 'decimal.js';
import { FinancialInput } from '@/components/forms/FinancialInput';
import { AccessibleField, AccessibleSelect, AccessibleButtonGroup } from '@/components/accessibility/AccessibleForm';
import { FormSection, FormGrid, FormActions, useFormValidation } from '@/components/forms/ProgressiveForm';
import { Button } from '@/components/ui/Button';
import { EnhancedRoundScenario } from '../../types/scenarioModeling';
import { fundingRoundSchema, isValidPrice, isValidValuation } from '@/utils/typeGuards';

export interface RefactoredFundingRoundFormProps {
  round: EnhancedRoundScenario;
  onChange: (updates: Partial<EnhancedRoundScenario>) => void;
  onSave?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

// Validation rules following the new pattern
const createValidationRules = () => ({
  name: (value: string) => {
    if (!value || value.trim().length === 0) return 'Round name is required';
    if (value.length > 50) return 'Round name must be 50 characters or less';
    return undefined;
  },
  preMoney: (value: number) => {
    if (!isValidValuation(value)) return 'Pre-money valuation must be a positive amount';
    if (value < 100000) return 'Pre-money valuation must be at least $1,000'; // 100000 cents = $1,000
    return undefined;
  },
  investmentAmount: (value: number) => {
    if (!isValidValuation(value)) return 'Investment amount must be a positive amount';
    if (value < 10000) return 'Investment amount must be at least $100'; // 10000 cents = $100
    return undefined;
  },
  pricePerShare: (value: number) => {
    if (!isValidPrice(value)) return 'Price per share must be a positive amount';
    if (value < 1) return 'Price per share must be at least $0.01'; // 1 cent
    return undefined;
  },
  shareClass: (value: string) => {
    if (!['COMMON', 'PREFERRED'].includes(value)) return 'Share class must be Common or Preferred';
    return undefined;
  },
  optionPoolIncrease: (value: number) => {
    if (value < 0) return 'Option pool increase cannot be negative';
    if (value > 50) return 'Option pool increase cannot exceed 50%';
    return undefined;
  },
  liquidationPreferenceMultiple: (value: number) => {
    if (value < 0) return 'Liquidation preference cannot be negative';
    if (value > 10) return 'Liquidation preference cannot exceed 10x';
    return undefined;
  },
  participationCap: (value: number) => {
    if (value < 0) return 'Participation cap cannot be negative';
    if (value > 20) return 'Participation cap cannot exceed 20x';
    return undefined;
  }
});

export const RefactoredFundingRoundForm: React.FC<RefactoredFundingRoundFormProps> = React.memo(({
  round,
  onChange,
  onSave,
  onCancel,
  disabled = false,
  className = ''
}) => {
  // Form validation with proper typing
  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched: markTouched,
    handleSubmit,
    isValid
  } = useFormValidation({
    initialValues: round,
    validationRules: createValidationRules(),
    onSubmit: onSave
  });

  // Advanced section state
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Memoized computed values with financial precision
  const postMoneyValuation = useMemo(() => 
    new Decimal(values.preMoney).plus(values.investmentAmount).toNumber(), 
    [values.preMoney, values.investmentAmount]
  );

  const impliedSharesIssued = useMemo(() => 
    values.pricePerShare > 0 
      ? new Decimal(values.investmentAmount).dividedBy(values.pricePerShare).floor().toNumber()
      : 0,
    [values.investmentAmount, values.pricePerShare]
  );

  // Handlers with proper type safety
  const handleFieldChange = useCallback(<K extends keyof EnhancedRoundScenario>(
    field: K,
    value: EnhancedRoundScenario[K]
  ) => {
    setValue(field, value);
    onChange({ [field]: value } as Partial<EnhancedRoundScenario>);
  }, [setValue, onChange]);

  const handleFieldBlur = useCallback(<K extends keyof EnhancedRoundScenario>(field: K) => {
    markTouched(field);
  }, [markTouched]);

  return (
    <div className={`space-y-6 ${className}`}>
      <FormSection
        title="Basic Round Details"
        description="Core information about this funding round"
        required
        error={!!(errors.name || errors.preMoney || errors.investmentAmount || errors.pricePerShare)}
      >
        <FormGrid columns={2} gap="md">
          <AccessibleField
            label="Round Name"
            error={touched.name ? errors.name : undefined}
            required
          >
            <input
              type="text"
              value={values.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              disabled={disabled}
              placeholder="e.g., Series A, Seed"
              className={`
                block w-full px-3 py-2.5 border rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:border-transparent
                disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                ${errors.name && touched.name
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
                }
              `}
            />
          </AccessibleField>

          <AccessibleSelect
            label="Share Class"
            value={values.shareClass}
            onChange={(value) => handleFieldChange('shareClass', value as 'COMMON' | 'PREFERRED')}
            options={[
              { value: 'COMMON', label: 'Common Stock' },
              { value: 'PREFERRED', label: 'Preferred Stock' }
            ]}
            error={touched.shareClass ? errors.shareClass : undefined}
            required
            disabled={disabled}
          />
        </FormGrid>

        <FormGrid columns={2} gap="md">
          <FinancialInput
            label="Pre-money Valuation"
            value={values.preMoney}
            onChange={(value) => handleFieldChange('preMoney', value)}
            displayUnit="millions"
            unit="M"
            precision={1}
            error={touched.preMoney ? errors.preMoney : undefined}
            helpText="Company valuation before this investment"
            required
            disabled={disabled}
          />

          <FinancialInput
            label="Investment Amount"
            value={values.investmentAmount}
            onChange={(value) => handleFieldChange('investmentAmount', value)}
            displayUnit="millions"
            unit="M"
            precision={1}
            error={touched.investmentAmount ? errors.investmentAmount : undefined}
            helpText="Total amount being invested"
            required
            disabled={disabled}
          />
        </FormGrid>

        <FormGrid columns={3} gap="md">
          <FinancialInput
            label="Price per Share"
            value={values.pricePerShare}
            onChange={(value) => handleFieldChange('pricePerShare', value)}
            displayUnit="dollars"
            unit="$"
            precision={2}
            error={touched.pricePerShare ? errors.pricePerShare : undefined}
            required
            disabled={disabled}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Post-money Valuation
            </label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              ${new Decimal(postMoneyValuation).dividedBy(100000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-500">Calculated automatically</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Shares Issued
            </label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              {impliedSharesIssued.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Based on investment ÷ price</p>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Advanced Terms"
        description="Investor protection and special rights"
        expanded={showAdvanced}
        expandable
        onToggle={setShowAdvanced}
      >
        <FormGrid columns={2} gap="md">
          <AccessibleButtonGroup
            label="Anti-dilution Protection"
            value={values.antiDilutionType || 'NONE'}
            onChange={(value) => handleFieldChange('antiDilutionType', value as any)}
            options={[
              { value: 'NONE', label: 'None' },
              { value: 'WEIGHTED_AVERAGE_BROAD', label: 'Broad-based WA' },
              { value: 'WEIGHTED_AVERAGE_NARROW', label: 'Narrow-based WA' },
              { value: 'FULL_RATCHET', label: 'Full Ratchet' }
            ]}
            orientation="vertical"
            disabled={disabled}
          />

          <AccessibleButtonGroup
            label="Participation Rights"
            value={values.participationRights || 'NONE'}
            onChange={(value) => handleFieldChange('participationRights', value as any)}
            options={[
              { value: 'NONE', label: 'Non-participating' },
              { value: 'FULL', label: 'Full Participation' },
              { value: 'CAPPED', label: 'Capped Participation' }
            ]}
            orientation="vertical"
            disabled={disabled}
          />
        </FormGrid>

        <FormGrid columns={3} gap="md">
          <FinancialInput
            label="Liquidation Preference"
            value={Math.round((values.liquidationPreferenceMultiple || 1.0) * 100)}
            onChange={(value) => handleFieldChange('liquidationPreferenceMultiple', value / 100)}
            displayUnit="dollars"
            unit="x"
            precision={1}
            helpText="Multiple of original investment"
            disabled={disabled}
          />

          {values.participationRights === 'CAPPED' && (
            <FinancialInput
              label="Participation Cap"
              value={Math.round((values.participationCap || 3.0) * 100)}
              onChange={(value) => handleFieldChange('participationCap', value / 100)}
              displayUnit="dollars"
              unit="x"
              precision={1}
              helpText="Maximum participation multiple"
              disabled={disabled}
            />
          )}

          <FinancialInput
            label="Option Pool Increase"
            value={Math.round((values.optionPoolIncrease || 0) * 10000)}
            onChange={(value) => handleFieldChange('optionPoolIncrease', value / 100)}
            displayUnit="percentage"
            unit="%"
            precision={1}
            helpText="Additional option pool percentage"
            disabled={disabled}
          />
        </FormGrid>
      </FormSection>

      {onSave && (
        <FormActions alignment="right">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting || disabled}
            loading={isSubmitting}
          >
            Save Round
          </Button>
        </FormActions>
      )}
    </div>
  );
});

RefactoredFundingRoundForm.displayName = 'RefactoredFundingRoundForm';